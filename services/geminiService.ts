import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductionPackage, UserInput, ViralScriptConfig, ViralScriptOutput, SfxCues, VisualPrompt } from "../types";

/**
 * PRISMA STUDIO CORE ENGINE - PRODUCTION LOCK
 */

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found. Please ensure the Engine is locked with a valid Gemini API Key.");
    }
    return new GoogleGenAI({ apiKey });
};

const handleApiError = (error: any, task: string): never => {
    console.error(`PRISMA Engine Error (${task}):`, error);
    const msg = (error?.message || "").toLowerCase();
    
    if (msg.includes("401") || msg.includes("403") || msg.includes("api key not valid") || msg.includes("invalid api key")) {
        window.dispatchEvent(new CustomEvent('PRISMA_API_KEY_INVALID'));
        throw new Error("API Key not valid or project permissions missing. Please update your key in the Manager.");
    }

    if (msg.includes("429") || msg.includes("quota") || msg.includes("limit")) {
        throw new Error("Quota Exceeded: Your API key has run out of credits or reached its rate limit. Check ai.google.dev.");
    }

    throw new Error(`Engine Failure [${task}]: ${error.message || 'Unknown failure'}`);
};

/**
 * ADVANCED JSON REPAIR ENGINE
 * Specifically targets "Expected , or ]" errors caused by unescaped quotes or truncation.
 */
const cleanJsonString = (text: string | undefined): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  
  // 1. Remove Markdown Wrapper
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/```$/, '').trim();
  }

  // 2. Locate the outermost JSON object
  const start = cleaned.indexOf('{');
  if (start === -1) return "{}";
  
  // 3. Handle Truncation: Find the last valid structural closure if possible
  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let lastValidBreak = -1;

  for (let i = start; i < cleaned.length; i++) {
    const char = cleaned[i];
    const prev = i > 0 ? cleaned[i-1] : '';

    if (char === '"' && prev !== '\\') {
      inString = !inString;
    }

    if (!inString) {
      if (char === '{') braceCount++;
      if (char === '}') braceCount--;
      if (char === '[') bracketCount++;
      if (char === ']') bracketCount--;

      // Capture the point where we have a complete set of structures
      if (braceCount === 0 && bracketCount === 0) {
        lastValidBreak = i;
      }
    }
  }

  // Truncate to the last valid closure if we ended mid-stream
  if (lastValidBreak !== -1) {
    cleaned = cleaned.substring(start, lastValidBreak + 1);
  } else {
    // If no clean break, at least find the last brace and try to close it
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > start) {
      cleaned = cleaned.substring(start, lastBrace + 1);
    } else {
      cleaned = cleaned.substring(start);
    }
  }

  // 4. Clean structural literal newlines (invalid in JSON strings)
  cleaned = cleaned.replace(/\n/g, ' ').replace(/\r/g, ' ');

  // 5. Fix common LLM trailing comma errors
  cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
  
  return cleaned;
};

const getRequiredKeyframeCount = (duration: string, density: string): number => {
    const table: Record<string, Record<string, number>> = {
        "30 Seconds": { "Concise": 4, "Standard": 5, "Detailed": 6 },
        "1 Minute": { "Concise": 6, "Standard": 8, "Detailed": 10 },
        "3 Minutes": { "Concise": 10, "Standard": 14, "Detailed": 18 },
        "5 Minutes": { "Concise": 14, "Standard": 20, "Detailed": 26 },
        "8 Minutes": { "Concise": 18, "Standard": 26, "Detailed": 34 },
        "10 Minutes": { "Concise": 20, "Standard": 30, "Detailed": 40 }
    };
    return table[duration]?.[density] || 8;
};

export const VISUAL_STYLE_PRESETS: Record<string, { image_style: string, video_style: string, recommended_vst: string }> = {
    "Stickman — 2D Classic": {
        image_style: "2D classic stickman animation, clean vector linework, simple flat shapes, high readability, minimal shading, crisp edges",
        video_style: "2D classic stickman motion, smooth tweened animation, stable linework, minimal shading, clean transitions",
        recommended_vst: "VST_01 Clean Digital Cinema"
    },
    "Stickman — Blueprint": {
        image_style: "blueprint schematic style, cyan grid background, white technical line drawings, precise geometry, labeled callouts",
        video_style: "blueprint line-reveal animation, technical callout pop-ins, subtle parallax grid drift, clean schematic clarity",
        recommended_vst: "VST_14 Matte Minimalist"
    },
    "Stickman — Chalkboard": {
        image_style: "chalkboard sketch style, rough chalk strokes, dusty smudges, hand-drawn diagrams, classroom vibe",
        video_style: "chalk-writing reveal animation, smudge transitions, chalk dust particles, hand-drawn timing",
        recommended_vst: "VST_05 Overcast Documentary"
    },
    "Stickman — 3D Render": {
        image_style: "simple 3D stick-figure render, smooth plastic material, soft studio lighting, clean shadows, minimal environment",
        video_style: "simple 3D character animation, smooth keyframed motion, subtle camera drift, clean lighting continuity",
        recommended_vst: "VST_09 High-Key Commercial"
    },
    "Clay Animation": {
        image_style: "clay animation style, handcrafted clay textures, visible fingerprints, warm cozy palette, practical set lighting",
        video_style: "claymation motion, subtle stop-motion jitter, tactile deformations, warm practical light flicker realism",
        recommended_vst: "VST_02 Warm Indie Drama"
    },
    "Studio Ghibli": {
        image_style: "Studio Ghibli aesthetic, hand-painted anime background, watercolor shading, warm atmospheric perspective, soft edges, nostalgic storybook feel",
        video_style: "painterly animation feel, gentle parallax pans, soft light transitions, calm cinematic pacing",
        recommended_vst: "VST_08 Soft Pastel Dream"
    },
    "Retro Anime": {
        image_style: "retro 90s anime cel style, clean ink lines, limited shading, subtle halation, nostalgic palette",
        video_style: "retro cel animation feel, limited-frame cadence, classic anime holds, mild film grain texture",
        recommended_vst: "VST_06 Retro 35mm Film"
    },
    "Pixar Style": {
        image_style: "stylized 3D family animation look, expressive faces, soft global illumination, polished materials, warm highlights",
        video_style: "stylized 3D animation, smooth character arcs, cinematic DOF, gentle camera glides",
        recommended_vst: "VST_09 High-Key Commercial"
    },
    "Stop-motion Animation": {
        image_style: "miniature practical set, handmade props, tactile textures, shallow depth of field, charming imperfections",
        video_style: "stop-motion feel, slight frame jitter, miniature parallax, practical lighting flicker realism",
        recommended_vst: "VST_07 Vintage 16mm Home-Movie"
    },
    "Cutout Animation": {
        image_style: "2D cutout puppet look, layered paper shapes, crisp silhouettes, bold color blocks, limited shadow depth",
        video_style: "cutout puppet motion, hinge-like limb movement, layered parallax pans, playful timing",
        recommended_vst: "VST_14 Matte Minimalist"
    },
    "3D CGI Animation": {
        image_style: "high quality 3D CGI frame, detailed materials, cinematic lighting, shallow depth of field, clean render",
        video_style: "3D CGI cinematic, smooth camera moves, realistic motion blur, controlled lighting continuity",
        recommended_vst: "VST_11 Anamorphic Cinematic"
    },
    "Cinematic 8K": {
        image_style: "ultra-detailed cinematic realism, crisp textures, controlled highlights, shallow DOF, cinematic grade",
        video_style: "cinematic realism, slow dolly or tracking, subtle handheld texture, realistic motion blur, cohesive grade",
        recommended_vst: "VST_11 Anamorphic Cinematic"
    },
    "Documentary": {
        image_style: "documentary realism, natural lighting, candid framing, grounded color, handheld authenticity",
        video_style: "documentary camera language, subtle handheld shake, natural ambience, minimal stylization",
        recommended_vst: "VST_05 Overcast Documentary"
    },
    "Cyberpunk": {
        image_style: "cyberpunk neon city, wet reflective streets, magenta/cyan practicals, haze, high contrast, futuristic grit",
        video_style: "neon noir cinematic, slow tracking, volumetric haze motion, rain streaks, reflective highlights",
        recommended_vst: "VST_12 Neon Night City"
    },
    "Film Noir": {
        image_style: "film noir, classic monochrome, hard shadows, venetian blind patterns, cigarette haze, dramatic contrast",
        video_style: "noir pacing, slow push-in, chiaroscuro lighting, smoke drift, sparse ambience",
        recommended_vst: "VST_13 Black & White Classic"
    },
    "Low-Key Thriller": {
        image_style: "low-key thriller lighting, deep shadows, tight contrast, selective practical lights, tense atmosphere",
        video_style: "suspense pacing, slow dolly in, subtle handheld tension, shadow movement, sparse ambience",
        recommended_vst: "VST_10 Low-Key Thriller"
    }
};

const NEGATIVE_SUFFIX = "--no text, watermark, logo, signature, bad anatomy, deformed, blurry, low quality, ugly, distorted face, extra fingers, uneven borders, random text, circle around number";
const VIDEO_NEGATIVE_SUFFIX = "Negative prompt: watermark, random text, logos, extra limbs, distorted face, low quality.";

export const generateMoviePackage = async (input: UserInput): Promise<ProductionPackage> => {
    const ai = getAiClient();
    const keyframeTotal = getRequiredKeyframeCount(input.videoDuration, input.sceneDensity);
    const styleData = VISUAL_STYLE_PRESETS[input.visualStyle] || VISUAL_STYLE_PRESETS["Studio Ghibli"];

    const prompt = `Create a cinematic production package for:
    - Narrative: "${input.script}"
    - Style Preset: "${input.visualStyle}"
    - Project Ratio: "${input.aspectRatio}"
    - Keyframes: ${keyframeTotal}

    PHASE 2 RULES (STRICT):
    1) SCENE IMAGE PROMPT (field: prompt):
    - MODE A — CHARACTER: "[CST] inside [BST]. [GST]. Subject: ..., Action: ..., Location: ..., Atmosphere: ..., Style/VST: ${styleData.image_style}, [VST] ..., Composition: ..., Camera: ..., Lens/focus: ..., Lighting: ..., Mood/Intent: ..., Format: --ar ${input.aspectRatio}. ${NEGATIVE_SUFFIX}"
    - MODE B — ATMOSPHERE: "[BST]. [GST]. Location: ..., Atmosphere: ..., Style/VST: ${styleData.image_style}, [VST] ..., Composition: ..., Camera: ..., Lens/focus: ..., Lighting: ..., Mood/Intent: ..., Format: --ar ${input.aspectRatio}. ${NEGATIVE_SUFFIX}"

    2) VIDEO MOTION PROMPT (field: videoPrompt):
    - Structure: SCENE → CAMERA → STYLE/LIGHTING → MOTION → AUDIO → Aspect ratio → Negative prompt
    - Style/Lighting: ${styleData.video_style}, [VST]
    - Format: 1-4 lines. ${VIDEO_NEGATIVE_SUFFIX}

    STRICT DATA COMPRESSION:
    To prevent JSON truncation, keep all prompt descriptions extremely concise. Use 2-3 word fragments instead of full sentences.

    STRICT ESCAPING:
    NEVER use literal double quotes inside a string. If needed, use \\" or use single quotes instead.
    
    OUTPUT CONTRACT:
    - JSON ONLY.
    - keyframe_plan_titles: ${keyframeTotal} strings.
    - visualPrompts: ${keyframeTotal} objects.`;

    const systemInstruction = `You are PRISMA STUDIO. Generate prompts in strict MASTER FORMAT. Use [CST], [BST], [GST], [VST] tokens. ALWAYS escape internal double quotes. Keep strings concise.`;

    try {
        const response = await ai.models.generateContent({
            model: input.modelEngine,
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        keyframe_plan_titles: { type: Type.ARRAY, items: { type: Type.STRING } },
                        metadata: { 
                          type: Type.OBJECT, 
                          properties: { 
                            topic: { type: Type.STRING }, 
                            mood: { type: Type.STRING }, 
                            visualStyle: { type: Type.STRING }, 
                            aspectRatio: { type: Type.STRING }, 
                            duration: { type: Type.STRING } 
                          } 
                        },
                        seo: { 
                          type: Type.OBJECT, 
                          properties: { 
                            bestTitle: { type: Type.STRING }, 
                            altTitles: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                            videoDescription: { type: Type.STRING }, 
                            tags: { type: Type.STRING }, 
                            hashtags: { type: Type.STRING }, 
                            thumbnailPrompt: { type: Type.STRING }, 
                            sunoPrompt: { type: Type.STRING } 
                          } 
                        },
                        story: { type: Type.STRING },
                        visualPrompts: { 
                            type: Type.ARRAY, 
                            items: { 
                                type: Type.OBJECT, 
                                properties: { 
                                    label: { type: Type.STRING }, 
                                    prompt: { type: Type.STRING }, 
                                    videoPrompt: { type: Type.STRING },
                                    type: { type: Type.STRING }, 
                                    requiresCharacter: { type: Type.BOOLEAN }, 
                                    moodGuide: { type: Type.STRING }, 
                                    visualDescription: { type: Type.STRING },
                                    cameraAngle: { type: Type.STRING }, 
                                    estimatedDuration: { type: Type.NUMBER },
                                    sfx_cues: {
                                        type: Type.OBJECT,
                                        properties: { primary: { type: Type.STRING } }
                                    }
                                } 
                            } 
                        }
                    },
                    required: ["keyframe_plan_titles", "visualPrompts", "metadata", "seo", "story"]
                }
            }
        });

        const rawJson = cleanJsonString(response.text);
        let data;
        try {
            data = JSON.parse(rawJson);
        } catch (e) {
            console.error("Critical JSON failure. Attempting aggressive repair...", e);
            // Fallback for extreme cases
            data = JSON.parse(rawJson + '}'); 
        }
        
        return {
            metadata: {
                topic: data.metadata?.topic || input.script.substring(0, 30),
                mood: data.metadata?.mood || "Cinematic",
                visualStyle: input.visualStyle,
                aspectRatio: input.aspectRatio,
                duration: input.videoDuration
            },
            seo: data.seo || { bestTitle: "Untitled", altTitles: [], videoDescription: "", tags: "", hashtags: "", thumbnailPrompt: "", sunoPrompt: "" },
            story: data.story || input.script,
            titles: data.keyframe_plan_titles || [],
            visualPrompts: data.visualPrompts || [],
            audioMap: [],
            cst: '', bst: '', gst: '', vst: styleData.recommended_vst
        };
    } catch (err) {
        return handleApiError(err, "GENERATE_PACKAGE");
    }
};

export const generateImage = async (prompt: string, aspectRatio: string, model: string = 'gemini-2.5-flash-image', refImage?: string): Promise<string> => {
    const ai = getAiClient();
    const parts: any[] = [];
    if (refImage) {
        const [header, data] = refImage.split(',');
        parts.push({ inlineData: { data: data || refImage, mimeType: header.match(/:(.*?);/)?.[1] || 'image/png' } });
    }
    parts.push({ text: prompt });
    try {
        const response = await ai.models.generateContent({
            model,
            contents: { parts },
            config: { imageConfig: { aspectRatio: aspectRatio as any } }
        });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
        throw new Error("No image data returned.");
    } catch (err) {
        return handleApiError(err, "GENERATE_IMAGE");
    }
};

export const extractContinuityTokensFromImage = async (base64Data: string, mimeType: string, prompt: string): Promise<{ cst: string, bst: string, gst: string, vst: string }> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: {
                parts: [
                    { inlineData: { data: base64Data, mimeType } },
                    { text: `Extract literal descriptors for [CST] (Character), [BST] (Background), [GST] (Style), and [VST] (Lens/Film Look). Return JSON ONLY.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { cst: { type: Type.STRING }, bst: { type: Type.STRING }, gst: { type: Type.STRING }, vst: { type: Type.STRING } },
                    required: ['cst', 'bst', 'gst', 'vst']
                }
            }
        });
        return JSON.parse(cleanJsonString(response.text) || "{}");
    } catch (err) {
        return handleApiError(err, "EXTRACT_TOKENS");
    }
};

export const refinePackagePrompts = async (pkg: ProductionPackage, tokens: { cst: string, bst: string, gst: string, vst: string }): Promise<VisualPrompt[]> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Replace [CST], [BST], [GST], [VST] tokens with these descriptions in BOTH "prompt" and "videoPrompt" fields of the following array.
            
            Continuity Data:
            CST: ${tokens.cst}
            BST: ${tokens.bst}
            GST: ${tokens.gst}
            VST: ${tokens.vst}
            
            Prompts: ${JSON.stringify(pkg.visualPrompts)}`,
            config: { 
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            label: { type: Type.STRING }, 
                            prompt: { type: Type.STRING }, 
                            videoPrompt: { type: Type.STRING },
                            type: { type: Type.STRING }, 
                            requiresCharacter: { type: Type.BOOLEAN }, 
                            moodGuide: { type: Type.STRING }, 
                            visualDescription: { type: Type.STRING },
                            cameraAngle: { type: Type.STRING }, 
                            estimatedDuration: { type: Type.NUMBER }
                        }
                    }
                }
            }
        });
        return JSON.parse(cleanJsonString(response.text) || "[]");
    } catch (err) {
        return handleApiError(err, "REFINE_PROMPTS");
    }
};

export const enhanceVisualPrompt = async (prompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    
    const systemInstruction = `You are a prompt engineer for PRISMA STUDIO. 
    You must output EXACTLY ONE prompt in the MASTER FORMAT provided. 
    Do not include any other text, options, or explanations.`;
    
    const promptText = `Refine this prompt into the PRISMA MASTER FORMAT: "${prompt}".
    
    GLOBAL INPUTS:
    - Style: ${styleData.image_style}
    - Ratio: ${aspectRatio}
    - VST: ${styleData.recommended_vst}
    
    RULES:
    - If character-centric: Use MODE A.
    - If environment-centric: Use MODE B.
    
    MASTER FORMAT — MODE A (CHARACTER):
    "[CST] inside [BST]. [GST]. Subject: ... Action: ... Location: ... Atmosphere: ... Style/VST: ${styleData.image_style}, [VST] ... Composition: ... Camera: ... Lens/focus: ... Lighting: ... Mood/Intent: ... Format: --ar ${aspectRatio}. ${NEGATIVE_SUFFIX}"
    
    MASTER FORMAT — MODE B (ATMOSPHERE):
    "[BST]. [GST]. Location: ... Atmosphere: ... Style/VST: ${styleData.image_style}, [VST] ... Composition: ... Camera: ... Lens/focus: ... Lighting: ... Mood/Intent: ... Format: --ar ${aspectRatio}. ${NEGATIVE_SUFFIX}"`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptText,
            config: { systemInstruction }
        });
        return response.text?.trim() || prompt;
    } catch (err) {
        return prompt;
    }
};

export const enhanceVideoPrompt = async (videoPrompt: string, visualPrompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    
    const systemInstruction = `You are a video prompt architect for PRISMA STUDIO.
    Output EXACTLY ONE prompt following the MASTER VIDEO FORMAT.
    Strict text-only, NO token prefixes like [CST] or [I2V].`;

    const promptText = `Enhance this video motion prompt: "${videoPrompt}" 
    Visual context: "${visualPrompt}"
    
    MASTER VIDEO MOTION PROMPT FORMAT (STRICT):
    "Scene: ... Camera: ... Style/Lighting: ${styleData.video_style}, [VST] ... Motion: (primary motion + secondary atmosphere motion + camera nuance). Dialogue: "..." Audio: Ambient..., SFX..., Music...
    Aspect ratio: ${aspectRatio}. ${VIDEO_NEGATIVE_SUFFIX}"
    
    RULES:
    - Structured fields: SCENE → CAMERA → STYLE/LIGHTING → MOTION → AUDIO → Aspect ratio → Negative prompt.
    - Motion: At least TWO layers.
    - Audio: If no dialogue, use "Dialogue: no dialogue. Audio: subtle ambient only."`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptText,
            config: { systemInstruction }
        });
        return response.text?.trim() || videoPrompt;
    } catch (err) {
        return videoPrompt;
    }
};

export const generateSfxCues = async (mood: string, title: string): Promise<SfxCues> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Generate SFX cues for: "${title}". Mood: ${mood}. JSON ONLY.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonString(response.text) || "{}");
    } catch (err) {
        return { primary: "Cinematic ambience", secondary: "Background noise" };
    }
};

export const generateSpeech = async (text: string, voiceId: string, style: string, language: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Style: ${style}, Language: ${language}. Text: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio returned.");
        const pcmData = decode(base64Audio);
        const wavHeader = createWavHeader(pcmData.length, 24000, 1, 16);
        return URL.createObjectURL(new Blob([wavHeader, pcmData], { type: 'audio/wav' }));
    } catch (err) {
        return handleApiError(err, "GENERATE_SPEECH");
    }
};

export const generateViralScript = async (config: ViralScriptConfig): Promise<ViralScriptOutput> => {
    const ai = getAiClient();
    const targetWpm = 155;
    const approxWords = Math.round((config.duration / 60) * targetWpm);
    const systemInstruction = `You are PRISMA STUDIO — Phase 0 Voice Over engine. Generate script following strict word budgets: ~${approxWords} words for ${config.duration}s. JSON ONLY.`;
    const prompt = `Topic: ${config.topic}. Story: ${config.narrative}. Emotion: ${config.emotionTarget}. CTA: ${config.ctaStyle}.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                systemInstruction,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        voiceover_text: { type: Type.STRING },
                        performance_prompt: { type: Type.STRING },
                        segment_map: { 
                            type: Type.ARRAY, 
                            items: { type: Type.STRING }
                        }
                    },
                    required: ["voiceover_text", "performance_prompt", "segment_map"]
                }
            }
        });
        return JSON.parse(cleanJsonString(response.text) || "{}");
    } catch (err) {
        return handleApiError(err, "GENERATE_VIRAL_SCRIPT");
    }
};

function decode(base64: string) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
}

function createWavHeader(dataLength: number, sampleRate: number, numChannels: number, bitsPerSample: number) {
    const buffer = new ArrayBuffer(44);
    const view = new DataView(buffer);
    view.setUint8(0, 'R'.charCodeAt(0)); view.setUint8(1, 'I'.charCodeAt(0)); view.setUint8(2, 'F'.charCodeAt(0)); view.setUint8(3, 'F'.charCodeAt(0));
    view.setUint32(4, 36 + dataLength, true);
    view.setUint8(8, 'W'.charCodeAt(0)); view.setUint8(9, 'A'.charCodeAt(0)); view.setUint8(10, 'V'.charCodeAt(0)); view.setUint8(11, 'E'.charCodeAt(0));
    view.setUint8(12, 'f'.charCodeAt(0)); view.setUint8(13, 'm'.charCodeAt(0)); view.setUint8(14, 't'.charCodeAt(0)); view.setUint8(15, ' '.charCodeAt(0));
    view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true); view.setUint16(34, bitsPerSample, true);
    view.setUint8(36, 'd'.charCodeAt(0)); view.setUint8(37, 'a'.charCodeAt(0)); view.setUint8(38, 't'.charCodeAt(0)); view.setUint8(39, 'a'.charCodeAt(0));
    view.setUint32(40, dataLength, true);
    return buffer;
}
