"""Image generation endpoints — provider-agnostic."""

import time
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List
from dataclasses import asdict

from api.services.image_gen.registry import ProviderRegistry
from api.services.image_gen.base import GenerationRequest
from api.services.api_logger import ApiLogger
from api.services.license import report_event, check_license
from api.routes.upload import resolve_image_urls

router = APIRouter(prefix="/api/image", tags=["image"])


# ---------- request / response schemas ----------
class GenerateRequest(BaseModel):
    prompt: str
    model: str = "seedream/4.5"
    aspect_ratio: str = "1:1"
    quality: str = "basic"
    image_urls: Optional[List[str]] = None


class GenerateResponse(BaseModel):
    task_id: str
    provider: str


class TaskStatusResponse(BaseModel):
    task_id: str
    state: str
    result_urls: Optional[List[str]] = None
    error_message: Optional[str] = None
    cost_time: Optional[int] = None


class ModelResponse(BaseModel):
    id: str
    name: str
    provider: str
    supports_image_input: bool
    aspect_ratios: List[str]
    qualities: List[str]


# ---------- endpoints ----------
@router.post("/generate", response_model=GenerateResponse, dependencies=[Depends(check_license)])
async def generate_image(req: GenerateRequest):
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="image_generation",
        model=req.model,
        provider=req.model.split("/")[0] if "/" in req.model else req.model,
        status="running",
        input_summary=req.prompt[:120],
    )
    try:
        # Resolve any base64 data URLs to public HTTP URLs (imgbb)
        resolved_urls = None
        if req.image_urls:
            resolved_urls = await resolve_image_urls(req.image_urls)
            resolved_urls = resolved_urls if resolved_urls else None

        provider = ProviderRegistry.get_for_model(req.model)
        task = await provider.create_task(
            GenerationRequest(
                prompt=req.prompt,
                model=req.model,
                aspect_ratio=req.aspect_ratio,
                quality=req.quality,
                image_urls=resolved_urls,
            )
        )
        ApiLogger.update(log_entry.id, task_id=task.task_id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Task created: {task.task_id}")
        await report_event("image_generation")
        return GenerateResponse(task_id=task.task_id, provider=task.provider)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str, provider: str = "seedream"):
    try:
        prov = ProviderRegistry.get(provider)
        status = await prov.get_task_status(task_id)
        return TaskStatusResponse(
            task_id=status.task_id,
            state=status.state,
            result_urls=status.result_urls,
            error_message=status.error_message,
            cost_time=status.cost_time,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/models", response_model=List[ModelResponse])
async def list_models():
    return [asdict(m) for m in ProviderRegistry.all_models()]
