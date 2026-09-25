import uuid

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String
from sqlalchemy import Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import CustodyStatus, IntegrityStatus


class EvidenceItem(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evidence_items"

    evidence_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    document_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("documents.id"), nullable=False, index=True)
    sha256_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    file_size: Mapped[int] = mapped_column(Integer, default=0)
    mime_type: Mapped[str] = mapped_column(String(128), default="application/pdf")
    document_version: Mapped[int] = mapped_column(Integer, default=1)
    uploaded_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    digital_signature: Mapped[str] = mapped_column(String(255), default="")
    integrity_status: Mapped[IntegrityStatus] = mapped_column(Enum(IntegrityStatus, name="evidence_integrity_status"), default=IntegrityStatus.VERIFIED)
    custody_status: Mapped[CustodyStatus] = mapped_column(Enum(CustodyStatus, name="evidence_custody_status"), default=CustodyStatus.WITH_INVESTIGATOR)
    last_verified_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=True)
    last_verified_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)


class EvidenceCustodyEvent(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "evidence_custody_events"

    evidence_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("evidence_items.id"), nullable=False, index=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    actor_role: Mapped[str] = mapped_column(String(64), nullable=False)
    action: Mapped[str] = mapped_column(String(128), nullable=False)
    location: Mapped[str] = mapped_column(String(255), default="")
    reason: Mapped[str] = mapped_column(String(512), default="")
    document_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    previous_event_hash: Mapped[str] = mapped_column(String(64), default="")
    current_event_hash: Mapped[str] = mapped_column(String(64), nullable=False)
