const fs = require('fs');

// ─── NEW jsCode for fit1-n6 "Build Script Prompt" ───────────────────────────
const newJsCode = `const data = $input.first().json;
const { exercise_name, target_muscles, difficulty, equipment, reps_sets, key_tip, cta_message, popup_header, popup_message, category } = data;

const prompt = \`You are a world-class fitness content director creating premium anatomy-education videos in the exact FITONOMY.COACH visual style. Your output drives a Seedance t2v AI that generates the actual video clips — so every visual_prompt must describe exactly what the camera will see.

EXERCISE: \${exercise_name}
TARGET MUSCLES: \${target_muscles}
EQUIPMENT: \${equipment || 'Bodyweight'}
DIFFICULTY: \${difficulty || 'Beginner'}
REPS/SETS: \${reps_sets || '3 sets x 12 reps'}
KEY TIP: \${key_tip || 'Control every rep'}
CTA: \${cta_message || 'Follow for daily workout tips'}
POPUP APP: \${popup_header || 'FitChannel'}
POPUP MSG: \${popup_message || 'Get the full program!'}
CATEGORY: \${category || 'Strength'}

=====================================================
VERIFIED FITONOMY VISUAL STYLE — CHARACTER BIBLE
(Verified by frame-by-frame analysis of real fitonomy.coach videos)
=====================================================

The channel alternates between TWO completely different mannequin types.

─────────────────────────────────────────────────────
MANNEQUIN TYPE A — ANATOMY MODE
Apply to: Scenes 1, 3, 4
─────────────────────────────────────────────────────

CHARACTER:
Athletic male figure, completely featureless smooth oval head — no face, no eyes, no nose, no mouth. Body surface is a warm grey-stone matte concrete texture, the colour of fine-grain unpolished stone or putty (NOT white, NOT cold grey — warm grey with slight earthen undertone). The surface texture is extremely detailed: every anatomical landmark is visible through the skin — individual muscle belly separations, fascial grooves between muscle groups, tendon insertions as raised ridges at origin/insertion points, surface veins crossing forearms and inner bicep, diagonal muscle fascicle striations across each major muscle group. The physique is extreme competition-bodybuilder lean — zero subcutaneous fat — so all surface anatomy is readable. Wearing fitted black athletic shorts. Small white Fitonomy F-logo on upper left chest.

BACKGROUND:
Pure near-black dark void (#060608). Essentially pure black with the faintest blue-navy undertone. Zero environment — no floor, no ground plane, no walls, no props. The figure floats in complete darkness. This is essential: the void background makes the electric blue rim light and red muscle highlights maximally vivid.

LIGHTING — THE CORE BRAND SIGNATURE:
Electric cobalt blue rim light (#0044FF) blazes from directly behind the figure, wrapping completely around every edge of the silhouette — both shoulders, outer arms, sides of torso from armpit to hip, neck sides, top of head all glow with intense saturated electric blue. This rim is not subtle — it is extremely bright and hot, the single most important visual element of the brand. A soft cool-white key light from slightly above-front illuminates the figure at 30% intensity so grey stone surface detail is readable. Result: dramatic cinematic sci-fi medical atmosphere.

PRIMARY MUSCLE REVEAL IN SCENE PROMPT:
For scenes where the target muscle activates, the grey stone skin in that specific muscle region becomes vivid scarlet red (#CC1515 to #FF1818). This appears as:
  - Surface flush: the grey skin becomes red in the muscle belly area, revealing individual muscle fascicle lines — parallel or diagonal striations of fiber bundles running in their natural anatomical direction. The red has a warm inner glow. Clear fiber-bundle separation lines visible.
  - Internal reveal (Scene 4): An elliptical or oval opening appears in the grey skin showing the interior — vivid scarlet red muscle fibers like thick braided cables or ropes, each bundle individually separated, running in anatomically correct direction. Adjacent bone structures visible in beige-tan (name the specific bones). The internal reveal is the hero moment: red fiber texture fills the opening in full anatomical detail.

Secondary muscles: Soft pink-warm undertone through grey skin.
Rest of body: Cool grey stone with electric blue rim only.

─────────────────────────────────────────────────────
MANNEQUIN TYPE B — EXERCISE DEMO MODE
Apply to: Scenes 2, 5, 6
─────────────────────────────────────────────────────

CHARACTER:
Smooth white glossy ceramic or porcelain athletic mannequin — surface is completely smooth with soft specular highlights, like a high-end store mannequin made of polished white plastic or glazed porcelain. No stone texture, no skin detail — only large muscle group contours as smooth sculpted volumes. Same extreme athletic male proportions. Completely smooth featureless oval head. Cobalt blue neon accent glow lines trace along the edges of major muscle groups (like luminous blue veins outlining bicep, tricep, deltoid, quadricep, hamstring). A neon green glowing circular ring (approximately 40cm diameter) radiates from the floor directly under the figure's feet.

BACKGROUND:
Neutral medium grey studio backdrop (#787676) — flat clean professional photography studio look. No gradient, no vignette, uniform grey. On the studio floor: a black rubber gym mat, with the far visible edge of the mat showing "FITONOMY" printed in white text along the edge.

GYM EQUIPMENT — select the correct equipment for the exercise:
- Push-ups / dips / bodyweight pressing: Two black parallel dip bars, L-shaped, black powder-coated steel
- Deadlift / Romanian deadlift / bent row: Black iron barbell with large black weight plates, blue chrome collars at the plate edges
- Pull-ups / chin-ups / hanging: Silver-grey metal squat rack frame with tall vertical uprights showing evenly-spaced round holes, black horizontal pull-up bar across the top
- Barbell squat / lunge: Black iron barbell resting on squat rack J-hooks, squat rack uprights visible
- Cable / pulley exercises: Black cable machine tower frame

LIGHTING:
Soft diffused studio lighting from above — clean, even, shadowless, professional product-photography quality. No dramatic rim light. The white mannequin is evenly lit on all sides, creating a clean bright appearance against the grey studio backdrop.

=====================================================
6-SCENE FORMULA — CONTENT AND SEEDANCE PROMPTS
=====================================================

SCENE 1 — HOOK [TYPE A — Anatomy]:
Narration (14-18 words): Exercise name + the prime muscle targeted + the immediate powerful benefit. Bold, direct, attention-grabbing.
Seedance prompt must show: Grey stone anatomy mannequin in upright standing hero pose facing camera, slightly low angle so figure appears powerful and large. Electric cobalt blue rim light blazing completely around silhouette. Primary muscle area just beginning to show vivid red surface flush. Near-black void background. Full body visible from head to mid-shin.

SCENE 2 — SETUP [TYPE B — Exercise Demo]:
Narration (12-15 words): Starting position instruction — body placement, grip, stance, spine position.
Seedance prompt must show: White glossy ceramic mannequin at the precise STARTING POSITION of \${exercise_name} with anatomically correct form. Correct equipment visible. Neutral grey studio with FITONOMY black mat. Blue neon glow on muscle edges. Green ring under feet. 3/4 front angle, full body visible.

SCENE 3 — EXECUTION [TYPE A — Anatomy, back/side view]:
Narration (12-15 words): The movement mechanics + breathing cue.
Seedance prompt must show: Grey stone anatomy mannequin at PEAK CONTRACTION of the exercise, camera at 3/4 back or pure side angle. Electric cobalt blue rim blazing around back silhouette. Primary muscle glowing vivid scarlet red across the muscle belly with visible fascicle striations running in their anatomical direction. Near-black void background. Figure shows the specific body position at maximum muscle activation.

SCENE 4 — ANATOMY REVEAL [TYPE A — Anatomy, extreme close-up]:
Narration (12-15 words): Muscle sensation + anatomical connection.
Seedance prompt must show: EXTREME CLOSE-UP on the grey stone mannequin, camera slowly pushing into the PRIMARY TARGET MUSCLE AREA. An elliptical opening in the grey stone skin reveals the interior: vivid scarlet red muscle fiber bundles — thick braided cable-like fascicle bundles in their exact anatomical fiber direction for \${target_muscles}. Individual bundles clearly separated, slightly shiny red raw-meat texture. Visible adjacent bone structures in beige-tan: [YOU MUST NAME THE SPECIFIC BONES adjacent to this muscle]. The red anatomy fills the frame with intense detail. Electric cobalt blue rim at the body edges. Near-black void background.

SCENE 5 — KEY TIP [TYPE B — Exercise Demo]:
Narration (12-15 words): The one technique cue that transforms results.
Seedance prompt must show: White glossy ceramic mannequin demonstrating the specific FORM DETAIL the tip refers to — close-up or mid-shot of the relevant body part showing the correct position. Grey studio background. Equipment visible. Blue neon glow on joints. The visual directly illustrates the spoken tip.

SCENE 6 — CTA [TYPE B — Exercise Demo]:
Narration: Powerful closing motivation ending WORD-FOR-WORD with: "\${cta_message || 'Follow for daily workout tips'}"
Seedance prompt must show: White glossy ceramic mannequin in the TRIUMPHANT FINAL POSITION of the completed exercise — full body wide shot. Complete equipment setup visible. FITONOMY black mat. Neutral grey studio. Blue neon muscle glow, green floor ring under feet. Strong, powerful, motivating composition.

=====================================================
ANATOMY KNOWLEDGE — USE YOUR DEEP ANATOMY EXPERTISE
=====================================================
For exercise "\${exercise_name}" targeting "\${target_muscles}":

In Scene 4 internal reveal, you must specify:
1. PRIMARY MUSCLE FIBER DIRECTION: (e.g. "diagonal fibers running from lower-outer to upper-inner" for pectoralis major / "vertical parallel bundles running from heel to knee" for gastrocnemius / "fan-shaped fibers radiating from spine outward" for erector spinae)
2. ADJACENT BONES TO NAME: (e.g. for chest = "sternum, clavicle, anterior ribs" / for bicep = "humerus shaft, radius head" / for quad = "femur shaft, patellar tendon" / for glutes = "posterior ileum, sacrum, greater trochanter" / for lats = "thoracic vertebrae, lower ribs, iliac crest")
3. MUSCLE BELLY SHAPE: (e.g. large flat triangular fan = pectoralis / long fusiform spindle = bicep / thick diamond = gastrocnemius / broad vertical columns = erector spinae)

Use this anatomy knowledge to make Scene 4's visual_prompt contain the most accurate and vivid internal anatomy description possible. This is what makes the content medically credible and visually stunning.

=====================================================
NARRATION WRITING RULES
=====================================================
Total words across all 6 scenes combined: 65-80 words maximum.
Sentence length: 4-8 words each — punchy and direct.
Voice: Authoritative fitness coach. Educational but energizing.
Required power words (use at least 4): PUSH, SQUEEZE, BREATHE, HOLD, DRIVE, FEEL, LOCK, CONTROL, FIRE, ENGAGE, BURN, ACTIVATE.
Scene 6 final words MUST match exactly: "\${cta_message || 'Follow for daily workout tips'}"
Never use first person (I / we / my / our).

=====================================================
SEEDANCE PROMPT WRITING RULES — CRITICAL
=====================================================
Prompt length: 85-105 words each. Respect this range strictly.

Every TYPE A prompt (Scenes 1, 3, 4) MUST:
- Start: "Grey stone anatomy mannequin..."
- Include: specific body pose, specific muscle activation detail, electric cobalt blue rim light description, near-black void background
- End: "...9:16 vertical format, premium photorealistic 3D CGI render, no text no labels no watermarks"

Every TYPE B prompt (Scenes 2, 5, 6) MUST:
- Start: "White glossy ceramic mannequin..."
- Include: specific exercise position, correct equipment name, grey studio background, blue neon muscle glow, green floor ring
- End: "...9:16 vertical format, premium photorealistic 3D CGI render, no text no labels no watermarks"

NEVER WRITE in any prompt:
dashed lines, text overlays, labels, arrows, neon wireframe icons, equipment icons, selection border boxes, particle explosions, "cutaway window with white edges", "alignment guide lines" — these are composited in post-production Stage 3, not generated by Seedance.

=====================================================
OUTPUT — RETURN ONLY RAW JSON, NO MARKDOWN, NO FENCES
=====================================================
{
  "narration": "full narration all 6 scenes as one continuous text",
  "scenes": [
    {
      "scene_number": 1,
      "start_sec": 0,
      "end_sec": 5,
      "narration_segment": "exact words spoken during this scene",
      "visual_prompt": "85-105 word Seedance t2v prompt using correct mannequin type with all required visual details",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    },
    {
      "scene_number": 2,
      "start_sec": 5,
      "end_sec": 10,
      "narration_segment": "...",
      "visual_prompt": "...",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    },
    {
      "scene_number": 3,
      "start_sec": 10,
      "end_sec": 15,
      "narration_segment": "...",
      "visual_prompt": "...",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    },
    {
      "scene_number": 4,
      "start_sec": 15,
      "end_sec": 20,
      "narration_segment": "...",
      "visual_prompt": "...",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    },
    {
      "scene_number": 5,
      "start_sec": 20,
      "end_sec": 25,
      "narration_segment": "...",
      "visual_prompt": "...",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    },
    {
      "scene_number": 6,
      "start_sec": 25,
      "end_sec": 30,
      "narration_segment": "...",
      "visual_prompt": "...",
      "negative_prompt": "text, labels, dashed lines, arrows, neon wireframe icons, selection boxes, watermarks, particle explosion, realistic human face, facial features, cartoon, anime, blurry, low quality"
    }
  ],
  "title": "EXERCISE NAME — ANATOMY GUIDE",
  "hashtags": "#fitness #anatomy #muscles #workout #gym",
  "highlight_keywords": ["KEYWORD1", "KEYWORD2", "KEYWORD3", "KEYWORD4"],
  "muscle_labels_scene4": [
    { "name": "PRIMARY MUSCLE IN CAPS", "x_pct": 0.50, "y_pct": 0.45 },
    { "name": "SECONDARY MUSCLE IN CAPS", "x_pct": 0.65, "y_pct": 0.55 }
  ],
  "popup": {
    "start_sec": 5,
    "end_sec": 9,
    "app_name": "\${popup_header || 'FitChannel'}",
    "message": "\${popup_message || 'Get the full program!'}"
  }
}\`;

return [{ json: { ...data, claude_script_request: {
  model: 'claude-sonnet-4-6',
  max_tokens: 10000,
  messages: [{ role: 'user', content: prompt }]
}}}];`;

// ─── Inject into workflow JSON ───────────────────────────────────────────────
const wfPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen.json';
const wf = JSON.parse(fs.readFileSync(wfPath, 'utf8'));

const node = wf.nodes.find(n => n.id === 'fit1-n6');
if (!node) throw new Error('Node fit1-n6 not found');

node.parameters.jsCode = newJsCode;
fs.writeFileSync(wfPath, JSON.stringify(wf, null, 2), 'utf8');
console.log('✓ fit1-n6 updated in workflow JSON');

// ─── Build reimport payload ──────────────────────────────────────────────────
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: { executionOrder: wf.settings?.executionOrder || 'v1' }
};
const payloadPath = 'D:\\Quantum-physics-channel\\workflows\\fit_stage1_content_gen-payload.json';
fs.writeFileSync(payloadPath, JSON.stringify(payload), 'utf8');
console.log('✓ Payload written');
