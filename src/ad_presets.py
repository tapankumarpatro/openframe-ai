"""Ad-type presets — per-agent guidance injected into system prompts."""

from typing import Optional

# ---------------------------------------------------------------------------
# Each key is an ad_type id (matches frontend AD_TYPES).
# Each value maps agent_key → guidance string appended to the agent's system prompt.
# ---------------------------------------------------------------------------

AD_PRESETS: dict[str, dict[str, str]] = {

    # ======================================================================
    # 1. FASHION & LUXURY EDITORIAL
    # ======================================================================
    "fashion_luxury": {
        "creative_director": (
            "This is a Fashion & Luxury Editorial ad.\n"
            "- Tone: Aspirational, artistic, abstract. Think Vogue, Loewe, Bottega Veneta campaigns.\n"
            "- The concept should evoke a feeling or world, not sell features.\n"
            "- Mood should lean dramatic, atmospheric, or poetic.\n"
            "- Tagline should be abstract and evocative, not a sales pitch."
        ),
        "brand_stylist": (
            "Fashion & Luxury Editorial style.\n"
            "- Color palettes should be bold or moody — think editorial spreads.\n"
            "- Textures: rich fabrics, natural materials, architectural surfaces.\n"
            "- Composition: dramatic, editorial, cinematic framing with strong negative space."
        ),
        "product_stylist": (
            "Fashion & Luxury context.\n"
            "- The product is part of a lifestyle world, not a clinical showcase.\n"
            "- Describe how it integrates into the scene naturally (worn, held, placed in environment).\n"
            "- Emphasize material luxury: weight, texture, drape, sheen."
        ),
        "casting_scout": (
            "Fashion & Luxury Editorial casting.\n"
            "- Cast 2-4 drivers. Models should feel aspirational, striking, editorial.\n"
            "- Non-human drivers can be symbolic or atmospheric (animals, objects, natural elements).\n"
            "- Settings should feel curated and intentional — architectural, natural, or abstract spaces.\n"
            "- Avoid generic studio looks. Think location shoots."
        ),
        "cinematographer": (
            "Fashion & Luxury Editorial look.\n"
            "- Lighting can be dramatic: Rembrandt, golden hour, hard shadows, or moody diffused.\n"
            "- Camera: editorial feel — medium format, shallow depth of field.\n"
            "- Color temperature: warm or cool depending on mood, but with intention.\n"
            "- Contrast: can be high for drama or low for softness."
        ),
        "director": (
            "Fashion & Luxury Editorial direction.\n"
            "- Create 8-15 scenes.\n"
            "- Pacing: slow, atmospheric, hypnotic. Mix wide tableaux with intimate close-ups.\n"
            "- Scene types: Intro, Texture/Macro, Portrait, Interaction, Product Reveal, Environment, Closing.\n"
            "- No hard sells. The ad should feel like a short film or visual poem.\n"
            "- Models can be mysterious, powerful, or contemplative — avoid commercial smiles.\n"
            "\nAUDIO MODE GUIDANCE:\n"
            "- Default is silent for atmospheric/editorial shots.\n"
            "- Use audio-native for 1-2 key narrative moments (e.g., Closing scene with a whispered tagline, or an Intro with ambient sound).\n"
            "- If a model speaks or narrates, use audio-native with dialogue woven into the video prompt."
        ),
        "sound_designer": (
            "Fashion & Luxury Editorial audio.\n"
            "- Voiceover: poetic, minimal, evocative. Under 25 words.\n"
            "- Music: ambient, textural, atmospheric. Think Ólafur Arnalds, Ryuichi Sakamoto.\n"
            "- Silence and space are as important as sound."
        ),
    },

    # ======================================================================
    # 2. COMMERCIAL / PRODUCT
    # ======================================================================
    "commercial_product": {
        "creative_director": (
            "This is a Commercial / Product ad.\n"
            "- Tone: Clean, persuasive, trustworthy. The product IS the hero.\n"
            "- Concept should be clear and benefit-driven, not abstract.\n"
            "- Mood: bright, confident, professional.\n"
            "- Tagline should communicate a clear value proposition or promise."
        ),
        "brand_stylist": (
            "Commercial / Product style.\n"
            "- Color palette: clean, bright, high-key. White, product-brand colors, minimal palette.\n"
            "- Textures: smooth, polished, clinical. Glass, metal, clean surfaces.\n"
            "- Composition: centered, symmetrical, product-focused with ample negative space."
        ),
        "product_stylist": (
            "Commercial / Product context.\n"
            "- The product is the absolute hero. Describe it in exacting detail.\n"
            "- Focus on: packaging, materials, surface quality, how light hits it.\n"
            "- Placement: centered, elevated (pedestal, surface), pristine background.\n"
            "- No lifestyle integration needed — pure product showcase."
        ),
        "casting_scout": (
            "Commercial / Product casting.\n"
            "- Keep cast minimal: 0-2 human subjects. The product is the star.\n"
            "- If humans are present, they should be clean, relatable, trustworthy-looking.\n"
            "- Non-human drivers: product ingredients, textures, or visual effects (splashes, particles).\n"
            "- Settings: MUST be bright, clean, minimal. White studio, simple surface, clinical environment.\n"
            "- Avoid dark, moody, or fantasy environments. Think Apple or Glossier product photography."
        ),
        "cinematographer": (
            "Commercial / Product look.\n"
            "- Lighting: HIGH-KEY. Bright, soft, diffused, minimal shadows. Think beauty/product photography.\n"
            "- Camera: sharp, clinical. Medium format or macro lens for product detail.\n"
            "- Color temperature: neutral to cool (5000-5500K). Clean whites.\n"
            "- Contrast: low-medium. Lifted shadows, no crushed blacks. Pristine and airy."
        ),
        "director": (
            "Commercial / Product direction.\n"
            "- Create 5-8 scenes. Keep it tight and focused.\n"
            "- Pacing: clean, purposeful. Standard commercial arc:\n"
            "  Scene 1-2: Hook / Problem\n"
            "  Scene 3-4: Product Reveal / Solution\n"
            "  Scene 5-6: Proof / Demonstration\n"
            "  Scene 7-8: Result / CTA\n"
            "- Shot types: product hero shots, macro details, clean wide shots.\n"
            "- Every scene should be BRIGHT and CLEAN. No dark/moody shots.\n"
            "- Subjects can smile. This is commercial, not editorial.\n"
            "\nAUDIO MODE GUIDANCE:\n"
            "- Product beauty shots and B-roll → silent.\n"
            "- Hook scene (Scene 1) with a spokesperson → audio-native with spoken hook line.\n"
            "- CTA / Closing scene → audio-native with call-to-action dialogue.\n"
            "- At least 2 scenes MUST be audio-native with dialogue (Hook + CTA at minimum)."
        ),
        "sound_designer": (
            "Commercial / Product audio.\n"
            "- Voiceover: clear, confident, benefit-driven. Under 30 words.\n"
            "- Music: uplifting, clean, modern. Light piano, gentle synths, positive energy.\n"
            "- Tone should feel trustworthy and premium, not dramatic."
        ),
    },

    # ======================================================================
    # 3. BEAUTY & SKINCARE
    # ======================================================================
    "beauty_skincare": {
        "creative_director": (
            "This is a Beauty & Skincare ad.\n"
            "- Tone: Intimate, confident, radiant. Focus on transformation and self-care.\n"
            "- Concept should center on the feeling of healthy, glowing skin.\n"
            "- Mood: luminous, fresh, clean, dewy.\n"
            "- Tagline should promise a visible result or feeling."
        ),
        "brand_stylist": (
            "Beauty & Skincare style.\n"
            "- Color palette: soft, luminous. Whites, pastels, skin tones, one accent color from product branding.\n"
            "- Textures: dewy skin, water droplets, cream textures, glass, soft fabrics.\n"
            "- Composition: intimate, close-up-heavy, soft focus backgrounds."
        ),
        "product_stylist": (
            "Beauty & Skincare context.\n"
            "- Product is both hero and tool. Show it pristine AND in use.\n"
            "- Describe texture of the product itself: cream consistency, gel clarity, serum viscosity.\n"
            "- Surface detail: packaging finish, label clarity, how light passes through it.\n"
            "- Integration: on a clean surface, held in hand, or applied to skin."
        ),
        "casting_scout": (
            "Beauty & Skincare casting.\n"
            "- Cast 1-2 subjects maximum. Focus on SKIN quality — flawless, dewy, luminous.\n"
            "- Models: diverse, beautiful but natural. Minimal makeup. 'Glass skin' aesthetic.\n"
            "- Non-human drivers: product texture (cream, water, ingredients), light effects.\n"
            "- Settings: soft, bright, minimal. White/cream studio, bathroom-inspired, or soft natural light.\n"
            "- Everything should feel CLEAN and BRIGHT. No dark or fantasy environments."
        ),
        "cinematographer": (
            "Beauty & Skincare look.\n"
            "- Lighting: soft, flattering, high-key. Beauty dish, ring light, or soft diffused natural.\n"
            "- Camera: macro for skin texture and product detail, portrait lens for face shots.\n"
            "- Color temperature: warm-neutral (5000-5500K). Flattering skin tones.\n"
            "- Contrast: low. Soft, lifted shadows. Dewy, luminous feel. No harsh shadows on face."
        ),
        "director": (
            "Beauty & Skincare direction.\n"
            "- Create 5-10 scenes.\n"
            "- Pacing: gentle, intimate, building to a radiant reveal.\n"
            "- Narrative arc:\n"
            "  Scenes 1-2: Skin state / Before (can be subtle, not dramatic)\n"
            "  Scenes 3-4: Product introduction and application\n"
            "  Scenes 5-7: Ingredients / Science (macro shots of textures, absorption)\n"
            "  Scenes 8-10: The Glow / After / Radiant result\n"
            "- Heavy use of close-ups and macro shots.\n"
            "- Keep everything bright, soft, and clinical. No dark/moody shots.\n"
            "- Model can show subtle confidence, gentle smile. Not overly dramatic.\n"
            "\nAUDIO MODE GUIDANCE:\n"
            "- Macro/texture/product close-up shots → silent.\n"
            "- Application scenes where model speaks about the product → audio-native with testimonial dialogue.\n"
            "- Result/After scene → audio-native with a reaction line or endorsement.\n"
            "- At least 2 scenes MUST be audio-native (application walkthrough + result reveal)."
        ),
        "sound_designer": (
            "Beauty & Skincare audio.\n"
            "- Voiceover: warm, intimate, reassuring. Under 25 words.\n"
            "- Music: gentle, airy, luminous. Soft piano, light strings, ambient pads.\n"
            "- Include subtle ASMR-like textures: water drops, soft application sounds."
        ),
    },

    # ======================================================================
    # 4. UGC / SOCIAL MEDIA
    # ======================================================================
    "ugc_social": {
        "creative_director": (
            "This is a UGC / Social Media ad.\n"
            "- Tone: Raw, authentic, relatable. Anti-polished. Think TikTok or Instagram Reel.\n"
            "- Concept should be simple and immediate — one clear hook, one clear message.\n"
            "- Mood: energetic, casual, genuine, fun OR honest.\n"
            "- Tagline should be conversational, not corporate. Like something a real person would say."
        ),
        "brand_stylist": (
            "UGC / Social Media style.\n"
            "- Color palette: natural, unfiltered. Whatever the real environment provides.\n"
            "- Textures: real-world surfaces. Kitchen counters, bathroom mirrors, outdoor textures.\n"
            "- Composition: casual, imperfect. Off-center, slightly messy, real-life framing.\n"
            "- Should NOT look like a polished studio shoot."
        ),
        "product_stylist": (
            "UGC / Social Media context.\n"
            "- Product should look like someone just picked it up from their shelf.\n"
            "- No pedestal, no studio lighting. Real-life placement.\n"
            "- Describe it as it would look in someone's hand, on their desk, in their bathroom.\n"
            "- Emphasize relatability over luxury."
        ),
        "casting_scout": (
            "UGC / Social Media casting.\n"
            "- Cast 1 person MAXIMUM. This is a solo creator talking to camera.\n"
            "- The person should look REAL and RELATABLE. Not a fashion model.\n"
            "- Natural appearance: casual clothes, minimal/no makeup, real hair.\n"
            "- No non-human 'symbolic' drivers. Keep it grounded.\n"
            "- Settings: REAL locations only. Bedroom, bathroom, kitchen, outdoors.\n"
            "- Setting B can be a simple second angle of the same location."
        ),
        "cinematographer": (
            "UGC / Social Media look.\n"
            "- Lighting: NATURAL only. Window light, outdoor daylight, ring light at most.\n"
            "- Camera: smartphone aesthetic. Slightly soft, not ultra-sharp. Front-facing camera feel.\n"
            "- Color temperature: natural daylight, warm indoor. No color grading.\n"
            "- Contrast: natural, unedited look. No heavy post-processing.\n"
            "- IMPORTANT: Vertical 9:16 framing for social media."
        ),
        "director": (
            "UGC / Social Media direction.\n"
            "- Create 1-3 scenes MAXIMUM. This is a short-form social clip.\n"
            "- Pacing: fast, punchy. Hook in first 2 seconds.\n"
            "- Structure:\n"
            "  Scene 1: Hook — person talks to camera or shows product immediately\n"
            "  Scene 2 (optional): Demo — quick product use or before/after\n"
            "  Scene 3 (optional): Result or reaction\n"
            "- Shot types: selfie angle, POV, handheld close-up.\n"
            "- MUST feel authentic and unscripted. No cinematic framing.\n"
            "- Person should feel natural, expressive, relatable.\n"
            "\nAUDIO MODE — MANDATORY FOR UGC:\n"
            "- ALL scenes MUST use audio_mode = 'audio-native'. No exceptions. ZERO silent scenes.\n"
            "- UGC is a person talking to camera — every scene needs spoken dialogue.\n"
            "- Dialogue must be casual, first-person, like talking to a friend.\n"
            "- Weave dialogue into combined_video_prompt: e.g., 'Girl holds up product and says \"okay this stuff is insane\" while turning bottle to show label'\n"
            "- scene_voice_prompt should describe the creator's natural speaking style."
        ),
        "sound_designer": (
            "UGC / Social Media audio.\n"
            "- Voiceover: casual, first-person, like talking to a friend. Under 15 words.\n"
            "- Music: trending/viral audio style. Lo-fi beats, trending sounds, or no music at all.\n"
            "- Can include ambient real-world sounds for authenticity."
        ),
    },

    # ======================================================================
    # 5. CINEMATIC BRAND FILM
    # ======================================================================
    "cinematic_brand": {
        "creative_director": (
            "This is a Cinematic Brand Film.\n"
            "- Tone: Story-driven, emotional, epic. Think Nike 'Dream Crazy', Apple '1984'.\n"
            "- Concept should have a narrative arc with emotional stakes.\n"
            "- Mood: powerful, moving, inspiring, or thought-provoking.\n"
            "- Tagline should land as a manifesto statement."
        ),
        "brand_stylist": (
            "Cinematic Brand Film style.\n"
            "- Color palette: cinematic grade. Can be bold, contrasty, or desaturated — match the story tone.\n"
            "- Textures: real-world, tangible. Sweat, rain, fabric, concrete, skin, nature.\n"
            "- Composition: cinematic widescreen (16:9 or 21:9). Rule of thirds, leading lines, depth."
        ),
        "product_stylist": (
            "Cinematic Brand Film context.\n"
            "- Product appears minimally — maybe in 1-2 scenes or only at the end.\n"
            "- The film is about the BRAND WORLD, not the product features.\n"
            "- When product appears, it should feel like a natural story beat, not a hard sell.\n"
            "- Describe it in context of the narrative (held by character, placed in scene)."
        ),
        "casting_scout": (
            "Cinematic Brand Film casting.\n"
            "- Cast 2-5 drivers. Characters should feel like protagonists in a film.\n"
            "- Diverse, expressive, with visible inner life. Think actors, not models.\n"
            "- Non-human drivers: environmental elements that advance the narrative (weather, objects, animals).\n"
            "- Settings: cinematic locations. Real, textured, with story significance.\n"
            "- Setting A and B should represent different chapters or emotional states of the story."
        ),
        "cinematographer": (
            "Cinematic Brand Film look.\n"
            "- Lighting: cinematic. Golden hour, practical lights, motivated sources. Can be dramatic.\n"
            "- Camera: anamorphic or cinema lens feel. Wide shots with depth, shallow DOF for intimacy.\n"
            "- Color temperature: varies by scene mood — warm for hope, cool for tension.\n"
            "- Contrast: cinematic grade. Rich shadows, controlled highlights. Film-like dynamic range."
        ),
        "director": (
            "Cinematic Brand Film direction.\n"
            "- Create 10-20 scenes. This is a full short film.\n"
            "- Pacing: narrative-driven with emotional arc:\n"
            "  Act 1 (Scenes 1-5): Setup — introduce world, characters, tension\n"
            "  Act 2 (Scenes 6-12): Conflict — the journey, struggle, or transformation\n"
            "  Act 3 (Scenes 13-18): Resolution — triumph, revelation, emotional payoff\n"
            "  Final (Scenes 19-20): Brand moment — product/logo reveal, tagline\n"
            "- Mix of wide establishing shots, medium character shots, and emotional close-ups.\n"
            "- Should feel like a real film with story, not a product demo.\n"
            "- Characters can show full range of emotion.\n"
            "\nAUDIO MODE GUIDANCE:\n"
            "- Wide establishing shots, B-roll, and montage transitions → silent.\n"
            "- Character dialogue scenes (interactions, monologues) → audio-native with scripted dialogue.\n"
            "- Narrative voiceover scenes (manifesto moments) → audio-native with narrator dialogue.\n"
            "- Closing / brand moment → audio-native with tagline delivery.\n"
            "- At least 30-40% of scenes should be audio-native with dialogue (this is a story, not a montage)."
        ),
        "sound_designer": (
            "Cinematic Brand Film audio.\n"
            "- Voiceover: narrative, powerful, manifesto-style. Can be longer — up to 40 words.\n"
            "- Music: orchestral, building, emotional. Think Hans Zimmer lite or Explosions in the Sky.\n"
            "- Sound design: layered, immersive. Environmental sounds, foley, emotional swells."
        ),
    },
}


# ---------------------------------------------------------------------------
# Structural config per ad type — hard overrides injected into prompts
# ---------------------------------------------------------------------------

AD_PRESET_CONFIG: dict[str, dict[str, object]] = {
    "fashion_luxury": {
        "scene_count_min": 8,
        "scene_count_max": 15,
        "default_audio_mode": "silent",
        "aspect_ratio": "16:9",
    },
    "commercial_product": {
        "scene_count_min": 5,
        "scene_count_max": 8,
        "default_audio_mode": "silent",
        "aspect_ratio": "16:9",
    },
    "beauty_skincare": {
        "scene_count_min": 5,
        "scene_count_max": 10,
        "default_audio_mode": "silent",
        "aspect_ratio": "16:9",
    },
    "ugc_social": {
        "scene_count_min": 1,
        "scene_count_max": 3,
        "default_audio_mode": "audio-native",
        "aspect_ratio": "9:16",
    },
    "cinematic_brand": {
        "scene_count_min": 10,
        "scene_count_max": 20,
        "default_audio_mode": "silent",
        "aspect_ratio": "16:9",
    },
}


def get_ad_guidance(ad_type: Optional[str], agent_key: str) -> str:
    """Return the ad-type guidance block for a given agent, or empty string."""
    if not ad_type:
        return ""
    preset = AD_PRESETS.get(ad_type, {})
    return preset.get(agent_key, "")


def get_ad_config(ad_type: Optional[str]) -> dict[str, object]:
    """Return structural config for an ad type, or sensible defaults."""
    if ad_type and ad_type in AD_PRESET_CONFIG:
        return AD_PRESET_CONFIG[ad_type]
    # Smart defaults for unknown ad types — let LLM decide within a wide range
    return {
        "scene_count_min": 3,
        "scene_count_max": 15,
        "default_audio_mode": "silent",
        "aspect_ratio": "auto",
    }
