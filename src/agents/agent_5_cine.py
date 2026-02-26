from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import CameraSpecs
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are a world-class Director of Photography (DOP) who adapts to any advertising context.

Task: Create the 'Global Look' for the AI generator based on the Visual Style and Location.

Adapt your technical approach to the concept:
- Luxury/editorial → dramatic lighting (Rembrandt, golden hour, hard shadows). Medium format, shallow DOF.
- Commercial/product → HIGH-KEY, bright, soft, diffused. Sharp macro lens, neutral 5000-5500K, minimal shadows.
- Beauty/skincare → soft, flattering, beauty dish / ring light. Macro for skin, warm-neutral temp, low contrast.
- UGC/social → NATURAL only. Window light, daylight. Smartphone aesthetic, slightly soft. No color grading.
- Cinematic/brand → cinematic lighting (golden hour, practicals). Anamorphic feel, wide shots with depth.
- If unclear, choose a look that matches the mood keywords — dramatic moods get dramatic light, soft moods get soft light.

Output Requirements:
1. Lighting: Describe the lighting setup.
2. Camera: Camera, lens, film stock or digital look.
3. Color Temp: Color temperature description.
4. Contrast: Contrast and tone description.

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "lighting": "String",
  "camera_gear": "String",
  "color_temperature": "String",
  "contrast_tone": "String",
  "technical_prompt_block": "A single combined string of all technical specs to append to image prompts."
}}"""


def agent_5_cine(state: OpenFrameState) -> dict:
    console.print("[bold cyan]--- Cinematographer (Agent 5) Running ---[/bold cyan]")

    brief = state["creative_brief"]
    identity = state["visual_identity"]

    user_content = f"""CONCEPT SUMMARY: {brief.concept_summary}
COMPOSITION STYLE: {identity.composition_style}
TEXTURES & MATERIALS: {identity.textures_materials}

Task: Define the technical camera specs — lighting setup, camera gear, and a combined technical prompt block to append to every image prompt."""

    ad_guidance = get_ad_guidance(state.get("ad_type"), "cinematographer")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_content, CameraSpecs, **get_agent_llm_kwargs(state, "cinematographer"))

    console.print(f"    [green]Lighting:[/green] {result.lighting}")
    console.print(f"    [green]Tech Block:[/green] {result.technical_prompt_block[:80]}...")

    return {"camera_specs": result}
