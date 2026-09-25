"""Synthetic demo data generator.

Everything here is fictional — synthetic names, locations, and case content
only. No real Aadhaar numbers, phone numbers, addresses, FIRs, witnesses, or
government records are used. Safe to run repeatedly: it is a no-op once
demo data already exists.
"""

import random
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.base import Base
from app.database.session import SessionLocal, engine
from app.models.ai import AIContradiction
from app.models.case import Case, CaseMember
from app.models.enums import (
    AlertSeverity,
    AlertStatus,
    CasePriority,
    CaseStatus,
    Classification,
    CustodyStatus,
    DocumentType,
    NotificationSeverity,
    UserRole,
)
from app.models.notification import Notification
from app.models.role_permission import RolePermission
from app.models.security import SecurityAlert
from app.models.user import User
from app.models.verification import VerificationCertificate
from app.security.rbac import ROLE_PERMISSIONS
from app.services.case_service import generate_case_number
from app.services.document_service import process_upload
from app.services.evidence_service import transfer_evidence
from app.services.verification_service import issue_certificate

random.seed(42)

DEMO_PASSWORD = "Demo@1234"

FICTIONAL_NAMES = [
    "Ravi Sharma", "Ananya Iyer", "Vikram Nair", "Priya Menon", "Karan Malhotra",
    "Sunita Rao", "Arjun Desai", "Meera Pillai", "Rohan Kapoor", "Divya Bhatt",
    "Farhan Sheikh", "Neha Joshi", "Aditya Verma", "Kavya Reddy", "Sameer Khan",
]
FICTIONAL_LOCATIONS = [
    "Sector 21, Cyber City", "MG Road Junction", "Lake View Colony", "Green Park Extension",
    "Old Market Road", "Riverside Industrial Area", "North Ridge Complex", "Central Plaza",
]
CASE_CATEGORIES = [
    "Digital Fraud Investigation", "Cybercrime", "Financial Crime", "Missing Person Inquiry",
    "Assault Investigation", "Property Offense", "Organized Crime", "Identity Theft",
]
JURISDICTIONS = ["South District Cyber Cell", "Central Metropolitan Police", "State Crime Branch", "NCRB Coordination Unit"]

DEMO_ACCOUNTS = [
    ("admin@nyayavault.demo", "System Administrator", "ADM-001", UserRole.SYSTEM_ADMIN),
    ("officer@nyayavault.demo", "Inspector Ravi Sharma", "IO-014", UserRole.INVESTIGATING_OFFICER),
    ("forensic@nyayavault.demo", "Dr. Ananya Iyer", "FO-027", UserRole.FORENSIC_OFFICER),
    ("court@nyayavault.demo", "Registrar Vikram Nair", "CO-009", UserRole.COURT_OFFICER),
    ("auditor@nyayavault.demo", "Auditor Priya Menon", "AU-003", UserRole.AUDITOR),
    ("legal@nyayavault.demo", "Advocate Karan Malhotra", "LO-011", UserRole.LEGAL_OFFICER),
    ("reviewer@nyayavault.demo", "Reviewer Sunita Rao", "RR-005", UserRole.READ_ONLY_REVIEWER),
]

EXTRA_ROLES = [UserRole.INVESTIGATING_OFFICER, UserRole.FORENSIC_OFFICER, UserRole.COURT_OFFICER, UserRole.AUDITOR, UserRole.LEGAL_OFFICER]


def _seed_role_permissions(db: Session):
    for role, perms in ROLE_PERMISSIONS.items():
        db.add(RolePermission(role=role.value, description=f"Standard permission set for {role.value.replace('_', ' ').title()}", permissions=sorted(perms)))
    db.commit()


def _seed_users(db: Session) -> dict[str, User]:
    users: dict[str, User] = {}
    for email, name, badge, role in DEMO_ACCOUNTS:
        user = User(email=email, full_name=name, badge_id=badge, role=role, hashed_password=hash_password(DEMO_PASSWORD), is_demo_account=True)
        db.add(user)
        users[email] = user

    for i in range(13):
        role = EXTRA_ROLES[i % len(EXTRA_ROLES)]
        name = random.choice(FICTIONAL_NAMES) + f" ({i})"
        email = f"user{i:02d}@nyayavault.demo"
        user = User(email=email, full_name=name, badge_id=f"BD-{100 + i}", role=role, hashed_password=hash_password(DEMO_PASSWORD), is_demo_account=True)
        db.add(user)
        users[email] = user

    db.commit()
    for u in users.values():
        db.refresh(u)
    return users


DOC_TEXT_TEMPLATES = {
    DocumentType.FIR: (
        "FIRST INFORMATION REPORT\nCASE-{case}\nFIR No. {fir}\nDate: {date}\nTime: {time}\n"
        "Station: {jurisdiction}\nComplainant reports an incident near {location}. "
        "Officer {officer} recorded the statement. Preliminary details indicate a digital fraud "
        "complaint requiring further investigation under applicable sections. Section 420 of the code is cited."
    ),
    DocumentType.WITNESS_STATEMENT: (
        "WITNESS STATEMENT\nCASE-{case}\nDate: {date}\nTime: {time}\n"
        "I, {witness}, state that on {date} at approximately {time} near {location}, I observed "
        "activity consistent with the complaint filed. I am prepared to testify to these facts "
        "if required by the investigating officer, {officer}."
    ),
    DocumentType.INVESTIGATION_REPORT: (
        "INVESTIGATION REPORT\nCASE-{case}\nDate: {date}\nTime: {time}\n"
        "Investigating Officer: {officer}\nSummary: Investigation into the matter reported at "
        "{location} is ongoing. Evidence collected includes digital transaction records. "
        "Witness {witness} was interviewed. Further forensic analysis has been requested."
    ),
    DocumentType.FORENSIC_REPORT: (
        "FORENSIC ANALYSIS REPORT\nCASE-{case}\nDate: {date}\n"
        "Forensic Officer: {officer}\nLaboratory analysis of the submitted digital media was "
        "conducted. Hash verification confirms file integrity at time of intake. No tampering "
        "indicators were found in the examined artifact chain."
    ),
    DocumentType.CHARGE_SHEET: (
        "CHARGE SHEET\nCASE-{case}\nDate: {date}\nJurisdiction: {jurisdiction}\n"
        "Pursuant to investigation under Section 420 and Section 468, this charge sheet is filed "
        "before the competent court by {officer} for further proceedings."
    ),
    DocumentType.COURT_FILING: (
        "IN THE COURT OF THE {jurisdiction}\nCASE-{case}\nDate: {date}\n"
        "Petition filed on behalf of the investigating agency regarding evidence submitted for "
        "case {case}. The court is requested to take the matter on record."
    ),
    DocumentType.JUDGMENT: (
        "JUDGMENT\nCASE-{case}\nDate: {date}\n"
        "Having reviewed the submissions and evidence on record for case {case}, the matter is "
        "disposed of in accordance with due process. This document is a synthetic demo record."
    ),
    DocumentType.LEGAL_NOTICE: (
        "LEGAL NOTICE\nCASE-{case}\nDate: {date}\n"
        "Notice under applicable provisions is hereby served in connection with case {case}, "
        "requiring response within the statutory period."
    ),
    DocumentType.POLICE_REPORT: (
        "POLICE REPORT\nCASE-{case}\nDate: {date}\nTime: {time}\nStation: {jurisdiction}\n"
        "Routine report filed by {officer} regarding follow-up action near {location}."
    ),
    DocumentType.EVIDENCE_RECORD: (
        "EVIDENCE RECORD\nCASE-{case}\nDate: {date}\n"
        "Record of digital evidence item collected at {location} and logged by {officer}."
    ),
    DocumentType.OTHER: (
        "CASE MEMORANDUM\nCASE-{case}\nDate: {date}\n"
        "General administrative note regarding case {case} prepared by {officer}."
    ),
}

CLASSIFICATION_BY_TYPE = {
    DocumentType.FIR: Classification.CONFIDENTIAL,
    DocumentType.WITNESS_STATEMENT: Classification.HIGHLY_CONFIDENTIAL,
    DocumentType.INVESTIGATION_REPORT: Classification.CONFIDENTIAL,
    DocumentType.FORENSIC_REPORT: Classification.HIGHLY_CONFIDENTIAL,
    DocumentType.CHARGE_SHEET: Classification.CONFIDENTIAL,
    DocumentType.COURT_FILING: Classification.INTERNAL,
    DocumentType.JUDGMENT: Classification.PUBLIC,
    DocumentType.LEGAL_NOTICE: Classification.INTERNAL,
    DocumentType.POLICE_REPORT: Classification.INTERNAL,
    DocumentType.EVIDENCE_RECORD: Classification.SEALED,
    DocumentType.OTHER: Classification.INTERNAL,
}


def _make_doc_text(doc_type: DocumentType, case_number: str, date: datetime, jurisdiction: str, force_time: str | None = None) -> str:
    template = DOC_TEXT_TEMPLATES[doc_type]
    return template.format(
        case=case_number,
        fir=random.randint(100, 999),
        date=date.strftime("%d-%b-%Y"),
        time=force_time or f"{random.randint(6, 23):02d}:{random.choice(['00', '15', '30', '45'])}",
        jurisdiction=jurisdiction,
        location=random.choice(FICTIONAL_LOCATIONS),
        officer=random.choice(FICTIONAL_NAMES),
        witness=random.choice(FICTIONAL_NAMES),
    )


def _seed_cases(db: Session, users: dict[str, User]) -> list[Case]:
    officer = users["officer@nyayavault.demo"]
    forensic = users["forensic@nyayavault.demo"]
    court = users["court@nyayavault.demo"]

    cases = []
    central = Case(
        case_number="CASE-2026-00127",
        title="Operation Silver Shield",
        category="Digital Fraud Investigation",
        jurisdiction="South District Cyber Cell",
        description=(
            "Multi-victim digital fraud investigation involving coordinated online transactions. "
            "Central demo case for NyayaVault — all content is synthetic."
        ),
        status=CaseStatus.ACTIVE,
        priority=CasePriority.CRITICAL,
        lead_officer_id=officer.id,
        security_flagged=True,
    )
    db.add(central)
    db.flush()
    for u in [officer, forensic, court]:
        db.add(CaseMember(case_id=central.id, user_id=u.id, role_on_case="LEAD" if u.id == officer.id else "MEMBER"))
    cases.append(central)

    for i in range(9):
        lead = random.choice([officer, forensic])
        case = Case(
            case_number=generate_case_number() if i > 0 else "CASE-2026-00128",
            title=f"{random.choice(CASE_CATEGORIES)} — File {i + 1}",
            category=random.choice(CASE_CATEGORIES),
            jurisdiction=random.choice(JURISDICTIONS),
            description="Synthetic demo case generated for NyayaVault evaluation.",
            status=random.choice([CaseStatus.ACTIVE, CaseStatus.ACTIVE, CaseStatus.CLOSED, CaseStatus.SUSPENDED]),
            priority=random.choice(list(CasePriority)),
            lead_officer_id=lead.id,
            security_flagged=random.random() < 0.15,
        )
        db.add(case)
        db.flush()
        db.add(CaseMember(case_id=case.id, user_id=lead.id, role_on_case="LEAD"))
        cases.append(case)

    db.commit()
    for c in cases:
        db.refresh(c)
    return cases


FORCED_FIRST_EVIDENCE_NUMBER = "EVD-2026-000921"


def _upload_demo_document(db, case, actor, doc_type, classification, event_date, seq, client_meta, force_time=None):
    text = _make_doc_text(doc_type, case.case_number, event_date, case.jurisdiction, force_time)
    content = text.encode("utf-8")
    result = process_upload(
        db, case, actor, f"{doc_type.value.lower()}_{seq:03d}.txt", "text/plain",
        content, doc_type, classification, client_meta,
    )
    if random.random() < 0.5:
        to_status = random.choice([CustodyStatus.WITH_FORENSICS, CustodyStatus.IN_TRANSIT, CustodyStatus.WITH_COURT])
        transfer_evidence(db, result.evidence, actor, to_status, random.choice(FICTIONAL_LOCATIONS), "Routine custody transfer for demo dataset", client_meta)
    return result


def _seed_documents_and_evidence(db: Session, cases: list[Case], users: dict[str, User]):
    officer = users["officer@nyayavault.demo"]
    forensic = users["forensic@nyayavault.demo"]
    client_meta = {"ip_address": "10.0.0.5", "device": "NyayaVault Seed Script"}
    doc_types = list(DocumentType)
    base_date = datetime.now(timezone.utc) - timedelta(days=20)
    central = cases[0]
    total_docs = 0

    # Guarantee the central demo case (Operation Silver Shield) has a deliberate, narratively
    # coherent document set: a witness statement (20:30) and investigation report (21:15) that
    # the contradiction-detection mock provider will flag as a timeline inconsistency, plus an
    # evidence record whose evidence number matches the ID referenced in the demo walkthrough.
    central_plan = [
        (DocumentType.FIR, "20:15"),
        (DocumentType.WITNESS_STATEMENT, "20:30"),
        (DocumentType.INVESTIGATION_REPORT, "21:15"),
        (DocumentType.FORENSIC_REPORT, None),
        (DocumentType.EVIDENCE_RECORD, None),
        (DocumentType.CHARGE_SHEET, None),
        (DocumentType.COURT_FILING, None),
        (DocumentType.JUDGMENT, None),
    ]
    forced_evidence_used = False
    for doc_type, force_time in central_plan:
        event_date = base_date + timedelta(days=random.randint(0, 18))
        actor = forensic if doc_type == DocumentType.FORENSIC_REPORT else officer
        result = _upload_demo_document(db, central, actor, doc_type, CLASSIFICATION_BY_TYPE[doc_type], event_date, total_docs, client_meta, force_time)
        if not forced_evidence_used and doc_type == DocumentType.EVIDENCE_RECORD:
            result.evidence.evidence_number = FORCED_FIRST_EVIDENCE_NUMBER
            db.commit()
            forced_evidence_used = True
        total_docs += 1

    # Fill the remaining documents round-robin across all cases (including the central one).
    while total_docs < 50:
        for case in cases:
            if total_docs >= 50:
                break
            doc_type = doc_types[total_docs % len(doc_types)]
            classification = CLASSIFICATION_BY_TYPE[doc_type]
            event_date = base_date + timedelta(days=random.randint(0, 18), hours=random.randint(0, 23))
            actor = forensic if doc_type == DocumentType.FORENSIC_REPORT else officer
            _upload_demo_document(db, case, actor, doc_type, classification, event_date, total_docs, client_meta)
            total_docs += 1

    if not forced_evidence_used:
        from sqlalchemy import select as _select
        from app.models.evidence import EvidenceItem as _EvidenceItem
        first_central_evidence = db.execute(_select(_EvidenceItem).where(_EvidenceItem.case_id == central.id).limit(1)).scalar_one_or_none()
        if first_central_evidence:
            first_central_evidence.evidence_number = FORCED_FIRST_EVIDENCE_NUMBER
            db.commit()


def _seed_security_alerts(db: Session, users: dict[str, User]):
    officers = [u for u in users.values() if u.role in (UserRole.INVESTIGATING_OFFICER, UserRole.FORENSIC_OFFICER)]
    reasons_pool = [
        ["Unusual access time", "Mass download", "Sensitive documents", "Deviation from normal behaviour"],
        ["Repeated failed access", "Multiple attempts within short window"],
        ["Access to unrelated case", "No case assignment on record"],
        ["Privilege escalation attempt", "Requested action beyond role permission"],
    ]
    for i in range(10):
        user = random.choice(officers)
        severity = random.choice(list(AlertSeverity))
        status_choice = random.choice([AlertStatus.OPEN, AlertStatus.OPEN, AlertStatus.RESOLVED, AlertStatus.DISMISSED])
        alert = SecurityAlert(
            user_id=user.id,
            risk_score=random.randint(40, 99),
            severity=severity,
            event_summary=f"{random.randint(5, 60)} confidential document download(s) by {user.full_name}" if i % 2 == 0 else f"Login anomaly detected for {user.full_name}",
            reasons=random.choice(reasons_pool),
            detected_at=datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 240)),
            status=status_choice,
            ip_address=f"10.0.{random.randint(0,255)}.{random.randint(1,254)}",
            device="Chrome on Windows (demo)",
        )
        if status_choice != AlertStatus.OPEN:
            alert.resolved_by = users["admin@nyayavault.demo"].id
            alert.resolution_note = "Reviewed during demo data generation."
        db.add(alert)
    db.commit()


def _seed_contradiction(db: Session, cases: list[Case]):
    from sqlalchemy import select as _select
    from app.models.document import Document as _Document

    central = cases[0]
    witness_docs = db.execute(_select(_Document).where(_Document.case_id == central.id, _Document.document_type == DocumentType.WITNESS_STATEMENT)).scalars().all()
    report_docs = db.execute(_select(_Document).where(_Document.case_id == central.id, _Document.document_type == DocumentType.INVESTIGATION_REPORT)).scalars().all()
    if witness_docs and report_docs:
        db.add(AIContradiction(
            case_id=central.id,
            category="timeline",
            severity="MEDIUM",
            description=(
                "Potential inconsistency detected — human review required. The witness statement "
                "reports a time of 20:30 while the investigation report reports 21:15 for what may "
                "be the same event."
            ),
            document_a_id=witness_docs[0].id,
            document_b_id=report_docs[0].id,
            requires_human_review=True,
            status="OPEN",
        ))
        db.commit()


def _seed_notifications(db: Session, users: dict[str, User]):
    officer = users["officer@nyayavault.demo"]
    samples = [
        (NotificationSeverity.CRITICAL, "Integrity violation detected", "A document hash mismatch was detected during routine verification."),
        (NotificationSeverity.WARNING, "Potential contradiction detected", "A potential timeline inconsistency was found in Operation Silver Shield."),
        (NotificationSeverity.WARNING, "Access request pending", "A forensic officer has requested elevated access to a sealed document."),
        (NotificationSeverity.INFO, "Evidence verification completed", "Evidence EVD-2026-000921 integrity was verified successfully."),
        (NotificationSeverity.SUCCESS, "Document successfully sealed", "A highly confidential document has been sealed and is now immutable."),
    ]
    for severity, title, message in samples:
        db.add(Notification(user_id=officer.id, severity=severity, title=title, message=message))
    db.commit()


def _seed_certificate(db: Session, cases: list[Case], users: dict[str, User]):
    from sqlalchemy import select as _select
    from app.models.evidence import EvidenceItem as _EvidenceItem

    evidence = db.execute(_select(_EvidenceItem).where(_EvidenceItem.evidence_number == FORCED_FIRST_EVIDENCE_NUMBER)).scalar_one_or_none()
    if not evidence:
        return
    from app.models.document import Document as _Document

    document = db.get(_Document, evidence.document_id)
    court = users["court@nyayavault.demo"]
    issue_certificate(db, evidence, document, court, {"ip_address": "10.0.0.9", "device": "NyayaVault Seed Script"})


def run(force: bool = False):
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        existing = db.query(User).count()
        if existing > 0 and not force:
            print(f"Demo data already present ({existing} users). Skipping. Pass force=True to reseed.")
            return

        print("Seeding role permissions...")
        _seed_role_permissions(db)
        print("Seeding users...")
        users = _seed_users(db)
        print("Seeding cases...")
        cases = _seed_cases(db, users)
        print("Seeding documents, evidence, and custody chain (this drives the full upload pipeline)...")
        _seed_documents_and_evidence(db, cases, users)
        print("Seeding security alerts...")
        _seed_security_alerts(db, users)
        print("Seeding AI contradiction example...")
        _seed_contradiction(db, cases)
        print("Seeding notifications...")
        _seed_notifications(db, users)
        print("Issuing demo verification certificate...")
        _seed_certificate(db, cases, users)
        print("Demo data seeding complete.")
        print(f"Central demo case: CASE-2026-00127 'Operation Silver Shield'")
        print(f"Central demo evidence: {FORCED_FIRST_EVIDENCE_NUMBER}")
        print("Demo accounts (password for all: Demo@1234):")
        for email, name, badge, role in DEMO_ACCOUNTS:
            print(f"  {email:32s} {role.value}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
