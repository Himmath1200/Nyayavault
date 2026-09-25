import uuid

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy import Uuid as UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin
from app.models.enums import CasePriority, CaseStatus


class Case(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "cases"

    case_number: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(128), nullable=False)
    jurisdiction: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[CaseStatus] = mapped_column(Enum(CaseStatus, name="case_status"), default=CaseStatus.ACTIVE, index=True)
    priority: Mapped[CasePriority] = mapped_column(Enum(CasePriority, name="case_priority"), default=CasePriority.MEDIUM, index=True)
    lead_officer_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    security_flagged: Mapped[bool] = mapped_column(default=False)


class CaseMember(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "case_members"

    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    role_on_case: Mapped[str] = mapped_column(String(128), default="MEMBER")
