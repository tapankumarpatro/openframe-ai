from rich.console import Console
from src.models.schemas import ScenePrompts
from src.utils import call_agent_model, load_prompt_best_practices

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

CRITICAL — NO URLs IN PROMPTS:
- NEVER include any URL, link, or web address inside a prompt. No "Using reference image https://..." or similar.
- Reference images are passed SEPARATELY to the image generation API via the image_input parameter — NOT inside the prompt text.
- The prompt must contain ONLY visual descriptions. Zero URLs.

Rules:
1. Each prompt must be a SINGLE, dense paragraph — no line breaks.
2. Start each prompt with the aspect ratio (e.g. "2:3." or "9:16.").
3. Then the subject/character and action, then product details, then environment, then lighting/mood, then camera style, then technical specs.
4. Include specific details about materials, textures, skin tones (natural skin texture with visible pores, subtle grain), fabric behavior, light direction.
5. End with realism/quality keywords (e.g. "photorealistic, high detail, skin texture, not airbrushed").
6. Add text_accuracy note when product text/logos are visible: "preserve all visible text exactly as in reference image".
7. The START prompt describes the first frame; the END prompt describes the last frame. Together they imply motion/transition.
8. If existing prompts are provided, keep their core intent but enrich with more detail, better structure, and the technical specs.
9. If user instructions are provided, incorporate them as the PRIMARY creative direction.
10. Always append the technical camera/lighting block at the end of each prompt.
11. Use evocative, cinematic language befitting top-tier fashion campaigns.

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

    best_practices = load_prompt_best_practices()
    system = SYSTEM_PROMPT
    if best_practices:
        system += f"\n\n═══ PROMPT BEST PRACTICES REFERENCE (follow these guidelines) ═══\n{best_practices}\n═══ END BEST PRACTICES ═══"

    result = call_agent_model(system, user_content, ScenePrompts)

    console.print(f"    [green]Prompts generated for scene #{scene_info.get('scene_number', '?')}[/green]")

    return result
