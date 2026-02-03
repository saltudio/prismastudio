export interface VisualPrompt {
  label: string;
  moodGuide?: string;
  visualDescription?: string;
  cameraAngle?: string;
  audioAtmosphere?: string;
  audioCue?: string;
  dialogue?: string;
  estimatedDuration?: number;
  prompt: string;
  type: 'character' | 'scene';
  requiresCharacter?: boolean;
  videoPrompt?: string;
}

export interface Character {
  name: string;
  role: string;
  ageAndAppearance: string;
  personality: string;
  visualPrompt: string;
}

export interface SeoMetadata {
  bestTitle: string;
  altTitles: string[];
  videoDescription: string;
  tags: string;
  hashtags: string;
  thumbnailPrompt: string;
  sunoPrompt: string;
}

export interface ProductionPackage {
  metadata: {
    topic: string;
    mood: string;
    visualStyle: string;
    aspectRatio: string;
    duration: string;
  };
  seo: SeoMetadata;
  titles: string[];
  story: string;
  audioMap: string[];
  visualPrompts: VisualPrompt[];
  // Continuity tokens
  cst: string;
  bst: string;
  gst: string;
  vst: string;
}

export type SceneDensity = 'Concise' | 'Standard' | 'Detailed';
export type AspectRatio = '16:9' | '9:16';
export type ApiProvider = 'aistudio' | 'vertex';

export interface UserInput {
  script: string;
  visualStyle: string;
  sceneDensity: SceneDensity;
  aspectRatio: AspectRatio;
  characterDescription: string;
  videoDuration: string;
  modelEngine: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  description: string;
  gender: 'Male' | 'Female';
  age: 'Young' | 'Adult' | 'Neutral';
  language: 'EN' | 'ID' | 'JP' | 'KR';
}

export interface ViralScriptConfig {
  language: 'ID' | 'EN' | 'JP' | 'KR';
  platform: 'Shorts' | 'TikTok' | 'Reels';
  topic: string;
  audience: string;
  emotionTarget: string;
  duration: number;
  accent: string;
  forbiddenWords: string;
  ctaStyle: string;
  narrative: string;
  visualStyle: string;
  characterContext?: string;
}

export interface ViralScriptOutput {
  voiceover_text: string;
  performance_prompt: string;
  segment_map: string[];
}

export type ExportFormat = 'WAV' | 'MP3';
export type Mp3Quality = 'Compressed' | 'Standard' | 'Max';

export interface SfxCues {
  primary: string;
  secondary: string;
  oneShot?: string;
  avoid?: string;
}