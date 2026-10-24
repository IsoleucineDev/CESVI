import json
import time
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import AppException
from app.services.llm import llm_client, SYSTEM_PROMPT

router = APIRouter(prefix="", tags=["assistant"])


class ChatMessage(BaseModel):
    role: str
    content: Optional[str] = None
    text: Optional[str] = None

    def get_text(self) -> str:
        return self.content or self.text or ""


class ChatRequest(BaseModel):
    case_id: Optional[str] = None
    caseId: Optional[str] = None
    message: str
    history: Optional[List[ChatMessage]] = None
    context: Optional[Dict[str, Any]] = None
    stream: Optional[bool] = True

    def get_case_id(self) -> str:
        return (self.case_id or self.caseId or "EXP-0248").strip()


@router.post("/assistant/chat")
@router.post("/ai/chat")
async def assistant_chat(req: ChatRequest, db: Session = Depends(get_db)):
    if not settings.GROQ_API_KEY and not settings.GEMINI_API_KEY:
        raise AppException(
            status_code=503,
            code="AI_CONFIG_MISSING",
            message="El servicio de IA no está configurado. Faltan las claves de API (GROQ_API_KEY o GEMINI_API_KEY).",
        )

    # 1. Preparar historial recortado a los últimos 6 mensajes
    messages_payload = [{"role": "system", "content": SYSTEM_PROMPT}]
    if req.history:
        trimmed = req.history[-6:]
        for h in trimmed:
            messages_payload.append({
                "role": "assistant" if h.role == "assistant" else "user",
                "content": h.get_text(),
            })

    messages_payload.append({"role": "user", "content": req.message})

    # Generar respuesta estructurada y validar con Pydantic
    text, quick_replies, fields = llm_client.generate_assistant_reply(messages_payload, db)

    if req.stream is False:
        return {
            "answer": text,
            "text": text,
            "quick_replies": quick_replies,
            "quickReplies": quick_replies,
            "fields": fields,
            "ready": True,
        }

    def event_stream():
        try:
            words = text.split(" ")
            for i, word in enumerate(words):
                token = word if i == len(words) - 1 else word + " "
                yield f"data: {json.dumps({'token': token})}\n\n"
                time.sleep(0.015)

            # Metadata payload
            metadata_payload = {
                "token": "",
                "answer": text,
                "text": text,
                "quick_replies": quick_replies,
                "quickReplies": quick_replies,
                "fields": fields,
                "ready": True,
            }
            yield f"data: {json.dumps(metadata_payload)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            err_payload = {"token": f"\n[Error en el asistente: {str(e)}]", "error": str(e), "ready": True}
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
