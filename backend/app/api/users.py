import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.models.role_permission import RolePermission
from app.models.user import User
from app.schemas.auth import UserOut
from app.schemas.user import RolePermissionOut, UserCreate, UserUpdate
from app.security.deps import require_permission
from app.security.rbac import Permission
from app.services.user_service import create_user, list_users

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def get_users(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.USER_MANAGE))):
    return list_users(db)


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user_endpoint(payload: UserCreate, db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.USER_MANAGE))):
    return create_user(db, payload.email, payload.full_name, payload.badge_id, payload.role, payload.password, payload.department)


@router.put("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, payload: UserUpdate, db: Session = Depends(get_db), admin: User = Depends(require_permission(Permission.USER_MANAGE))):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(target, field, value)
    db.commit()
    db.refresh(target)
    return target


@router.get("/roles/permissions", response_model=list[RolePermissionOut])
def role_permissions(db: Session = Depends(get_db), user: User = Depends(require_permission(Permission.USER_MANAGE))):
    return db.query(RolePermission).all()
