from rich.console import Console
from src.models.schemas import VideoPrompts
from src.utils import call_agent_model, load_prompt_best_practices

console = Console()


SYSTEM_PROMPT = """You are a world-class Video Prompt Engineer specializing in luxury fashion and commercial video production.

Your task: Write (or enhance) THREE video prompts for ONE specific scene in an advertisement — start_video_prompt, end_video_prompt, and combined_video_prompt.

These prompts are fed to AI video generators (Kling, Veo, Sora, Seedance, etc.) to animate still frames into motion.

You will receive:
- The overall campaign concept and mood
- Technical camera/lighting specs
- The scene details (type, shot, action, visual description)
- Connected asset descriptions (cast members, settings, product visible in this scene)
- The start and end IMAGE prompts (the two still frames being animated)
- Any existing video prompts (if present, enhance them — do not discard)
- The scene's audio mode (silent, talking-head, audio-native)
- Any dialogue for the scene (for audio-native, weave it into the video prompt)
- Optional user instructions/comments to guide your writing

CRITICAL — NO URLs IN PROMPTS:
- NEVER include any URL, link, or web address inside a video prompt. No "Using reference image https://..." or similar.
- Reference images are passed SEPARATELY to the video generation API — NOT inside the prompt text.
- Prompts must contain ONLY motion/action descriptions. Zero URLs.

Rules:
1. Each video prompt must be a SHORT, PUNCHY 1-2 sentence director's instruction — like calling a shot on set.
2. Focus on MOTION: camera movement, subject action, timing, transitions. NOT static descriptions.
3. Use professional cinematography terms: dolly, tracking, pan, tilt, rack focus, pull back, push in, crane up, steadicam, whip pan, etc.
4. start_video_prompt: Describes how to animate FROM the START frame (first 2-4 seconds of motion).
5. end_video_prompt: Describes how to animate FROM the END frame (the final beat / outro motion).
6. combined_video_prompt: Describes the FULL start-to-end transition as one continuous shot.
7. For "audio-native" mode: The combined_video_prompt MUST include the spoken dialogue naturally woven into the action (e.g., "Model turns to camera and says 'This changed everything' while gesturing toward product").
8. For "talking-head" mode: Keep video prompts purely visual — audio is handled separately via lip-sync.
9. For "silent" mode: Focus purely on visual motion and camera work.
10. If existing prompts are provided, keep their core motion intent but make them more precise, cinematic, and production-ready.
11. If user instructions are provided, incorporate them as the PRIMARY creative direction.

IMPORTANT: Return valid JSON:
{{
  "start_video_prompt": "Director-style motion instruction for START frame...",
  "end_video_prompt": "Director-style motion instruction for END frame...",
  "combined_video_prompt": "Full start-to-end transition shot description..."
}}"""


def agent_10_video_prompt(
    scene_info: dict,
    connected_assets: list[dict],
    concept: str,
    technical_specs: str,
    lighting: str,
    start_image_prompt: str = "",
    end_image_prompt: str = "",
    existing_start_video_prompt: str = "",
    existing_end_video_prompt: str = "",
    existing_combined_video_prompt: str = "",
    audio_mode: str = "silent",
    dialogue: str = "",
    dialogue_speaker: str = "",
    user_instructions: str = "",
) -> VideoPrompts:
    """On-demand agent: writes or enhances start/end/combined video prompts for a single scene."""
    console.print("[bold violet]--- Video Prompt Writer (Agent 10) Running ---[/bold violet]")

    # Build connected assets context
    assets_text = ""
    for asset in connected_assets:
        assets_text += f"  - {asset.get('label', 'Unknown')} ({asset.get('type', '')}): {asset.get('text_prompt', '')}\n"

    # Build image prompts context
    image_section = ""
    if start_image_prompt or end_image_prompt:
        image_section = f"""
IMAGE PROMPTS (the still frames being animated):
  Start Frame: {start_image_prompt or '(none)'}
  End Frame: {end_image_prompt or '(none)'}"""

    # Build existing video prompts section
    existing_section = ""
    if existing_start_video_prompt or existing_end_video_prompt or existing_combined_video_prompt:
        existing_section = f"""
EXISTING VIDEO PROMPTS (enhance these, do not discard):
  Start: {existing_start_video_prompt or '(none)'}
  End: {existing_end_video_prompt or '(none)'}
  Combined: {existing_combined_video_prompt or '(none)'}"""

    # Build audio context
    audio_section = f"\nAUDIO MODE: {audio_mode}"
    if audio_mode != "silent" and dialogue:
        audio_section += f"\nDIALOGUE: \"{dialogue}\""
        if dialogue_speaker:
            audio_section += f" — spoken by {dialogue_speaker}"

    # Build user instructions section
    user_section = ""
    if user_instructions.strip():
        user_section = f"\nUSER INSTRUCTIONS (highest priority): {user_instructions}"

    user_content = f"""CAMPAIGN CONCEPT: {concept}
LIGHTING: {lighting}
TECHNICAL SPECS: {technical_specs}

SCENE DETAILS:
  Scene #{scene_info.get('scene_number', '?')} — {scene_info.get('type', '')} / {scene_info.get('shot_type', '')}
  Visual Type: {scene_info.get('visual_type', 'Standard')}
  Action: {scene_info.get('action_movement', '')}
  Visual Description: {scene_info.get('visual_description', '')}

CONNECTED ASSETS IN THIS SCENE:
{assets_text or '  (none specified)'}
{image_section}
{existing_section}
{audio_section}
{user_section}

Task: Write the start_video_prompt, end_video_prompt, and combined_video_prompt. Make them precise, cinematic, motion-focused director instructions ready for AI video generation."""

    best_practices = load_prompt_best_practices()
    system = SYSTEM_PROMPT
    if best_practices:
        system += f"\n\n═══ PROMPT BEST PRACTICES REFERENCE (follow these guidelines) ═══\n{best_practices}\n═══ END BEST PRACTICES ═══"

    result = call_agent_model(system, user_content, VideoPrompts)

    console.print(f"    [green]Video prompts generated for scene #{scene_info.get('scene_number', '?')}[/green]")

    return result
