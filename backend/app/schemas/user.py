from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole
from app.schemas.auth import UserOut


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    badge_id: str
    role: UserRole
    password: str
    department: str = "NCRB - Women Safety Division"


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None
    department: str | None = None


class RolePermissionOut(BaseModel):
    role: str
    description: str
    permissions: list[str]


UserOut = UserOut
