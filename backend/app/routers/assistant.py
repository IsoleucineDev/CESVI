import json
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import AppException
from app.models import Case, Document, Extraction
from app.services.llm import llm_client, clip_document_text

router = APIRouter(prefix="", tags=["assistant"])


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    case_id: Optional[str] = None
    caseId: Optional[str] = None
    message: str
    history: Optional[List[ChatMessage]] = None
    context: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = True

    def get_case_id(self) -> str:
        return (self.case_id or self.caseId or "").strip()


def build_system_prompt(case: Case, extractions_summary: str, clipped_docs: str) -> str:
    return (
        "Eres el perito técnico en hechos de tránsito de CESVI México. "
        "Tu función es responder dudas técnicas sobre el expediente y el dictamen con respuestas breves, objetivas y directas en español de México.\n\n"
        "REGLAS ESTRICTAS:\n"
        "1. Basa tus respuestas ÚNICAMENTE en los datos y fragmentos del dictamen que se proporcionan a continuación.\n"
        "2. Si un dato no consta expresamente o aparece como 'no_consta', debes responder con la frase exacta: 'No consta en el dictamen'.\n"
        "3. Nunca deduzcas, ni calcules velocidades o causas que no estén expresamente sustentadas.\n"
        "4. Respuestas concisas, técnicas y al grano.\n\n"
        f"--- EXPEDIENTE: {case.id} ---\n"
        f"Título: {case.title}\n"
        f"Ubicación registrada: {case.location or 'No registrada'}\n"
        f"Estado: {case.status}\n\n"
        "--- CAMPOS EXTRAÍDOS DEL DICTAMEN ---\n"
        f"{extractions_summary}\n\n"
        "--- FRAGMENTOS TEXTUALES RELEVANTES DEL DICTAMEN ---\n"
        f"{clipped_docs}\n"
    )


@router.post("/assistant/chat")
@router.post("/ai/chat")
async def assistant_chat(req: ChatRequest, db: Session = Depends(get_db)):
    case_id = req.get_case_id()
    if not case_id:
        raise AppException(
            status_code=400,
            code="MISSING_CASE_ID",
            message="Se requiere el identificador del caso (case_id).",
        )

    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise AppException(
            status_code=404,
            code="CASE_NOT_FOUND",
            message="El caso especificado no fue encontrado.",
        )

    # 1. Obtener documentos y sus extracciones
    docs = db.query(Document).filter(Document.case_id == case_id).all()
    all_pages = []
    for doc in docs:
        all_pages.extend(doc.pages)

    clipped_text = clip_document_text(all_pages, settings.MAX_EXTRACT_CHARS) if all_pages else "Sin documentos adjuntos."

    extractions_lines = []
    for doc in docs:
        ext = db.query(Extraction).filter(Extraction.document_id == doc.id).order_by(Extraction.created_at.desc()).first()
        if ext:
            try:
                data = json.loads(ext.data)
                for field, val in data.items():
                    status = val.get("status", "no_consta")
                    v = val.get("value")
                    quote = val.get("quote")
                    page = val.get("page")
                    if status == "consta" and v:
                        extractions_lines.append(f"- {field}: {v} (Pág. {page}, cita: '{quote}')")
                    else:
                        extractions_lines.append(f"- {field}: no consta en el dictamen")
            except Exception:
                pass

    extractions_summary = "\n".join(extractions_lines) if extractions_lines else "No hay campos extraídos formalmente aún."
    system_instruction = build_system_prompt(case, extractions_summary, clipped_text)

    # 2. Recortar historial a los últimos N mensajes para ahorro de tokens
    messages_payload = [{"role": "system", "content": system_instruction}]
    if req.history:
        trimmed_history = req.history[-settings.MAX_HISTORY_MESSAGES:]
        for h in trimmed_history:
            messages_payload.append({"role": h.role, "content": h.content})

    messages_payload.append({"role": "user", "content": req.message})

    # 3. Quick replies y acciones sugeridas para el frontend
    quick_replies = [
        "¿Cuál fue el punto de impacto?",
        "¿A qué velocidad circulaban los vehículos?",
        "¿Quién tiene la responsabilidad aparente?",
    ]

    actions = []
    if case.location:
        actions.append({"type": "set_location", "query": case.location})

    def event_stream():
        full_answer = ""
        try:
            for token in llm_client.stream_chat(messages_payload, db):
                full_answer += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            # Enviar metadatos de cierre requeridos por el AssistantPanel
            metadata_payload = {
                "token": "",
                "actions": actions,
                "quickReplies": quick_replies,
                "progress": 100,
                "ready": True,
                "topics": [{"name": "Análisis del dictamen", "done": True}],
                "missing": [],
            }
            yield f"data: {json.dumps(metadata_payload)}\n\n"
            yield "data: [DONE]\n\n"
        except AppException as ae:
            err_payload = {"token": f"\n[Error: {ae.message}]", "error": ae.message, "ready": True}
            yield f"data: {json.dumps(err_payload)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            err_payload = {"token": "\n[Error al procesar el dictamen]", "ready": True}
            yield f"data: {json.dumps(err_payload)}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream",
        },
    )
