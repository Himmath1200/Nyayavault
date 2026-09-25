import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.database.base import Base
from app.database.session import engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nyayavault")


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title="NyayaVault API",
    description="Secure Digital Document Management System for Legal and Investigation Documents — NCRB Women Safety Division",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    # Dev convenience: a laptop's LAN/Wi-Fi IP changes across sessions (DHCP), which would
    # otherwise require editing CORS_ORIGINS by hand every time — instead, any private-network
    # address on our known dev ports is allowed automatically. Never enabled outside dev.
    allow_origin_regex=(
        r"^http://(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}):(5173|3000)$"
        if settings.ENV != "production"
        else None
    ),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    return response


# A catch-all registered via @app.exception_handler(Exception) runs at the OUTERMOST layer of
# the app (Starlette's ServerErrorMiddleware) — outside every middleware added via
# add_middleware()/@app.middleware("http"), CORSMiddleware included. That means any unhandled
# error would ship with no CORS headers, and browsers silently discard such a response before
# JS ever sees it — surfacing as a generic "Network Error" no matter what actually failed. A
# plain middleware wrapping call_next() in try/except runs *inside* CORSMiddleware instead, so
# error responses get the same CORS/security headers as every other response.
@app.middleware("http")
async def unhandled_exception_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception:
        logger.exception("Unhandled exception on %s %s", request.method, request.url.path)
        return JSONResponse(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, content={"detail": "An internal error occurred."})


app.include_router(api_router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "nyayavault-backend", "ai_enabled": settings.GEMINI_ENABLED}
