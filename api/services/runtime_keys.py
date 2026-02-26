"""Persistent runtime API key storage.

Stores user-provided API keys in a JSON file (settings.json) so they
survive server restarts.  Services should call get_key() to read a key,
falling back to environment variables when no user key is set.
"""

import json
import os
import threading
from pathlib import Path

_SETTINGS_FILE = Path(__file__).resolve().parents[2] / "settings.json"
_lock = threading.Lock()
_cache: dict[str, str] = {}


def _load() -> dict[str, str]:
    """Load settings from disk into cache."""
    global _cache
    try:
        if _SETTINGS_FILE.exists():
            _cache = json.loads(_SETTINGS_FILE.read_text(encoding="utf-8"))
        else:
            _cache = {}
    except (json.JSONDecodeError, OSError):
        _cache = {}
    return _cache


def _save() -> None:
    """Persist cache to disk."""
    try:
        _SETTINGS_FILE.write_text(json.dumps(_cache, indent=2), encoding="utf-8")
    except OSError:
        pass


# Load once on import
_load()


def get_key(key_name: str, env_fallback: str | None = None) -> str:
    """Return the user-provided key, falling back to env var then empty string."""
    with _lock:
        val = _cache.get(key_name, "").strip()
        if val:
            return val
    # Fallback to environment
    if env_fallback:
        return os.environ.get(env_fallback, "").strip()
    return ""


def set_key(key_name: str, value: str) -> None:
    """Store a key (persisted to settings.json)."""
    with _lock:
        _cache[key_name] = value.strip()
        _save()


def get_all_providers() -> dict:
    """Return provider info (which providers have keys set, not the keys themselves)."""
    with _lock:
        return {
            "agent_provider": _cache.get("agent_provider", "openrouter"),
            "agent_key_set": bool(_cache.get("openrouter_api_key", "").strip()),
            "media_provider": _cache.get("media_provider", "kie.ai"),
            "media_key_set": bool(_cache.get("kie_api_key", "").strip()),
            "imgbb_key_set": bool(_cache.get("imgbb_api_key", "").strip()),
        }


def set_all(data: dict) -> None:
    """Bulk update settings."""
    with _lock:
        for k, v in data.items():
            _cache[k] = v.strip() if isinstance(v, str) else v
        _save()
