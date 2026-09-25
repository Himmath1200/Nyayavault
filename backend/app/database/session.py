import os
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings

# On Vercel (set automatically for every serverless invocation) each request can land on a
# fresh container, so a persistent connection pool just accumulates idle connections a
# short-lived Postgres plan will happily throttle. NullPool opens a connection per request and
# closes it immediately after — the right trade-off here; use a pooled Postgres connection
# string (e.g. Neon's or Supabase's pooler endpoint) to absorb the resulting churn.
_engine_kwargs = {"pool_pre_ping": True, "future": True}
if os.environ.get("VERCEL"):
    _engine_kwargs["poolclass"] = NullPool

engine = create_engine(settings.DATABASE_URL, **_engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, future=True)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
