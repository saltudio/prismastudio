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
    
    let msg = "";
    try {
      if (typeof error.message === 'string' && error.message.startsWith('{')) {
        const parsed = JSON.parse(error.message);
        msg = (parsed?.error?.message || error.message).toLowerCase();
      } else {
        msg = (error?.message || "").toLowerCase();
      }
    } catch {
      msg = (error?.message || "").toLowerCase();
    }
    
    if (msg.includes("401") || msg.includes("403") || msg.includes("api key not valid") || msg.includes("invalid api key")) {
        window.dispatchEvent(new CustomEvent('PRISMA_API_KEY_INVALID'));
        throw new Error("API Key not valid. Please check your Engine Settings.");
    }

    if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("resource_exhausted")) {
        throw new Error("QUOTA EXHAUSTED: Your API key has reached its limit. Wait 60s or switch to a paid key.");
    }

    throw new Error(`Engine Failure [${task}]: ${msg || 'Unknown failure'}`);
};

/**
 * ULTRA-AGGRESSIVE JSON REPAIR ENGINE
 */
const cleanJsonString = (text: string | undefined): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();

  const start = cleaned.indexOf('{');
  if (start === -1) return "{}";
  cleaned = cleaned.substring(start);

  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  let lastSafePoint = -1;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escaped) inString = !inString;
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;

      if (braceCount >= 0 && bracketCount >= 0) {
        if (char === '}' || char === ']' || char === ',') {
          lastSafePoint = i;
        }
      }
    }
    escaped = (char === '\\' && !escaped);
    if (braceCount < 0 || bracketCount < 0) break;
  }

  if (braceCount > 0 || bracketCount > 0 || inString) {
    if (lastSafePoint !== -1) {
      cleaned = cleaned.substring(0, lastSafePoint + 1);
      cleaned = cleaned.trim().replace(/,$/, '');
      
      let sBrace = 0, sBracket = 0;
      for (const c of cleaned) {
        if (c === '{') sBrace++; else if (c === '}') sBrace--;
        if (c === '[') sBracket++; else if (c === ']') sBracket--;
      }
      while (sBracket > 0) { cleaned += ']'; sBracket--; }
      while (sBrace > 0) { cleaned += '}'; sBrace--; }
    } else {
        if (!cleaned.endsWith('}')) cleaned += '}';
    }
  }

  return cleaned
    .replace(/\n/g, ' ')
    .replace(/\r/g, ' ')
    .replace(/,\s*([\]}])/g, '$1')
    .replace(/"\s*:\s*"/g, '":"');
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
        image_style: "2D classic stickman animation, clean vector linework, flat shapes",
        video_style: "2D classic stickman motion, smooth tweened animation, stable linework",
        recommended_vst: "VST_01 Clean Digital Cinema"
    },
    "Stickman — Blueprint": {
        image_style: "blueprint schematic style, cyan grid, white technical line drawings",
        video_style: "blueprint line-reveal animation, technical callout pop-ins",
        recommended_vst: "VST_14 Matte Minimalist"
    },
    "Stickman — Chalkboard": {
        image_style: "chalkboard sketch style, rough chalk strokes, dusty smudges",
        video_style: "chalk-writing reveal animation, smudge transitions, chalk dust",
        recommended_vst: "VST_05 Overcast Documentary"
    },
    "Stickman — 3D Render": {
        image_style: "simple 3D stick-figure render, smooth plastic, soft studio light",
        video_style: "simple 3D character animation, smooth keyframed motion",
        recommended_vst: "VST_09 High-Key Commercial"
    },
    "Clay Animation": {
        image_style: "clay animation style, handcrafted clay textures, fingerprints",
        video_style: "claymation motion, stop-motion jitter, tactile deformations",
        recommended_vst: "VST_02 Warm Indie Drama"
    },
    "Studio Ghibli": {
        image_style: "Studio Ghibli aesthetic, hand-painted watercolor anime, soft edges",
        video_style: "painterly animation feel, gentle parallax pans, soft light transitions",
        recommended_vst: "VST_08 Soft Pastel Dream"
    },
    "Retro Anime": {
        image_style: "retro 90s anime cel style, ink lines, limited shading, halation",
        video_style: "retro cel animation, limited-frame cadence, classic anime holds",
        recommended_vst: "VST_06 Retro 35mm Film"
    },
    "Pixar Style": {
        image_style: "stylized 3D family animation look, expressive faces, global illumination",
        video_style: "stylized 3D animation, smooth character arcs, cinematic DOF",
        recommended_vst: "VST_09 High-Key Commercial"
    },
    "Stop-motion Animation": {
        image_style: "miniature practical set, handmade props, tactile textures",
        video_style: "stop-motion feel, frame jitter, miniature parallax",
        recommended_vst: "VST_07 Vintage 16mm Home-Movie"
    },
    "Cutout Animation": {
        image_style: "2D cutout puppet look, layered paper shapes, crisp silhouettes",
        video_style: "cutout puppet motion, hinge-like limb movement, layered parallax",
        recommended_vst: "VST_14 Matte Minimalist"
    },
    "3D CGI Animation": {
        image_style: "high quality 3D CGI frame, detailed materials, cinematic lighting",
        video_style: "3D CGI cinematic, smooth camera moves, realistic motion blur",
        recommended_vst: "VST_11 Anamorphic Cinematic"
    },
    "Cinematic 8K": {
        image_style: "ultra-detailed cinematic realism, crisp textures, shallow DOF",
        video_style: "cinematic realism, slow dolly tracking, realistic motion blur",
        recommended_vst: "VST_11 Anamorphic Cinematic"
    },
    "Documentary": {
        image_style: "documentary realism, natural lighting, candid framing",
        video_style: "documentary camera language, handheld shake, natural ambience",
        recommended_vst: "VST_05 Overcast Documentary"
    },
    "Cyberpunk": {
        image_style: "cyberpunk neon city, wet reflective streets, magenta/cyan practicals",
        video_style: "neon noir cinematic, slow tracking, volumetric haze motion",
        recommended_vst: "VST_12 Neon Night City"
    },
    "Film Noir": {
        image_style: "film noir, classic monochrome, hard shadows, dramatic contrast",
        video_style: "noir pacing, slow push-in, chiaroscuro lighting, smoke drift",
        recommended_vst: "VST_13 Black & White Classic"
    },
    "Low-Key Thriller": {
        image_style: "low-key thriller lighting, deep shadows, tight contrast",
        video_style: "suspense pacing, slow dolly in, handheld tension",
        recommended_vst: "VST_10 Low-Key Thriller"
    }
};

const NEGATIVE_SUFFIX = "--no text, watermark, logo, signature, bad anatomy, deformed, blurry, low quality, ugly, distorted face, extra fingers, uneven borders, random text, circle around number";
const VIDEO_NEGATIVE_SUFFIX = "Negative prompt: watermark, random text, logos, extra limbs, distorted face, low quality.";

export const generateMoviePackage = async (input: UserInput): Promise<ProductionPackage> => {
    const ai = getAiClient();
    const keyframeTotal = getRequiredKeyframeCount(input.videoDuration, input.sceneDensity);
    const styleData = VISUAL_STYLE_PRESETS[input.visualStyle] || VISUAL_STYLE_PRESETS["Studio Ghibli"];

    const prompt = `Act as PRISMA STUDIO. Generate a cinematic storyboard package.
    Narrative: "${input.script}"
    Style: "${input.visualStyle}"
    Character DNA: "${input.characterDescription}"
    Target: ${keyframeTotal} Keyframes

    STRICT CONSTRAINTS:
    1. BREVITY: Keep prompt strings concise. No fluff.
    2. JSON VALIDITY: No unescaped double quotes inside strings.
    3. MASTER FORMATS:
       - image prompt: "[CST] inside [BST]. [GST]. Subject: ..., Style: ${styleData.image_style}, [VST] ..., --ar ${input.aspectRatio}. ${NEGATIVE_SUFFIX}"
       - videoPrompt: "Scene: ... Camera: ... Style/Lighting: ${styleData.video_style}, [VST] ... Motion: (layers). Dialogue: "..." Audio: Ambient..., SFX..., Music... Aspect ratio: ${input.aspectRatio}. ${VIDEO_NEGATIVE_SUFFIX}"
    
    JSON SCHEMA:
    {
      "keyframe_plan_titles": ["..."],
      "metadata": { "topic": "...", "mood": "...", "visualStyle": "...", "aspectRatio": "...", "duration": "..." },
      "seo": { "bestTitle": "...", "altTitles": ["..."], "videoDescription": "...", "tags": "...", "hashtags": "...", "thumbnailPrompt": "...", "sunoPrompt": "..." },
      "story": "...",
      "visualPrompts": [
        { "label": "...", "prompt": "...", "videoPrompt": "...", "type": "character"|"scene", "requiresCharacter": boolean, "moodGuide": "...", "visualDescription": "...", "cameraAngle": "...", "estimatedDuration": number, "sfx_cues": { "primary": "..." } }
      ]
    }`;

    try {
        const response = await ai.models.generateContent({
            model: input.modelEngine || 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                temperature: 0.6,
            }
        });

        const rawJson = cleanJsonString(response.text);
        let data;
        try {
            data = JSON.parse(rawJson);
        } catch (e) {
            console.warn("Retrying JSON Parse...");
            try {
                data = JSON.parse(rawJson + '}');
            } catch (innerE) {
                throw new Error("JSON_STRUCTURAL_FAILURE: Response was truncated or malformed. Reduce 'Asset Density'.");
            }
        }
        
        const rawPrompts = Array.isArray(data.visualPrompts) ? data.visualPrompts : [];
        const validPrompts = rawPrompts.filter((p: any) => p && (p.prompt || p.label));

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
            titles: data.keyframe_plan_titles || (validPrompts.map((p: any) => p.label)),
            visualPrompts: validPrompts,
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
                    { text: `Extract descriptors: [CST], [BST], [GST], [VST]. JSON ONLY.` }
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
        return JSON.parse(cleanJsonString(response.text));
    } catch (err) {
        return handleApiError(err, "EXTRACT_TOKENS");
    }
};

export const refinePackagePrompts = async (pkg: ProductionPackage, tokens: { cst: string, bst: string, gst: string, vst: string }): Promise<VisualPrompt[]> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Inject tokens: CST=${tokens.cst}, BST=${tokens.bst}, GST=${tokens.gst}, VST=${tokens.vst} into: ${JSON.stringify(pkg.visualPrompts)}`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonString(response.text));
    } catch (err) {
        return handleApiError(err, "REFINE_PROMPTS");
    }
};

export const enhanceVisualPrompt = async (prompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    
    const promptText = `Rewrite to MASTER IMAGE FORMAT: "${prompt}". Style: ${styleData.image_style}, VST: ${styleData.recommended_vst}, --ar ${aspectRatio}.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptText
        });
        return response.text?.trim() || prompt;
    } catch (err) {
        return prompt;
    }
};

export const enhanceVideoPrompt = async (videoPrompt: string, visualPrompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    
    const promptText = `Rewrite to MASTER VIDEO MOTION FORMAT: "${videoPrompt}". Context: "${visualPrompt}". Sequence: Scene->Camera->Style(${styleData.video_style})->Motion->Audio.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: promptText
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
            contents: `SFX Cues for: "${title}". Mood: ${mood}. JSON: {primary, secondary}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonString(response.text));
    } catch (err) {
        return { primary: "Cinematic ambience", secondary: "Atmospheric" };
    }
};

export const generateSpeech = async (text: string, voiceId: string, style: string, language: string): Promise<string> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: `Lang: ${language}. Text: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceId } } },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("Synthesis failed.");
        const pcmData = decode(base64Audio);
        const wavHeader = createWavHeader(pcmData.length, 24000, 1, 16);
        return URL.createObjectURL(new Blob([wavHeader, pcmData], { type: 'audio/wav' }));
    } catch (err) {
        return handleApiError(err, "GENERATE_SPEECH");
    }
};

export const generateViralScript = async (config: ViralScriptConfig): Promise<ViralScriptOutput> => {
    const ai = getAiClient();
    const prompt = `Topic: ${config.topic}. Narrative: ${config.narrative}. Tone: ${config.emotionTarget}. Budget: ${Math.round(config.duration * 2.5)} words.`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonString(response.text));
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
