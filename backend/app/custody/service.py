import hashlib
import json
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.evidence import EvidenceCustodyEvent, EvidenceItem
from app.models.user import User


def _hash_custody_event(previous_hash: str, actor_id: str, action: str, document_hash: str, location: str, reason: str) -> str:
    canonical = json.dumps(
        {
            "previous_hash": previous_hash,
            "actor_id": actor_id,
            "action": action,
            "document_hash": document_hash,
            "location": location,
            "reason": reason,
        },
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def add_custody_event(
    db: Session,
    evidence: EvidenceItem,
    actor: User,
    action: str,
    location: str = "",
    reason: str = "",
    commit: bool = True,
) -> EvidenceCustodyEvent:
    last = db.execute(
        select(EvidenceCustodyEvent)
        .where(EvidenceCustodyEvent.evidence_id == evidence.id)
        .order_by(EvidenceCustodyEvent.created_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    previous_hash = last.current_event_hash if last else "GENESIS"
    current_hash = _hash_custody_event(previous_hash, str(actor.id), action, evidence.sha256_hash, location, reason)

    event = EvidenceCustodyEvent(
        evidence_id=evidence.id,
        actor_id=actor.id,
        actor_role=actor.role.value,
        action=action,
        location=location,
        reason=reason,
        document_hash=evidence.sha256_hash,
        previous_event_hash=previous_hash,
        current_event_hash=current_hash,
    )
    db.add(event)
    if commit:
        db.commit()
        db.refresh(event)
    else:
        db.flush()
    return event


def get_custody_chain(db: Session, evidence_id: uuid.UUID) -> list[EvidenceCustodyEvent]:
    return db.execute(
        select(EvidenceCustodyEvent)
        .where(EvidenceCustodyEvent.evidence_id == evidence_id)
        .order_by(EvidenceCustodyEvent.created_at.asc())
    ).scalars().all()
