import json
import time
import asyncio
from fastapi import APIRouter, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from api.models.api_schemas import (
    WorkflowRequest, WorkflowResponse, WorkflowResult,
    ResumeWorkflowRequest,
    EnhancePromptsRequest, EnhancePromptsResponse,
    EnhanceVideoPromptsRequest, EnhanceVideoPromptsResponse,
    EnhanceSceneAudioRequest, EnhanceSceneAudioResponse,
    EnhanceAssetPromptRequest, EnhanceAssetPromptResponse,
    EnhanceBatchInstructionsRequest, EnhanceBatchInstructionsResponse,
    RunSingleAgentRequest, RunSingleAgentResponse,
)
from api.services import runner
from api.services.api_logger import ApiLogger
from api.services.license import report_event, check_license

router = APIRouter(prefix="/api/workflow")


@router.post("/run", response_model=WorkflowResponse, dependencies=[Depends(check_license)])
async def run_workflow(req: WorkflowRequest):
    """Start a new workflow run. Returns workflow_id immediately."""
    # Convert agent_models from Pydantic to plain dicts for state
    agent_models_dict = None
    if req.agent_models:
        agent_models_dict = {k: v.model_dump(exclude_none=True) for k, v in req.agent_models.items()}
    workflow_id = runner.start_workflow(req.user_input, ad_type=req.ad_type, product_image=req.product_image, agent_models=agent_models_dict)
    ApiLogger.log(
        call_type="workflow_pipeline",
        model="7-agent-pipeline",
        provider="openrouter",
        task_id=workflow_id,
        status="running",
        input_summary=req.user_input[:120],
        estimated_credits=0.10,
    )
    await report_event("workflow_run")
    return WorkflowResponse(workflow_id=workflow_id, status="running")


@router.post("/resume", response_model=WorkflowResponse)
async def resume_workflow(req: ResumeWorkflowRequest):
    """Resume a failed workflow from where it left off. Skips already-completed agents."""
    agent_models_dict = None
    if req.agent_models:
        agent_models_dict = {k: v.model_dump(exclude_none=True) for k, v in req.agent_models.items()}
    workflow_id = runner.resume_workflow(
        req.workflow_id, req.user_input,
        ad_type=req.ad_type, product_image=req.product_image,
        existing_outputs=req.existing_outputs, agent_models=agent_models_dict,
    )
    completed = [k for k, v in req.existing_outputs.items() if v]
    ApiLogger.log(
        call_type="workflow_pipeline",
        model="7-agent-pipeline",
        provider="openrouter",
        task_id=workflow_id,
        status="running",
        input_summary=f"RESUME ({len(completed)} done): {req.user_input[:80]}",
        estimated_credits=0.05,
    )
    return WorkflowResponse(workflow_id=workflow_id, status="running")


@router.get("/{workflow_id}/stream")
async def stream_events(workflow_id: str):
    """SSE stream of agent status events for a running workflow."""
    q = runner.subscribe(workflow_id)
    if q is None:
        raise HTTPException(status_code=404, detail="Workflow not found")

    async def event_generator():
        try:
            while True:
                try:
                    event = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: q.get(timeout=1.0)
                    )
                    yield {
                        "event": "agent_update",
                        "data": json.dumps(event),
                    }
                    # Terminal event
                    if event.get("agent") == "__done__":
                        break
                except Exception:
                    # Queue.get timeout — just keep waiting
                    # Check if workflow is done
                    wf = runner.get_workflow(workflow_id)
                    if wf and wf["status"] in ("completed", "error"):
                        # Drain remaining events
                        while not q.empty():
                            event = q.get_nowait()
                            yield {
                                "event": "agent_update",
                                "data": json.dumps(event),
                            }
                        break
        finally:
            runner.unsubscribe(workflow_id, q)

    return EventSourceResponse(event_generator())


@router.get("/{workflow_id}/result", response_model=WorkflowResult)
async def get_result(workflow_id: str):
    """Get the current status and result of a workflow."""
    wf = runner.get_workflow(workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    return WorkflowResult(**wf)


@router.post("/enhance-prompts", response_model=EnhancePromptsResponse)
async def enhance_prompts(req: EnhancePromptsRequest):
    """Run agent_8 to write or enhance start/end image prompts for a single scene."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="prompt_enhancement",
        model="prompt-writer",
        provider="openrouter",
        status="running",
        input_summary=f"Scene {req.scene_info.get('scene_number', '?')}: {(req.user_instructions or 'auto')[:80]}",
        estimated_credits=0.01,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_prompt_writer(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Prompts generated ({len(result.start_image_prompt)} + {len(result.end_image_prompt)} chars)")
        return EnhancePromptsResponse(
            start_image_prompt=result.start_image_prompt,
            end_image_prompt=result.end_image_prompt,
        )
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhance-video-prompts", response_model=EnhanceVideoPromptsResponse)
async def enhance_video_prompts(req: EnhanceVideoPromptsRequest):
    """Run agent_10 to write or enhance start/end/combined video prompts for a single scene."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="video_prompt_enhancement",
        model="video-prompt-writer",
        provider="openrouter",
        status="running",
        input_summary=f"Scene {req.scene_info.get('scene_number', '?')}: {(req.user_instructions or 'auto')[:80]}",
        estimated_credits=0.01,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_video_prompt_writer(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Video prompts generated ({len(result.start_video_prompt)} + {len(result.end_video_prompt)} + {len(result.combined_video_prompt)} chars)")
        return EnhanceVideoPromptsResponse(
            start_video_prompt=result.start_video_prompt,
            end_video_prompt=result.end_video_prompt,
            combined_video_prompt=result.combined_video_prompt,
        )
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/enhance-scene-audio", response_model=EnhanceSceneAudioResponse)
async def enhance_scene_audio(req: EnhanceSceneAudioRequest):
    """Run agent_9 to generate dialogue, voice prompt, and updated video prompts when audio mode changes."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="scene_audio_enhancement",
        model="scene-audio-enhancer",
        provider="openrouter",
        status="running",
        input_summary=f"Scene {req.scene_info.get('scene_number', '?')}: mode={req.audio_mode}",
        estimated_credits=0.01,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_scene_audio(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Audio enhanced: {len(result.dialogue)} chars dialogue")
        return EnhanceSceneAudioResponse(
            dialogue=result.dialogue,
            dialogue_speaker=result.dialogue_speaker,
            scene_voice_prompt=result.scene_voice_prompt,
            combined_video_prompt=result.combined_video_prompt,
            start_video_prompt=result.start_video_prompt,
            end_video_prompt=result.end_video_prompt,
        )
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


def _run_scene_audio(req: EnhanceSceneAudioRequest):
    from src.agents.agent_9_scene_audio import agent_9_scene_audio
    return agent_9_scene_audio(
        scene_info=req.scene_info,
        connected_assets=req.connected_assets,
        concept=req.concept,
        audio_mode=req.audio_mode,
        existing_start_video_prompt=req.existing_start_video_prompt,
        existing_end_video_prompt=req.existing_end_video_prompt,
        existing_combined_video_prompt=req.existing_combined_video_prompt,
        existing_dialogue=req.existing_dialogue,
        user_instructions=req.user_instructions,
    )


@router.post("/enhance-asset-prompt", response_model=EnhanceAssetPromptResponse)
async def enhance_asset_prompt(req: EnhanceAssetPromptRequest):
    """Use LLM to write or enhance a key asset's visual prompt."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="asset_prompt_enhancement",
        model="prompt-writer",
        provider="openrouter",
        status="running",
        input_summary=f"{req.asset_type}/{req.asset_label}: {(req.user_instructions or 'auto')[:80]}",
        estimated_credits=0.005,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_asset_prompt_writer(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Asset prompt: {len(result)} chars")
        return EnhanceAssetPromptResponse(enhanced_prompt=result)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


def _run_asset_prompt_writer(req: EnhanceAssetPromptRequest) -> str:
    from src.utils import call_agent_model
    type_hints = {
        "character": "a fashion/luxury cast member or model for an advertisement",
        "environment": "a setting or environment/location for an advertisement shoot",
        "product": "a luxury product being advertised",
    }
    hint = type_hints.get(req.asset_type, "an advertisement asset")
    system = (
        "You are an expert prompt writer for AI image generation in fashion & luxury advertising. "
        "Write a single, detailed visual prompt for generating an image of {hint}. "
        "Include: appearance, pose/composition, lighting, mood, style, camera angle. "
        "Output ONLY the prompt text, nothing else."
    ).format(hint=hint)
    user_parts = []
    if req.asset_label:
        user_parts.append(f"Asset: {req.asset_label}")
    if req.concept:
        user_parts.append(f"Campaign concept: {req.concept}")
    if req.existing_prompt:
        user_parts.append(f"Current prompt to enhance:\n{req.existing_prompt}")
    else:
        user_parts.append("No existing prompt — write one from scratch.")
    if req.user_instructions:
        user_parts.append(f"User instructions: {req.user_instructions}")
    user_msg = "\n\n".join(user_parts)
    result = call_agent_model(system, user_msg)
    return result.strip()


@router.post("/enhance-batch-instructions", response_model=EnhanceBatchInstructionsResponse)
async def enhance_batch_instructions(req: EnhanceBatchInstructionsRequest):
    """Use LLM to write or enhance batch creator instructions."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="batch_instructions_enhancement",
        model="prompt-writer",
        provider="openrouter",
        status="running",
        input_summary=f"batch instructions: {(req.existing_instructions or req.user_hint or 'auto')[:80]}",
        estimated_credits=0.005,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_batch_instructions_writer(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Batch instructions: {len(result)} chars")
        return EnhanceBatchInstructionsResponse(enhanced_instructions=result)
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


def _run_batch_instructions_writer(req: EnhanceBatchInstructionsRequest) -> str:
    from src.utils import call_agent_model
    system = (
        "You are an expert creative director for fashion & luxury advertising. "
        "Your job is to write or improve batch image generation instructions. "
        "These instructions guide an AI to generate multiple advertising image variations.\n\n"
        "Write clear, vivid instructions that specify:\n"
        "- The type of shoot (product photography, model photoshoot, campaign, lookbook, editorial, etc.)\n"
        "- Visual style and mood (moody, bright, cinematic, minimalist, etc.)\n"
        "- Environment/setting preferences\n"
        "- Lighting and color palette direction\n"
        "- Any specific poses, compositions, or angles\n"
        "- What should vary across the batch (outfits, settings, moods, angles, etc.)\n\n"
        "Keep it concise but detailed — 2-4 sentences. "
        "Output ONLY the instructions text, nothing else. No quotes, no prefix."
    )
    user_parts = []
    if req.existing_instructions:
        user_parts.append(f"Current instructions to enhance:\n{req.existing_instructions}")
    else:
        user_parts.append("No existing instructions — write from scratch.")
    if req.product_description:
        user_parts.append(f"Product being advertised: {req.product_description[:300]}")
    if req.cast_description:
        user_parts.append(f"Cast/model description: {req.cast_description[:300]}")
    if req.concept:
        user_parts.append(f"Campaign concept: {req.concept}")
    if req.user_hint:
        user_parts.append(f"User hint: {req.user_hint}")
    user_msg = "\n\n".join(user_parts)
    result = call_agent_model(system, user_msg)
    return result.strip()


@router.post("/run-single-agent", response_model=RunSingleAgentResponse)
async def run_single_agent(req: RunSingleAgentRequest):
    """Run a single agent with existing context. Synthesizes missing upstream data."""
    t0 = time.time()
    log_entry = ApiLogger.log(
        call_type="single_agent_run",
        model=req.agent_name,
        provider="openrouter",
        status="running",
        input_summary=f"Agent: {req.agent_name}, input: {req.user_input[:80]}",
        estimated_credits=0.02,
    )
    try:
        result = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: _run_single_agent(req),
        )
        ApiLogger.update(log_entry.id, status="success",
                         duration_ms=int((time.time() - t0) * 1000),
                         output_summary=f"Agent {req.agent_name} completed")
        return result
    except Exception as e:
        ApiLogger.update(log_entry.id, status="error", error_message=str(e),
                         duration_ms=int((time.time() - t0) * 1000))
        raise HTTPException(status_code=500, detail=str(e))


# Agent name → (function import path, output key)
AGENT_MAP = {
    "creative_director": ("src.agents.agent_1_creative", "agent_1_creative", "creative_brief"),
    "brand_stylist": ("src.agents.agent_2_brand", "agent_2_brand", "visual_identity"),
    "product_stylist": ("src.agents.agent_3_product", "agent_3_product", "product_specs"),
    "casting_scout": ("src.agents.agent_4_casting", "agent_4_casting", "casting_brief"),
    "cinematographer": ("src.agents.agent_5_cine", "agent_5_cine", "camera_specs"),
    "director": ("src.agents.agent_6_director", "agent_6_director", "shot_list"),
    "sound_designer": ("src.agents.agent_7_sound", "agent_7_sound", "audio_specs"),
}


def _run_single_agent(req: RunSingleAgentRequest) -> RunSingleAgentResponse:
    """Build OpenFrameState from existing outputs + synthesized context, then run one agent."""
    import importlib
    from src.models.schemas import (
        CreativeBrief, VisualIdentity, ProductSpecs, CastingBrief,
        CameraSpecs, ShotList, AudioSpecs, CastMember,
        Scene as SchemaScene,
    )

    if req.agent_name not in AGENT_MAP:
        raise ValueError(f"Unknown agent: {req.agent_name}")

    module_path, func_name, output_key = AGENT_MAP[req.agent_name]
    outputs = req.existing_outputs

    # ── Helper: reconstruct Pydantic model from raw dict, or return None ──
    def _get_or_none(key, cls):
        raw = outputs.get(key)
        if raw and isinstance(raw, dict):
            try:
                return cls(**raw)
            except Exception:
                return None
        return None

    # ── Synthesize minimal CreativeBrief from user_input if missing ──
    def _synth_brief():
        return CreativeBrief(
            campaign_title=req.user_input[:80] if req.user_input else "Untitled Campaign",
            concept_summary=req.user_input or "A fashion/luxury advertisement",
            mood_keywords=["elegant", "premium", "modern"],
            tagline="",
        )

    # ── Synthesize minimal VisualIdentity if missing ──
    def _synth_identity():
        return VisualIdentity(
            color_palette=["black", "white", "gold"],
            textures_materials="premium materials",
            composition_style="balanced editorial",
        )

    # ── Synthesize CastingBrief from canvas assets if missing ──
    def _synth_casting():
        chars = [a for a in req.canvas_assets if a.get("type") == "character"]
        envs = [a for a in req.canvas_assets if a.get("type") == "environment"]
        members = [CastMember(
            name=c.get("label", "Model"),
            driver_type=c.get("driver_type", "human"),
            visual_prompt=c.get("text_prompt", ""),
        ) for c in chars] if chars else [CastMember(name="Hero Model", driver_type="human", visual_prompt="fashion model")]
        return CastingBrief(
            cast_members=members,
            setting_a_description=envs[0].get("text_prompt", "elegant studio") if envs else "elegant studio",
            setting_b_description=envs[1].get("text_prompt", "outdoor location") if len(envs) > 1 else "outdoor location",
        )

    # ── Synthesize CameraSpecs from canvas if missing ──
    def _synth_camera():
        cam = next((a for a in req.canvas_assets if a.get("type") == "camera"), None)
        prompt = cam.get("text_prompt", "") if cam else ""
        return CameraSpecs(
            lighting=prompt or "natural soft light",
            camera_gear="cinema camera, 50mm lens",
            color_temperature="warm",
            contrast_tone="medium contrast",
            technical_prompt_block=prompt or "shot on cinema camera, natural lighting, warm tones",
        )

    # ── Synthesize ShotList from canvas scenes if missing ──
    def _synth_shot_list():
        if req.canvas_scenes:
            scenes = [SchemaScene(
                scene_number=s.get("scene_number", i + 1),
                type=s.get("type", "Lifestyle"),
                shot_type=s.get("shot_type", "Wide Shot"),
                visual_type=s.get("visual_type", "Standard"),
                visual_description=s.get("visual_description", ""),
                action_movement=s.get("action_movement", ""),
                start_image_prompt=s.get("start_image_prompt", ""),
                end_image_prompt=s.get("end_image_prompt", ""),
            ) for i, s in enumerate(req.canvas_scenes)]
            return ShotList(scenes=scenes)
        return ShotList(scenes=[
            SchemaScene(scene_number=1, type="Intro", shot_type="Wide Shot",
                        visual_description="Opening shot", action_movement="Slow reveal",
                        start_image_prompt="", end_image_prompt="", visual_type="Standard"),
        ])

    # ── Build OpenFrameState ──
    state = {
        "user_input": req.user_input,
        "ad_type": req.ad_type,
        "product_image": req.product_image,
        "agent_models": {},
        "creative_brief": _get_or_none("creative_brief", CreativeBrief) or _synth_brief(),
        "creative_critique": None,
        "visual_identity": _get_or_none("visual_identity", VisualIdentity) or _synth_identity(),
        "product_specs": _get_or_none("product_specs", ProductSpecs),
        "casting_brief": _get_or_none("casting_brief", CastingBrief) or _synth_casting(),
        "camera_specs": _get_or_none("camera_specs", CameraSpecs) or _synth_camera(),
        "shot_list": _get_or_none("shot_list", ShotList) or _synth_shot_list(),
        "audio_specs": _get_or_none("audio_specs", AudioSpecs),
    }

    # Import and run the agent
    mod = importlib.import_module(module_path)
    agent_fn = getattr(mod, func_name)
    result = agent_fn(state)

    # Agent returns {"output_key": pydantic_model}
    output_data = {}
    for k, v in result.items():
        if hasattr(v, "model_dump"):
            output_data = v.model_dump()
            output_key = k
            break
        elif isinstance(v, dict):
            output_data = v
            output_key = k
            break

    return RunSingleAgentResponse(
        agent_name=req.agent_name,
        output_key=output_key,
        output_data=output_data,
    )


def _run_prompt_writer(req: EnhancePromptsRequest):
    from src.agents.agent_8_prompt_writer import agent_8_prompt_writer
    return agent_8_prompt_writer(
        scene_info=req.scene_info,
        connected_assets=req.connected_assets,
        concept=req.concept,
        technical_specs=req.technical_specs,
        lighting=req.lighting,
        existing_start_prompt=req.existing_start_prompt,
        existing_end_prompt=req.existing_end_prompt,
        user_instructions=req.user_instructions,
    )


def _run_video_prompt_writer(req: EnhanceVideoPromptsRequest):
    from src.agents.agent_10_video_prompt import agent_10_video_prompt
    return agent_10_video_prompt(
        scene_info=req.scene_info,
        connected_assets=req.connected_assets,
        concept=req.concept,
        technical_specs=req.technical_specs,
        lighting=req.lighting,
        start_image_prompt=req.start_image_prompt,
        end_image_prompt=req.end_image_prompt,
        existing_start_video_prompt=req.existing_start_video_prompt,
        existing_end_video_prompt=req.existing_end_video_prompt,
        existing_combined_video_prompt=req.existing_combined_video_prompt,
        audio_mode=req.audio_mode,
        dialogue=req.dialogue,
        dialogue_speaker=req.dialogue_speaker,
        user_instructions=req.user_instructions,
    )
