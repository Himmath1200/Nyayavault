import uuid
from datetime import datetime

from pydantic import BaseModel

from app.models.enums import AccessAction, AccessPurpose, AccessRequestStatus
from app.schemas.common import ORMModel


class AccessRequestCreate(BaseModel):
    document_id: uuid.UUID
    purpose: AccessPurpose
    action: AccessAction
    justification: str = ""


class AccessRequestOut(ORMModel):
    id: uuid.UUID
    document_id: uuid.UUID
    requested_by: uuid.UUID
    purpose: AccessPurpose
    action: AccessAction
    justification: str
    status: AccessRequestStatus
    decided_by: uuid.UUID | None
    decided_at: datetime | None
    decision_note: str
    created_at: datetime


class AccessRequestDecision(BaseModel):
    approve: bool
    note: str = ""


class AccessDecisionCheck(BaseModel):
    label: str
    passed: bool
    detail: str = ""


class AccessDecisionOut(BaseModel):
    granted: bool
    checks: list[AccessDecisionCheck]
    reasons: list[str]
