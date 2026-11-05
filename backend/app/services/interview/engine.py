"""Motor de la entrevista al perito (chat que ayuda a generar el reporte).

El CÓDIGO (chat_core + schema + facts_utils) lleva el checklist y verifica;
la selección y redacción de preguntas es DETERMINISTA (plantillas por vehículo);
y la extracción de datos se delega a los proveedores Gemini/Groq configurados en llm_client.
Todo el estado vive en la tabla `interviews`, así sobrevive a reinicios del backend.
"""
import json
import re
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.exceptions import AppException
from app.models import Case, Interview
from app.services.llm import llm_client

from .chat_core import process_answer
from .schema import FIN_TEXT, MODALIDADES, topics_for

# ------------------------------------------------------------------ Plantillas deterministas
QUESTION_TEMPLATES: Dict[str, str] = {
    # --- Generales ---
    "declaracion_{V}": "¿Cuál es la declaración del conductor de {vehículo} sobre cómo ocurrió el hecho?",
    "superficie": "¿Cuál es el tipo y condición de la superficie de rodamiento (ej. asfalto seco, concreto mojado)?",
    "iluminacion": "¿Cuáles eran las condiciones de iluminación y visibilidad al momento del hecho (día, noche, alumbrado, lluvia, niebla)?",
    "sentido_carril_{V}": "¿En qué sentido de circulación y por cuál carril transitaba {vehículo}?",
    "velocidad_{V}_kmh": "¿Cuál es la velocidad estimada de {vehículo} antes del evento (en km/h)?",
    "maniobra_previa_{V}": "¿Qué maniobra realizó {vehículo} antes del impacto (ej. frenado, giro, cambio de carril, detenido)?",

    # --- Específicos por modalidad ---
    "distancia_previa": "¿Cuál era la distancia o tiempo de separación entre los vehículos antes de la frenada o evento?",
    "senalizacion_preferencia": "¿Qué señalización vial existía en el lugar (semáforo, señal de alto, ceda el paso) o quién tenía preferencia de paso?",
    "tipo_objeto": "¿Qué tipo de objeto fue impactado, de qué material es y cuál es su altura aproximada?",
    "causa_perdida_control": "¿Cuál fue la causa de la pérdida de control (derrape, reventón, esquivar, distracción)?",
    "maniobra_reversa": "¿Cuál fue la dirección y tramo recorrido en maniobra de reversa, y qué visibilidad tenía el conductor?",
    "vueltas_volcadura": "¿Cuántas vueltas dio el vehículo y en qué sentido ocurrió la volcadura?",

    # --- Hechos e impacto ---
    "secuencia_eventos": "¿Cuál fue la secuencia y orden de los impactos (primer contacto e impactos secundarios)?",
    "punto_impacto_via": "¿En qué punto exacto de la vía ocurrió el impacto (calle, carril, intersección o referencia)?",
    "angulo_impacto": "¿Cuál fue el ángulo aproximado entre los vehículos al momento del impacto?",
    "altura_marca_objeto_cm": "¿Cuál es la altura (en cm) de las marcas del impacto en el objeto fijo?",
    "evidencias_sitio": "¿Qué evidencias o indicios se encontraron en el sitio (restos, fragmentos, marcas, pintura)?",
    "huellas_frenado_m": "¿Cuál es la longitud (en metros) de las huellas de frenado o derrape, si existen?",
    "airbags_{V}": "¿Qué bolsas de aire de {vehículo} se activaron tras la colisión?",

    # --- Datos de formulario / croquis ---
    "danos_{V}": "¿Qué zonas de daños presenta {vehículo}, cuál fue la dirección de la fuerza de impacto y su magnitud?",
    "posicion_final_{V}": "¿Dónde y en qué orientación quedó la posición final de detención de {vehículo}?",
}


def build_question_for_topic(topic: Dict[str, Any], vehiculos: Dict[str, Any]) -> str:
    """Genera la pregunta de forma determinista a partir del tema y las plantillas."""
    topic_id = topic["id"]
    topic_desc = topic.get("desc", topic_id)
    base_id = topic.get("base") or re.sub(r"V[1-3]", "{V}", topic_id)

    # Identificar vehículo si el tema es por vehículo
    m = re.search(r"_(V[1-3])(?:_|$)", topic_id)
    vid = m.group(1) if m else "V1"
    vname = vehiculos.get(vid)
    veh_label = f"{vid} ({vname})" if vname and vname != vid else (vname or f"vehículo {vid}")

    template = QUESTION_TEMPLATES.get(base_id)
    if template:
        return template.replace("{vehículo}", veh_label).replace("{V}", vid)
    return f"¿Podrías indicar la información correspondiente a {topic_desc}?"


def run_extraction(system: str, user: str, max_tokens: int = 500, db: Optional[Session] = None) -> str:
    """Delega la extracción al cliente Gemini/Groq configurado en llm.py."""
    return llm_client.extract_interview_data(system=system, user=user, max_tokens=max_tokens, db=db)


# Alias por compatibilidad
run_llm = run_extraction


def _j(s: Optional[str]) -> Dict[str, Any]:
    return json.loads(s) if s else {}


def _dump(d: Dict[str, Any]) -> str:
    return json.dumps(d, ensure_ascii=False)


def _pending(iv: Interview):
    estado, form = _j(iv.estado), _j(iv.form)
    topics = topics_for(iv.modalidad, _j(iv.vehiculos))
    return topics, [t for t in topics if t["id"] not in estado and t["id"] not in form]


def _ask_next(iv: Interview):
    """Decide la siguiente pregunta de forma determinista usando el orden de temas y plantillas."""
    topics, pend = _pending(iv)
    if not pend:
        iv.done, iv.tema, iv.pregunta = True, None, FIN_TEXT
    else:
        next_topic = pend[0]
        tema = next_topic["id"]
        pregunta = build_question_for_topic(next_topic, _j(iv.vehiculos))
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

    def extract_fn(system: str, user: str, max_tokens: int = 500) -> str:
        return run_extraction(system, user, max_tokens=max_tokens, db=db)

    msgs = process_answer(estado, iv.tema, iv.pregunta, resp, pend, iv.modalidad, _j(iv.vehiculos), extract_fn)
    iv.estado = _dump(estado)
    iv.last_q, iv.last_a = iv.pregunta, resp
    topics, pend = _ask_next(iv)
    db.commit()
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
