from rich.console import Console
from src.models.schemas import ScenePrompts
from src.utils import call_agent_model

console = Console()


SYSTEM_PROMPT = """You are a world-class Image Prompt Engineer for luxury fashion advertising.

Your task: Write (or enhance) a START frame and END frame text-to-image prompt for ONE specific scene in a commercial.

You will receive:
- The overall campaign concept and mood
- Technical camera/lighting specs (MUST be included verbatim in every prompt)
- The scene details (type, shot, action, description)
- Connected asset descriptions (cast members, settings, product visible in this scene)
- Any existing prompts (if present, enhance them — do not start from scratch)
- Optional user instructions/comments to guide your writing

Rules:
1. Each prompt must be a SINGLE, dense paragraph — no line breaks. Written for Midjourney / Flux / DALL-E style generators.
2. Start with the subject and action, then environment, then lighting/mood, then technical specs.
3. Include specific details about materials, textures, skin tones, fabric behavior, light direction.
4. The START prompt describes the first frame; the END prompt describes the last frame. Together they imply motion/transition.
5. If existing prompts are provided, keep their core intent but enrich with more detail, better structure, and the technical specs.
6. If user instructions are provided, incorporate them as the PRIMARY creative direction.
7. Always append the technical camera/lighting block at the end of each prompt.
8. Use evocative, cinematic language befitting top-tier fashion campaigns.

IMPORTANT: Return valid JSON:
{{
  "start_image_prompt": "Full prompt for START frame...",
  "end_image_prompt": "Full prompt for END frame..."
}}"""


def agent_8_prompt_writer(
    scene_info: dict,
    connected_assets: list[dict],
    concept: str,
    technical_specs: str,
    lighting: str,
    existing_start_prompt: str = "",
    existing_end_prompt: str = "",
    user_instructions: str = "",
) -> ScenePrompts:
    """On-demand agent: writes or enhances start/end image prompts for a single scene."""
    console.print("[bold cyan]--- Prompt Writer (Agent 8) Running ---[/bold cyan]")

    # Build connected assets context
    assets_text = ""
    for asset in connected_assets:
        assets_text += f"  - {asset.get('label', 'Unknown')} ({asset.get('type', '')}): {asset.get('text_prompt', '')}\n"

    # Build existing prompts section
    existing_section = ""
    if existing_start_prompt or existing_end_prompt:
        existing_section = f"""
EXISTING PROMPTS (enhance these, do not discard):
  Start: {existing_start_prompt or '(none)'}
  End: {existing_end_prompt or '(none)'}"""

    # Build user instructions section
    user_section = ""
    if user_instructions.strip():
        user_section = f"\nUSER INSTRUCTIONS (highest priority): {user_instructions}"

    user_content = f"""CAMPAIGN CONCEPT: {concept}
LIGHTING: {lighting}
TECHNICAL SPECS: {technical_specs}

SCENE DETAILS:
  Scene #{scene_info.get('scene_number', '?')} — {scene_info.get('type', '')} / {scene_info.get('shot_type', '')}
  Action: {scene_info.get('action_movement', '')}
  Visual Description: {scene_info.get('visual_description', '')}

CONNECTED ASSETS IN THIS SCENE:
{assets_text or '  (none specified)'}
{existing_section}
{user_section}

Task: Write the start_image_prompt and end_image_prompt. Include all technical specs. Make them rich, cinematic, and production-ready."""

    result = call_agent_model(SYSTEM_PROMPT, user_content, ScenePrompts)

    console.print(f"    [green]Prompts generated for scene #{scene_info.get('scene_number', '?')}[/green]")

    return result
