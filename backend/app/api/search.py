"""Global search — powers the top bar's search box, which spans cases, documents,
evidence, and (for roles that manage them) users. Each entity type is only searched if the
current user's role actually holds the matching *_VIEW/MANAGE permission, mirroring how the
dedicated list endpoints for each of those entities already gate access."""

from typing import Literal

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.case import Case
from app.models.document import Document
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.security.deps import get_current_user
from app.security.rbac import Permission, has_permission

router = APIRouter(prefix="/api/search", tags=["search"])

RESULT_LIMIT_PER_TYPE = 6


class SearchResult(BaseModel):
    type: Literal["case", "document", "evidence", "user"]
    id: str
    title: str
    subtitle: str
    case_id: str | None = None


@router.get("", response_model=list[SearchResult])
def global_search(
    q: str = Query(..., min_length=2),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[SearchResult]:
    like = f"%{q}%"
    results: list[SearchResult] = []

    if has_permission(user.role, Permission.CASE_VIEW):
        cases = db.execute(
            select(Case).where(or_(Case.title.ilike(like), Case.case_number.ilike(like))).limit(RESULT_LIMIT_PER_TYPE)
        ).scalars().all()
        results += [
            SearchResult(type="case", id=str(c.id), title=c.title, subtitle=c.case_number, case_id=str(c.id))
            for c in cases
        ]

    if has_permission(user.role, Permission.DOCUMENT_VIEW):
        docs = db.execute(
            select(Document)
            .where(or_(Document.name.ilike(like), Document.document_number.ilike(like)))
            .limit(RESULT_LIMIT_PER_TYPE)
        ).scalars().all()
        results += [
            SearchResult(type="document", id=str(d.id), title=d.name, subtitle=d.document_number, case_id=str(d.case_id))
            for d in docs
        ]

    if has_permission(user.role, Permission.EVIDENCE_VIEW):
        evidence = db.execute(
            select(EvidenceItem).where(EvidenceItem.evidence_number.ilike(like)).limit(RESULT_LIMIT_PER_TYPE)
        ).scalars().all()
        results += [
            SearchResult(type="evidence", id=str(e.id), title=e.evidence_number, subtitle="Evidence item", case_id=str(e.case_id))
            for e in evidence
        ]

    if has_permission(user.role, Permission.USER_MANAGE):
        users = db.execute(
            select(User)
            .where(or_(User.full_name.ilike(like), User.email.ilike(like), User.badge_id.ilike(like)))
            .limit(RESULT_LIMIT_PER_TYPE)
        ).scalars().all()
        results += [
            SearchResult(type="user", id=str(u.id), title=u.full_name, subtitle=f"{u.email} · {u.role.value.replace('_', ' ').title()}")
            for u in users
        ]

    return results
