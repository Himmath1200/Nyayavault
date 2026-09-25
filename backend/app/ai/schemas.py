from pydantic import BaseModel, Field


class DocumentClassification(BaseModel):
    document_type: str
    confidence: float = Field(ge=0, le=1)
    classification: str


class EntityExtraction(BaseModel):
    persons: list[str] = []
    locations: list[str] = []
    organizations: list[str] = []
    dates: list[str] = []
    evidence_items: list[str] = []
    case_numbers: list[str] = []
    legal_sections: list[str] = []


class TimelineEventOut(BaseModel):
    date: str
    time: str = ""
    event: str
    source_document: str = ""
    confidence: float = Field(ge=0, le=1, default=0.75)


class TimelineExtraction(BaseModel):
    events: list[TimelineEventOut] = []


class ContradictionOut(BaseModel):
    detected: bool
    category: str = ""
    description: str = ""
    documents: list[str] = []
    severity: str = "LOW"
    requires_human_review: bool = True


class ContradictionReport(BaseModel):
    contradictions: list[ContradictionOut] = []


class CaseInsights(BaseModel):
    summary: str
    key_people: list[str] = []
    key_locations: list[str] = []
    risk_signals: list[str] = []
    disclaimer: str = (
        "AI-generated analysis for investigative support only. Does not constitute a legal "
        "conclusion. All findings require human review."
    )


class CaseAnswer(BaseModel):
    answer: str
    source_documents: list[str] = []
    confidence: float = Field(ge=0, le=1, default=0.6)
