"""Shared helpers for all kie.ai-based image generation providers."""

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional, List

import httpx

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [2, 5, 10]  # seconds between retries

from .base import GenerationTask, TaskStatus

KIE_BASE = "https://api.kie.ai/api/v1/jobs"
_ENV_PATH = Path(__file__).resolve().parents[3] / ".env"


def read_kie_key() -> str:
    """Read KIE_API_KEY: user-provided (settings.json) → env var → .env file."""
    # 1. Check user-provided key from settings UI
    try:
        from api.services.runtime_keys import get_key
        user_key = get_key("kie_api_key")
        if user_key:
            return user_key
    except Exception:
        pass
    # 2. Environment variable
    key = os.environ.get("KIE_API_KEY", "")
    if key:
        return key.strip()
    # 3. Direct .env file read
    try:
        for line in _ENV_PATH.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line.startswith("KIE_API_KEY=") and not line.startswith("#"):
                return line.split("=", 1)[1].strip().strip("'\"")
    except FileNotFoundError:
        pass
    return ""


def kie_headers() -> dict:
    """Build authorization headers for kie.ai API."""
    key = read_kie_key()
    if not key:
        raise RuntimeError("KIE_API_KEY is not set — add it to .env")
    return {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }


async def kie_create_task(payload: dict, provider_name: str) -> GenerationTask:
    """POST to kie.ai createTask with automatic retry on transient errors."""
    last_err: Exception = RuntimeError("Unknown error")
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.post(
                    f"{KIE_BASE}/createTask",
                    json=payload,
                    headers=kie_headers(),
                )
                body = resp.json()

            code = body.get("code")
            if code != 200:
                msg = body.get("msg", f"kie.ai error (HTTP {resp.status_code})")
                raise RuntimeError(msg)

            return GenerationTask(
                task_id=body["data"]["taskId"],
                provider=provider_name,
            )
        except (httpx.ConnectError, httpx.TimeoutException, OSError) as e:
            last_err = e
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
            logger.warning("kie_create_task attempt %d/%d failed (%s), retrying in %ds...", attempt + 1, MAX_RETRIES, e, delay)
            await asyncio.sleep(delay)
    raise RuntimeError(f"kie.ai createTask failed after {MAX_RETRIES} retries: {last_err}")


async def kie_get_task_status(task_id: str) -> TaskStatus:
    """GET kie.ai recordInfo with automatic retry on transient errors."""
    last_err: Exception = RuntimeError("Unknown error")
    for attempt in range(MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                resp = await client.get(
                    f"{KIE_BASE}/recordInfo",
                    params={"taskId": task_id},
                    headers=kie_headers(),
                )
                body = resp.json()

            if body.get("code") != 200:
                raise RuntimeError(body.get("msg", "Failed to query task"))

            d = body["data"]
            result_urls: Optional[List[str]] = None
            if d.get("resultJson"):
                try:
                    result_urls = json.loads(d["resultJson"]).get("resultUrls")
                except (json.JSONDecodeError, KeyError):
                    pass

            return TaskStatus(
                task_id=task_id,
                state=d["state"],
                result_urls=result_urls,
                error_message=d.get("failMsg"),
                cost_time=d.get("costTime"),
            )
        except (httpx.ConnectError, httpx.TimeoutException, OSError) as e:
            last_err = e
            delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
            logger.warning("kie_get_task_status attempt %d/%d failed (%s), retrying in %ds...", attempt + 1, MAX_RETRIES, e, delay)
            await asyncio.sleep(delay)
    raise RuntimeError(f"Status check failed after {MAX_RETRIES} retries: {last_err}")
