# NyayaVault

**Secure Digital Document Management System for Legal and Investigation Documents**

> "Every Document. Every Action. Every Proof. Verifiable."

Built for **Smart India Hackathon 2026** — Problem Statement **26190**, Ministry of Home Affairs / National Crime Records Bureau (NCRB), Women Safety Division.

---

## 1. Problem Statement

Law enforcement and legal teams handle FIRs, witness statements, forensic reports, charge sheets, and court filings across fragmented systems with weak custody tracking, no cryptographic integrity guarantees, and access control that stops at "who is logged in" rather than "why do they need this document, for this case, right now." Evidence tampering, unclear chain of custody, and undocumented access are hard to detect after the fact and harder to prove in court.

## 2. Solution

NyayaVault is a case-centric evidence and legal document intelligence platform that treats every document as an object with a **cryptographic identity** (SHA-256 "Evidence DNA"), a **lifecycle** (chain of custody), an **authorization context** (zero-trust, purpose-based access control), and an **AI-assisted understanding layer** (classification, entity extraction, timeline reconstruction, contradiction flagging) — all wrapped in an **append-only, hash-chained audit ledger** and independently verifiable through a **court verification portal** and **QR-based public certificates**.

### Unique innovations

- **Evidence DNA** — every uploaded document is fingerprinted (SHA-256), versioned, and given a dedicated evidence record with one-click integrity re-verification.
- **Hash-chained Chain of Custody** — every custody event links to the previous event's hash, so any silent edit breaks the chain, not just a flag in a database row.
- **Hash-chained Audit Ledger** — the same tamper-evidence principle applied platform-wide to every security-relevant action (login, view, download, share, seal, transfer, alert...).
- **Zero-trust, purpose-based access control (ABAC, not just RBAC)** — every access decision evaluates role permission, case assignment, document classification ceiling, declared purpose, and current account risk, and shows its work via an "Explain Access Decision" panel.
- **AI as understanding, never as authority** — Gemini (or a deterministic mock) classifies, extracts, summarizes, and flags "potential inconsistencies" for human review. It is architecturally incapable of making an access decision or a legal determination — those are separate subsystems.
- **Court Verification + Digital Evidence Certificate + QR** — anyone holding a printed certificate can scan a QR code to reach a public page that reveals only safe verification metadata, never document contents.

## 3. Architecture

```
Gemini (AI)         → understanding (classification, extraction, summaries, contradictions)
RBAC + ABAC          → authorization (role × case × classification × purpose × risk)
SHA-256              → integrity (Evidence DNA, tamper detection)
Digital Signature    → authenticity (per-evidence signature abstraction)
Chain of Custody     → evidence lifecycle (hash-linked events)
Audit Ledger         → accountability (hash-linked, append-only, no delete/update API)
PostgreSQL           → structured records
Local disk / Vercel Blob storage → document bytes
React + TypeScript   → command-center UI
```

These are independent subsystems by design: a Gemini outage never affects access enforcement or integrity guarantees, and the audit ledger cannot be bypassed by a compromised frontend because every check re-runs server-side.

### Monorepo layout

```
nyayavault/
├── frontend/     React + TypeScript + Vite + Tailwind
├── backend/      FastAPI + SQLAlchemy + PostgreSQL
├── docker-compose.yml
└── README.md
```

Backend is service-oriented (`app/services`, `app/security`, `app/documents`, `app/audit`, `app/custody`, `app/ai`) — `main.py` only wires routers together.

## 4. Technology Stack

**Frontend:** React 18, TypeScript, Vite, Tailwind CSS, Lucide icons, React Router, Recharts, React Flow, Framer Motion, TanStack Query, `qrcode.react`.

**Backend:** Python, FastAPI, Pydantic, SQLAlchemy 2.0.

**Database:** PostgreSQL (UUID primary keys via SQLAlchemy's cross-dialect `Uuid` type — native `uuid` column on Postgres).

**AI:** Gemini API via `google-genai`, called only from the backend, with a deterministic mock provider fallback (`GEMINI_ENABLED=false`) so the app runs with zero API key.

**Security:** JWT access/refresh tokens, bcrypt password hashing, demo MFA flow, RBAC + ABAC access-control engine, SHA-256 document hashing, hash-chained audit and custody ledgers, CORS allowlist, security response headers, path-traversal-safe storage, upload validation (type/size).

## 5. Security Model

| Layer | Mechanism |
|---|---|
| Authentication | JWT (short-lived access + refresh), bcrypt password hashing, demo MFA (`123456`) |
| Authorization | Static RBAC permission matrix (`app/security/rbac.py`) + per-request ABAC decision engine (`app/security/access_control.py`) considering role, case assignment, classification ceiling, purpose, and live risk (open HIGH/CRITICAL security alerts on the account) |
| Integrity | SHA-256 hash computed at upload, re-computed and compared on demand (`/api/documents/{id}/verify`) |
| Custody | Hash-chained `EvidenceCustodyEvent` records — each event's hash covers the previous event's hash |
| Accountability | Hash-chained `AuditEvent` ledger — append-only, no update/delete endpoint exists for it anywhere in the API |
| Anomaly detection | Rule-based simulation: unusual login hour, repeated failed logins, mass-download bursts — raises `SecurityAlert` records with actionable responses (Lock Session / Require MFA / Mark Reviewed / Dismiss) |

The backend **never trusts the frontend** for authorization — every route re-checks permissions via FastAPI dependencies, and the frontend's `utils/rbac.ts` mirror exists purely to hide irrelevant UI, not to gate anything.

## 6. AI Architecture

`app/ai/gemini_service.py` is the only code that talks to Gemini. Every method returns `(PydanticModel, is_live: bool)`; if `GEMINI_ENABLED=false`, the API key is missing, the call fails, or the response doesn't validate against the expected Pydantic schema, it **falls back to a deterministic mock provider** (`app/ai/mock_provider.py`) instead of crashing or returning unvalidated data. Every prompt (`app/ai/prompts.py`) explicitly instructs the model not to make legal conclusions, determine guilt/innocence, or accuse anyone, and to phrase any detected conflict as *"Potential inconsistency detected — human review required."*

## 7. Database

Tables: `users`, `role_permissions`, `cases`, `case_members`, `documents`, `document_versions`, `document_metadata`, `evidence_items`, `evidence_custody_events`, `audit_events`, `access_requests`, `access_logs`, `security_alerts`, `ai_analyses`, `ai_entities`, `ai_timeline_events`, `ai_contradictions`, `verification_certificates`, `notifications`. All use UUID primary keys and `created_at`/`updated_at` timestamps where relevant, with indexes on `case_id`, `document_id`, `user_id`, `timestamp`, `document_type`, and `classification`.

---

## 8. Installation

### Option A — Docker Compose (recommended)

```bash
cp backend/.env.example backend/.env      # edit if desired
docker compose up --build
```

This starts PostgreSQL, Redis, the FastAPI backend (`:8000`), and the frontend (`:5173`). Then seed demo data:

```bash
docker compose exec backend python seed.py
```

### Option B — Manual

**PostgreSQL:**

```bash
docker run -d --name nyayavault-pg -e POSTGRES_USER=nyayavault -e POSTGRES_PASSWORD=nyayavault -e POSTGRES_DB=nyayavault -p 5432:5432 postgres:16-alpine
```

**Backend:**

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate    # or: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env      # DATABASE_URL already points at the container above
python seed.py             # creates tables + synthetic demo data
uvicorn app.main:app --reload
```

**Frontend:**

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Visit `http://localhost:5173`.

### Environment variables

`backend/.env`:

```
DATABASE_URL=postgresql+psycopg2://nyayavault:nyayavault@localhost:5432/nyayavault
JWT_SECRET=change-this-to-a-long-random-secret-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_EXPIRE_MINUTES=30
JWT_REFRESH_EXPIRE_DAYS=7
GEMINI_ENABLED=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
UPLOAD_DIR=./uploads
MAX_UPLOAD_SIZE=26214400
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
REDIS_URL=redis://localhost:6379/0
REDIS_ENABLED=false
```

`frontend/.env`:

```
VITE_API_BASE_URL=http://localhost:8000
```

### Gemini API setup

1. Get a key from Google AI Studio.
2. In `backend/.env`, set `GEMINI_ENABLED=true` and `GEMINI_API_KEY=<your key>`.
3. Restart the backend. The Settings page shows whether AI is running live or in mock mode.

The API key is **read only from the environment on the backend** — it is never sent to, stored in, or reachable from the frontend.

---

## 9. Deploying to Vercel

The app deploys as **two separate Vercel projects** — one for `frontend/`, one for `backend/` — because they build and scale independently. The backend runs as a Python serverless function (`backend/api/index.py` re-exports the same FastAPI app used locally), so it needs external managed services in place of anything that assumed a persistent server: a cloud Postgres database, Vercel Blob for document storage, and no in-memory state (MFA/email-verification codes and failed-login counters are stored in the database for exactly this reason).

**1. Provision a Postgres database.** Any managed Postgres works; [Neon](https://neon.tech) or [Supabase](https://supabase.com) both have a free tier and a "pooled connection" string, which you want here — serverless functions open far more short-lived connections than an always-on server. Copy that pooled connection string.

**2. Deploy the backend.**
- In Vercel, "Add New Project" → import this repo → set **Root Directory** to `backend`.
- Environment variables:
  - `DATABASE_URL` = the pooled Postgres string from step 1 (must start `postgresql+psycopg2://`)
  - `JWT_SECRET` = a long random value (not the dev default)
  - `ENV` = `production`
  - `CORS_ORIGINS` = leave as `http://localhost:5173` for now — you'll add the real frontend URL in step 4
  - `GEMINI_ENABLED` / `GEMINI_API_KEY` / `GEMINI_MODEL` — optional, same as local dev
- Deploy. Note the resulting URL (e.g. `https://nyayavault-api.vercel.app`) — `/health` should return `{"status":"ok",...}`. Tables are created automatically on first request (`Base.metadata.create_all`); run `python seed.py` locally against the same `DATABASE_URL` if you want the synthetic demo data.

**3. Connect Vercel Blob (document storage).** In the backend project → Storage tab → Create → Blob. This injects `BLOB_READ_WRITE_TOKEN` automatically. Then open that store's settings and copy its public base URL (`https://<id>.public.blob.vercel-storage.com`) into the backend project's env vars as `BLOB_PUBLIC_BASE_URL` (this one is *not* injected automatically). Redeploy the backend so it picks up both variables — `app/documents/storage.py` switches from local disk to Blob automatically once `BLOB_READ_WRITE_TOKEN` is present.

**4. Deploy the frontend.**
- "Add New Project" → same repo → **Root Directory** = `frontend`.
- Environment variable: `VITE_API_BASE_URL` = the backend URL from step 2 (no trailing slash).
- Deploy. Note the resulting URL (e.g. `https://nyayavault.vercel.app`).

**5. Close the loop.** Back in the backend project's env vars, set `CORS_ORIGINS` to the frontend URL from step 4 and redeploy the backend. Without this the frontend loads but every API call fails CORS.

**Known platform limits to design around, not code around:**
- Vercel serverless functions cap request bodies around 4.5MB — large document uploads that work locally may be rejected there. `MAX_UPLOAD_SIZE` is app-level and doesn't change this platform limit.
- Function execution time is capped (`maxDuration: 60` is set in `backend/vercel.json`, itself capped by your Vercel plan) — a slow Gemini call on a cold start is the most likely thing to hit this.
- Cold starts add latency to the first request after idle; this is inherent to serverless and not something the app code controls.

---

## 10. Demo Accounts

All demo accounts use password **`Demo@1234`**, MFA code **`123456`**.

| Email | Role |
|---|---|
| `admin@nyayavault.demo` | System Admin |
| `officer@nyayavault.demo` | Investigating Officer |
| `forensic@nyayavault.demo` | Forensic Officer |
| `court@nyayavault.demo` | Court Officer |
| `auditor@nyayavault.demo` | Auditor |
| `legal@nyayavault.demo` | Legal Officer |
| `reviewer@nyayavault.demo` | Read-Only Reviewer |

`python seed.py` also creates 13 additional synthetic officers, 10 cases (headlined by **CASE-2026-00127 "Operation Silver Shield"**), 50+ documents, 50+ evidence items with custody events, 10 security alerts, a seeded AI-detected timeline contradiction, and an issued verification certificate for **`EVD-2026-000921`**.

## 11. Demo Walkthrough

1. Sign in as `officer@nyayavault.demo` → open **CASE-2026-00127**.
2. Review the case Overview, then open **AI Intelligence** to see the relationship graph, key people/locations, and summary.
3. Open **Evidence** → select `EVD-2026-000921` → **Verify Integrity** on its Evidence DNA card.
4. Open **Chain of Custody** for that evidence item.
5. Sign out, sign in as `auditor@nyayavault.demo` → open **Audit Trail**, confirm the hash chain shows "Chain Verified."
6. As `officer@nyayavault.demo`, open a **SEALED** document → the access-check panel denies access with a full explanation (classification exceeds role ceiling) — this is the "unauthorized access" demo beat.
7. Sign in as `court@nyayavault.demo` → **Court Verification** → search `EVD-2026-000921` → **Generate Verification Certificate** → view the printable certificate with its QR code.
8. Scan/open the QR URL (`/verify/{verification_id}`) in a private window — no login required, only safe metadata is shown.

## 12. API Documentation

Interactive docs are auto-generated by FastAPI:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## 13. Testing

```bash
cd backend
pytest -q
```

The suite specifically covers: unauthorized users cannot access restricted (SEALED) documents, sealed evidence has no content-mutation route, a tampered file produces `INTEGRITY_FAILED` on re-verification, the audit ledger has no delete/update route and its hash chain verifies, and a simulated Gemini outage falls back to the mock provider without raising.

## 14. Future Scope

- Alembic migrations (currently `Base.metadata.create_all` on startup, appropriate for a prototype).
- Vector-embedding semantic search (the search layer is already abstracted to support this).
- Real digital signature infrastructure (PKI) in place of the current signature abstraction.
- Production-grade rate limiting via Redis (the dependency is wired but not yet enforced per-route).

## 15. Legal & Ethical Notes

All data in this repository is synthetic. No real Aadhaar numbers, phone numbers, addresses, FIRs, witnesses, or government records are used anywhere, including in seed data. The AI layer summarizes, classifies, extracts entities, and flags potential inconsistencies for human review — it never determines guilt, innocence, or any legal outcome, and every AI-influenced surface in the product says so explicitly. Verification certificates state plainly that they are a technical record, not a legal determination, and NyayaVault does not claim to be independently legally admissible.
#   N y a y a v a u l t  
 