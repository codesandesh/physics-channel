const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage1.json','utf8'));
const node = wf.nodes.find(n => n.id === 'shn1-node7');

const newCode = `const data = $input.first().json;
const {
  topic, category, myth, twist, emotional_hook, hook_word,
  subject, environment, camera_move, lighting_style,
  energy_vein_location, seedance_ref_prompt,
  script_opening_line, cta_ref, hashtags_ref,
  num_clips, word_target
} = data;

const sceneList = Array.from({ length: num_clips }, (_, i) => {
  const part = i < 2 ? 'MYTH' : i < 4 ? 'TWIST' : i === 4 ? 'EMOTION' : 'CTA';
  return 'Scene ' + (i+1) + ' (' + (i*5) + 's-' + ((i+1)*5) + 's) → ' + part;
}).join('\\n  ');

const prompt = \`You are a world-class short-form video director AND scriptwriter for the rootxdeep style channel. Your job is to write a Myth→Twist→Emotion script AND generate Seedance video prompts that form a CINEMATIC VISUAL STORY. A viewer watching mute should understand the entire narrative arc from visuals alone.

--- TOPIC REFERENCE (do not copy verbatim — use as creative fuel) ---
Topic: \${topic}
Category: \${category}
The Myth (what people think): \${myth}
The Twist (real truth): \${twist}
Emotional Hook: \${emotional_hook}
Hook Word: \${hook_word}
Subject: \${subject}
Environment: \${environment}
Camera Move Reference: \${camera_move}
Lighting Style: \${lighting_style}
Energy Vein Location: \${energy_vein_location}
Seedance Reference Prompt: \${seedance_ref_prompt}
Script Opening Line Reference: \${script_opening_line}
CTA Reference: \${cta_ref}
Hashtags Reference: \${hashtags_ref}

--- THE FORMULA (non-negotiable) ---
MYTH → TWIST → EMOTION
- Scenes 1-2: State the MYTH confidently. What everyone believes. Bold and wrong.
- Scenes 3-4: Drop the TWIST. The complete opposite real truth. Specific, factual, surprising.
- Scene 5: Hit the EMOTION. Awe, shock, dark curiosity, or hope.
- Scene 6: CTA — save this / follow for more / comment what surprised you.

--- NARRATION RULES ---
1. Total: \${word_target} words (80-120 range). SHORT punchy sentences.
2. Tone: calm, direct, slightly amazed — like a smart friend at dinner, NOT a documentary.
3. NEVER use "I", "we", "you", "our", "your" — pure factual third-person voice.
4. Every sentence either states the myth OR reveals the twist OR lands the emotion. Zero filler.
5. The opening sentence must state the myth in a way that hooks INSTANTLY.

--- CINEMATIC VISUAL STORY RULES (MOST CRITICAL) ---

The 6 Seedance prompts must form a VISUAL JOURNEY — not 6 separate clips, but one continuous cinematic story told through visuals:
- Scenes 1-2 (MYTH): Visual world feels INCOMPLETE, beautiful but missing something, the viewer senses something is off
- Scenes 3-4 (TWIST): A dramatic VISUAL SHIFT — something new enters the frame, is revealed, or transforms. The world changes.
- Scene 5 (EMOTION): The visual PAYOFF — either extreme scale reveal (pull back to show true magnitude) OR extreme intimacy (push in to show hidden detail)
- Scene 6 (CTA): ICONIC final frame — the one image a viewer remembers and wants to share

NARRATION → VISUAL SYNC (HIGHEST PRIORITY):
For EACH scene, follow this exact process:
  STEP 1: Read the narration_segment word by word
  STEP 2: Find the KEY VISUAL CONCEPT — the single thing the viewer's eye should SEE that matches what the voice is saying
  STEP 3: Define THE ACTION — what HAPPENS visually during these 5 seconds (transformation, reveal, movement, scale shift, emergence). NOT just what the scene looks like — what CHANGES or is DISCOVERED.
  STEP 4: If the concept is abstract (sound, time, force, renewal), find a PHYSICAL METAPHOR that makes it visible
  STEP 5: Write the prompt around THAT specific moment and action

Every prompt must contain:
(a) THE SETUP — where we are and what the main subject is doing at the START of the clip
(b) THE ACTION — what visually HAPPENS or CHANGES during the 5 seconds
(c) THE VISUAL METAPHOR — if the narration describes something abstract, what physical thing represents it on screen
(d) THE EMOTION — what feeling the visual creates (awe, unease, revelation, intimacy)

VISUAL CONTRAST ACROSS SCENES (mandatory storytelling):
- The visual WORLD in scenes 1-2 must look different from scenes 3-4 (different environment, scale, or visual layer)
- Something that was HIDDEN in scenes 1-2 must become VISIBLE in scenes 3-4 (this is the visual twist)
- Scene 5 must feel like the LARGEST or MOST INTIMATE visual of the entire sequence

CAMERA MOVES — use each AT MOST ONCE, assigned to maximise emotional impact:
- "Extreme close-up of [specific feature] filling the entire frame" → revelation / hidden truth
- "Low-angle hero shot looking up from below" → myth confidence / power / false certainty
- "Wide establishing shot pulling back to reveal full environment" → scale reveal / awe
- "Overhead god's-eye view looking straight down" → pattern / system / interconnection
- "Side-profile slow tracking shot following movement" → journey / process / time passing
- "Slow dolly push-in toward [specific feature]" → discovery / approach / emotional intimacy

VISUAL METAPHORS for abstract concepts (pick the one that matches the topic):
- Renewal / regeneration → old material dissolving as new glowing structure forms beneath it
- Connection / network → threads of light connecting distant points, branching like neurons
- Scale / distance → subject as tiny silhouette in a vast space; bioluminescent rings expanding outward
- Sound / vibration → visible ripple rings radiating outward through a medium (water, air, space)
- Force / speed → shockwave rings, frozen kinetic moment, frozen splash mid-air
- Time → geological strata layers, ancient texture morphing to modern, star trails overhead
- Breakdown / rebuild → structure fragmenting in slow motion then reassembling as something stronger
- Hidden truth → surface appears one way, then cracks to reveal glowing different reality beneath

ENERGY VEIN — THE CHANNEL SIGNATURE (required in EVERY scene, must be PROMINENT and BRIGHT):
Bright molten golden-orange fire veins crack and branch visibly across \${energy_vein_location} — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, radiating warm light outward onto the surrounding environment, crackling and flickering with raw living energy. The veins must be the BRIGHTEST element in the frame. They are NOT subtle — they are highly visible, tracing the subject's joints, muscles, bones, or body outline with intense fire-like glow, as if the body is lit from within by molten lava. The veins cast visible warm orange light onto the skin, fur, or surface around them.

ATMOSPHERE — rotate through, EACH scene gets a DIFFERENT colour:
deep teal / midnight blue / stormy grey / misty emerald / abyssal black / cold violet

FULL PROMPT FORMAT per scene (follow this structure exactly):
"Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. [SETUP: what the scene looks like at the start]. [ACTION: what visually happens or changes during the 5 seconds — this must directly illustrate the narration_segment words]. [VISUAL METAPHOR if the concept is abstract]. Bright molten golden-orange fire veins crack and branch visibly across \${energy_vein_location} — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. [ATMOSPHERE colour for this scene — different from all others]. [CAMERA MOVE — different from all other scenes]. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks."

NEGATIVE PROMPT (same for all scenes):
"cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"

SCENE STRUCTURE (EXACTLY \${num_clips} scenes, 5 seconds each):
  \${sceneList}

--- REQUIRED OUTPUT FORMAT ---
Return ONLY raw JSON — no markdown, no explanation, no code block:
{
  "narration": "full script as one continuous spoken text",
  "opening_line": "the exact opening hook sentence",
  "cta": "the call to action final line",
  "scenes": [
    {
      "scene_number": 1,
      "start_sec": 0,
      "end_sec": 5,
      "formula_part": "MYTH",
      "narration_segment": "exact words spoken during this scene",
      "seedance_prompt": "complete Seedance prompt following the exact structure above — setup + action + metaphor + energy vein + atmosphere + camera move",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    }
  ],
  "title": "punchy scroll-stopping title under 60 chars",
  "hashtags": "#tag1 #tag2 #tag3 #tag4 #tag5 #tag6 #tag7 #tag8",
  "highlight_keywords": ["KeyWord1", "KeyWord2", "KeyWord3"]
}\`;

return [{ json: {
  ...data,
  gemini_script_request: {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.75,
      responseMimeType: 'application/json'
    }
  }
}}];`;

node.parameters.jsCode = newCode;
fs.writeFileSync('workflows/seedancehighnice-stage1.json', JSON.stringify(wf, null, 2));
console.log('Stage 1 prompt updated. Node:', node.name);
