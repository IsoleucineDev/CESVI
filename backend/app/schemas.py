from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ErrorResponse(BaseModel):
    code: str
    message: str


class CaseBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None


class CaseCreate(CaseBase):
    id: Optional[str] = None


class CaseUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    location: Optional[str] = None
    status: Optional[str] = None


class CaseOut(CaseBase):
    id: str
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentOut(BaseModel):
    id: str
    case_id: str
    filename: str
    page_count: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DocumentPageOut(BaseModel):
    page_number: int
    text: str

    model_config = ConfigDict(from_attributes=True)


class DocumentTextOut(BaseModel):
    id: str
    case_id: str
    filename: str
    page_count: int
    pages: List[DocumentPageOut]

    model_config = ConfigDict(from_attributes=True)


class ExtractedField(BaseModel):
    value: Optional[str] = None
    quote: Optional[str] = None
    page: Optional[int] = None
    status: str = "no_consta"


class ExtractionResult(BaseModel):
    document_id: str
    fields: dict[str, ExtractedField]
    created_at: datetime

