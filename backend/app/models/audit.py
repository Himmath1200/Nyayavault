import uuid

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy import JSON as JSONB, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, UUIDMixin


class AuditEvent(Base, UUIDMixin):
    """Append-only, hash-chained audit ledger. No update/delete API is exposed for this table."""

    __tablename__ = "audit_events"

    timestamp: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), index=True, nullable=False)
    timestamp_iso: Mapped[str] = mapped_column(String(64), nullable=False)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    actor_role: Mapped[str] = mapped_column(String(64), default="SYSTEM")
    action: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=True, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=True, index=True)
    metadata_json: Mapped[dict] = mapped_column(JSONB, default=dict)
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    device: Mapped[str] = mapped_column(String(255), default="")
    previous_event_hash: Mapped[str] = mapped_column(String(64), default="")
    current_event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
