"""OpenFrame AI — License enforcement & telemetry.

Architecture (same pattern as OpenRouter / Stripe API keys):
  ┌─────────────────┐         ┌──────────────────┐         ┌──────────┐
  │  OpenFrame App   │ ──────▶ │  n8n webhook      │ ──────▶ │ Supabase │
  │  (this code)     │ ◀────── │  (your server)    │ ◀────── │ (your DB)│
  └─────────────────┘         └──────────────────┘         └──────────┘

  - App sends license_key → n8n validates against Supabase → returns result
  - Enforcement decision comes from SERVER (n8n), not local code
  - When you want to enforce: flip a flag in Supabase → all instances obey
  - Periodic re-validation every 6 hours so server stays in control
  - User only sets OPENFRAME_LICENSE_KEY in .env
"""

import os
import uuid
import time
import asyncio
import platform
import logging
import hashlib
import httpx
from pathlib import Path
from typing import Optional
from fastapi import HTTPException
from api.services.runtime_keys import get_key as _runtime_get_key, set_key as _runtime_set_key

logger = logging.getLogger("openframe.license")

# ── n8n production webhook URLs ───────────────────────────────────────────────
# Replace these with your actual n8n production webhook URLs before publishing.
# These are the ONLY external URLs the app calls for licensing.
_V = "https://ai-automation-n8n.panaiq.com/webhook/openframe-license-validate"
_T = "https://ai-automation-n8n.panaiq.com/webhook/of-telemetry-v2"
_KG = "https://ai-automation-n8n.panaiq.com/webhook/of-keygen-v2"

_APP_VERSION = "1.0.0"
_REVALIDATE_INTERVAL = 6 * 60 * 60  # Re-validate every 6 hours

# ── Instance fingerprint (persisted to disk so it survives restarts) ──────────
_DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "data")
_IID_FILE = os.path.join(_DATA_DIR, ".instance_id")


def _get_instance_id() -> str:
    os.makedirs(_DATA_DIR, exist_ok=True)
    if os.path.exists(_IID_FILE):
        return Path(_IID_FILE).read_text().strip()
    iid = f"of-{uuid.uuid4().hex[:16]}"
    Path(_IID_FILE).write_text(iid)
    return iid


INSTANCE_ID = _get_instance_id()


def _get_license_key() -> str:
    """Read license key from settings.json first, then .env fallback."""
    return _runtime_get_key("license_key", "OPENFRAME_LICENSE_KEY")


def save_license_key(key: str) -> None:
    """Persist a license key to settings.json (called from API route)."""
    _runtime_set_key("license_key", key)


async def generate_license_key(email: str, company: str, plan: str = "pro") -> dict:
    """Call n8n keygen webhook to create a new license key."""
    async with httpx.AsyncClient(timeout=15) as c:
        r = await c.post(_KG, headers={"Content-Type": "application/json"}, json={
            "email": email,
            "company": company,
            "plan": plan,
        })
        if r.status_code != 200:
            raise Exception(f"Key generation failed: HTTP {r.status_code}")
        return r.json()


# ── License state (server-controlled) ────────────────────────────────────────
_state: dict = {
    "instance_id": INSTANCE_ID,
    "plan": "community",
    "valid": False,
    "enforce": False,       # Controlled by YOUR server, not local code
    "message": "Not yet validated",
    "validated_at": 0,
}
_sig: str = ""  # Integrity check


def _compute_sig(s: dict) -> str:
    raw = f"{s['valid']}:{s['enforce']}:{s['plan']}:{s['validated_at']}:{INSTANCE_ID}"
    return hashlib.sha256(raw.encode()).hexdigest()[:16]


async def validate_license() -> dict:
    """Validate license key against the server. Called on startup + periodically."""
    global _state, _sig

    key = _get_license_key()
    result = {
        "instance_id": INSTANCE_ID,
        "plan": "community",
        "valid": False,
        "enforce": False,
        "message": "",
        "validated_at": time.time(),
    }

    if not key:
        result["message"] = "No license key — community mode"
        _state = result
        _sig = _compute_sig(_state)
        await _telemetry("heartbeat")
        logger.info("License: Community mode (instance: %s)", INSTANCE_ID)
        return result

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(_V, headers={"Content-Type": "application/json"}, json={
                "license_key": key,
                "instance_id": INSTANCE_ID,
                "app_version": _APP_VERSION,
                "os_info": f"{platform.system()} {platform.release()}",
            })
            if r.status_code == 200:
                d = r.json()
                result["valid"] = d.get("valid", False)
                result["plan"] = d.get("plan", "community")
                result["enforce"] = d.get("enforce", False)
                result["message"] = d.get("message", "")
                logger.info("License: valid=%s plan=%s enforce=%s (instance: %s)",
                            result["valid"], result["plan"], result["enforce"], INSTANCE_ID)
            else:
                result["message"] = f"Validation returned HTTP {r.status_code}"
                logger.warning("License: HTTP %d", r.status_code)
    except Exception as e:
        result["message"] = f"Server unreachable — community mode"
        logger.info("License: Unreachable — community mode (%s)", e)

    _state = result
    _sig = _compute_sig(_state)
    return result


def get_cached_license() -> dict:
    """Return current license state (for /api/license/status endpoint)."""
    return {k: v for k, v in _state.items() if k != "validated_at"}


async def validate_key(key: str) -> dict:
    """Validate a specific license key (for per-user validation).
    
    Unlike validate_license() which uses the global key from settings.json,
    this accepts any key and returns its status without mutating global state.
    """
    result = {
        "instance_id": INSTANCE_ID,
        "plan": "community",
        "valid": False,
        "enforce": False,
        "message": "",
    }

    if not key or not key.strip():
        result["message"] = "No license key — community mode"
        return result

    try:
        async with httpx.AsyncClient(timeout=10) as c:
            r = await c.post(_V, headers={"Content-Type": "application/json"}, json={
                "license_key": key.strip(),
                "instance_id": INSTANCE_ID,
                "app_version": _APP_VERSION,
                "os_info": f"{platform.system()} {platform.release()}",
            })
            if r.status_code == 200:
                d = r.json()
                result["valid"] = d.get("valid", False)
                result["plan"] = d.get("plan", "community")
                result["enforce"] = d.get("enforce", False)
                result["message"] = d.get("message", "")
            else:
                result["message"] = f"Validation returned HTTP {r.status_code}"
    except Exception as e:
        result["message"] = f"Server unreachable — community mode"
        logger.info("License validate_key: Unreachable (%s)", e)

    return result


async def check_license():
    """FastAPI dependency — enforces license on generation endpoints.
    
    If the server says enforce=True and the key is invalid → HTTP 403.
    This decision comes from YOUR n8n server, not local code.
    Periodic re-validation ensures the server stays in control.
    """
    # Integrity check — detect if someone tampered with cached state
    if _sig != _compute_sig(_state):
        raise HTTPException(status_code=403, detail="License validation error — restart required")

    # Re-validate if cache is stale
    age = time.time() - _state.get("validated_at", 0)
    if age > _REVALIDATE_INTERVAL:
        await validate_license()

    # Enforcement is decided by the server
    if _state.get("enforce") and not _state.get("valid"):
        raise HTTPException(
            status_code=403,
            detail="Valid license required. Get your key at https://openframe.ai/license"
        )


async def _telemetry(event_type: str):
    """Fire-and-forget telemetry to n8n webhook."""
    try:
        key = _get_license_key() or None
        async with httpx.AsyncClient(timeout=5) as c:
            await c.post(_T, headers={"Content-Type": "application/json"}, json={
                "instance_id": INSTANCE_ID,
                "license_key": key,
                "event_type": event_type,
                "app_version": _APP_VERSION,
                "os_info": f"{platform.system()} {platform.release()}",
            })
    except Exception:
        pass


async def report_event(event_type: str):
    """Report a usage event (called from generation endpoints).
    
    event_type: "workflow_run" | "image_generation" | "video_generation" | "audio_generation"
    """
    await _telemetry(event_type)


async def _periodic_revalidation():
    """Background task: re-validates license every 6 hours."""
    while True:
        await asyncio.sleep(_REVALIDATE_INTERVAL)
        try:
            await validate_license()
        except Exception:
            pass
