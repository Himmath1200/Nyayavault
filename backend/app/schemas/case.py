import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import CasePriority, CaseStatus
from app.schemas.common import ORMModel


class CaseCreate(BaseModel):
    title: str
    category: str
    jurisdiction: str
    description: str = ""
    priority: CasePriority = CasePriority.MEDIUM


class CaseUpdate(BaseModel):
    title: str | None = None
    status: CaseStatus | None = None
    priority: CasePriority | None = None
    description: str | None = None


class CaseOut(ORMModel):
    id: uuid.UUID
    case_number: str
    title: str
    category: str
    jurisdiction: str
    description: str
    status: CaseStatus
    priority: CasePriority
    lead_officer_id: uuid.UUID
    security_flagged: bool
    created_at: datetime
    updated_at: datetime


class CaseListItem(CaseOut):
    lead_officer_name: str = ""
    evidence_count: int = 0
