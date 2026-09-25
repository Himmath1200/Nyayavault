"""Append-only, hash-chained audit ledger.

Each event's current_event_hash = SHA-256(previous_event_hash + canonical
payload). No API route exposes update or delete for AuditEvent, so the only
way to break the chain is direct DB tampering — which INTEGRITY_VERIFIED /
chain-walk checks (see verify_chain) will detect.
"""

import hashlib
import json
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.audit import AuditEvent
from app.models.user import User


def _hash_event(previous_hash: str, timestamp_iso: str, actor_id: str | None, action: str, metadata: dict) -> str:
    """Hashes the exact canonical timestamp STRING stored alongside the event, never a
    DateTime re-derived from the DB — datetime round-tripping through a column (especially
    on SQLite, which has no native timezone-aware type) can silently change precision or
    drop tzinfo, which would make the chain fail to verify for reasons unrelated to tampering."""
    canonical = json.dumps(
        {
            "previous_hash": previous_hash,
            "timestamp": timestamp_iso,
            "actor_id": actor_id,
            "action": action,
            "metadata": metadata,
        },
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _get_last_event(db: Session) -> AuditEvent | None:
    return db.execute(select(AuditEvent).order_by(AuditEvent.timestamp.desc(), AuditEvent.id.desc()).limit(1)).scalar_one_or_none()


def record_event(
    db: Session,
    action: str,
    actor: User | None = None,
    case_id: uuid.UUID | None = None,
    document_id: uuid.UUID | None = None,
    metadata: dict | None = None,
    ip_address: str = "",
    device: str = "",
    commit: bool = True,
) -> AuditEvent:
    metadata = metadata or {}
    last = _get_last_event(db)
    previous_hash = last.current_event_hash if last else "GENESIS"
    now = datetime.now(timezone.utc)
    now_iso = now.isoformat()
    actor_id_str = str(actor.id) if actor else None
    current_hash = _hash_event(previous_hash, now_iso, actor_id_str, action, metadata)

    event = AuditEvent(
        timestamp=now,
        timestamp_iso=now_iso,
        actor_id=actor.id if actor else None,
        actor_role=actor.role.value if actor else "SYSTEM",
        action=action,
        case_id=case_id,
        document_id=document_id,
        metadata_json=metadata,
        ip_address=ip_address,
        device=device,
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


def verify_chain(db: Session, limit: int = 5000) -> dict:
    events = db.execute(select(AuditEvent).order_by(AuditEvent.timestamp.asc(), AuditEvent.id.asc()).limit(limit)).scalars().all()
    previous_hash = "GENESIS"
    for event in events:
        expected = _hash_event(previous_hash, event.timestamp_iso, str(event.actor_id) if event.actor_id else None, event.action, event.metadata_json)
        if expected != event.current_event_hash or event.previous_event_hash != previous_hash:
            return {"intact": False, "broken_at_event_id": str(event.id), "events_checked": len(events)}
        previous_hash = event.current_event_hash
    return {"intact": True, "broken_at_event_id": None, "events_checked": len(events)}
