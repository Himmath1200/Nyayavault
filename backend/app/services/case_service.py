import random
import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.models.case import Case, CaseMember
from app.models.enums import CasePriority
from app.models.evidence import EvidenceItem
from app.models.user import User


def generate_case_number() -> str:
    year = datetime.now(timezone.utc).year
    return f"CASE-{year}-{random.randint(10000, 99999)}"


def create_case(db: Session, user: User, title: str, category: str, jurisdiction: str, description: str, priority: CasePriority, client_meta: dict) -> Case:
    case = Case(
        case_number=generate_case_number(),
        title=title,
        category=category,
        jurisdiction=jurisdiction,
        description=description,
        priority=priority,
        lead_officer_id=user.id,
    )
    db.add(case)
    db.flush()
    db.add(CaseMember(case_id=case.id, user_id=user.id, role_on_case="LEAD"))
    db.commit()
    db.refresh(case)
    record_event(db, "CASE_CREATED", actor=user, case_id=case.id, metadata={"title": title}, **client_meta)
    return case


def evidence_count(db: Session, case_id: uuid.UUID) -> int:
    return db.execute(select(func.count()).select_from(EvidenceItem).where(EvidenceItem.case_id == case_id)).scalar_one()
