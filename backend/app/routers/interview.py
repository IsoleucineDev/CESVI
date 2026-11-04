from typing import Any, Dict

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.interview import engine
from app.services.interview.schema import MODALIDADES

router = APIRouter(prefix="/interview", tags=["interview"])


class StartIn(BaseModel):
    case_id: str
    modalidad: str
    vehiculos: Dict[str, Any] = Field(default_factory=dict)  # {"V1": "Nissan Versa gris", "V2": "..."}
    form: Dict[str, Any] = Field(default_factory=dict)       # datos ya conocidos (no se vuelven a preguntar)


class AnswerIn(BaseModel):
    case_id: str
    respuesta: str


# Son `def` (no `async def`) a propósito: llaman al modelo con httpx síncrono y FastAPI las corre en un hilo,
# así no bloquean el resto del servidor.

@router.get("/modalidades")
def modalidades():
    return {k: v for k, v in MODALIDADES.items() if k != "otro"}


@router.post("/start")
def start(body: StartIn, db: Session = Depends(get_db)):
    return engine.start_interview(db, body.case_id, body.modalidad, body.vehiculos, body.form)


@router.post("/answer")
def answer(body: AnswerIn, db: Session = Depends(get_db)):
    return engine.answer_interview(db, body.case_id, body.respuesta)


@router.get("/{case_id}")
def get_state(case_id: str, db: Session = Depends(get_db)):
    return engine.get_interview(db, case_id)
