"""Flux Kontext provider via kie.ai API — text-to-image + image editing."""

import asyncio
import logging
from typing import List, Optional

import httpx

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_headers, MAX_RETRIES, RETRY_DELAYS

logger = logging.getLogger(__name__)

FLUX_KONTEXT_URL = "https://api.kie.ai/api/v1/flux/kontext/generate"
FLUX_KONTEXT_STATUS_URL = "https://api.kie.ai/api/v1/flux/kontext/record-info"


class FluxKontextProvider(ImageProvider):
    """kie.ai wrapper for Flux Kontext Pro / Max."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        # Determine which sub-model to use based on the model id
        if "max" in request.model:
            flux_model = "flux-kontext-max"
        else:
            flux_model = "flux-kontext-pro"

        payload: dict = {
            "prompt": request.prompt,
            "model": flux_model,
            "aspectRatio": request.aspect_ratio,
            "outputFormat": "png",
            "promptUpsampling": False,
            "safetyTolerance": 2,
        }

        # inputImage for editing / reference (single URL)
        if request.image_urls and len(request.image_urls) > 0:
            payload["inputImage"] = request.image_urls[0]

        # Custom POST to the Flux Kontext endpoint (not the standard createTask)
        last_err: Exception = RuntimeError("Unknown error")
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.post(
                        FLUX_KONTEXT_URL,
                        json=payload,
                        headers=kie_headers(),
                    )
                    body = resp.json()

                code = body.get("code")
                if code != 200:
                    msg = body.get("msg", f"Flux Kontext error (HTTP {resp.status_code})")
                    raise RuntimeError(msg)

                return GenerationTask(
                    task_id=body["data"]["taskId"],
                    provider="flux-kontext",
                )
            except (httpx.ConnectError, httpx.TimeoutException, OSError) as e:
                last_err = e
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.warning(
                    "flux_kontext create attempt %d/%d failed (%s), retrying in %ds...",
                    attempt + 1, MAX_RETRIES, e, delay,
                )
                await asyncio.sleep(delay)
        raise RuntimeError(f"Flux Kontext create failed after {MAX_RETRIES} retries: {last_err}")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        """Flux Kontext uses its own record-info endpoint with a different response format."""
        last_err: Exception = RuntimeError("Unknown error")
        for attempt in range(MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=30) as client:
                    resp = await client.get(
                        FLUX_KONTEXT_STATUS_URL,
                        params={"taskId": task_id},
                        headers=kie_headers(),
                    )
                    body = resp.json()

                if body.get("code") != 200:
                    raise RuntimeError(body.get("msg", "Failed to query Flux Kontext task"))

                d = body["data"]
                success_flag = d.get("successFlag")
                error_msg = d.get("errorMessage") or d.get("errorCode")
                result_urls: Optional[List[str]] = None

                # Map successFlag to state string used by the polling loop
                if success_flag == 1:
                    state = "success"
                    response_data = d.get("response") or {}
                    result_url = response_data.get("resultImageUrl")
                    if result_url:
                        result_urls = [result_url]
                elif success_flag == -1 or error_msg:
                    state = "fail"
                else:
                    state = "processing"

                return TaskStatus(
                    task_id=task_id,
                    state=state,
                    result_urls=result_urls,
                    error_message=error_msg if error_msg else None,
                    cost_time=None,
                )
            except (httpx.ConnectError, httpx.TimeoutException, OSError) as e:
                last_err = e
                delay = RETRY_DELAYS[min(attempt, len(RETRY_DELAYS) - 1)]
                logger.warning(
                    "flux_kontext status attempt %d/%d failed (%s), retrying in %ds...",
                    attempt + 1, MAX_RETRIES, e, delay,
                )
                await asyncio.sleep(delay)
        raise RuntimeError(f"Flux Kontext status check failed after {MAX_RETRIES} retries: {last_err}")

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="flux-kontext/pro",
                name="Flux Kontext Pro",
                provider="flux-kontext",
                supports_image_input=True,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
                qualities=["basic"],
            ),
            ModelInfo(
                id="flux-kontext/max",
                name="Flux Kontext Max",
                provider="flux-kontext",
                supports_image_input=True,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16", "21:9"],
                qualities=["basic"],
            ),
        ]
