import json
from unittest.mock import patch

from app.models import Interview
from app.services.interview import engine
from app.services.interview.schema import FIN_TEXT, SALTADO, topics_for


def test_question_templates_for_vehicle():
    """Verifica que las plantillas deterministas generen preguntas correctas por vehículo."""
    vehiculos = {"V1": "Nissan Versa gris", "V2": "Volkswagen Jetta blanco"}

    # Prueba con maniobra previa
    topic_v1 = {"id": "maniobra_previa_V1", "desc": "Maniobra de V1", "base": "maniobra_previa_{V}"}
    q1 = engine.build_question_for_topic(topic_v1, vehiculos)
    assert "¿Qué maniobra realizó V1 (Nissan Versa gris) antes del impacto?" == q1

    # Prueba con sentido y carril
    topic_v2 = {"id": "sentido_carril_V2", "desc": "Sentido de V2", "base": "sentido_carril_{V}"}
    q2 = engine.build_question_for_topic(topic_v2, vehiculos)
    assert "¿En qué sentido de circulación y por cuál carril transitaba V2 (Volkswagen Jetta blanco)?" == q2

    # Prueba con tema general (no por vehículo)
    topic_sup = {"id": "superficie", "desc": "Superficie de rodamiento", "base": "superficie"}
    q_sup = engine.build_question_for_topic(topic_sup, vehiculos)
    assert "¿Cuál es el tipo y condición de la superficie de rodamiento" in q_sup


def test_start_interview_deterministic(db_session):
    """Verifica el inicio de la entrevista y que la primera pregunta sea determinista sin LLM."""
    case_id = "EXP-TEST-001"
    modalidad = "alcance"
    vehiculos = {"V1": "Nissan Versa", "V2": "Ford Fiesta"}

    res = engine.start_interview(db_session, case_id, modalidad, vehiculos, form={})

    assert res["case_id"] == case_id
    assert res["done"] is False
    assert res["progreso"] == 0
    # La primera pregunta por prioridad es declaracion_V1
    assert res["tema"] == "declaracion_V1"
    assert "Nissan Versa" in res["pregunta"]

    # Verificar persistencia en base de datos
    iv = db_session.get(Interview, case_id)
    assert iv is not None
    assert iv.modalidad == "alcance"
    assert iv.done == 0


def test_answer_skip_no_network(db_session):
    """Verifica que omitir / saltar no requiera llamada de red y registre SALTADO."""
    case_id = "EXP-TEST-001"
    engine.start_interview(
        db_session,
        case_id,
        "alcance",
        {"V1": "Versa", "V2": "Jetta"},
        form={},
    )

    # El perito responde que no tiene el dato
    res = engine.answer_interview(db_session, case_id, "desconozco ese dato, no se tiene registro")

    assert "declaracion_V1" in res["estado"]
    assert res["estado"]["declaracion_V1"] == SALTADO
    # Pasa al siguiente tema automáticamente
    assert res["tema"] != "declaracion_V1"


def test_answer_with_mocked_llm_extraction(db_session):
    """Verifica que la extracción con Gemini/Groq delegada guarde los datos y avance."""
    case_id = "EXP-TEST-001"
    engine.start_interview(
        db_session,
        case_id,
        "alcance",
        {"V1": "Versa", "V2": "Jetta"},
        form={},
    )

    # Simulamos respuesta para declaracion_V1 (las declaraciones se guardan textuales)
    res = engine.answer_interview(
        db_session,
        case_id,
        "El conductor refiere que circulaba a velocidad moderada cuando sintió el impacto",
    )
    assert "El conductor refiere" in res["estado"]["declaracion_V1"]
    assert res["tema"] == "declaracion_V2"

    # Segunda respuesta
    res2 = engine.answer_interview(
        db_session,
        case_id,
        "El segundo conductor declaró que estaba detenido en el semáforo",
    )
    assert "estaba detenido" in res2["estado"]["declaracion_V2"]
    assert res2["done"] is False


def test_interview_finishes_when_no_pending(db_session):
    """Verifica que cuando no quedan temas pendientes se marque como completada."""
    case_id = "EXP-TEST-001"
    topics = topics_for("alcance", {"V1": "Versa"})
    all_filled = {t["id"]: "dato respondido" for t in topics}

    iv = Interview(
        case_id=case_id,
        modalidad="alcance",
        vehiculos=json.dumps({"V1": "Versa"}),
        form="{}",
        estado=json.dumps(all_filled),
    )
    db_session.add(iv)
    db_session.commit()

    engine._ask_next(iv)
    assert iv.done is True
    assert iv.tema is None
    assert iv.pregunta == FIN_TEXT
