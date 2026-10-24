import io
import json
import pymupdf as fitz
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.models import LLMCache, LLMLog
from app.main import app
from app.services.llm import llm_client

TEST_DATABASE_URL = "sqlite://"
engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_health_and_cases_crud(client):
    h_res = client.get("/api/v1/health")
    assert h_res.status_code == 200
    assert h_res.json() == {"status": "ok"}

    case_payload = {
        "id": "EXP-TEST-001",
        "title": "Colisión Reforma y Juárez",
        "description": "Impacto por alcance entre sedán y camión",
        "location": "Av. Juárez esq. Paseo de la Reforma"
    }
    create_res = client.post("/api/v1/cases", json=case_payload)
    assert create_res.status_code == 201
    assert create_res.json()["title"] == "Colisión Reforma y Juárez"

    get_res = client.get("/api/v1/cases/EXP-TEST-001")
    assert get_res.status_code == 200

    patch_res = client.patch("/api/v1/cases/EXP-TEST-001", json={"status": "closed"})
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "closed"


def test_error_format_mexican_spanish(client):
    response = client.get("/api/v1/cases/EXP-INEXISTENTE-999")
    assert response.status_code == 404
    data = response.json()
    assert data["code"] == "CASE_NOT_FOUND"
    assert "no fue encontrado" in data["message"]


def test_pdf_document_upload_and_text(client):
    client.post("/api/v1/cases", json={"id": "EXP-PDF-1", "title": "Caso de Prueba PDF"})

    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 100), "Dictamen técnico pericial. Vehículo 01 circulaba a 60 km/h.")
    pdf_bytes = doc.tobytes()
    doc.close()

    files = {"file": ("dictamen_test.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/cases/EXP-PDF-1/documents", files=files)
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    text_res = client.get(f"/api/v1/documents/{doc_id}/text")
    assert text_res.status_code == 200
    assert "Vehículo 01 circulaba a 60 km/h" in text_res.json()["pages"][0]["text"]


def test_extract_validation_and_token_logging(client, monkeypatch):
    client.post("/api/v1/cases", json={"id": "EXP-EXTRACT-1", "title": "Caso Extracción"})

    doc = fitz.open()
    p1 = doc.new_page()
    p1.insert_text((50, 100), "Punto de impacto sobre el carril derecho. Nissan Versa color gris.")
    pdf_bytes = doc.tobytes()
    doc.close()

    files = {"file": ("dictamen.pdf", io.BytesIO(pdf_bytes), "application/pdf")}
    upload_res = client.post("/api/v1/cases/EXP-EXTRACT-1/documents", files=files)
    doc_id = upload_res.json()["id"]

    # Simular respuesta LLM con una cita literal válida y una cita inventada
    simulated_json = json.dumps({
        "punto_impacto": {
            "value": "carril derecho",
            "quote": "Punto de impacto sobre el carril derecho",
            "page": 1
        },
        "velocidad_v1": {
            "value": "90 km/h",
            "quote": "Velocidad calculada en 90 km/h",  # Inventada -> debe descartarse
            "page": 1
        }
    })

    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_test")
    monkeypatch.setattr(llm_client, "_call_groq", lambda p, c: (simulated_json, 150, 60))

    extract_res = client.post(f"/api/v1/documents/{doc_id}/extract")
    assert extract_res.status_code == 200
    fields = extract_res.json()["fields"]

    assert fields["punto_impacto"]["status"] == "consta"
    assert fields["punto_impacto"]["value"] == "carril derecho"

    # La cita inventada se descartó por código a no_consta
    assert fields["velocidad_v1"]["status"] == "no_consta"
    assert fields["velocidad_v1"]["value"] is None

    # Verificar registro en tabla llm_logs
    db = TestingSessionLocal()
    log = db.query(LLMLog).first()
    assert log is not None
    assert log.provider == "groq"
    assert log.tokens_in == 150
    db.close()


def test_assistant_chat_streaming(client, monkeypatch):
    client.post("/api/v1/cases", json={"id": "EXP-CHAT-1", "title": "Caso Asistente"})

    # Simular generador streaming del LLM
    def mock_stream(messages, db):
        yield "El "
        yield "punto "
        yield "de impacto fue el carril derecho. "
        yield "La velocidad no consta en el dictamen."

    monkeypatch.setattr(settings, "GROQ_API_KEY", "gsk_test")
    monkeypatch.setattr(llm_client, "stream_chat", mock_stream)

    chat_payload = {
        "case_id": "EXP-CHAT-1",
        "message": "¿A qué velocidad circulaba el vehículo?",
    }
    res = client.post("/api/v1/assistant/chat", json=chat_payload)
    assert res.status_code == 200
    assert "text/event-stream" in res.headers["content-type"]

    body = res.text
    assert "data: " in body
    assert "no consta en el dictamen" in body
    assert "[DONE]" in body
