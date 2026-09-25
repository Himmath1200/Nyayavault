import uuid
from datetime import datetime

from app.models.enums import NotificationSeverity
from app.schemas.common import ORMModel


class NotificationOut(ORMModel):
    id: uuid.UUID
    severity: NotificationSeverity
    title: str
    message: str
    link: str
    is_read: bool
    created_at: datetime
