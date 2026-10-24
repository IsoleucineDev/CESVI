import os
import uuid
from typing import List
import pymupdf as fitz
from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.exceptions import AppException
from app.models import Case, Document, DocumentPage
from app.schemas import CaseCreate, CaseUpdate, CaseOut, DocumentOut

router = APIRouter(prefix="/cases", tags=["cases"])


@router.get("", response_model=List[CaseOut])
def get_cases(db: Session = Depends(get_db)):
    return db.query(Case).order_by(Case.created_at.desc()).all()


@router.post("", response_model=CaseOut, status_code=201)
def create_case(case_in: CaseCreate, db: Session = Depends(get_db)):
    case_id = case_in.id or f"EXP-{uuid.uuid4().hex[:6].upper()}"
    existing = db.query(Case).filter(Case.id == case_id).first()
    if existing:
        raise AppException(
            status_code=400,
            code="CASE_ALREADY_EXISTS",
            message=f"Ya existe un caso con el identificador '{case_id}'."
        )

    new_case = Case(
        id=case_id,
        title=case_in.title,
        description=case_in.description,
        location=case_in.location,
    )
    db.add(new_case)
    db.commit()
    db.refresh(new_case)
    return new_case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: str, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise AppException(
            status_code=404,
            code="CASE_NOT_FOUND",
            message="El caso especificado no fue encontrado."
        )
    return case


@router.patch("/{case_id}", response_model=CaseOut)
def update_case(case_id: str, case_in: CaseUpdate, db: Session = Depends(get_db)):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise AppException(
            status_code=404,
            code="CASE_NOT_FOUND",
            message="El caso especificado no fue encontrado."
        )

    update_data = case_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(case, field, value)

    db.commit()
    db.refresh(case)
    return case


@router.post("/{case_id}/documents", response_model=DocumentOut, status_code=201)
async def upload_document(
    case_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    case = db.query(Case).filter(Case.id == case_id).first()
    if not case:
        raise AppException(
            status_code=404,
            code="CASE_NOT_FOUND",
            message="El caso especificado no fue encontrado."
        )

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise AppException(
            status_code=400,
            code="INVALID_FILE_TYPE",
            message="Solo se permiten archivos en formato PDF."
        )

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    doc_id = str(uuid.uuid4())
    stored_filename = f"{doc_id}_{file.filename}"
    file_path = os.path.join(settings.UPLOAD_DIR, stored_filename)

    file_bytes = await file.read()
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    try:
        pdf = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        if os.path.exists(file_path):
            os.remove(file_path)
        raise AppException(
            status_code=400,
            code="CORRUPTED_PDF",
            message="El archivo PDF proporcionado está dañado o no se pudo abrir."
        )

    page_count = len(pdf)
    db_document = Document(
        id=doc_id,
        case_id=case_id,
        filename=file.filename,
        file_path=file_path,
        page_count=page_count,
    )
    db.add(db_document)

    for i in range(page_count):
        page_text = pdf[i].get_text()
        db_page = DocumentPage(
            document_id=doc_id,
            page_number=i + 1,
            text=page_text or "",
        )
        db.add(db_page)

    pdf.close()
    db.commit()
    db.refresh(db_document)
    return db_document
