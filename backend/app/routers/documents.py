import json
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.exceptions import AppException
from app.models import Document, Extraction
from app.schemas import DocumentTextOut, ExtractionResult, ExtractedField
from app.services.llm import llm_client, clip_document_text

router = APIRouter(prefix="/documents", tags=["documents"])

TARGET_FIELDS = [
    "fecha_siniestro",
    "hora_siniestro",
    "lugar_siniestro",
    "tipo_colision",
    "vehiculo_1",
    "vehiculo_2",
    "velocidad_v1",
    "velocidad_v2",
    "punto_impacto",
    "responsabilidad_aparente",
]


@router.get("/{document_id}/text", response_model=DocumentTextOut)
def get_document_text(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message="El documento especificado no fue encontrado."
        )

    return doc


@router.post("/{document_id}/extract", response_model=ExtractionResult)
def extract_document_fields(document_id: str, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise AppException(
            status_code=404,
            code="DOCUMENT_NOT_FOUND",
            message="El documento especificado no fue encontrado."
        )

    # Revisar si ya existe extracción previa guardada en BD
    existing_extraction = (
        db.query(Extraction)
        .filter(Extraction.document_id == document_id)
        .order_by(Extraction.created_at.desc())
        .first()
    )
    if existing_extraction:
        try:
            parsed = json.loads(existing_extraction.data)
            return ExtractionResult(
                document_id=document_id,
                fields={k: ExtractedField(**v) for k, v in parsed.items()},
                created_at=existing_extraction.created_at,
            )
        except Exception:
            pass

    clipped_context = clip_document_text(doc.pages)

    prompt = (
        "Extrae del siguiente dictamen los siguientes campos estrictamente en formato JSON:\n"
        f"{', '.join(TARGET_FIELDS)}.\n\n"
        "Reglas obligatorias:\n"
        "1. Cada campo debe ser un objeto con: {'value': string o null, 'quote': string o null, 'page': entero o null}.\n"
        "2. 'quote' DEBE ser una cita TEXTUAL Y EXACTA (copiada literalmente) del fragmento del dictamen.\n"
        "3. Si un dato no consta expresamente en el texto, asigna value: null, quote: null, page: null. NO inventes ni deduzcas nada.\n"
        "Ejemplo de formato:\n"
        '{\n'
        '  "lugar_siniestro": {"value": "Av. Insurgentes Sur 1200", "quote": "ocurrido en Av. Insurgentes Sur 1200", "page": 1},\n'
        '  "velocidad_v1": {"value": null, "quote": null, "page": null}\n'
        '}'
    )

    raw_json = llm_client.generate_json(prompt, clipped_context, db)
    try:
        data = json.loads(raw_json)
    except Exception:
        data = {}

    page_text_map = {page.page_number: page.text for page in doc.pages}
    all_text = " ".join(page_text_map.values())

    validated_fields = {}
    for field in TARGET_FIELDS:
        field_info = data.get(field, {})
        if not isinstance(field_info, dict):
            validated_fields[field] = ExtractedField(value=None, quote=None, page=None, status="no_consta")
            continue

        val = field_info.get("value")
        quote = field_info.get("quote")
        page_num = field_info.get("page")

        if not val or not quote:
            validated_fields[field] = ExtractedField(value=None, quote=None, page=None, status="no_consta")
            continue

        quote_clean = str(quote).strip()
        target_page_text = page_text_map.get(page_num, "") if page_num else all_text

        # Validación por código: si la cita no existe literalmente en el texto, se descarta el campo
        if quote_clean and (quote_clean in target_page_text or quote_clean in all_text):
            validated_fields[field] = ExtractedField(
                value=str(val).strip(),
                quote=quote_clean,
                page=int(page_num) if page_num else None,
                status="consta",
            )
        else:
            validated_fields[field] = ExtractedField(value=None, quote=None, page=None, status="no_consta")

    now = datetime.now(timezone.utc)
    extraction_record = Extraction(
        document_id=document_id,
        data=json.dumps({k: v.model_dump() for k, v in validated_fields.items()}),
        created_at=now,
    )
    db.add(extraction_record)
    db.commit()

    return ExtractionResult(
        document_id=document_id,
        fields=validated_fields,
        created_at=now,
    )
