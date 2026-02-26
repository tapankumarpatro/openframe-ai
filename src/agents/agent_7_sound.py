from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import AudioSpecs
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are the Sound Designer who adapts to any advertising context.

You handle TWO kinds of audio:

1. **Global Audio** (for the whole video):
   - voiceover_script: A VO narration script for the entire video. Adapt length and tone to the concept:
     - Luxury/editorial → poetic, minimal, under 25 words.
     - Commercial → clear, benefit-driven, under 30 words.
     - UGC/social → casual first-person, under 15 words.
     - Cinematic → narrative, manifesto-style, up to 40 words.
     - If unclear, write something that matches the mood keywords.
   - music_prompt_technical: A prompt for AI music generation (Suno/Udio):
     - Chord Progression, Instrumentation, Atmosphere, Tempo.
   - audio_atmosphere_description: Brief description of the audio vibe.

2. **Per-Scene Dialogue** (for scenes with audio_mode "talking-head" or "audio-native"):
   The director has marked some scenes with audio_mode != "silent". For each of those scenes, write a scene_dialogues entry:
   - scene_number: matches the scene
   - dialogue: the spoken line (natural, conversational, matching the scene's action)
   - speaker: which cast member speaks (or "narrator")
   - tone: delivery tone (casual, poetic, urgent, warm, confident, etc.)

   If NO scenes have talking-head or audio-native modes, return an empty scene_dialogues list.

IMPORTANT: Return valid JSON:
{{
  "voiceover_script": "String",
  "music_prompt_technical": "String",
  "audio_atmosphere_description": "String",
  "scene_dialogues": [
    {{
      "scene_number": 1,
      "dialogue": "The spoken line...",
      "speaker": "Hero Model",
      "tone": "casual"
    }}
  ]
}}"""


def agent_7_sound(state: OpenFrameState) -> dict:
    console.print("[bold white]--- Sound Designer (Agent 7) Running ---[/bold white]")

    brief = state["creative_brief"]
    shot_list = state["shot_list"]

    # Build scene summary including audio_mode so the sound designer knows which scenes need dialogue
    scene_lines = []
    for s in shot_list.scenes:
        line = f"  Scene {s.scene_number}: [{s.shot_type}] {s.action_movement} | audio_mode={s.audio_mode}"
        if s.dialogue:
            line += f" | director_dialogue=\"{s.dialogue}\" speaker={s.dialogue_speaker}"
        scene_lines.append(line)
    scene_summary = "\n".join(scene_lines)

    # Count how many scenes need dialogue
    dialogue_scenes = [s for s in shot_list.scenes if s.audio_mode != "silent"]

    user_content = f"""CONCEPT SUMMARY: {brief.concept_summary}
MOOD KEYWORDS: {', '.join(brief.mood_keywords)}

SCENES:
{scene_summary}

DIALOGUE SCENES: {len(dialogue_scenes)} scenes need per-scene dialogue (audio_mode != "silent").

Task: Write a global VO script, a technical music generation prompt, and per-scene dialogue for any non-silent scenes."""

    ad_guidance = get_ad_guidance(state.get("ad_type"), "sound_designer")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_content, AudioSpecs, **get_agent_llm_kwargs(state, "sound_designer"))

    console.print(f"    [green]VO Script:[/green] {result.voiceover_script}")
    if result.scene_dialogues:
        console.print(f"    [green]Scene dialogues:[/green] {len(result.scene_dialogues)} lines")
        for sd in result.scene_dialogues:
            console.print(f"      S{sd.scene_number} ({sd.speaker}, {sd.tone}): \"{sd.dialogue}\"")

    return {"audio_specs": result}
