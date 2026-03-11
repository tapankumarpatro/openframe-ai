"""Batch Creator endpoints — product analysis + prompt variation generation."""

import asyncio
import time
from fastapi import APIRouter, HTTPException

from api.models.api_schemas import (
    AnalyzeProductRequest,
    AnalyzeProductResponse,
    BatchGeneratePromptsRequest,
    BatchGeneratePromptsResponse,
    BatchPromptItemResponse,
)
from api.services.api_logger import ApiLogger

router = APIRouter(prefix="/api/batch", tags=["batch"])


# ── Product Image Analysis (Gemini Vision) ──

@router.post("/analyze-product", response_model=AnalyzeProductResponse)
async def analyze_product(req: AnalyzeProductRequest):
    """Use vision model (Gemini 2.5 Pro) to analyze a product image."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="product_analysis",
        model="gemini-vision",
        provider="openrouter",
        status="running",
        input_summary=f"label={req.product_label}, url={req.product_image_url[:80]}",
    )
    try:
        analysis = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_product_analysis(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Analysis: {len(analysis)} chars")
        return AnalyzeProductResponse(product_analysis=analysis)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


def _run_product_analysis(req: AnalyzeProductRequest) -> str:
    from src.agents.agent_12_product_analyzer import agent_12_product_analyzer
    return agent_12_product_analyzer(
        product_image_url=req.product_image_url,
        product_label=req.product_label,
        existing_description=req.existing_description,
    )


# ── Batch Prompt Generation ──

@router.post("/generate-prompts", response_model=BatchGeneratePromptsResponse)
async def generate_batch_prompts(req: BatchGeneratePromptsRequest):
    """Run vision analysis (if product image provided) then agent_11 for prompt variations."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="batch_prompt_generation",
        model="batch-creator",
        provider="openrouter",
        status="running",
        input_summary=f"batch_size={req.batch_size}, instructions={req.user_instructions[:80]}",
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_batch_creator(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Generated {len(result.items)} prompt variations")
        return BatchGeneratePromptsResponse(
            items=[
                BatchPromptItemResponse(style_label=item.style_label, prompt=item.prompt)
                for item in result.items
            ]
        )
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


def _run_batch_creator(req: BatchGeneratePromptsRequest):
    product_desc = req.product_description

    # If a product image URL is provided, run vision analysis first
    if req.product_image_url and req.product_image_url.startswith("http"):
        from src.agents.agent_12_product_analyzer import agent_12_product_analyzer
        from rich.console import Console
        Console().print("[bold magenta]Step 1/2: Analyzing product image with Gemini Vision...[/bold magenta]")
        vision_analysis = agent_12_product_analyzer(
            product_image_url=req.product_image_url,
            product_label="",
            existing_description=product_desc,
        )
        # Vision analysis overrides/augments the text description
        product_desc = vision_analysis
        Console().print("[bold magenta]Step 2/2: Generating prompt variations...[/bold magenta]")

    from src.agents.agent_11_batch_creator import agent_11_batch_creator
    return agent_11_batch_creator(
        reference_description=req.reference_description,
        user_instructions=req.user_instructions,
        batch_size=req.batch_size,
        concept=req.concept,
        technical_specs=req.technical_specs,
        reference_image_url=req.reference_image_url,
        product_description=product_desc,
        generation_mode=req.generation_mode,
        cast_description=req.cast_description,
        cast_image_url=req.cast_image_url,
    )
