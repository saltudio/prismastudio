import React, { useState, useEffect, useMemo, useRef } from 'react';
import { voices } from '../data/voices';
import { VoiceOption, ViralScriptConfig, ViralScriptOutput, ExportFormat, Mp3Quality } from '../types';
import { generateSpeech, generateVoiceoverPack } from '../services/geminiService';
import { exportAudio } from '../utils/audioUtils';
import { Mic, Bot, SlidersHorizontal, Wand2, Copy, Check, Loader2, AlertCircle, Download, FileText, ClipboardList } from 'lucide-react';

interface VoiceOverGeneratorProps {
  story: string;
  topic: string;
  duration: string;
  visualStyle: string;
}

const durationStringToSeconds = (duration: string): number => {
    const durationMap: Record<string, number> = {
      "30 Seconds": 30, "1 Minute": 60, "3 Minutes": 180, "5 Minutes": 300,
      "8 Minutes": 480, "10 Minutes": 600
    };
    return durationMap[duration] || 60;
}

const ScriptStats: React.FC<{ text: string }> = ({ text }) => {
    const words = text.split(/\s+/).filter(Boolean).length;
    const estimatedSeconds = Math.round(words / (155/60)); 

    return (
        <div className="text-[10px] font-mono text-brutal-dark/60 dark:text-brutal-gray/60 mt-2 flex flex-wrap gap-x-4 gap-y-1 uppercase font-bold">
            <span>{words} words</span>
            <span>~{estimatedSeconds}s estimated</span>
        </div>
    );
};

const VoiceOverGenerator: React.FC<VoiceOverGeneratorProps> = ({ story, topic, duration, visualStyle }) => {
  const [scriptConfig, setScriptConfig] = useState<Omit<ViralScriptConfig, 'narrative' | 'topic' | 'duration' | 'visualStyle'>>({
    language: 'EN',
    platform: 'TikTok',
    audience: 'General Audience',
    emotionTarget: 'Hype / CTR',
    accent: 'Neutral',
    forbiddenWords: '',
    ctaStyle: 'Question',
    characterPov: 'Narrator',
  });

  const [voiceConfig, setVoiceConfig] = useState({
      gender: 'All',
      age: 'All',
      selectedLabel: 'Zephyr — Bright'
  });

  const [directorialPrompt, setDirectorialPrompt] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const filteredVoices = useMemo(() => {
    return voices.filter(v => {
      const langMatch = v.language === scriptConfig.language;
      const genderMatch = voiceConfig.gender === 'All' || v.gender === voiceConfig.gender;
      const ageMatch = voiceConfig.age === 'All' || v.age === voiceConfig.age;
      return langMatch && genderMatch && ageMatch;
    });
  }, [scriptConfig.language, voiceConfig.gender, voiceConfig.age]);

  const selectedVoiceId = useMemo(() => {
      const found = voices.find(v => `${v.id} — ${v.description}` === voiceConfig.selectedLabel);
      return found?.id || '';
  }, [voiceConfig.selectedLabel]);

  const handleAnalyzeNarrative = async () => {
    if (!story) return;
    setScriptLoading(true);
    setError(null);
    try {
      const config: ViralScriptConfig = {
        ...scriptConfig,
        narrative: story,
        topic: topic,
        duration: durationStringToSeconds(duration),
        visualStyle: visualStyle,
      };
      const pack = await generateVoiceoverPack(config, story);
      setDirectorialPrompt(pack);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze narrative.');
    } finally {
      setScriptLoading(false);
    }
  };
  
  const handleGenerateVoice = async () => {
    if (!directorialPrompt || !selectedVoiceId) return;
    setTtsLoading(true);
    setError(null);
    try {
      const url = await generateSpeech(directorialPrompt, selectedVoiceId, scriptConfig.emotionTarget, scriptConfig.language);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize audio.');
    } finally {
      setTtsLoading(false);
    }
  };

  const handleCopy = () => {
      navigator.clipboard.writeText(directorialPrompt);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-brutal-dark border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal p-8 space-y-10 animate-fade-in">
      <div className="border-b-4 border-brutal-dark dark:border-brutal-gray pb-8">
        <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3 mb-8">
            <Bot className="w-8 h-8" /> Phase 0: Voice Over (TTS) Studio
        </h3>

        {/* Row 1: Script Studio */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[10px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Language</label>
              <select value={scriptConfig.language} onChange={e => setScriptConfig(p => ({...p, language: e.target.value as any}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option value="EN">English</option><option value="ID">Indonesian</option><option value="JP">Japanese</option><option value="KR">Korean</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[10px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Emotion</label>
              <select value={scriptConfig.emotionTarget} onChange={e => setScriptConfig(p => ({...p, emotionTarget: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option>Hype / CTR</option><option>Calm / Cozy</option><option>Serious / Documentary</option><option>Mysterious / Tension</option><option>Funny / Cute</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[10px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Audience</label>
              <select value={scriptConfig.audience} onChange={e => setScriptConfig(p => ({...p, audience: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option>General Audience</option><option>Kids / Family</option><option>Teens</option><option>Adults</option><option>Professional</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[10px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">CTA Style</label>
              <select value={scriptConfig.ctaStyle} onChange={e => setScriptConfig(p => ({...p, ctaStyle: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option>Question</option><option>Direct CTA</option><option>Soft CTA</option><option>No CTA</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[10px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">POV</label>
              <select value={scriptConfig.characterPov} onChange={e => setScriptConfig(p => ({...p, characterPov: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option>Narrator</option><option>Main Character POV</option><option>Reporter</option><option>Teacher</option><option>Friend</option>
              </select>
          </div>
        </div>

        {/* Row 2: Voice Studio */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[10px] font-bold uppercase border-2 border-brutal-dark">Gender</label>
                <select value={voiceConfig.gender} onChange={e => setVoiceConfig(v => ({...v, gender: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    <option>All</option><option>Female</option><option>Male</option>
                </select>
            </div>
            <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[10px] font-bold uppercase border-2 border-brutal-dark">Age</label>
                <select value={voiceConfig.age} onChange={e => setVoiceConfig(v => ({...v, age: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    <option>All</option><option>Teen</option><option>Young Adult</option><option>Adult</option><option>Mature</option>
                </select>
            </div>
            <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[10px] font-bold uppercase border-2 border-brutal-dark">Voice Engine</label>
                <select value={voiceConfig.selectedLabel} onChange={e => setVoiceConfig(v => ({...v, selectedLabel: e.target.value}))} className="w-full p-4 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    {filteredVoices.map(v => (
                        <option key={v.id} value={`${v.id} — ${v.description}`}>{v.name} — {v.description}</option>
                    ))}
                </select>
            </div>
        </div>

        <button 
          onClick={handleAnalyzeNarrative} 
          disabled={scriptLoading || !story} 
          className="w-full flex items-center justify-center gap-3 bg-brutal-yellow text-brutal-dark font-display font-black text-xl uppercase p-6 border-4 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
        >
          {scriptLoading ? <><Loader2 className="w-6 h-6 animate-spin" /> Analyzing Narrative...</> : <><Wand2 className="w-6 h-6" /> Analyze Narrative</>}
        </button>
      </div>

      <div className="space-y-6">
          <div className="flex items-center justify-between">
              <h4 className="font-display font-black text-xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3">
                  <ClipboardList className="w-6 h-6" /> Voiceover Pack
              </h4>
              <button 
                onClick={handleCopy} 
                disabled={!directorialPrompt}
                className="bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray px-4 py-2 font-mono font-bold text-[10px] uppercase shadow-brutal-sm flex items-center gap-2 hover:bg-brutal-yellow transition-all"
              >
                  {isCopied ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                  Copy Pack
              </button>
          </div>
          
          <textarea
            className="w-full h-80 p-6 font-mono text-sm leading-relaxed bg-brutal-gray/20 dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray text-brutal-dark dark:text-white focus:outline-none focus:bg-white dark:focus:bg-brutal-dark transition-all"
            value={directorialPrompt}
            onChange={(e) => setDirectorialPrompt(e.target.value)}
            placeholder="# AUDIO PROFILE: ... (Click Analyze Narrative to generate)"
          />
          <ScriptStats text={directorialPrompt} />

          <button 
            onClick={handleGenerateVoice} 
            disabled={ttsLoading || !directorialPrompt} 
            className="w-full flex items-center justify-center gap-3 bg-brutal-dark dark:bg-brutal-gray text-white dark:text-brutal-dark font-display font-black text-2xl uppercase p-6 border-4 border-brutal-dark shadow-brutal transition-all hover:bg-brutal-yellow hover:text-brutal-dark hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50"
          >
            {ttsLoading ? <><Loader2 className="w-8 h-8 animate-spin" /> Synthesizing...</> : <><Mic className="w-8 h-8" /> Generate Voice</>}
          </button>
      </div>

      {audioUrl && (
          <div className="bg-brutal-yellow/10 border-4 border-brutal-dark p-8 animate-fade-in shadow-brutal">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-grow w-full">
                    <p className="font-mono text-[10px] font-black uppercase mb-2 tracking-widest opacity-60">Production Master Asset:</p>
                    <audio src={audioUrl} controls className="w-full h-12"></audio>
                </div>
                <a 
                  href={audioUrl} 
                  download={`PRISMA_VO_${topic.replace(/\s+/g, '_')}.wav`} 
                  className="flex items-center justify-center gap-3 bg-brutal-dark text-white px-8 py-4 font-display font-black uppercase text-sm shadow-brutal-sm hover:bg-brutal-yellow hover:text-brutal-dark transition-all"
                >
                    <Download className="w-5 h-5" /> Download
                </a>
            </div>
          </div>
      )}

      {error && (
        <div className="bg-red-500 text-white p-6 border-4 border-brutal-dark flex items-start gap-4 animate-shake shadow-brutal">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <p className="font-mono text-sm font-bold uppercase">{error}</p>
        </div>
      )}
    </div>
  );
};

export default VoiceOverGenerator;
