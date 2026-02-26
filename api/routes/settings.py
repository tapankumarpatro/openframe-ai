"""Settings endpoints — API key management."""

from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional

from api.services.runtime_keys import get_all_providers, set_all, get_key

router = APIRouter(prefix="/api/settings", tags=["settings"])


class SaveKeysRequest(BaseModel):
    agent_provider: str = "openrouter"
    agent_api_key: Optional[str] = None
    media_provider: str = "kie.ai"
    media_api_key: Optional[str] = None
    imgbb_api_key: Optional[str] = None


class ProviderStatus(BaseModel):
    agent_provider: str
    agent_key_set: bool
    media_provider: str
    media_key_set: bool
    imgbb_key_set: bool = False


def _mask_key(key: str) -> str:
    """Return first 5 chars + asterisks, or empty if no key."""
    if not key:
        return ""
    if len(key) <= 5:
        return key
    return key[:5] + "*" * min(len(key) - 5, 16)


class ProviderStatusWithPreview(ProviderStatus):
    agent_key_preview: str = ""
    media_key_preview: str = ""
    imgbb_key_preview: str = ""


@router.get("/keys", response_model=ProviderStatusWithPreview)
async def get_keys_status():
    """Return which providers are configured + masked key previews."""
    info = get_all_providers()
    # Get actual keys for masking
    agent_key = get_key("openrouter_api_key", "OPENROUTER_API_KEY")
    media_key = get_key("kie_api_key", "KIE_API_KEY")
    imgbb_key = get_key("imgbb_api_key", "IMGBB_API_KEY")
    # Update status from env fallbacks
    if not info["agent_key_set"]:
        info["agent_key_set"] = bool(agent_key)
    if not info["media_key_set"]:
        info["media_key_set"] = bool(media_key)
    if not info["imgbb_key_set"]:
        info["imgbb_key_set"] = bool(imgbb_key)
    return ProviderStatusWithPreview(
        **info,
        agent_key_preview=_mask_key(agent_key),
        media_key_preview=_mask_key(media_key),
        imgbb_key_preview=_mask_key(imgbb_key),
    )


@router.post("/keys", response_model=ProviderStatus)
async def save_keys(req: SaveKeysRequest):
    """Save API keys for providers. Keys are persisted in settings.json."""
    data: dict = {
        "agent_provider": req.agent_provider,
        "media_provider": req.media_provider,
    }
    if req.agent_api_key is not None:
        data["openrouter_api_key"] = req.agent_api_key
    if req.media_api_key is not None:
        data["kie_api_key"] = req.media_api_key
    if req.imgbb_api_key is not None:
        data["imgbb_api_key"] = req.imgbb_api_key
    set_all(data)
    return await get_keys_status()
