import { GoogleGenAI, Type, Modality } from "@google/genai";
import { ProductionPackage, UserInput, ViralScriptConfig, ViralScriptOutput, SfxCues, VisualPrompt } from "../types";

/**
 * PRISMA STUDIO CORE ENGINE - PRODUCTION LOCK v3.1
 * Single-Pass Production Contract & Strict Master Formats
 */

const getAiClient = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API Key not found. Ensure environment is configured with a valid Gemini API Key.");
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Exponential backoff with jitter for Quota (429) errors
 */
const delayWithJitter = (attempt: number) => {
    const baseDelay = Math.pow(2, attempt) * 2000;
    const jitter = Math.random() * 1000;
    return new Promise(res => setTimeout(res, baseDelay + jitter));
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
    
    if (msg.includes("429") || msg.includes("quota") || msg.includes("limit") || msg.includes("resource_exhausted")) {
        throw new Error("QUOTA EXHAUSTED: Your API key has reached its limit. Wait 60s or switch to a paid key.");
    }

    if (msg.includes("401") || msg.includes("403") || msg.includes("api key not valid") || msg.includes("invalid api key")) {
        throw new Error("API Key not valid. Please check your configuration.");
    }

    throw new Error(`Engine Failure [${task}]: ${msg || 'Unknown failure'}`);
};

/**
 * ULTRA-ROBUST JSON EXTRACTION AND REPAIR ENGINE
 */
const cleanJsonString = (text: string | undefined): string => {
  if (!text) return "{}";
  let cleaned = text.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
  
  // Find the start of the first JSON object or array
  const startObj = cleaned.indexOf('{');
  const startArr = cleaned.indexOf('[');
  let start = -1;
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) start = startObj;
  else if (startArr !== -1) start = startArr;

  if (start === -1) return "{}";
  cleaned = cleaned.substring(start);

  let braceCount = 0;
  let bracketCount = 0;
  let inString = false;
  let escaped = false;
  let lastSafePoint = -1;
  let finished = false;

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (char === '"' && !escaped) inString = !inString;
    
    if (!inString) {
      if (char === '{') braceCount++;
      else if (char === '}') braceCount--;
      else if (char === '[') bracketCount++;
      else if (char === ']') bracketCount--;

      // Track last safe point to cut in case of truncation
      if (braceCount >= 0 && bracketCount >= 0) {
        if (char === '}' || char === ']' || char === ',') {
          lastSafePoint = i;
        }
      }

      // If counts hit 0, we found the end of the root JSON structure
      if (braceCount === 0 && bracketCount === 0 && (i > 0)) {
        cleaned = cleaned.substring(0, i + 1);
        finished = true;
        break;
      }
    }
    escaped = (char === '\\' && !escaped);
    if (braceCount < 0 || bracketCount < 0) break;
  }

  // Handle truncation if not finished normally
  if (!finished && (braceCount > 0 || bracketCount > 0 || inString)) {
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
    const dKey = duration.toLowerCase().replace(/\s+/g, '_');
    const denKey = density.toLowerCase();
    const table: Record<string, Record<string, number>> = {
        "30_seconds": { concise: 4, standard: 5, detailed: 6 },
        "1_minute": { concise: 6, standard: 8, detailed: 10 },
        "3_minutes": { concise: 10, standard: 14, detailed: 18 },
        "5_minutes": { concise: 14, standard: 20, detailed: 26 },
        "8_minutes": { concise: 18, standard: 26, detailed: 34 },
        "10_minutes": { concise: 20, standard: 30, detailed: 40 }
    };
    return table[dKey]?.[denKey] || 8;
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

export const generateMoviePackage = async (input: UserInput, retryCount = 0): Promise<ProductionPackage> => {
    const ai = getAiClient();
    const keyframeTotal = getRequiredKeyframeCount(input.videoDuration, input.sceneDensity);
    const stylePreset = VISUAL_STYLE_PRESETS[input.visualStyle] || VISUAL_STYLE_PRESETS["Studio Ghibli"];

    const systemPrompt = `You are PRISMA STUDIO. Generate a full production package with EXACTLY ${keyframeTotal} scenes.

    MASTER FORMAT — CHARACTER SCENE (STRICT MODE A)
    - Starts with: "[CST] inside [BST]. [GST]."
    - Fields: Subject: [details], Action: [details], Location: [details], Atmosphere: [details], Style/VST: (${stylePreset.image_style}), [VST] [details], Composition: [details], Camera: [details], Lens/focus: [details], Lighting: [details], Mood/Intent: [details], Format: --ar ${input.aspectRatio}. ${NEGATIVE_SUFFIX}
    - 1-2 lines max.

    MASTER FORMAT — ATMOSPHERE-ONLY (STRICT MODE B)
    - MUST NOT start with "[CST] inside [BST].".
    - Starts with: "[BST]. [GST]."
    - Fields: Location: [details], Atmosphere: [details], Style/VST: (${stylePreset.image_style}), [VST] [details], Composition: [details], Camera: [details], Lens/focus: [details], Lighting: [details], Mood/Intent: [details], Format: --ar ${input.aspectRatio}. ${NEGATIVE_SUFFIX}
    - 1-2 lines max.

    VIDEO MOTION PROMPT — MANDATORY STRUCTURE:
    For EACH visualPrompts item, generate a "videoPrompt" following this strict format:
    Scene: [summary]. Camera: [shot type (close-up/medium/wide/aerial) + movement (dolly/track/pan/handheld/crane) + lens (shallow/wide/macro/deep)]. Style/Lighting: [style + lighting]. Motion: [subject + environment motion]. Audio: [Ambient noise + SFX + Music rule (default "No music")]. Dialogue: "[quoted line or 'No dialogue']". Negative: no text, no watermark, no logo, no subtitles, no UI, no glitches.

    SINGLE-PASS OUTPUT CONTRACT:
    - ALWAYS compute keyframe_total: ${keyframeTotal}.
    - ALWAYS output keyframe_plan_titles length = ${keyframeTotal}.
    - ALWAYS output visualPrompts length = ${keyframeTotal}.
    - EACH visualPrompts item MUST include BOTH: prompt (Mode A or B) AND videoPrompt (motion).

    JSON SCHEMA:
    {
      "project_ratio_used": "${input.aspectRatio}",
      "asset_density_used": "${input.sceneDensity}",
      "estimated_duration_used": "${input.videoDuration}",
      "art_director_style_used": "${input.visualStyle}",
      "keyframe_total": ${keyframeTotal},
      "metadata": { "topic": "...", "mood": "..." },
      "seo": { "bestTitle": "...", "altTitles": [], "videoDescription": "...", "tags": "...", "hashtags": "...", "thumbnailPrompt": "...", "sunoPrompt": "..." },
      "story": "...",
      "keyframe_plan_titles": ["Title 1", "Title 2", ...],
      "visualPrompts": [
        { 
          "label": "...", "type": "character" | "scene", "requiresCharacter": bool, 
          "prompt": "MODE A or B Prompt String", 
          "videoPrompt": "Strict Video Prompt String", 
          "sfx_cues": { "primary": "...", "secondary": "..." } 
        }
      ],
      "single_pass_state": { "single_pass": "true", "total_keyframes": ${keyframeTotal}, "max_keyframes_single_pass": 40 }
    }`;

    const userPrompt = `Script Content: "${input.script.substring(0, 1500)}"`;

    try {
        const response = await ai.models.generateContent({
            model: input.modelEngine || 'gemini-3-flash-preview',
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                responseMimeType: "application/json",
                maxOutputTokens: 8192,
                temperature: 0.7,
            }
        });

        const rawJson = cleanJsonString(response.text);
        let data;
        try {
            data = JSON.parse(rawJson);
        } catch (e) {
            if (retryCount < 1) return generateMoviePackage(input, retryCount + 1);
            throw new Error("JSON_STRUCTURAL_FAILURE: Response was truncated or invalid. Please shorten script or reduce density.");
        }
        
        const validPrompts = (Array.isArray(data.visualPrompts) ? data.visualPrompts : []).slice(0, keyframeTotal);

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
            titles: data.keyframe_plan_titles || validPrompts.map((p: any) => p.label || "Scene"),
            visualPrompts: validPrompts,
            audioMap: [],
            cst: '', bst: '', gst: '', vst: stylePreset.recommended_vst
        };
    } catch (err: any) {
        if ((err.message.includes("429") || err.message.includes("QUOTA") || err.message.includes("RESOURCE_EXHAUSTED")) && retryCount < 5) {
            await delayWithJitter(retryCount);
            return generateMoviePackage(input, retryCount + 1);
        }
        return handleApiError(err, "GENERATE_PACKAGE");
    }
};

export const generateVoiceoverPack = async (config: ViralScriptConfig, narrative: string): Promise<string> => {
    const ai = getAiClient();
    const systemPrompt = `You are an Audio Director. Generate a full Voiceover Pack directorial prompt.
    
    STRICT STRUCTURE:
    # AUDIO PROFILE: [Name or Role]
    ## "[Short Archetype Title]"
    
    ## THE SCENE: [Location / Environment]
    [Physical environment + vibe aligned to Emotion + Audience.]
    
    ### DIRECTOR'S NOTES
    Style: [match Emotion + Audience + CTA style]
    Pacing: [fast/medium/slow; short-form cadence]
    Accent: [Language-appropriate; English=Neutral American; Indonesian=Neutral Indonesian]
    Delivery: [clarity, articulation]
    CTA: [ONLY if CTA Style != No CTA; 1 line max]
    
    ### SAMPLE CONTEXT
    [Mention character POV + gender/age preference]
    
    #### TRANSCRIPT
    [Hook -> Core -> CTA]
    
    RULES:
    - Language=${config.language} -> Transcript must be in that language.
    - Emotion=${config.emotionTarget}.
    - Audience=${config.audience}.
    - POV=${config.characterPov}.
    - CTA Style=${config.ctaStyle} (Question CTA must end with ?).`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Narrative: ${narrative.substring(0, 2000)}`,
            config: { systemInstruction: systemPrompt }
        });
        return response.text?.trim() || "Failed to generate prompt.";
    } catch (err) {
        return handleApiError(err, "GENERATE_VO_PACK");
    }
};

export const generateImage = async (prompt: string, aspectRatio: string, model: string = 'gemini-2.5-flash-image', refImage?: string, retryCount = 0): Promise<string> => {
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
        throw new Error("No image data returned from Engine.");
    } catch (err: any) {
        if ((err.message.includes("429") || err.message.includes("QUOTA") || err.message.includes("RESOURCE_EXHAUSTED")) && retryCount < 3) {
            await delayWithJitter(retryCount);
            return generateImage(prompt, aspectRatio, model, refImage, retryCount + 1);
        }
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
                    { text: `Analyze this reference image and extract continuity tokens for: [CST] (subject appearance), [BST] (setting/background), [GST] (lighting/texture), [VST] (film style). JSON ONLY.` }
                ]
            },
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { 
                      cst: { type: Type.STRING }, 
                      bst: { type: Type.STRING }, 
                      gst: { type: Type.STRING }, 
                      vst: { type: Type.STRING } 
                    },
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
            contents: `Inject these continuity tokens into the prompts of this production package: CST=${tokens.cst}, BST=${tokens.bst}, GST=${tokens.gst}, VST=${tokens.vst}. Maintain the MASTER FORMAT strictly. Scenelist: ${JSON.stringify(pkg.visualPrompts)}`,
            config: {
                systemInstruction: "You are a prompt refiner. Return a JSON object with a 'visualPrompts' array.",
                responseMimeType: "application/json"
            }
        });
        const raw = JSON.parse(cleanJsonString(response.text));
        let results = Array.isArray(raw) ? raw : (raw.visualPrompts || []);
        if (!Array.isArray(results) && typeof results === 'object') results = Object.values(results);
        return results as VisualPrompt[];
    } catch (err) {
        return handleApiError(err, "REFINE_PROMPTS");
    }
};

export const enhanceVisualPrompt = async (prompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    const promptText = `Refine this image prompt to MASTER FORMAT (Mode A or B). Style: ${styleData.image_style}, --ar ${aspectRatio}. Include Negative Suffix. Prompt: "${prompt}"`;
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptText });
        return response.text?.trim() || prompt;
    } catch (err) { return prompt; }
};

export const enhanceVideoPrompt = async (videoPrompt: string, visualPrompt: string, stylePreset: string, aspectRatio: string): Promise<string> => {
    const ai = getAiClient();
    const styleData = VISUAL_STYLE_PRESETS[stylePreset] || VISUAL_STYLE_PRESETS["Studio Ghibli"];
    const promptText = `Generate a TIMESTAMPED 3-shot motion plan based on the context: "${visualPrompt}". 
    
    STRICT OUTPUT FORMAT:
    - Exactly 3 lines.
    - No extra commentary, no headings, no bullets.
    - Each line format: <TS> Scene: ... Camera: ... Style/Lighting: ... Motion: ... Audio: ... (No music / or specified).
    - Use timestamps: 0:00-0:02, 0:02-0:04, 0:04-0:06.
    
    Style Context: ${styleData.video_style}. Original Motion: "${videoPrompt}"`;
    
    try {
        const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: promptText });
        return response.text?.trim() || videoPrompt;
    } catch (err) { return videoPrompt; }
};

export const generateSfxCues = async (mood: string, title: string): Promise<SfxCues> => {
    const ai = getAiClient();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: `Suggest 2 high-quality SFX cues for: "${title}" (Mood: ${mood}). JSON: {primary, secondary}.`,
            config: { responseMimeType: "application/json" }
        });
        return JSON.parse(cleanJsonString(response.text));
    } catch (err) {
        return { primary: "Ambient soundscape", secondary: "Atmospheric" };
    }
};

export const generateSpeech = async (text: string, voiceId: string, style: string, language: string): Promise<string> => {
    const ai = getAiClient();
    try {
        // PATCH: If directorial prompt structure is detected, pass as-is
        const finalContent = text.startsWith('# AUDIO PROFILE:') 
            ? text 
            : `Language: ${language}. Style: ${style}. Script: ${text}`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: finalContent }] }],
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
    const prompt = `Topic: ${config.topic}. Target Duration: ${config.duration}s. Emotion: ${config.emotionTarget}. Create a high-engagement viral script for ${config.platform}. JSON only.`;
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
