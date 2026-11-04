"""Motor de la entrevista al perito (chat que ayuda a generar el reporte).

El CÓDIGO (chat_core + schema + facts_utils, de la compañera) lleva el checklist y verifica;
el MODELO (Qwen2.5-3B + adapter LoRA, servido con mlx_lm.server) redacta preguntas y propone datos.
Todo el estado vive en la tabla `interviews`, así sobrevive a reinicios del backend.
"""
import json
from typing import Any, Dict, Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.exceptions import AppException
from app.models import Case, Interview

from .chat_core import process_answer
from .schema import FIN_TEXT, MODALIDADES, SYSTEM_Q, build_q_user, parse_q, topics_for


def run_llm(system: str, user: str, max_tokens: int = 200) -> str:
    """Llama a un servidor compatible con OpenAI (mlx_lm.server, Ollama...). Temperatura 0 = igual que en las pruebas."""
    try:
        r = httpx.post(
            f"{settings.INTERVIEW_BASE_URL.rstrip('/')}/chat/completions",
            json={
                "model": settings.INTERVIEW_MODEL,
                "max_tokens": max_tokens,
                "temperature": 0.0,
                "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
            },
            headers={"Authorization": f"Bearer {settings.INTERVIEW_API_KEY}"},
            timeout=settings.INTERVIEW_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
    except (httpx.HTTPError, KeyError, IndexError, ValueError):
        raise AppException(
            status_code=503,
            code="INTERVIEW_LLM_UNAVAILABLE",
            message="El modelo de la entrevista no responde. Verifica que el servidor del modelo esté encendido.",
        )


def _j(s: Optional[str]) -> Dict[str, Any]:
    return json.loads(s) if s else {}


def _dump(d: Dict[str, Any]) -> str:
    return json.dumps(d, ensure_ascii=False)


def _pending(iv: Interview):
    estado, form = _j(iv.estado), _j(iv.form)
    topics = topics_for(iv.modalidad, _j(iv.vehiculos))
    return topics, [t for t in topics if t["id"] not in estado and t["id"] not in form]


def _ask_next(iv: Interview):
    """Decide la siguiente pregunta (o marca el fin) y la deja guardada en `iv`."""
    topics, pend = _pending(iv)
    if not pend:
        iv.done, iv.tema, iv.pregunta = True, None, FIN_TEXT
    else:
        last = (iv.last_q, iv.last_a) if iv.last_q is not None else None
        raw = run_llm(SYSTEM_Q, build_q_user(iv.modalidad, _j(iv.vehiculos), _j(iv.form),
                                             _j(iv.estado), pend, last))
        tema, pregunta = parse_q(raw)
        if tema not in {t["id"] for t in pend}:  # el código manda: si el modelo se sale de la lista, se corrige
            tema = pend[0]["id"]
        iv.done, iv.tema, iv.pregunta = False, tema, pregunta
    return topics, pend


def _public(iv: Interview, topics, pend, mensajes=None) -> Dict[str, Any]:
    total = len(topics)
    out = {
        "case_id": iv.case_id,
        "done": bool(iv.done),
        "tema": iv.tema,
        "pregunta": iv.pregunta,
        "answer": iv.pregunta,  # mismo nombre que usa /ai/chat, para reutilizar el chat del frontend
        "progreso": int(100 * (total - len(pend)) / total) if total else 100,
        "estado": _j(iv.estado),
    }
    if mensajes is not None:
        out["mensajes"] = mensajes  # lo que entendió el sistema de la respuesta anterior
    return out


def start_interview(db: Session, case_id: str, modalidad: str, vehiculos: Dict[str, Any], form: Dict[str, Any]):
    if not db.get(Case, case_id):
        raise AppException(status_code=404, code="CASE_NOT_FOUND", message="El caso especificado no fue encontrado.")
    if modalidad not in MODALIDADES or modalidad == "otro":
        validas = [m for m in MODALIDADES if m != "otro"]
        raise AppException(status_code=422, code="INVALID_MODALIDAD",
                           message=f"Modalidad inválida. Usa una de: {', '.join(validas)}.")
    # Se renombran a V1..V3 en orden (el catálogo de temas depende de esos ids)
    vals = [str(v) for v in (vehiculos or {}).values()][:3] or ["vehículo 1"]
    vehs = {f"V{i}": v for i, v in enumerate(vals, 1)}

    iv = db.get(Interview, case_id)
    if iv is None:
        iv = Interview(case_id=case_id)
        db.add(iv)
    iv.modalidad, iv.vehiculos, iv.form = modalidad, _dump(vehs), _dump(form or {})
    iv.estado, iv.last_q, iv.last_a = "{}", None, None
    topics, pend = _ask_next(iv)
    db.commit()
    return _public(iv, topics, pend)


def answer_interview(db: Session, case_id: str, respuesta: str):
    iv = db.get(Interview, case_id)
    if iv is None:
        raise AppException(status_code=404, code="INTERVIEW_NOT_FOUND",
                           message="Este caso no tiene una entrevista iniciada.")
    if iv.done:
        raise AppException(status_code=409, code="INTERVIEW_DONE", message="La entrevista ya terminó.")
    resp = (respuesta or "").strip()
    if not resp:
        raise AppException(status_code=422, code="EMPTY_ANSWER", message="La respuesta está vacía.")

    estado = _j(iv.estado)
    _, pend = _pending(iv)
    msgs = process_answer(estado, iv.tema, iv.pregunta, resp, pend, iv.modalidad, _j(iv.vehiculos), run_llm)
    iv.estado = _dump(estado)
    iv.last_q, iv.last_a = iv.pregunta, resp
    topics, pend = _ask_next(iv)
    db.commit()  # si el modelo falla antes de este punto no se guarda nada y el perito puede reintentar
    return _public(iv, topics, pend, msgs)


def get_interview(db: Session, case_id: str):
    iv = db.get(Interview, case_id)
    if iv is None:
        raise AppException(status_code=404, code="INTERVIEW_NOT_FOUND",
                           message="Este caso no tiene una entrevista iniciada.")
    topics, pend = _pending(iv)
    out = _public(iv, topics, pend)
    out.update(modalidad=iv.modalidad, vehiculos=_j(iv.vehiculos))
    return out
