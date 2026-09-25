"""Vercel's Python runtime looks under api/ for a module exporting an ASGI `app` — this file
is that entrypoint. All it does is re-export the real FastAPI app from app/main.py so there is
exactly one FastAPI() instance and one place (app/main.py) that defines routes/middleware,
whether the app is run locally via `uvicorn app.main:app` or deployed on Vercel."""

from app.main import app

__all__ = ["app"]
