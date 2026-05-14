const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json','utf8'));
const node = wf.nodes.find(n => n.id === 'shn2-n0b');

node.parameters.jsCode = `return [{ json: ${JSON.stringify({
  "job_id": "SHN-64718870",
  "row_num": "87",
  "status": "Approved",
  "category": "Human Body",
  "topic": "Bones Are Alive",
  "myth": "Bones are dead rigid structures",
  "twist": "Your bones are living organs with blood supply, nerve endings, and immune function — constantly rebuilding",
  "emotional_hook": "Reframe / Awe",
  "hook_word": "YOUR BONES ARE",
  "subject": "Person standing strong, powerful stance",
  "environment": "Dramatic landscape or neutral strong setting",
  "camera_move": "Low angle hero shot, full figure",
  "lighting_style": "Dramatic strong lighting, hero quality",
  "energy_vein_location": "Entire skeleton — living and pulsing",
  "seedance_ref_prompt": "Cinematic 4K, 9:16, 10s. A person stands in powerful stance against dramatic backdrop. Golden-orange energy veins pulse through their entire visible skeleton — not dead bone but living pulsing tissue. Dramatic hero lighting. Low angle. ARRI ALEXA grade.",
  "script_opening_line": "Your skeleton isn't dead. It has blood vessels, nerve endings, and it's rebuilding itself right now.",
  "cta_ref": "Follow for anatomy facts that change how you see your own body.",
  "hashtags_ref": "#bones #skeleton #anatomy #humanbody #mindblown",
  "est_virality": "⭐⭐⭐⭐",
  "priority": "Medium",
  "sheet_row": 88,
  "source": "google_sheet",
  "num_clips": 6,
  "clip_dur_sec": 5,
  "word_target": 80,
  "start_time": 1778764719548,
  "narration": "Bones are often perceived as inert, rigid structures. They seem like static scaffolding, a permanent framework. This view suggests they are simply dead material, unchanging once formed. No life, no dynamic processes. In reality, bones are living organs. They possess intricate blood supplies and active nerve endings. Bone tissue constantly rebuilds itself. Old cells dissolve as new, stronger material forms continuously. This continuous regeneration makes the entire skeleton a vibrant, dynamic system. It is a marvel of constant renewal. Follow for anatomy facts that change how one sees the body.",
  "opening_line": "Bones are often perceived as inert, rigid structures.",
  "cta": "Follow for anatomy facts that change how one sees the body.",
  "scenes": [
    {
      "scene_number": 1,
      "start_sec": 0,
      "end_sec": 5,
      "formula_part": "MYTH",
      "narration_segment": "Bones are often perceived as inert, rigid structures. They seem like static scaffolding, a permanent framework.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. A person stands in a powerful, unmoving stance against a desolate, rocky landscape, their form appearing immutable and stone-like. The energy veins are present but seem trapped, glowing subtly within a seemingly impenetrable, rigid surface, hinting at life constrained. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. deep teal. Low-angle hero shot looking up from below. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 2,
      "start_sec": 5,
      "end_sec": 10,
      "formula_part": "MYTH",
      "narration_segment": "This view suggests they are simply dead material, unchanging once formed. No life, no dynamic processes.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The person maintains their rigid, unyielding posture, their silhouette stark against a vast, empty horizon. The environment around them is desolate, reflecting the idea of dead, unchanging material. The energy veins within their form remain constant, not actively pulsing or changing in intensity, reinforcing the static myth. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. midnight blue. Side-profile slow tracking shot following movement. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 3,
      "start_sec": 10,
      "end_sec": 15,
      "formula_part": "TWIST",
      "narration_segment": "In reality, bones are living organs. They possess intricate blood supplies and active nerve endings.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. A dramatic visual shift occurs as the previously rigid, stone-like surface of the person's upper body begins to crack and glow from within. A complex, intricate network of fine, branching golden-orange filaments, representing blood vessels and nerve endings, emerges and spreads rapidly across the skin and visible bone structure, becoming intensely visible and pulsing with light. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. stormy grey. Slow dolly push-in toward the chest and rib cage area, focusing on the emergence. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 4,
      "start_sec": 15,
      "end_sec": 20,
      "formula_part": "TWIST",
      "narration_segment": "Bone tissue constantly rebuilds itself. Old cells dissolve as new, stronger material forms continuously.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. An extreme close-up on a segment of bone, perhaps a glowing joint or rib section, now clearly showing its internal structure. Old, duller bone material visibly dissolves and fragments away in slow motion, as brighter, more intensely glowing new bone tissue forms beneath it, expanding and strengthening continuously. This represents renewal and regeneration. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. misty emerald. Extreme close-up of a specific bone feature filling the entire frame. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 5,
      "start_sec": 20,
      "end_sec": 25,
      "formula_part": "EMOTION",
      "narration_segment": "This continuous regeneration makes the entire skeleton a vibrant, dynamic system. It is a marvel of constant renewal.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The camera pulls back dramatically to reveal the full figure of the person standing against a vast, awe-inspiring, cosmic backdrop. Their entire skeleton is now vibrantly luminous, enveloped in intensely pulsing golden-orange energy veins. The previous rigid form is gone, replaced by a living, breathing, glowing entity, a marvel of dynamic, constant renewal. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. abyssal black. Wide establishing shot pulling back to reveal full environment. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 6,
      "start_sec": 25,
      "end_sec": 30,
      "formula_part": "CTA",
      "narration_segment": "Follow for anatomy facts that change how one sees the body.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The camera is positioned directly overhead, looking straight down at the person who stands with arms outstretched, revealing the intricate, interconnected glowing network of their entire skeleton from a god's-eye view. The golden-orange energy veins trace a beautiful, complex pattern across their form and the ground beneath them, creating an iconic, memorable image of interconnected life and system. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. cold violet. Overhead god's-eye view looking straight down. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    }
  ],
  "seedance_prompts": [
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. A person stands in a powerful, unmoving stance against a desolate, rocky landscape, their form appearing immutable and stone-like. The energy veins are present but seem trapped, glowing subtly within a seemingly impenetrable, rigid surface, hinting at life constrained. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. deep teal. Low-angle hero shot looking up from below. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The person maintains their rigid, unyielding posture, their silhouette stark against a vast, empty horizon. The environment around them is desolate, reflecting the idea of dead, unchanging material. The energy veins within their form remain constant, not actively pulsing or changing in intensity, reinforcing the static myth. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. midnight blue. Side-profile slow tracking shot following movement. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. A dramatic visual shift occurs as the previously rigid, stone-like surface of the person's upper body begins to crack and glow from within. A complex, intricate network of fine, branching golden-orange filaments, representing blood vessels and nerve endings, emerges and spreads rapidly across the skin and visible bone structure, becoming intensely visible and pulsing with light. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. stormy grey. Slow dolly push-in toward the chest and rib cage area, focusing on the emergence. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. An extreme close-up on a segment of bone, perhaps a glowing joint or rib section, now clearly showing its internal structure. Old, duller bone material visibly dissolves and fragments away in slow motion, as brighter, more intensely glowing new bone tissue forms beneath it, expanding and strengthening continuously. This represents renewal and regeneration. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. misty emerald. Extreme close-up of a specific bone feature filling the entire frame. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The camera pulls back dramatically to reveal the full figure of the person standing against a vast, awe-inspiring, cosmic backdrop. Their entire skeleton is now vibrantly luminous, enveloped in intensely pulsing golden-orange energy veins. The previous rigid form is gone, replaced by a living, breathing, glowing entity, a marvel of dynamic, constant renewal. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. abyssal black. Wide establishing shot pulling back to reveal full environment. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 1:1 square format, 5 seconds. The camera is positioned directly overhead, looking straight down at the person who stands with arms outstretched, revealing the intricate, interconnected glowing network of their entire skeleton from a god's-eye view. The golden-orange energy veins trace a beautiful, complex pattern across their form and the ground beneath them, creating an iconic, memorable image of interconnected life and system. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. cold violet. Overhead god's-eye view looking straight down. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks."
  ],
  "negative_prompts": [
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
  ],
  "title": "Bones: Dead Stone or Living Fire?",
  "hashtags": "#bones #skeleton #anatomy #humanbody #mindblown #livingbones #bodyscience #reframe",
  "highlight_keywords": ["Bones","Living Organs","Rebuilding","Skeleton","Awe"]
}, null, 2)} }];`;

fs.writeFileSync('workflows/seedancehighnice-stage2.json', JSON.stringify(wf, null, 2));
console.log('Stage 2 test payload updated to SHN-64718870');
