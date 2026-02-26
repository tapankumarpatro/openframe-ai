"""License status & management endpoints."""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from api.services.license import (
    get_cached_license, validate_license, validate_key,
    save_license_key, generate_license_key, INSTANCE_ID,
)

router = APIRouter(prefix="/api/license")


class SaveKeyRequest(BaseModel):
    license_key: str


class GenerateKeyRequest(BaseModel):
    email: str
    company: str
    plan: str = "pro"


class ValidateKeyRequest(BaseModel):
    license_key: str


@router.get("/status")
async def license_status(license_key: Optional[str] = Query(None)):
    """Return current license status.
    
    If license_key is provided, validates that specific key (per-user mode).
    Otherwise returns the global cached status.
    """
    if license_key and license_key.strip():
        result = await validate_key(license_key)
        result["instance_id"] = INSTANCE_ID
        return result
    # No key provided — return community by default
    return {
        "instance_id": INSTANCE_ID,
        "plan": "community",
        "valid": False,
        "enforce": False,
        "message": "No license key — community mode",
    }


@router.post("/validate")
async def revalidate(req: Optional[ValidateKeyRequest] = None):
    """Validate a license key. If body contains license_key, validates that key.
    Otherwise re-validates the global key."""
    if req and req.license_key.strip():
        result = await validate_key(req.license_key)
        result["instance_id"] = INSTANCE_ID
        return result
    result = await validate_license()
    return result


@router.post("/save-key")
async def save_key(req: SaveKeyRequest):
    """Validate a license key and return its status.
    Also saves it globally for backward compat with single-user deployments."""
    save_license_key(req.license_key)
    result = await validate_key(req.license_key)
    result["instance_id"] = INSTANCE_ID
    return result


@router.post("/generate")
async def generate_key(req: GenerateKeyRequest):
    """Generate a new license key via n8n webhook."""
    try:
        data = await generate_license_key(req.email, req.company, req.plan)
        return data
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))
