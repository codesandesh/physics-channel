const fs = require('fs');
const wf = JSON.parse(fs.readFileSync('workflows/seedancehighnice-stage2.json','utf8'));
const node = wf.nodes.find(n => n.id === 'shn2-n0b');

node.parameters.jsCode = `return [{ json: ${JSON.stringify({
  "job_id": "SHN-62298364",
  "topic": "Bones Are Alive",
  "category": "Human Body",
  "title": "Your Bones Aren't Dead: The Living Skeleton Truth",
  "hashtags": "#bones #skeleton #anatomy #humanbody #mindblown #livingbones #sciencefacts #rootxdeep",
  "narration": "Bones appear as inert, rigid structures. They seem unchanging, solid, and purely mechanical. Many believe skeletal systems are simply a framework for the body. These structures are dynamic, living organs. Bones contain a complex network of blood vessels and nerve endings. They constantly remodel, breaking down old tissue and building new material. Immune cells also reside within bone marrow. This continuous internal activity makes the entire skeleton a vibrant, responsive system. A profound, ongoing transformation occurs within every skeletal component. Follow for anatomy facts that change how one sees the body.",
  "opening_line": "Bones appear as inert, rigid structures.",
  "cta": "Follow for anatomy facts that change how one sees the body.",
  "scenes": [
    {
      "scene_number": 1,
      "start_sec": 0,
      "end_sec": 5,
      "formula_part": "MYTH",
      "narration_segment": "Bones appear as inert, rigid structures.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A person stands in a stoic, powerful stance, against a dramatic, stark landscape. The visible bones are presented as static, unmoving structures, devoid of overt internal activity, like an ancient, unyielding monument. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Deep teal atmosphere. Low-angle hero shot looking up from below. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 2,
      "start_sec": 5,
      "end_sec": 10,
      "formula_part": "MYTH",
      "narration_segment": "They seem unchanging, solid, and purely mechanical. Many believe skeletal systems are simply a framework for the body.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A side-profile view of the stoic figure, focusing on the ribcage and spine. The camera tracks, emphasizing the skeletal structure as a static, interlocked framework, showing no visible internal processes or dynamism, like the intricate but seemingly lifeless gears of a colossal machine. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Midnight blue atmosphere. Side-profile slow tracking shot following movement. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 3,
      "start_sec": 10,
      "end_sec": 15,
      "formula_part": "TWIST",
      "narration_segment": "These structures are dynamic, living organs. Bones contain a complex network of blood vessels and nerve endings.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A close-up on a section of a long bone (e.g., forearm). The seemingly solid bone surface begins to subtly fracture with light, revealing an intricate, glowing network of fine, branching threads emerging and pulsating from beneath the surface, transforming the perception of its interior, like a hidden truth revealed as light cracks through a solid surface. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Stormy grey atmosphere. Slow dolly push-in toward the forearm bone. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 4,
      "start_sec": 15,
      "end_sec": 20,
      "formula_part": "TWIST",
      "narration_segment": "They constantly remodel, breaking down old tissue and building new material. Immune cells also reside within bone marrow.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. An overhead view looking down into a cross-section of the bone, where the glowing networks are now fully visible. Old, dull bone material visibly dissolves and recedes, as vibrant, new, intensely glowing bone tissue rapidly forms and expands beneath it, illustrating continuous regeneration and rebuilding. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Misty emerald atmosphere. Overhead god's-eye view looking straight down. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 5,
      "start_sec": 20,
      "end_sec": 25,
      "formula_part": "EMOTION",
      "narration_segment": "This continuous internal activity makes the entire skeleton a vibrant, responsive system. A profound, ongoing transformation occurs within every skeletal component.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. The camera is close on the figure, showing the active, regenerating bone. The camera pulls back dramatically to a wide establishing shot, revealing the full figure now standing in a powerful, awe-inspiring stance, their entire skeleton visibly integrated with the intensely glowing, dynamic energy veins, radiating life, a vast internal universe revealed. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Abyssal black atmosphere. Wide establishing shot pulling back to reveal full environment. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    },
    {
      "scene_number": 6,
      "start_sec": 25,
      "end_sec": 30,
      "formula_part": "CTA",
      "narration_segment": "Follow for anatomy facts that change how one sees the body.",
      "seedance_prompt": "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. The full figure is radiating energy. An extreme close-up on the figure's hand, where the glowing, crackling energy veins are at their peak intensity, pulsating with undeniable life, filling the entire frame and creating an iconic, memorable final frame that invites engagement and further discovery. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Cold violet atmosphere. Extreme close-up of the figure's hand filling the entire frame. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
      "negative_prompt": "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
    }
  ],
  "seedance_prompts": [
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A person stands in a stoic, powerful stance, against a dramatic, stark landscape. The visible bones are presented as static, unmoving structures, devoid of overt internal activity, like an ancient, unyielding monument. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Deep teal atmosphere. Low-angle hero shot looking up from below. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A side-profile view of the stoic figure, focusing on the ribcage and spine. The camera tracks, emphasizing the skeletal structure as a static, interlocked framework, showing no visible internal processes or dynamism, like the intricate but seemingly lifeless gears of a colossal machine. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Midnight blue atmosphere. Side-profile slow tracking shot following movement. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. A close-up on a section of a long bone (e.g., forearm). The seemingly solid bone surface begins to subtly fracture with light, revealing an intricate, glowing network of fine, branching threads emerging and pulsating from beneath the surface, transforming the perception of its interior, like a hidden truth revealed as light cracks through a solid surface. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Stormy grey atmosphere. Slow dolly push-in toward the forearm bone. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. An overhead view looking down into a cross-section of the bone, where the glowing networks are now fully visible. Old, dull bone material visibly dissolves and recedes, as vibrant, new, intensely glowing bone tissue rapidly forms and expands beneath it, illustrating continuous regeneration and rebuilding. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Misty emerald atmosphere. Overhead god's-eye view looking straight down. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. The camera is close on the figure, showing the active, regenerating bone. The camera pulls back dramatically to a wide establishing shot, revealing the full figure now standing in a powerful, awe-inspiring stance, their entire skeleton visibly integrated with the intensely glowing, dynamic energy veins, radiating life, a vast internal universe revealed. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Abyssal black atmosphere. Wide establishing shot pulling back to reveal full environment. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks.",
    "Cinematic photorealistic 4K video, 9:16 vertical, 5 seconds. The full figure is radiating energy. An extreme close-up on the figure's hand, where the glowing, crackling energy veins are at their peak intensity, pulsating with undeniable life, filling the entire frame and creating an iconic, memorable final frame that invites engagement and further discovery. Bright molten golden-orange fire veins crack and branch visibly across Entire skeleton — living and pulsing — like glowing lava fractures or burning lightning scars etched across the surface — intensely luminous, the brightest element in the frame, casting warm orange light onto the surrounding surface, crackling with living energy. Cold violet atmosphere. Extreme close-up of the figure's hand filling the entire frame. Volumetric god rays. Atmospheric haze. Shallow depth of field. Film grain texture. ARRI ALEXA cinematic color grade. Epic nature documentary tone. No motion blur. No text. No watermarks."
  ],
  "negative_prompts": [
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur",
    "cartoon, anime, CGI animation, text, letters, numbers, labels, watermarks, blur, low quality, flat lighting, motion blur"
  ],
  "highlight_keywords": ["Bones","Living Organs","Rebuilding","Skeleton","Anatomy","Transformation"],
  "num_clips": 6,
  "clip_dur_sec": 5,
  "sheet_row": 88,
  "start_time": 1778762299010,
  "subject": "Person standing strong, powerful stance",
  "environment": "Dramatic landscape or neutral strong setting",
  "energy_vein_location": "Entire skeleton — living and pulsing",
  "est_virality": "⭐⭐⭐⭐",
  "priority": "Medium"
}, null, 2)} }];`;

fs.writeFileSync('workflows/seedancehighnice-stage2.json', JSON.stringify(wf, null, 2));
console.log('Stage 2 test payload updated. Node:', node.name);
