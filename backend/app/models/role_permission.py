from sqlalchemy import String
from sqlalchemy import JSON as JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDMixin


class RolePermission(Base, UUIDMixin, TimestampMixin):
    """Read-model of the RBAC matrix defined in app.security.rbac, seeded for display in
    the User/Role management UI. Authorization decisions are enforced from the code matrix,
    not this table, so the two can never silently drift apart in a way that weakens access control."""

    __tablename__ = "role_permissions"

    role: Mapped[str] = mapped_column(String(64), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(String(512), default="")
    permissions: Mapped[list] = mapped_column(JSONB, default=list)
