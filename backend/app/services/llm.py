import hashlib
import json
import time
from typing import Tuple, Optional, List, Dict, Any, Generator
import httpx
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import AppException
from app.models import LLMCache, LLMLog, DocumentPage

SYSTEM_PROMPT = (
    "Eres el asistente pericial de CESVI México para reconstrucción de hechos de tránsito vial. "
    "Guías al perito paso a paso en el proceso: ubicación, vehículos, dinámica, evidencia, informe. "
    "Haz solo UNA pregunta a la vez. No inventes datos ni hagas cálculos; si algo no consta, responde exactamente 'no consta'. "
    "Tus respuestas deben tener como máximo 3 oraciones en español de México.\n\n"
    "Debes responder SIEMPRE en formato JSON válido con la siguiente estructura:\n"
    "{\n"
    '  "text": "Tu respuesta conversacional en español de México (máximo 3 oraciones)",\n'
    '  "quick_replies": ["Opción 1", "Opción 2"],\n'
    '  "fields": {"vehicle": "V1", "speed_kmh": 42, "heading": "Noreste", "confidence": "media"}\n'
    "}\n"
    "- 'quick_replies': lista con un máximo de 3 botones breves sugeridos para responder.\n"
    "- 'fields': objeto opcional solo si el usuario aportó o modificó vehículo, velocidad speed_kmh, rumbo o confianza."
)


class StructuredResponse(BaseModel):
    text: str
    quick_replies: Optional[List[str]] = Field(default=None)
    fields: Optional[Dict[str, Any]] = None


class LLMClient:
    def __init__(self):
        self.http_client = httpx.Client(timeout=25.0)
        self.last_quick_replies: Optional[List[str]] = None
        self.last_fields: Optional[Dict[str, Any]] = None

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
        models_to_try = [settings.GROQ_MODEL, "openai/gpt-oss-120b", "qwen/qwen3.8-27b"]
        for mod in models_to_try:
            try:
                payload = {
                    "model": mod,
                    "messages": [
                        {
                            "role": "system",
                            "content": (
                                "Eres un asistente pericial forense automotriz mexicano. "
                                "Devuelve únicamente un objeto JSON válido con los datos pedidos."
                            ),
                        },
                        {
                            "role": "user",
                            "content": f"Documento:\n{context}\n\nInstrucción:\n{prompt}",
                        },
                    ],
                    "temperature": 0.1,
                    "max_tokens": 1024,
                    "response_format": {"type": "json_object"},
                }
                resp = self.http_client.post(url, headers=headers, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    content = data["choices"][0]["message"]["content"]
                    usage = data.get("usage", {})
                    tokens_in = usage.get("prompt_tokens", len((prompt + context).split()))
                    tokens_out = usage.get("completion_tokens", len(content.split()))
                    return content, tokens_in, tokens_out
            except Exception:
                continue

        raise RuntimeError("No se pudo completar la llamada con Groq.")

    def _call_gemini(self, prompt: str, context: str) -> Tuple[str, int, int]:
        if not settings.GEMINI_API_KEY:
            raise ValueError("GEMINI_API_KEY no configurada.")

        models_to_try = [settings.GEMINI_MODEL, "gemini-2.5-flash", "gemini-flash-latest"]
        for mod in models_to_try:
            clean_mod = mod if mod.startswith("models/") else f"models/{mod}"
            url = f"https://generativelanguage.googleapis.com/v1beta/{clean_mod}:generateContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "contents": [
                    {
                        "role": "user",
                        "parts": [{"text": f"Documento:\n{context}\n\nInstrucción:\n{prompt}"}],
                    }
                ],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 1024,
                    "responseMimeType": "application/json",
                },
            }
            try:
                resp = self.http_client.post(url, json=payload, timeout=20.0)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        content = candidates[0]["content"]["parts"][0]["text"]
                        meta = data.get("usageMetadata", {})
                        tokens_in = meta.get("promptTokenCount", len((prompt + context).split()))
                        tokens_out = meta.get("candidatesTokenCount", len(content.split()))
                        return content, tokens_in, tokens_out
            except Exception:
                continue

        raise RuntimeError("Gemini no devolvió respuesta.")

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

    def generate_assistant_reply(
        self, messages: List[dict], db: Session
    ) -> Tuple[str, List[str], Optional[Dict[str, Any]]]:
        if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
            raise AppException(
                status_code=503,
                code="AI_CONFIG_MISSING",
                message="El servicio de IA no está configurado. Faltan las claves de API (GROQ_API_KEY o GEMINI_API_KEY).",
            )

        start_time = time.time()
        raw_text = None
        provider = None
        used_model = None
        t_in = 0
        t_out = 0

        # Asegurar mención de JSON en los mensajes para Groq response_format
        call_messages = list(messages)
        if not any("json" in (m.get("content") or "").lower() for m in call_messages):
            call_messages.insert(0, {"role": "system", "content": "Responder en formato JSON."})

        # 1. Intentar Groq como principal (modelo de .env o fallback de modelo en Groq)
        if settings.GROQ_API_KEY:
            groq_candidates = [settings.GROQ_MODEL, "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "llama-3.3-70b-versatile"]
            groq_models = []
            for m in groq_candidates:
                if m and m not in groq_models:
                    groq_models.append(m)

            for model_candidate in groq_models:
                try:
                    url = "https://api.groq.com/openai/v1/chat/completions"
                    headers = {
                        "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                        "Content-Type": "application/json",
                    }
                    payload = {
                        "model": model_candidate,
                        "messages": call_messages,
                        "temperature": settings.TEMPERATURE,
                        "max_tokens": settings.MAX_TOKENS,
                        "response_format": {"type": "json_object"},
                    }
                    resp = self.http_client.post(url, headers=headers, json=payload, timeout=20.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        raw_text = data["choices"][0]["message"]["content"]
                        usage = data.get("usage", {})
                        t_in = usage.get("prompt_tokens", 0)
                        t_out = usage.get("completion_tokens", 0)
                        provider = "groq"
                        used_model = model_candidate
                        break
                except Exception:
                    continue

        # 2. Respaldo Gemini si Groq falló o no tiene key
        if not raw_text and settings.GEMINI_API_KEY:
            gemini_candidates = [settings.GEMINI_MODEL, "gemini-3.8-flash", "gemini-flash-latest", "gemini-pro-latest"]
            gemini_models = []
            for m in gemini_candidates:
                if m and m not in gemini_models:
                    gemini_models.append(m)

            for model_candidate in gemini_models:
                try:
                    clean_model = (
                        model_candidate
                        if model_candidate.startswith("models/")
                        else f"models/{model_candidate}"
                    )
                    url = f"https://generativelanguage.googleapis.com/v1beta/{clean_model}:generateContent?key={settings.GEMINI_API_KEY}"
                    
                    system_text = ""
                    contents = []
                    for m in messages:
                        role = m.get("role")
                        text = m.get("content") or ""
                        if role == "system":
                            system_text += f"{text}\n"
                        else:
                            gemini_role = "user" if role == "user" else "model"
                            if contents and contents[-1]["role"] == gemini_role:
                                contents[-1]["parts"][0]["text"] += f"\n\n{text}"
                            else:
                                contents.append({"role": gemini_role, "parts": [{"text": text}]})

                    if not contents:
                        contents = [{"role": "user", "parts": [{"text": "Continuar"}]}]

                    payload = {
                        "contents": contents,
                        "generationConfig": {
                            "temperature": settings.TEMPERATURE,
                            "maxOutputTokens": settings.MAX_TOKENS,
                            "responseMimeType": "application/json",
                        },
                    }
                    if system_text.strip():
                        payload["systemInstruction"] = {
                            "parts": [{"text": system_text.strip()}]
                        }

                    resp = self.http_client.post(url, json=payload, timeout=20.0)
                    if resp.status_code == 200:
                        data = resp.json()
                        candidates = data.get("candidates", [])
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts", [])
                            if parts:
                                raw_text = parts[0].get("text", "")
                                meta = data.get("usageMetadata", {})
                                t_in = meta.get("promptTokenCount", 0)
                                t_out = meta.get("candidatesTokenCount", 0)
                                provider = "gemini"
                                used_model = model_candidate
                                break
                except Exception:
                    continue

        if not raw_text:
            raise AppException(
                status_code=503,
                code="AI_SERVICE_UNAVAILABLE",
                message="El servicio de IA no se encuentra disponible temporalmente. Intente nuevamente más tarde.",
            )

        latency_ms = int((time.time() - start_time) * 1000)
        if t_in == 0:
            t_in = sum(len(m.get("content", "").split()) for m in messages)
        if t_out == 0:
            t_out = len(raw_text.split())

        self._log_call(provider, used_model or "unknown", t_in, t_out, latency_ms, db)

        # 4. Validar JSON con Pydantic; si es inválido, devuelve solo el texto
        try:
            cleaned = raw_text.strip()
            if cleaned.startswith("```"):
                lines = cleaned.splitlines()
                if lines and lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                cleaned = "\n".join(lines).strip()
            parsed = json.loads(cleaned)
            structured = StructuredResponse.model_validate(parsed)
            text = structured.text
            quick_replies = (structured.quick_replies or [])[:3]
            fields = structured.fields
        except Exception:
            text = raw_text.strip()
            quick_replies = []
            fields = None

        self.last_quick_replies = quick_replies
        self.last_fields = fields
        return text, quick_replies, fields

    def stream_chat(self, messages: List[dict], db: Session) -> Generator[str, None, None]:
        text, quick_replies, fields = self.generate_assistant_reply(messages, db)
        words = text.split(" ")
        for i, word in enumerate(words):
            token = word if i == len(words) - 1 else word + " "
            yield token
            time.sleep(0.015)


llm_client = LLMClient()


def clip_document_text(pages: List[DocumentPage], max_chars: int = 4000) -> str:
    scored_pages = []
    keywords = [
        "hecho", "siniestro", "vehículo", "vehiculo", "marca", "modelo",
        "placas", "velocidad", "impacto", "carril", "alcance", "frenado",
        "daños", "danos", "conclusión", "conclusion", "responsabilidad",
    ]
    for page in pages:
        lower = page.text.lower()
        score = sum(1 for kw in keywords if kw in lower)
        scored_pages.append((score, page))

    scored_pages.sort(key=lambda x: x[0], reverse=True)
    selected = []
    total = 0
    for _, page in scored_pages:
        if total + len(page.text) > max_chars:
            break
        selected.append(page)
        total += len(page.text)

    selected.sort(key=lambda x: x.page_number)
    return "\n---\n".join(f"[Página {p.page_number}]\n{p.text}" for p in selected)
