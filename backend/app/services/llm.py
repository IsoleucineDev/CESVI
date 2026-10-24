import hashlib
import json
import time
from typing import Tuple, Optional, List, Generator
import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import AppException
from app.models import LLMCache, LLMLog, DocumentPage


class LLMClient:
    def __init__(self):
        self.http_client = httpx.Client(timeout=30.0)

    def _hash_key(self, prompt: str, context: str) -> str:
        content = f"{prompt.strip()}|||{context.strip()}"
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def _get_from_cache(self, hash_key: str, db: Session) -> Optional[str]:
        cached = db.query(LLMCache).filter(LLMCache.prompt_hash == hash_key).first()
        return cached.response_text if cached else None

    def _save_to_cache(self, hash_key: str, response_text: str, db: Session):
        try:
            cache_entry = LLMCache(prompt_hash=hash_key, response_text=response_text)
            db.add(cache_entry)
            db.commit()
        except Exception:
            db.rollback()

    def _log_call(
        self,
        provider: str,
        model: str,
        tokens_in: int,
        tokens_out: int,
        latency_ms: int,
        db: Session,
    ):
        try:
            log_entry = LLMLog(
                provider=provider,
                model=model,
                tokens_in=tokens_in,
                tokens_out=tokens_out,
                latency_ms=latency_ms,
            )
            db.add(log_entry)
            db.commit()
        except Exception:
            db.rollback()

    def _call_groq(self, prompt: str, context: str) -> Tuple[str, int, int]:
        if not settings.GROQ_API_KEY:
            raise ValueError("GROQ_API_KEY no configurada.")

        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.GROQ_MODEL,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente pericial forense automotriz mexicano. "
                        "Devuelve únicamente un objeto JSON válido con los datos pedidos. "
                        "No inventes datos ni calcules valores no presentes en el texto."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Contexto del dictamen:\n{context}\n\nInstrucción:\n{prompt}",
                },
            ],
            "temperature": settings.TEMPERATURE,
            "max_tokens": settings.MAX_TOKENS,
            "response_format": {"type": "json_object"},
        }

        last_error = None
        for _ in range(2):
            try:
                res = self.http_client.post(url, headers=headers, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    tokens_in = usage.get("prompt_tokens", 0)
                    tokens_out = usage.get("completion_tokens", 0)
                    return content, tokens_in, tokens_out
                else:
                    last_error = f"Status {res.status_code}: {res.text}"
            except Exception as e:
                last_error = str(e)
            time.sleep(0.5)

        raise RuntimeError(f"Fallo en Groq: {last_error}")

    def _call_gemini(self, prompt: str, context: str) -> Tuple[str, int, int]:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY no configurada.")

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent?key={settings.GEMINI_API_KEY}"
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "text": (
                                f"Contexto del dictamen:\n{context}\n\n"
                                f"Instrucción:\n{prompt}\n\n"
                                "Responde ÚNICAMENTE un objeto JSON válido sin bloques markdown ni texto adicional."
                            )
                        }
                    ]
                }
            ],
            "generationConfig": {
                "temperature": settings.TEMPERATURE,
                "maxOutputTokens": settings.MAX_TOKENS,
                "responseMimeType": "application/json",
            },
        }

        last_error = None
        for _ in range(2):
            try:
                res = self.http_client.post(url, json=payload)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0]:
                        parts = candidates[0]["content"].get("parts", [])
                        content = parts[0].get("text", "{}") if parts else "{}"
                        usage = data.get("usageMetadata", {})
                        tokens_in = usage.get("promptTokenCount", 0)
                        tokens_out = usage.get("candidatesTokenCount", 0)
                        return content, tokens_in, tokens_out
                else:
                    last_error = f"Status {res.status_code}: {res.text}"
            except Exception as e:
                last_error = str(e)
            time.sleep(0.5)

        raise RuntimeError(f"Fallo en Gemini: {last_error}")

    def generate_json(self, prompt: str, context: str, db: Session) -> str:
        hash_key = self._hash_key(prompt, context)
        cached_response = self._get_from_cache(hash_key, db)
        if cached_response:
            return cached_response

        if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
            raise AppException(
                status_code=503,
                code="AI_CONFIG_MISSING",
                message="El servicio de IA no está configurado. Faltan las claves de API (GROQ_API_KEY o GEMINI_API_KEY).",
            )

        start_time = time.time()
        if settings.GROQ_API_KEY:
            try:
                content, t_in, t_out = self._call_groq(prompt, context)
                latency_ms = int((time.time() - start_time) * 1000)
                self._log_call("groq", settings.GROQ_MODEL, t_in, t_out, latency_ms, db)
                self._save_to_cache(hash_key, content, db)
                return content
            except Exception:
                pass

        if settings.GEMINI_API_KEY:
            try:
                content, t_in, t_out = self._call_gemini(prompt, context)
                latency_ms = int((time.time() - start_time) * 1000)
                self._log_call("gemini", settings.GEMINI_MODEL, t_in, t_out, latency_ms, db)
                self._save_to_cache(hash_key, content, db)
                return content
            except Exception:
                pass

        raise AppException(
            status_code=503,
            code="AI_SERVICE_UNAVAILABLE",
            message="El servicio de IA no se encuentra disponible temporalmente. Intente nuevamente más tarde.",
        )

    def stream_chat(self, messages: List[dict], db: Session) -> Generator[str, None, None]:
        hash_key = hashlib.sha256(json.dumps(messages, sort_keys=True).encode("utf-8")).hexdigest()
        cached = self._get_from_cache(hash_key, db)
        if cached:
            for word in cached.split(" "):
                yield word + " "
                time.sleep(0.01)
            return

        if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
            raise AppException(
                status_code=503,
                code="AI_CONFIG_MISSING",
                message="El servicio de IA no está configurado. Faltan las claves de API (GROQ_API_KEY o GEMINI_API_KEY).",
            )

        start_time = time.time()
        # 1. Intentar streaming con Groq
        if settings.GROQ_API_KEY:
            for _ in range(2):
                try:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    }
                    payload = {
                        "model": settings.GROQ_MODEL,
                        "messages": messages,
                        "temperature": settings.TEMPERATURE,
                        "max_tokens": settings.MAX_TOKENS,
                        "stream": True,
                    }
                    full_text = ""
                    with self.http_client.stream("POST", url, headers=headers, json=payload) as response:
                        if response.status_code == 200:
                            for line in response.iter_lines():
                                if not line or not line.startswith("data: "):
                                    continue
                                raw_data = line[6:].strip()
                                if raw_data == "[DONE]":
                                    break
                                try:
                                    chunk = json.loads(raw_data)
                                    delta = chunk["choices"][0]["delta"].get("content", "")
                                    if delta:
                                        full_text += delta
                                        yield delta
                                except Exception:
                                    continue

                            latency_ms = int((time.time() - start_time) * 1000)
                            t_in = sum(len(m.get("content", "").split()) for m in messages)
                            t_out = len(full_text.split())
                            self._log_call("groq", settings.GROQ_MODEL, t_in, t_out, latency_ms, db)
                            if full_text:
                                self._save_to_cache(hash_key, full_text, db)
                            return
                except Exception:
                    time.sleep(0.5)

        # 2. Respaldo: Gemini
        if settings.GEMINI_API_KEY:
            for _ in range(2):
                try:
                    url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:streamGenerateContent?alt=sse&key={settings.GEMINI_API_KEY}"
                    contents = []
                    for m in messages:
                        role = "user" if m.get("role") in ["user", "system"] else "model"
                        contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
                    payload = {
                        "contents": contents,
                        "generationConfig": {
                            "temperature": settings.TEMPERATURE,
                            "maxOutputTokens": settings.MAX_TOKENS,
                        },
                    }
                    full_text = ""
                    with self.http_client.stream("POST", url, json=payload) as response:
                        if response.status_code == 200:
                            for line in response.iter_lines():
                                if not line or not line.startswith("data: "):
                                    continue
                                raw_data = line[6:].strip()
                                try:
                                    chunk = json.loads(raw_data)
                                    candidates = chunk.get("candidates", [])
                                    if candidates:
                                        parts = candidates[0].get("content", {}).get("parts", [])
                                        if parts:
                                            delta = parts[0].get("text", "")
                                            if delta:
                                                full_text += delta
                                                yield delta
                                except Exception:
                                    continue

                            latency_ms = int((time.time() - start_time) * 1000)
                            t_in = sum(len(m.get("content", "").split()) for m in messages)
                            t_out = len(full_text.split())
                            self._log_call("gemini", settings.GEMINI_MODEL, t_in, t_out, latency_ms, db)
                            if full_text:
                                self._save_to_cache(hash_key, full_text, db)
                            return
                except Exception:
                    time.sleep(0.5)

        raise AppException(
            status_code=503,
            code="AI_SERVICE_UNAVAILABLE",
            message="El servicio de IA no se encuentra disponible temporalmente. Intente nuevamente más tarde.",
        )


def clip_document_text(pages: List[DocumentPage], max_chars: int = 4000) -> str:
    keywords = [
        "hecho", "siniestro", "vehículo", "vehiculo", "marca", "modelo",
        "placas", "velocidad", "impacto", "carril", "alcance", "frenado",
        "daños", "danos", "conclusión", "conclusion", "responsabilidad",
        "lugar", "fecha", "hora"
    ]

    scored_pages = []
    for page in pages:
        lower_text = page.text.lower()
        score = sum(1 for kw in keywords if kw in lower_text)
        scored_pages.append((score, page))

    scored_pages.sort(key=lambda x: x[0], reverse=True)
    selected_pages = [p for s, p in scored_pages if s > 0]
    if not selected_pages:
        selected_pages = [p for _, p in scored_pages]

    selected_pages.sort(key=lambda p: p.page_number)

    clipped_chunks = []
    total_len = 0
    for page in selected_pages:
        chunk = f"--- PÁGINA {page.page_number} ---\n{page.text.strip()}\n"
        if total_len + len(chunk) > max_chars and clipped_chunks:
            break
        clipped_chunks.append(chunk)
        total_len += len(chunk)

    return "\n".join(clipped_chunks)


llm_client = LLMClient()
