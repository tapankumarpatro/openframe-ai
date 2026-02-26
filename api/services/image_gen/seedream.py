"""Seedream 4.5 provider via kie.ai API."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status


class SeedreamProvider(ImageProvider):
    """kie.ai wrapper for Seedream 4.5 Edit."""

    # ---- create task ----
    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        # Auto-select kie.ai model: edit (requires images) vs text-to-image
        has_images = bool(request.image_urls)
        kie_model = "seedream/4.5-edit" if has_images else "seedream/4.5-text-to-image"

        payload: dict = {
            "model": kie_model,
            "input": {
                "prompt": request.prompt,
                "aspect_ratio": request.aspect_ratio,
                "quality": request.quality or "basic",
            },
        }
        if has_images:
            payload["input"]["image_urls"] = request.image_urls

        return await kie_create_task(payload, "seedream")

    # ---- poll status ----
    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    # ---- available models ----
    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="seedream/4.5",
                name="Seedream 4.5",
                provider="seedream",
                supports_image_input=True,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16", "2:3", "3:2", "21:9"],
                qualities=["basic", "high"],
            ),
        ]
