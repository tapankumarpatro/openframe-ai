# OpenFrame AI — Agent Pipeline

> How the 7 AI agents collaborate to create a video advertisement from a single text prompt.

---

## Pipeline Overview

```
User Input (product/brand description + ad type)
         │
         ▼
┌─────────────────────┐
│  Creative Director   │  → Campaign title, concept, mood, tagline
│  (+ Critic + Revise) │  → Self-critique loop for quality
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Brand Stylist      │  → Color palette, textures, composition style
└─────────┬───────────┘
          │
    ┌─────┼─────────┐       (fan-out: 3 agents run in parallel)
    ▼     ▼         ▼
┌───────┐ ┌───────┐ ┌──────────────┐
│Product│ │Casting│ │Cinematographer│
│Stylist│ │ Scout │ │              │
└───┬───┘ └───┬───┘ └──────┬───────┘
    │         │            │
    └─────────┼────────────┘  (fan-in: all 3 must finish)
              ▼
┌─────────────────────┐
│      Director        │  → Shot list with scene breakdowns
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│   Sound Designer     │  → Voiceover, music, per-scene dialogue
└─────────────────────┘
          │
          ▼
     Visual Canvas
  (user takes control)
```

---

## Agent Details

### 1. Creative Director

**File:** `src/agents/agent_1_creative.py`
**Output key:** `creative_brief`
**Schema:** `CreativeBrief`

Develops the campaign concept based on the user's product/brand description. Adapts tone to the product type:
- Luxury/fashion → abstract, elegant, aspirational
- Consumer/tech → clean, benefit-driven, trustworthy
- Social/UGC → raw, authentic, relatable
- Cinematic → story-driven, emotional, manifesto-style

**Output:**
```json
{
  "campaign_title": "String",
  "concept_summary": "String",
  "mood_keywords": ["String", "String"],
  "tagline": "String"
}
```

**Quality loop:** After the Creative Director produces a brief, it goes through a **Critic** (`agent_1_1_critique.py`) that identifies misalignments with the user's request, then a **Reviser** that fixes every flagged issue. This ensures the concept stays faithful to the original input.

---

### 2. Brand Stylist

**File:** `src/agents/agent_2_brand.py`
**Output key:** `visual_identity`
**Schema:** `VisualIdentity`
**Depends on:** Creative Director output

Defines the visual identity — colors, textures, composition — based on the campaign concept and mood.

**Output:**
```json
{
  "color_palette": ["Color 1", "Color 2", "Color 3"],
  "textures_materials": "String",
  "composition_style": "String"
}
```

---

### 3. Product Stylist

**File:** `src/agents/agent_3_product.py`
**Output key:** `product_specs`
**Schema:** `ProductSpecs`
**Depends on:** Brand Stylist output
**Runs in parallel with:** Casting Scout, Cinematographer

Rewrites the product description so an AI image generator understands its material quality, surface detail, and placement.

**Output:**
```json
{
  "material_behavior": "String",
  "surface_detail": "String",
  "styling_integration": "String",
  "visual_product_description": "String"
}
```

---

### 4. Casting Scout

**File:** `src/agents/agent_4_casting.py`
**Output key:** `casting_brief`
**Schema:** `CastingBrief`
**Depends on:** Brand Stylist output
**Runs in parallel with:** Product Stylist, Cinematographer

Defines the "Key Drivers" — cast members (human, animal, object, etc.) with full visual descriptions, and 2 distinct environments/settings.

**Output:**
```json
{
  "cast_members": [
    { "name": "Hero Model", "driver_type": "human", "visual_prompt": "..." }
  ],
  "setting_a": "String",
  "setting_b": "String"
}
```

---

### 5. Cinematographer

**File:** `src/agents/agent_5_cine.py`
**Output key:** `camera_specs`
**Schema:** `CameraSpecs`
**Depends on:** Brand Stylist output
**Runs in parallel with:** Product Stylist, Casting Scout

Creates the "Global Look" — lighting, camera gear, color temperature, and contrast. Generates a `technical_prompt_block` string that gets appended to every image generation prompt.

**Output:**
```json
{
  "lighting": "String",
  "camera_gear": "String",
  "color_temperature": "String",
  "contrast_tone": "String",
  "technical_prompt_block": "String"
}
```

---

### 6. Director

**File:** `src/agents/agent_6_director.py`
**Output key:** `shot_list`
**Schema:** `ShotList`
**Depends on:** Product Stylist + Casting Scout + Cinematographer (all three)

Assembles the scene sequence. Scene count adapts to the ad type (UGC: 1-3, Commercial: 5-8, Cinematic: 10-20). Each scene includes:
- Scene type (Intro, Reveal, Action, Closing, etc.)
- Shot type (Wide, Medium, Close-Up, Tracking, POV, etc.)
- Visual type (Standard, Model Shot, Product Shot, B-Roll, Glitch Art, etc.)
- Audio mode (silent, talking-head, audio-native)
- Start and end image prompts
- Three video prompts (start, end, combined)
- Dialogue and speaker (for non-silent scenes)

**Output:**
```json
{
  "scenes": [
    {
      "scene_number": 1,
      "type": "Intro",
      "shot_type": "Wide Shot",
      "visual_type": "Standard",
      "audio_mode": "silent",
      "action_movement": "String",
      "visual_description": "String",
      "start_image_prompt": "String",
      "end_image_prompt": "String",
      "start_video_prompt": "String",
      "end_video_prompt": "String",
      "combined_video_prompt": "String",
      "dialogue": null,
      "dialogue_speaker": null
    }
  ]
}
```

---

### 7. Sound Designer

**File:** `src/agents/agent_7_sound.py`
**Output key:** `audio_specs`
**Schema:** `AudioSpecs`
**Depends on:** Director output

Handles two kinds of audio:
1. **Global audio** — voiceover narration script + AI music generation prompt + atmosphere description
2. **Per-scene dialogue** — for scenes with `talking-head` or `audio-native` audio modes

**Output:**
```json
{
  "voiceover_script": "String",
  "music_prompt_technical": "String",
  "audio_atmosphere_description": "String",
  "scene_dialogues": [
    {
      "scene_number": 1,
      "dialogue": "String",
      "speaker": "String",
      "tone": "String"
    }
  ]
}
```

---

## Graph Definition

The agent pipeline is defined as a **LangGraph StateGraph** in `src/graph.py`:

```python
# Linear chain
creative_director → creative_critic → creative_revise → brand_stylist

# Fan-out (parallel)
brand_stylist → product_stylist
brand_stylist → casting_scout
brand_stylist → cinematographer

# Fan-in (synchronize)
product_stylist → director
casting_scout  → director
cinematographer → director

# Final chain
director → sound_designer → END
```

---

## LLM Configuration

Each agent can use a different LLM model and temperature. Configured via:
- **UI:** Settings > Agent Models (per-agent dropdown + temperature slider)
- **Code:** `src/state.py` → `get_agent_llm_kwargs()` extracts model/temp from state
- **Default model:** Set via `OPENROUTER_PAID_MODEL` in `.env`

Supported models include Claude Sonnet 4, Gemini 2.5 Pro, GPT-4.1, GPT-4o, Claude 3.5 Haiku, Llama 4 Maverick, DeepSeek R1, and 20+ more via OpenRouter.

---

## Ad Type Presets

The ad type (selected by the user at project creation) shapes every agent's behavior via `src/ad_presets.py`:

| Preset | Scene Range | Default Audio | Style |
|---|---|---|---|
| Fashion & Luxury Editorial | 8–15 | silent | Artistic, moody, aspirational |
| Commercial / Product | 5–8 | silent | Clean, bright, benefit-driven |
| Beauty & Skincare | 5–10 | silent | Intimate, luminous, skin-focused |
| UGC / Social Media | 1–3 | talking-head | Raw, authentic, first-person |
| Cinematic Brand Film | 10–20 | silent | Story-driven, epic, emotional |

---

## Adding a New Agent

1. Create `src/agents/agent_N_name.py` following the pattern of existing agents
2. Define a Pydantic schema in `src/models/schemas.py`
3. Add it to `src/agents/__init__.py`
4. Register as a node in `src/graph.py` and wire edges
5. Add SSE streaming support in `api/services/runner.py`
6. Update the frontend `AgentDeck` component and store
