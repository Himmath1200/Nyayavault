import uuid

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text
from sqlalchemy import JSON as JSONB, Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import AlertSeverity, AlertStatus


class SecurityAlert(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "security_alerts"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True, index=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)
    severity: Mapped[AlertSeverity] = mapped_column(Enum(AlertSeverity, name="alert_severity"), index=True, nullable=False)
    event_summary: Mapped[str] = mapped_column(String(255), nullable=False)
    reasons: Mapped[list] = mapped_column(JSONB, default=list)
    detected_at: Mapped["DateTime"] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[AlertStatus] = mapped_column(Enum(AlertStatus, name="alert_status"), default=AlertStatus.OPEN, index=True)
    resolved_by: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    resolution_note: Mapped[str] = mapped_column(Text, default="")
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    device: Mapped[str] = mapped_column(String(255), default="")
