import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.audit.service import record_event
from app.database.session import get_db
from app.models.case import Case
from app.models.enums import CaseStatus
from app.models.user import User
from app.schemas.case import CaseCreate, CaseListItem, CaseOut, CaseUpdate
from app.security.deps import get_client_meta, require_permission
from app.security.rbac import Permission
from app.services.case_service import create_case, evidence_count

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=list[CaseListItem])
def list_cases(
    status_filter: CaseStatus | None = Query(None, alias="status"),
    search: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.CASE_VIEW)),
):
    stmt = select(Case)
    if status_filter:
        stmt = stmt.where(Case.status == status_filter)
    if search:
        like = f"%{search}%"
        stmt = stmt.where(or_(Case.title.ilike(like), Case.case_number.ilike(like)))
    stmt = stmt.order_by(Case.updated_at.desc())
    cases = db.execute(stmt).scalars().all()
    results = []
    for case in cases:
        officer = db.get(User, case.lead_officer_id)
        item = CaseListItem.model_validate(case)
        item.lead_officer_name = officer.full_name if officer else ""
        item.evidence_count = evidence_count(db, case.id)
        results.append(item)
    return results


@router.post("", response_model=CaseOut, status_code=status.HTTP_201_CREATED)
def create_case_endpoint(
    payload: CaseCreate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.CASE_CREATE)),
):
    case = create_case(
        db, user, payload.title, payload.category, payload.jurisdiction, payload.description, payload.priority, get_client_meta(request)
    )
    return case


@router.get("/{case_id}", response_model=CaseOut)
def get_case(case_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.CASE_VIEW))):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    return case


@router.put("/{case_id}", response_model=CaseOut)
def update_case(
    case_id: uuid.UUID,
    payload: CaseUpdate,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.CASE_UPDATE)),
):
    case = db.get(Case, case_id)
    if not case:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Case not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(case, field, value)
    db.commit()
    db.refresh(case)
    record_event(db, "CASE_UPDATED", actor=user, case_id=case.id, metadata=payload.model_dump(exclude_unset=True), **get_client_meta(request))
    return case
