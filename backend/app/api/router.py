from fastapi import APIRouter

from app.api import access, ai, audit, auth, cases, dashboard, documents, evidence, notifications, security, users, verify

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(cases.router)
api_router.include_router(documents.router)
api_router.include_router(evidence.router)
api_router.include_router(ai.router)
api_router.include_router(security.router)
api_router.include_router(audit.router)
api_router.include_router(verify.router)
api_router.include_router(access.router)
api_router.include_router(users.router)
api_router.include_router(notifications.router)
api_router.include_router(dashboard.router)
