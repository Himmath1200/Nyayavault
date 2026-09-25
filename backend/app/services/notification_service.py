import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.enums import NotificationSeverity
from app.models.notification import Notification


def notify(db: Session, user_id: uuid.UUID, severity: NotificationSeverity, title: str, message: str = "", link: str = "", commit: bool = True) -> Notification:
    n = Notification(user_id=user_id, severity=severity, title=title, message=message, link=link)
    db.add(n)
    if commit:
        db.commit()
        db.refresh(n)
    else:
        db.flush()
    return n


def list_for_user(db: Session, user_id: uuid.UUID, unread_only: bool = False) -> list[Notification]:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if unread_only:
        stmt = stmt.where(Notification.is_read.is_(False))
    stmt = stmt.order_by(Notification.created_at.desc()).limit(100)
    return db.execute(stmt).scalars().all()


def mark_read(db: Session, notification: Notification) -> Notification:
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification
