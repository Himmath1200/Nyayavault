from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.enums import UserRole
from app.models.user import User


def create_user(db: Session, email: str, full_name: str, badge_id: str, role: UserRole, password: str, department: str) -> User:
    user = User(
        email=email,
        full_name=full_name,
        badge_id=badge_id,
        role=role,
        hashed_password=hash_password(password),
        department=department,
        is_demo_account=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def list_users(db: Session) -> list[User]:
    return db.execute(select(User).order_by(User.created_at.desc())).scalars().all()


def get_by_email(db: Session, email: str) -> User | None:
    return db.execute(select(User).where(User.email == email)).scalar_one_or_none()
