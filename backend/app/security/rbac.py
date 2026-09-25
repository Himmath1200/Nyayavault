"""Static RBAC permission matrix. This is the single source of truth for role
authorization — enforced in code so it cannot silently drift from the
RolePermission read-model used for display in the admin UI."""

from app.models.enums import AccessPurpose, Classification, UserRole


class Permission:
    CASE_CREATE = "CASE_CREATE"
    CASE_VIEW = "CASE_VIEW"
    CASE_UPDATE = "CASE_UPDATE"
    DOCUMENT_UPLOAD = "DOCUMENT_UPLOAD"
    DOCUMENT_VIEW = "DOCUMENT_VIEW"
    DOCUMENT_DOWNLOAD = "DOCUMENT_DOWNLOAD"
    DOCUMENT_SHARE = "DOCUMENT_SHARE"
    DOCUMENT_SEAL = "DOCUMENT_SEAL"
    EVIDENCE_VIEW = "EVIDENCE_VIEW"
    EVIDENCE_VERIFY = "EVIDENCE_VERIFY"
    EVIDENCE_TRANSFER = "EVIDENCE_TRANSFER"
    CUSTODY_VIEW = "CUSTODY_VIEW"
    AUDIT_VIEW = "AUDIT_VIEW"
    SECURITY_VIEW = "SECURITY_VIEW"
    SECURITY_RESOLVE = "SECURITY_RESOLVE"
    ACCESS_REQUEST_CREATE = "ACCESS_REQUEST_CREATE"
    ACCESS_REQUEST_APPROVE = "ACCESS_REQUEST_APPROVE"
    AI_USE = "AI_USE"
    COURT_VERIFY = "COURT_VERIFY"
    CERTIFICATE_GENERATE = "CERTIFICATE_GENERATE"
    USER_MANAGE = "USER_MANAGE"
    SETTINGS_MANAGE = "SETTINGS_MANAGE"


ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.SYSTEM_ADMIN: {
        Permission.CASE_VIEW,
        Permission.AUDIT_VIEW,
        Permission.SECURITY_VIEW,
        Permission.SECURITY_RESOLVE,
        Permission.ACCESS_REQUEST_APPROVE,
        Permission.USER_MANAGE,
        Permission.SETTINGS_MANAGE,
        Permission.DOCUMENT_VIEW,
    },
    UserRole.INVESTIGATING_OFFICER: {
        Permission.CASE_CREATE,
        Permission.CASE_VIEW,
        Permission.CASE_UPDATE,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_DOWNLOAD,
        Permission.EVIDENCE_VIEW,
        Permission.CUSTODY_VIEW,
        Permission.ACCESS_REQUEST_CREATE,
        Permission.AI_USE,
    },
    UserRole.FORENSIC_OFFICER: {
        Permission.CASE_VIEW,
        Permission.DOCUMENT_UPLOAD,
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_DOWNLOAD,
        Permission.EVIDENCE_VIEW,
        Permission.EVIDENCE_VERIFY,
        Permission.EVIDENCE_TRANSFER,
        Permission.CUSTODY_VIEW,
        Permission.ACCESS_REQUEST_CREATE,
        Permission.AI_USE,
    },
    UserRole.COURT_OFFICER: {
        Permission.CASE_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_DOWNLOAD,
        Permission.EVIDENCE_VIEW,
        Permission.EVIDENCE_VERIFY,
        Permission.CUSTODY_VIEW,
        Permission.COURT_VERIFY,
        Permission.CERTIFICATE_GENERATE,
        Permission.ACCESS_REQUEST_CREATE,
    },
    UserRole.LEGAL_OFFICER: {
        Permission.CASE_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.DOCUMENT_DOWNLOAD,
        Permission.EVIDENCE_VIEW,
        Permission.CUSTODY_VIEW,
        Permission.ACCESS_REQUEST_CREATE,
        Permission.AI_USE,
        Permission.COURT_VERIFY,
    },
    UserRole.AUDITOR: {
        Permission.CASE_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.AUDIT_VIEW,
        Permission.SECURITY_VIEW,
        Permission.CUSTODY_VIEW,
        Permission.EVIDENCE_VIEW,
    },
    UserRole.READ_ONLY_REVIEWER: {
        Permission.CASE_VIEW,
        Permission.DOCUMENT_VIEW,
        Permission.EVIDENCE_VIEW,
    },
}

# Ceiling classification a role may VIEW without an approved elevated access request.
ROLE_CLASSIFICATION_CEILING: dict[UserRole, Classification] = {
    UserRole.SYSTEM_ADMIN: Classification.HIGHLY_CONFIDENTIAL,
    UserRole.INVESTIGATING_OFFICER: Classification.CONFIDENTIAL,
    UserRole.FORENSIC_OFFICER: Classification.HIGHLY_CONFIDENTIAL,
    UserRole.COURT_OFFICER: Classification.SEALED,
    UserRole.LEGAL_OFFICER: Classification.CONFIDENTIAL,
    UserRole.AUDITOR: Classification.HIGHLY_CONFIDENTIAL,
    UserRole.READ_ONLY_REVIEWER: Classification.INTERNAL,
}

_CLASSIFICATION_ORDER = [
    Classification.PUBLIC,
    Classification.INTERNAL,
    Classification.CONFIDENTIAL,
    Classification.HIGHLY_CONFIDENTIAL,
    Classification.SEALED,
]

# Purposes each role is permitted to invoke when requesting/using access.
ROLE_ALLOWED_PURPOSES: dict[UserRole, set[AccessPurpose]] = {
    UserRole.SYSTEM_ADMIN: set(AccessPurpose),
    UserRole.INVESTIGATING_OFFICER: {AccessPurpose.INVESTIGATION, AccessPurpose.EVIDENCE_VERIFICATION},
    UserRole.FORENSIC_OFFICER: {AccessPurpose.FORENSIC_ANALYSIS, AccessPurpose.EVIDENCE_VERIFICATION},
    UserRole.COURT_OFFICER: {AccessPurpose.COURT_PREPARATION, AccessPurpose.EVIDENCE_VERIFICATION},
    UserRole.LEGAL_OFFICER: {AccessPurpose.COURT_PREPARATION, AccessPurpose.ADMINISTRATIVE_REVIEW},
    UserRole.AUDITOR: {AccessPurpose.ADMINISTRATIVE_REVIEW},
    UserRole.READ_ONLY_REVIEWER: {AccessPurpose.ADMINISTRATIVE_REVIEW},
}


def classification_rank(classification: Classification) -> int:
    return _CLASSIFICATION_ORDER.index(classification)


def has_permission(role: UserRole, permission: str) -> bool:
    return permission in ROLE_PERMISSIONS.get(role, set())


def classification_within_ceiling(role: UserRole, classification: Classification) -> bool:
    ceiling = ROLE_CLASSIFICATION_CEILING.get(role, Classification.PUBLIC)
    return classification_rank(classification) <= classification_rank(ceiling)


def purpose_allowed(role: UserRole, purpose: AccessPurpose) -> bool:
    return purpose in ROLE_ALLOWED_PURPOSES.get(role, set())
