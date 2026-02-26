"""Z Image provider via kie.ai API — text-to-image only."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status


class ZImageProvider(ImageProvider):
    """kie.ai wrapper for Z Image."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        payload: dict = {
            "model": "z-image",
            "input": {
                "prompt": request.prompt,
                "aspect_ratio": request.aspect_ratio,
            },
        }

        return await kie_create_task(payload, "z-image")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="z-image/1.0",
                name="Z Image",
                provider="z-image",
                supports_image_input=False,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16"],
                qualities=[],
            ),
        ]
