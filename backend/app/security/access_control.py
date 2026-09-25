"""Zero-trust, purpose-based access decision engine.

A single access decision considers: authentication, case assignment, role
permission, requested purpose, requested action, document classification and
current security risk on the user. This is deliberately NOT plain RBAC —
every check is evaluated and returned so the frontend can render an
"Explain Access Decision" panel.
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.access import AccessRequest
from app.models.case import Case, CaseMember
from app.models.document import Document
from app.models.enums import AccessAction, AccessPurpose, AccessRequestStatus, AlertSeverity, AlertStatus, UserRole
from app.models.security import SecurityAlert
from app.models.user import User
from app.security.rbac import Permission, classification_within_ceiling, has_permission, purpose_allowed

ACTION_PERMISSION = {
    AccessAction.VIEW: Permission.DOCUMENT_VIEW,
    AccessAction.DOWNLOAD: Permission.DOCUMENT_DOWNLOAD,
    AccessAction.SHARE: Permission.DOCUMENT_SHARE,
}


@dataclass
class AccessCheck:
    label: str
    passed: bool
    detail: str = ""


@dataclass
class AccessDecision:
    granted: bool
    checks: list[AccessCheck] = field(default_factory=list)
    reasons: list[str] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "granted": self.granted,
            "checks": [c.__dict__ for c in self.checks],
            "reasons": self.reasons,
        }


def _is_case_assigned(db: Session, user: User, case: Case) -> bool:
    if case.lead_officer_id == user.id:
        return True
    if user.role in (UserRole.SYSTEM_ADMIN, UserRole.AUDITOR, UserRole.COURT_OFFICER):
        return True
    member = db.execute(
        select(CaseMember).where(CaseMember.case_id == case.id, CaseMember.user_id == user.id)
    ).scalar_one_or_none()
    return member is not None


def _has_elevated_grant(db: Session, user: User, document: Document) -> bool:
    grant = db.execute(
        select(AccessRequest).where(
            AccessRequest.document_id == document.id,
            AccessRequest.requested_by == user.id,
            AccessRequest.status == AccessRequestStatus.APPROVED,
        )
    ).scalar_one_or_none()
    return grant is not None


def _current_risk_acceptable(db: Session, user: User) -> tuple[bool, str]:
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
    alert = db.execute(
        select(SecurityAlert).where(
            SecurityAlert.user_id == user.id,
            SecurityAlert.status == AlertStatus.OPEN,
            SecurityAlert.severity.in_([AlertSeverity.HIGH, AlertSeverity.CRITICAL]),
            SecurityAlert.detected_at >= cutoff,
        )
    ).scalar_one_or_none()
    if alert:
        return False, f"Open {alert.severity.value.lower()} security alert on this account"
    return True, ""


def evaluate_access(
    db: Session,
    user: User,
    case: Case,
    document: Document,
    purpose: AccessPurpose,
    action: AccessAction,
) -> AccessDecision:
    checks: list[AccessCheck] = []
    reasons: list[str] = []

    checks.append(AccessCheck("Authenticated", True, f"{user.full_name} ({user.role.value})"))

    assigned = _is_case_assigned(db, user, case)
    checks.append(AccessCheck(f"Assigned to case #{case.case_number}", assigned))
    if not assigned:
        reasons.append("User is not assigned to this case")

    permission = ACTION_PERMISSION[action]
    role_ok = has_permission(user.role, permission)
    checks.append(AccessCheck(f"Role permits {action.value.lower()}", role_ok, user.role.value))
    if not role_ok:
        reasons.append(f"Role {user.role.value} does not permit {action.value}")

    purpose_ok = purpose_allowed(user.role, purpose)
    checks.append(AccessCheck("Purpose permitted", purpose_ok, purpose.value))
    if not purpose_ok:
        reasons.append(f"Purpose {purpose.value} not permitted for role {user.role.value}")

    classification_ok = classification_within_ceiling(user.role, document.classification)
    elevated = False
    if not classification_ok:
        elevated = _has_elevated_grant(db, user, document)
        classification_ok = elevated
    checks.append(
        AccessCheck(
            "Classification permitted",
            classification_ok,
            document.classification.value + (" (elevated grant)" if elevated else ""),
        )
    )
    if not classification_ok:
        reasons.append(f"Document classification {document.classification.value} exceeds role ceiling")

    if document.is_sealed and action in (AccessAction.SHARE,):
        checks.append(AccessCheck("Sealed evidence share restriction", False, "SEALED documents cannot be shared"))
        reasons.append("Sealed evidence cannot be shared")
        classification_ok = False

    risk_ok, risk_detail = _current_risk_acceptable(db, user)
    checks.append(AccessCheck("Risk acceptable", risk_ok, risk_detail))
    if not risk_ok:
        reasons.append(risk_detail)

    granted = assigned and role_ok and purpose_ok and classification_ok and risk_ok
    return AccessDecision(granted=granted, checks=checks, reasons=reasons)
