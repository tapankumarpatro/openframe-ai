"""Image upload endpoint — converts base64 images to publicly accessible HTTP URLs.

Uses imgbb.com (free, reliable) if IMGBB_API_KEY is set in .env.
Falls back to local serving otherwise.
"""

import base64
import hashlib
import logging
import os
import re
from pathlib import Path

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

logger = logging.getLogger(__name__)

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


def _read_imgbb_key() -> str:
    """Read IMGBB_API_KEY from env or .env file."""
    key = os.environ.get("IMGBB_API_KEY", "")
    if key:
        return key.strip()
    try:
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("IMGBB_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""

router = APIRouter(prefix="/api/upload", tags=["upload"])

UPLOAD_DIR = Path(__file__).resolve().parents[2] / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)

# Cache: content_hash → public URL (avoid re-uploading same image)
_url_cache: dict[str, str] = {}


class UploadRequest(BaseModel):
    image_base64: str  # data:image/...;base64,... or raw base64


class UploadResponse(BaseModel):
    url: str
    filename: str


def _parse_base64(data: str) -> tuple[str, bytes]:
    """Parse a data URL or raw base64 string. Returns (extension, raw bytes)."""
    m = re.match(r"^data:image/(\w+);base64,(.+)$", data, re.DOTALL)
    if m:
        ext = m.group(1).lower()
        if ext == "jpeg":
            ext = "jpg"
        raw = base64.b64decode(m.group(2))
        return ext, raw

    try:
        raw = base64.b64decode(data)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 data")

    if raw[:8] == b"\x89PNG\r\n\x1a\n":
        ext = "png"
    elif raw[:2] == b"\xff\xd8":
        ext = "jpg"
    elif raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        ext = "webp"
    else:
        ext = "png"

    return ext, raw


async def _upload_to_imgbb(raw: bytes, ext: str) -> str:
    """Upload bytes to imgbb.com and return a public URL. Requires IMGBB_API_KEY."""
    api_key = _read_imgbb_key()
    if not api_key:
        raise RuntimeError("IMGBB_API_KEY not set — add a free key from https://api.imgbb.com/ to .env")
    b64 = base64.b64encode(raw).decode()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.imgbb.com/1/upload",
            data={"key": api_key, "image": b64},
        )
    body = resp.json()
    if resp.status_code == 200 and body.get("success"):
        return body["data"]["url"]
    raise RuntimeError(f"imgbb upload failed: {body.get('error', {}).get('message', resp.text[:200])}")


async def resolve_image_urls(urls: list[str]) -> list[str]:
    """Convert a list of image URLs: base64 → public imgbb URL, http → passthrough.

    This is called by the image generation endpoint to ensure all reference
    images sent to kie.ai are publicly accessible HTTP URLs.
    """
    resolved: list[str] = []
    for url in urls:
        if url.startswith("http"):
            resolved.append(url)
        elif url.startswith("data:image"):
            try:
                ext, raw = _parse_base64(url)
                content_hash = hashlib.sha256(raw).hexdigest()[:16]
                if content_hash in _url_cache:
                    resolved.append(_url_cache[content_hash])
                    logger.info(f"[resolve] Cache hit {content_hash}")
                else:
                    public_url = await _upload_to_imgbb(raw, ext)
                    _url_cache[content_hash] = public_url
                    logger.info(f"[resolve] Uploaded base64 → {public_url}")
                    resolved.append(public_url)
            except Exception as e:
                logger.warning(f"[resolve] Failed to upload base64 image: {e}")
        # skip blob: or other unsupported schemes
    return resolved


@router.post("/image", response_model=UploadResponse)
async def upload_image(req: UploadRequest):
    """Upload a base64 image and return a publicly accessible HTTP URL."""
    ext, raw = _parse_base64(req.image_base64)

    content_hash = hashlib.sha256(raw).hexdigest()[:16]
    filename = f"{content_hash}.{ext}"

    # Check cache first
    if content_hash in _url_cache:
        logger.info(f"Cache hit for {filename} → {_url_cache[content_hash]}")
        return UploadResponse(url=_url_cache[content_hash], filename=filename)

    # Save locally as fallback
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        filepath.write_bytes(raw)

    # Upload to imgbb for a publicly accessible URL
    try:
        public_url = await _upload_to_imgbb(raw, ext)
        _url_cache[content_hash] = public_url
        logger.info(f"Uploaded {filename} → {public_url}")
        return UploadResponse(url=public_url, filename=filename)
    except Exception as e:
        logger.warning(f"Public upload failed, falling back to local: {e}")
        local_url = f"/api/upload/files/{filename}"
        return UploadResponse(url=local_url, filename=filename)


@router.get("/files/{filename}")
async def serve_uploaded_file(filename: str):
    """Serve a locally saved file (fallback)."""
    filepath = UPLOAD_DIR / filename
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found")

    ext = filepath.suffix.lower()
    media_types = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}
    media_type = media_types.get(ext, "application/octet-stream")

    return FileResponse(filepath, media_type=media_type)
