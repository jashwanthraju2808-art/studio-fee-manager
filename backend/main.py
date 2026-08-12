from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.database.init_db import *  # noqa: F401, F403 — runs create_all + seeds on startup
from app.core.auth import get_current_user
from app.routers.auth import router as auth_router
from app.routers.members import router as member_router
from app.routers.payment import router as payment_router
from app.routers.attendance import router as attendance_router
from app.routers.dashboard import router as dashboard_router
from app.routers.batches import router as batch_router
from app.routers.notifications import router as notification_router
from app.routers.studio import router as studio_router
from app.routers.users import router as users_router
from app.routers.audit_logs import router as audit_logs_router
from app.routers.export import router as export_router
from app.routers.import_data import router as import_router
from app.routers.cron import router as cron_router

app = FastAPI(
    title="Studio Fee Manager API",
    version="1.0.0",
    description="Antar Yoga — Studio Fee Manager",
)

# ── CORS ───────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://studio-fee-manager.onrender.com",
        "https://antar-yoga.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Public routes (no auth needed) ────────────────────────────
app.include_router(auth_router)

# Cron job uses its own CRON_SECRET header auth — not JWT
app.include_router(cron_router)

# ── Protected routes (JWT required globally) ──────────────────
protected = {"dependencies": [Depends(get_current_user)]}

app.include_router(member_router,       **protected)
app.include_router(payment_router,      **protected)
app.include_router(attendance_router,   **protected)
app.include_router(dashboard_router,    **protected)
app.include_router(batch_router,        **protected)
app.include_router(notification_router, **protected)
app.include_router(export_router,       **protected)

# These routers handle auth per-endpoint (require_admin inside each route)
app.include_router(studio_router)
app.include_router(users_router)
app.include_router(audit_logs_router)
app.include_router(import_router)

# ── Static uploads (logos etc.) ───────────────────────────────
uploads_dir = Path(__file__).parent / "uploads"
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")


@app.get("/", tags=["Health"])
def home():
    return {"message": "Welcome to Antar Yoga — Studio Fee Manager API"}


@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
