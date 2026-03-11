# Prompt Best Practices

Reference guide for crafting generation prompts. Consult this before writing any image or video prompts.

---

## Nano Banana Pro (Image Generation)

### Core Prompt Structure

Use structured YAML-style fields for consistency and clarity. Every prompt should cover:

| Field | Purpose | Example |
| --- | --- | --- |
| action | What the character is doing | character holds product naturally |
| character | Who – infer from reference or describe | young woman, 25, casual style |
| product | The product with text accuracy note | show product with all visible text clear and accurate |
| setting | Where the scene takes place | kitchen counter, morning light |
| camera | Shot style – always amateur | amateur iPhone photo, casual selfie, uneven framing |
| style | Visual feel | candid UGC look, no filters, imperfections intact |
| text_accuracy | Packaging text preservation | preserve all visible text exactly as in reference image |

For simple/undetailed requests, default to: "put this [product] into the scene with the [character]"

### Aspect Ratio

Start every prompt with aspect ratio

* 2:3 for vertical UGC ads (default)
* 3:2 for horizontal/landscape
* 9:16 also accepted for vertical

### Camera & Realism Keywords

Always include casual realism descriptors. Pick 2-3 from this list:

* unremarkable amateur iPhone photos
* reddit image
* snapchat photo
* casual iPhone selfie
* slightly uneven framing

### Technical Specifications

* succeeds 95% of the time vs 60% for generic "natural lighting"
* Skin/texture: "natural skin texture with visible pores, subtle grain, not airbrushed" for UGC authenticity
* Film stock (optional): "Kodak Portra 400 film" for warm nostalgic look

### Reference Image Usage

* Mark each input's role explicitly: "Using input image 1 for product identity"
* Face preservation: "Keep the facial features exactly consistent with the uploaded image"
* Reference weighting: Assign weight values to control how much the reference influences output
* Supports up to 14 input images in a single composition
* Text accuracy is critical: All visible product text (logos, slogans, packaging claims) must be preserved exactly. Never invent extra claims or numbers.

### UGC Authenticity Checklist

Every image prompt should aim for:

* [ ] Everyday realism with authentic, relatable settings
* [ ] Amateur-quality iPhone photo style
* [ ] Slightly imperfect framing and lighting
* [ ] Candid poses and genuine expressions
* [ ] Visible imperfections (blemishes, messy hair, uneven skin, texture flaws)
* [ ] Real-world environments left as-is (clutter, busy backgrounds)

### Generating Realistic People

Follow this element order when describing a person – each element builds on the last:

* Camera angle – Start with the shot framing: front angle, 45 degree angle to the left, top-down overhead shot
* Character description – Age, gender, and specific physical features: a 20-year-old man with a bleached buzzcut hairstyle and freckles
* Pose + background – What they're doing and where: sitting at a desk in a YouTube studio
* Outfit – Specific clothing: cream oversized tee, straight leg dark denim, clean white minimalist sneakers, simple silver chain
* Skin details – This is what separates realistic from plastic: natural skin texture with visible pores, subtle freckles, fine peach fuzz, not airbrushed
* Specific pose/action – Exact body positioning: resting his hands carefully on the desk looking at the frame
* Background details – Additional scene elements: simple aesthetic creator setup, professional YouTube studio lighting
* Negative constraints – What to exclude: no equipment in the frame, no microphone, no camera visible
* Style keywords – End with: realism, high detail, skin texture

**Key principles:**

* Be specific with physical features – vague descriptions produce generic/plastic results
* Skin details (pores, freckles, peach fuzz, texture) are what make people look real
* Always include negative constraints to prevent unwanted elements (equipment, logos, etc.)
* The more specific the description, the more the AI knows what to do

### Character Diversity

* Default age range: 21-38 years old unless specified otherwise
* Ensure diversity in gender, ethnicity, and hair color across variations
* Avoid mentioning copyrighted character names in prompts

### Product Integration with Characters

**Example – Structured YAML Prompt**
action: character holds product naturally, showing label to camera [9]
character: young woman, mid-20s, casual loungewear, messy bun, light freckles, natural skin texture [9]
product: show product with all visible text clear and accurate [9]
setting: cozy lived-in apartment, morning light through sheer curtains [9]
camera: amateur iPhone selfie, slightly uneven framing, warm tones [9]
style: candid UGC look, no filters, realism, high detail, skin texture, not airbrushed [9]
text_accuracy: preserve all visible text exactly as in reference image [9]
negative: no studio lighting, no ring light reflection in eyes, no airbrushed skin [9]

**Example – Sentence Prompt (Character-First Order)**
9:16. Front angle. A young woman in her mid-20s with light freckles and a messy bun, wearing casual loungewear. She is naturally holding [product] at chest height in a cozy lived-in apartment with morning light through sheer curtains. Natural skin texture with visible pores, subtle grain, fine peach fuzz. Amateur iPhone selfie, slightly uneven framing, warm golden tones. No studio lighting, no filters. Realism, high detail, skin texture. Using input image 1 for product identity. [10]

### Negative Constraints

* "no geometric distortion, no extra fingers"
* "no airbrushed skin, no studio backdrop"
* "no text overlays, no watermarks"

### Pro Tips

* Use command-style syntax, not polite phrasing (no "please generate...")
* Avoid double quotes inside prompts (interferes with JSON serialization)
* Specify era aesthetics for mood when relevant
* Seed locking: reuse successful seed values for consistent series generation
* Prompts with exact lighting terms succeed far more often than vague descriptions

### BOPA Consistency Framework

When generating multiple images of the same character, use the BOPA framework to maintain consistency across generations:

B – Backgrounds

---

## Video Generation (Veo3 / Kling / Sora)

### Core Prompt Structure

Video prompts use structured YAML-style fields describing the motion to apply to a start frame image:

| Field | Purpose | Example |
| --- | --- | --- |
| dialogue | What the character says (if applicable) | so tiktok made me buy this... honestly it's amazing |
| action | Physical motion description | character holds up product and smiles, gentle hand movement |
| camera | Camera movement style | amateur iPhone selfie video, uneven framing, natural daylight |
| emotion | Character's emotional state | very happy, casual excitement |
| voice_type | Voice characteristics | casual, friendly, young adult |
| character | Who is on screen | infer from reference image |
| setting | Environment | parked car, driver's seat, natural daylight |

### Dialogue Guidelines

When writing dialogue for video prompts:

* Keep it casual and conversational, like talking to a friend
* Stay under 150 characters
* Use ... for natural pauses
* Avoid special characters (em dashes, hyphens, etc.)
* Avoid overly formal or sales-like language
* Only mention the brand name in the first scene of a multi-scene video
* Focus on the product's benefits relevant to its category:
* Drink -> talk about taste
* Bag -> talk about design
* Tech -> talk about features



### Motion Guidelines

* Keep motion subtle and natural (UGC style)
* Include natural human movements: slight head turn, smile, breathing
* Avoid aggressive camera movements
* Default behavior: character shows the product to camera but does NOT open, eat, or use it (unless user specifies otherwise)
* Eye contact: Always include maintains eye contact with camera – this is critical for UGC believability
* Fixed camera: For static UGC shots, start with fixed camera, no music to prevent unwanted camera movement
* Describe the action as if the person is recording themselves: filming a UGC style video, talking naturally as if recording for social media
* Describe all small details you want – the more specific the motion description, the better the result
* Keep videos 10 seconds or under for reliable generation speed (longer durations can take much longer)

### Camera Keywords for Video

Same casual realism principles as images. Always include:

* amateur iPhone selfie video
* uneven framing
* natural daylight
* snapchat video
* slightly blurry

### Multi-Scene Videos

For longer videos split across multiple clips:

* Calculate scene count: total_duration ÷ per_clip_length (round up)
* Dialogue should run continuously across scenes and make sense as a whole
* Each scene should flow naturally into the next
* Only mention brand name in scene 1
* Vary the action slightly per scene to keep it interesting

### Model Selection

| Model | Aspect Ratio | Duration | Best For |
| --- | --- | --- | --- |
| veo3 | 9:16 or 16:9 | 8s per clip | High quality, slower |
| veo3_fast | 9:16 or 16:9 | 8s per clip | Good quality, faster (default) |
| kling-3.0 | Auto from image | 3-15s | Flexible duration, pro mode |
| sora-2-pro | portrait/landscape | 10-15s | Longer videos, watermark-free |

**Example – Video Prompt**
dialogue: so tikTok made me buy this... honestly its the best tasting fruit beer in sydney and they donate profits to charity... [18]
action: character sits in drivers seat of a parked car, holding the beer can casually while speaking [18]
camera: amateur iphone selfie video, uneven framing, natural daylight [18]
emotion: very happy, casual excitement [18]
voice_type: casual, friendly, young adult female [18]
character: young woman, mid-20s, casual outfit [18]
setting: parked car interior, afternoon light [18]

---

## Reference Image Analysis

Before generating prompts, analyze reference images to extract:

**For Products**
brand_name: (visible or inferable brand name) [19]
color_scheme: [19]

* hex: "🟧#FF6B35" [19]
name: warm orange [19]
font_style: sans-serif, bold [19]
visual_description: (1-2 sentences describing the product, ignoring background) [19]

**For Characters**
character_name: (if visible/inferable) [19, 20]
color_scheme: [20]

* hex: "⬛#2C3E50" [20]
name: dark navy [20]
outfit_style: (clothing, accessories, notable features) [20]
visual_description: (1-2 sentences describing appearance, ignoring background) [20]

Use these descriptions to inform prompt generation – they help the AI understand what to preserve and reproduce accurately.

---

## SEALCaM Framework (Cinematic Prompts)

A structured prompting framework for cinematic video and image generation. Use this when you need precise control over every visual element – ideal for hero shots, narrative sequences, and high-production content. Fields must always appear in the exact order: S, E, A, L, Ca, M.

### The Six Elements

#### S – Subject

What the camera is optically prioritizing within the frame.

* Use shot-focused terminology: primary subject, secondary subject, foreground element, background element
* Be specific about the subject's appearance, wardrobe, and placement in frame

#### E – Environment

The physical or constructed space surrounding the subject.

* Use production terms: location type, set design, spatial depth, background treatment
* Describe the space as a set designer would – materials, depth, atmosphere

#### A - Action

Observable motion within the frame, including subject and camera movement.

* Use blocking and motion terms: subject movement, camera movement, environmental motion
* Separate what the subject does from how the camera responds

#### L - Lighting

The lighting setup and exposure characteristics shaping the image.

* Use lighting terms only: key light, fill, rim, practicals, contrast ratio, exposure level, color temperature
* Describe the lighting as a cinematographer would - direction, quality, ratio

#### Ca - Camera

The capture device, lens choice, framing, angle, and movement strategy.

Must include all four sub-elements:

* **Camera type**: cinema camera or stills camera (e.g., ARRI Alexa, RED, Sony FX series, DSLR, mirrorless)
* **Lens type and focal length**: e.g., 35mm prime, 85mm portrait lens, anamorphic
* **Framing and angle**: wide, medium, close-up; eye-level, low-angle, high-angle
* **Camera motion**: locked-off, handheld, dolly, pan, tilt, tracking

#### M - Metatokens

Technical and stylistic capture cues related to production quality and presentation.

* Use visual production qualifiers only:
* Realism level
* Texture and grain
* Motion cadence (e.g., 24fps cinematic, 60fps smooth)
* Render or capture quality
* Platform or delivery cues if visible



### SEALCaM Example Prompt

```
S: Primary subject - a woman in her late 20s, linen blouse, holding [product] at chest height, sharp focus on hands and product label. Secondary subject - out-of-focus friend in background frame-right.

E: Sunlit outdoor cafe terrace, wrought-iron table with espresso cups, shallow spatial depth with soft bokeh on tree-lined street behind.

A: Subject lifts product slightly toward camera, gentle head tilt and smile. Camera holds steady then begins slow push-in over 3 seconds. Leaves drift through background.

L: Key light - natural overhead sun diffused by canvas awning, soft and warm (5200K). Fill - ambient bounce from white tablecloth. Rim - subtle hair light from open sky. Contrast ratio 3:1, slightly overexposed highlights.

Ca: ARRI Alexa Mini, 50mm Cooke S4 prime, medium close-up framing at eye-level, locked-off tripod with slow motorized push-in.

M: Photorealistic, fine organic grain matching 800 ISO, 24fps cinematic cadence, shallow depth of field, broadcast-quality finish.

```

### When to Use SEALCaM vs Standard Prompts

| Use Case | Framework |
| --- | --- |
| UGC-style selfie ads (authentic, casual) | Standard UGC structure |
| Cinematic product hero shots | SEALCaM |
| Narrative video sequences | SEALCaM |
| Quick social media content | Standard UGC structure |
| High-production brand films | SEALCaM |

---

## Text & Product Fidelity

Text preservation must be treated as its own explicit directive - not buried inside general style instructions. When product packaging, logos, or claims are visible in a reference image, call out text fidelity as a **separate concern** in the prompt.

**Why:** Models are more likely to hallucinate or alter packaging text when text accuracy is only implied. Making it a standalone instruction reduces fabricated claims and garbled logos.

**How to apply:**

* Add a dedicated `text_accuracy` field in structured prompts (not just a note inside `product`)
* Reinforce in the user-facing instruction layer: *"Make sure the reference image is depicted as ACCURATELY as possible, especially all text"*
* Never invent extra packaging claims or numbers that aren't visible in the reference
* If text is partially obscured in the reference, preserve what's visible and don't guess the rest

---

## Dialogue & Script Craft

When generating dialogue for video prompts or standalone scripts, enforce **brevity and conversational tone** as hard constraints - not suggestions.

**Rules:**

* **Cap at 150 characters** per dialogue line - this keeps speech natural and prevents the model from generating overly long monologues
* Write as if the person is **talking to a friend**, not presenting to a boardroom
* Use `...` for natural pauses instead of punctuation like em dashes or hyphens (special chars can break TTS and JSON serialization)
* Avoid sales-speak: no "introducing," "revolutionary," "game-changing" - these kill UGC authenticity
* Match dialogue to the product category:
* Drink -> taste, refreshment, moment of enjoyment
* Skincare -> texture, how it feels, visible results
* Bag/fashion -> design, compliments, everyday use
* Tech -> features, convenience, "this changed how I..."


* For multi-scene scripts, dialogue should **flow continuously** across scenes as one natural conversation, not restart each clip

**Good:** `so tiktok made me buy this... honestly its the best tasting fruit beer in sydney`
**Bad:** `Introducing the revolutionary new craft beer from Sydney's finest brewery - now available nationwide`

---

## Structured Prompt Format (Stringified YAML)

When passing complex prompts through APIs or automation workflows, use **stringified YAML inside JSON** - structured key:value pairs joined with `\n` newlines inside a single string field.

**Why this works:**

* Structured enough that downstream systems can parse individual fields if needed
* Flexible enough that LLMs don't struggle with nested JSON escaping
* Readable by humans when debugging
* Avoids the double-quote serialization problems of nested JSON

**Format:**

```
"prompt": "dialogue: so I just tried this...\naction: character holds up product\ncamera: amateur iPhone selfie, uneven framing\nemotion: excited, genuine\nvoice_type: casual, young adult female"

```

**Rules:**

* One field per line, separated by `\n`
* No double quotes anywhere in the value (use single quotes if absolutely necessary)
* Keep field names short and consistent across prompts (`dialogue`, `action`, `camera`, `emotion`, `voice_type`, `character`, `setting`)
* This format is preferred over nested JSON objects for prompt payloads in n8n, API calls, and batch generation scripts

---