"""Nano Banana 2 provider via kie.ai API — text-to-image + image editing."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status

# Map quality field to Nano Banana 2 resolution values
_QUALITY_TO_RESOLUTION = {
    "1K": "1K",
    "2K": "2K",
    "4K": "4K",
    # Friendly aliases
    "basic": "1K",
    "high": "2K",
    "ultra": "4K",
}


class NanoBanana2Provider(ImageProvider):
    """kie.ai wrapper for Nano Banana 2."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        resolution = _QUALITY_TO_RESOLUTION.get(request.quality, "1K")

        payload: dict = {
            "model": "nano-banana-2",
            "input": {
                "prompt": request.prompt,
                "aspect_ratio": request.aspect_ratio,
                "resolution": resolution,
                "output_format": "png",
            },
        }

        # image_input for editing / reference
        if request.image_urls:
            payload["input"]["image_input"] = request.image_urls

        return await kie_create_task(payload, "nano-banana-2")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="nano-banana/2",
                name="Nano Banana 2",
                provider="nano-banana-2",
                supports_image_input=True,
                aspect_ratios=["1:1", "1:4", "1:8", "2:3", "3:2", "3:4", "4:1", "4:3", "4:5", "5:4", "8:1", "9:16", "16:9", "21:9"],
                qualities=["1K", "2K", "4K"],
            ),
        ]
