import uuid

from pydantic import BaseModel

from app.ai.schemas import CaseAnswer, CaseInsights, ContradictionReport, DocumentClassification, EntityExtraction, TimelineExtraction


class AnalyzeDocumentRequest(BaseModel):
    document_id: uuid.UUID


class AnalyzeDocumentResponse(BaseModel):
    classification: DocumentClassification
    entities: EntityExtraction
    summary: str
    is_live_ai: bool


class TimelineRequest(BaseModel):
    case_id: uuid.UUID


class ContradictionsRequest(BaseModel):
    case_id: uuid.UUID


class CaseInsightsRequest(BaseModel):
    case_id: uuid.UUID


class AskRequest(BaseModel):
    case_id: uuid.UUID
    question: str
