import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.custody.service import get_custody_chain
from app.database.session import get_db
from app.models.evidence import EvidenceItem
from app.models.user import User
from app.schemas.evidence import CustodyEventOut, EvidenceOut, EvidenceTransferRequest
from app.security.deps import get_client_meta, require_permission
from app.security.rbac import Permission
from app.services.evidence_service import transfer_evidence

router = APIRouter(prefix="/api/evidence", tags=["evidence"])


@router.get("", response_model=list[EvidenceOut])
def list_evidence(
    case_id: uuid.UUID | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.EVIDENCE_VIEW)),
):
    stmt = select(EvidenceItem)
    if case_id:
        stmt = stmt.where(EvidenceItem.case_id == case_id)
    return db.execute(stmt.order_by(EvidenceItem.created_at.desc())).scalars().all()


@router.get("/{evidence_id}", response_model=EvidenceOut)
def get_evidence(evidence_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.EVIDENCE_VIEW))):
    evidence = db.get(EvidenceItem, evidence_id)
    if not evidence:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    return evidence


@router.get("/{evidence_id}/custody", response_model=list[CustodyEventOut])
def custody_chain(evidence_id: uuid.UUID, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.CUSTODY_VIEW))):
    return get_custody_chain(db, evidence_id)


@router.post("/{evidence_id}/transfer", response_model=EvidenceOut)
def transfer(
    evidence_id: uuid.UUID,
    payload: EvidenceTransferRequest,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_permission(Permission.EVIDENCE_TRANSFER)),
):
    evidence = db.get(EvidenceItem, evidence_id)
    if not evidence:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Evidence not found")
    return transfer_evidence(db, evidence, user, payload.to_custody_status, payload.location, payload.reason, get_client_meta(request))
