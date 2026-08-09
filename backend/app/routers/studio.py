"""
Studio settings — logo upload and studio info.
"""

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import FileResponse

from app.core.auth import get_current_user

router = APIRouter(prefix="/studio", tags=["Studio"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"

UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED_TYPES = {
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
    "image/svg+xml",
}


# ============================================================
# UPLOAD LOGO
# JWT REQUIRED
# ============================================================

@router.post("/logo")
async def upload_logo(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Only PNG, JPG, WEBP or SVG images are allowed.",
        )

    ext = Path(file.filename).suffix.lower() or ".png"

    dest = UPLOAD_DIR / f"logo{ext}"

    # Remove previous logo
    for old in UPLOAD_DIR.glob("logo.*"):
        old.unlink()

    # Save new logo
    with dest.open("wb") as f:
        shutil.copyfileobj(file.file, f)

    return {
        "message": "Logo uploaded successfully",
        "path": "/studio/logo",
    }


# ============================================================
# GET LOGO
# PUBLIC
# ============================================================

@router.get("/logo")
def get_logo():
    for ext in [".png", ".jpg", ".jpeg", ".webp", ".svg"]:
        logo_path = UPLOAD_DIR / f"logo{ext}"

        if logo_path.exists():
            return FileResponse(str(logo_path))

    raise HTTPException(
        status_code=404,
        detail="No logo uploaded yet",
    )


# ============================================================
# STUDIO INFO
# PUBLIC
# ============================================================

@router.get("/info")
def get_studio_info():
    return {
        "name": os.getenv("STUDIO_NAME", "Antar Yoga"),
        "phone": os.getenv("STUDIO_PHONE", "+919916486812"),
        "email": os.getenv(
            "GMAIL_USER",
            "JASHWANTHRAJU2808@GMAIL.COM",
        ),
    }