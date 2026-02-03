import React, { useState, useEffect, useMemo, useRef } from 'react';
import { voices } from '../data/voices';
import { VoiceOption, ViralScriptConfig, ViralScriptOutput, ExportFormat, Mp3Quality } from '../types';
import { generateSpeech, generateViralScript } from '../services/geminiService';
import { exportAudio } from '../utils/audioUtils';
import { Mic, Languages, Sparkles, Download, Loader2, AlertCircle, Wand2, Bot, SlidersHorizontal, ChevronsRight, FileText, Clapperboard, Quote, Activity, Clock, ListOrdered } from 'lucide-react';

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
            <span>Target: 155 WPM</span>
        </div>
    );
};

const VoiceOverGenerator: React.FC<VoiceOverGeneratorProps> = ({ story, topic, duration, visualStyle }) => {
  const [scriptConfig, setScriptConfig] = useState<Omit<ViralScriptConfig, 'narrative' | 'topic' | 'duration' | 'visualStyle'>>({
    language: 'EN',
    platform: 'TikTok',
    audience: 'General Audience',
    emotionTarget: 'Hype/CTR',
    accent: 'Neutral',
    forbiddenWords: '',
    ctaStyle: 'Question',
    characterContext: 'Narrator',
  });
  const [viralScript, setViralScript] = useState<ViralScriptOutput | null>(null);
  const [editableTranscript, setEditableTranscript] = useState('');
  
  const [genderFilter, setGenderFilter] = useState<'All' | 'Male' | 'Female'>('All');
  const [ageFilter, setAgeFilter] = useState<'All' | 'Young' | 'Adult' | 'Neutral'>('All');
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [speakingStyle, setSpeakingStyle] = useState('Storytelling');

  const [scriptLoading, setScriptLoading] = useState(false);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [exportFormat, setExportFormat] = useState<ExportFormat>('WAV');
  const [mp3Quality, setMp3Quality] = useState<Mp3Quality>('Standard');

  useEffect(() => {
    const voicesForLang = voices.filter(v => v.language === scriptConfig.language);
    const filtered = voicesForLang.filter(v => {
      const genderMatch = genderFilter === 'All' || v.gender === genderFilter;
      const ageMatch = ageFilter === 'All' || v.age === ageFilter;
      return genderMatch && ageMatch;
    });
    setAvailableVoices(filtered);
    if (filtered.length > 0) {
      setSelectedVoiceId(filtered[0].id);
    } else {
      setSelectedVoiceId('');
    }
  }, [scriptConfig.language, genderFilter, ageFilter]);
  
  useEffect(() => {
      if (audioRef.current) {
          audioRef.current.playbackRate = playbackRate;
      }
  }, [playbackRate]);

  const handleGenerateScript = async () => {
    setScriptLoading(true);
    setError(null);
    setViralScript(null);
    setEditableTranscript('');
    setAudioUrl(null);
    try {
      const fullConfig: ViralScriptConfig = {
        ...scriptConfig,
        narrative: story,
        topic: topic,
        duration: durationStringToSeconds(duration),
        visualStyle: visualStyle,
      };
      const result = await generateViralScript(fullConfig);
      setViralScript(result);
      setEditableTranscript(result.voiceover_text);
    } catch (err: any) {
      setError(err.message || 'Failed to generate script.');
    } finally {
      setScriptLoading(false);
    }
  };
  
  const handleGenerateVoice = async () => {
    if (!editableTranscript || !selectedVoiceId) return;
    setTtsLoading(true);
    setError(null);
    setAudioUrl(null);
    try {
      const url = await generateSpeech(editableTranscript, selectedVoiceId, speakingStyle, scriptConfig.language);
      setAudioUrl(url);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize audio.');
    } finally {
      setTtsLoading(false);
    }
  };
  
  const handleDownload = () => {
      if (!audioUrl) return;
      const selectedVoice = voices.find(v => v.id === selectedVoiceId);
      const filename = `VO_${topic.replace(/\s+/g, '_')}_${selectedVoice?.name || 'audio'}`;
      exportAudio(audioUrl, exportFormat, mp3Quality, filename);
  };

  return (
    <div className="bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal p-6 space-y-8">
      {/* --- Step 1: Script Studio --- */}
      <div className="border-b-4 border-brutal-dark dark:border-brutal-gray pb-6">
        <h3 className="font-display font-black text-xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3 mb-4">
            <Bot className="w-6 h-6" /> Phase 0: Voice Over (TTS) Studio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[9px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Language</label>
              <select value={scriptConfig.language} onChange={e => setScriptConfig(p => ({...p, language: e.target.value as any}))} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option value="EN">English</option><option value="ID">Indonesian</option><option value="JP">Japanese</option><option value="KR">Korean</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[9px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Emotion</label>
              <select value={scriptConfig.emotionTarget} onChange={e => setScriptConfig(p => ({...p, emotionTarget: e.target.value}))} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option value="Hype/CTR">Hype / CTR</option><option value="Calm">Calm</option><option value="Serious">Serious</option><option value="Warm">Warm</option><option value="Documentary">Documentary</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[9px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Audience</label>
              <select value={scriptConfig.audience} onChange={e => setScriptConfig(p => ({...p, audience: e.target.value}))} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option value="General Audience">General Audience</option><option value="Kids">Kids</option><option value="Educational">Educational</option><option value="Mature">Mature</option>
              </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[9px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">CTA Style</label>
              <select value={scriptConfig.ctaStyle} onChange={e => setScriptConfig(p => ({...p, ctaStyle: e.target.value}))} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                  <option value="Question">Question</option><option value="Direct">Direct</option><option value="Soft">Soft</option><option value="None">None</option>
              </select>
          </div>
          <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
              <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow px-1 font-mono text-[9px] font-bold uppercase text-brutal-dark border-2 border-brutal-dark">Character/POV</label>
              <input type="text" value={scriptConfig.characterContext} onChange={e => setScriptConfig(p => ({...p, characterContext: e.target.value}))} placeholder="e.g. Young boy, Detective..." className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none rounded-none text-brutal-dark dark:text-white" />
          </div>
        </div>
        <button onClick={handleGenerateScript} disabled={scriptLoading} className="w-full flex items-center justify-center gap-3 bg-brutal-yellow text-brutal-dark font-display font-black text-lg uppercase p-4 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] disabled:opacity-50">
          {scriptLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Architectural Sync...</> : <><Wand2 className="w-5 h-5" /> Generate VO Assets</>}
        </button>
      </div>

       {/* --- Script Output --- */}
       {viralScript && (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-4">
                    <div>
                        <h4 className="font-mono text-xs font-bold uppercase text-brutal-dark dark:text-brutal-gray mb-2 flex items-center gap-2"><FileText className="w-4 h-4" /> Voiceover Transcript</h4>
                        <textarea
                            className="h-80 w-full p-4 bg-brutal-gray/30 dark:bg-brutal-dark/80 border-2 border-brutal-dark dark:border-brutal-gray text-sm font-mono focus:outline-none focus:bg-white dark:focus:bg-brutal-dark leading-relaxed"
                            value={editableTranscript}
                            onChange={(e) => setEditableTranscript(e.target.value)}
                        />
                        <ScriptStats text={editableTranscript} />
                    </div>
                </div>
                <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-600 p-4 shadow-brutal-sm">
                        <h4 className="font-mono text-[10px] font-bold uppercase text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
                            <Activity className="w-4 h-4" /> Performance Guidance
                        </h4>
                        <p className="font-mono text-xs leading-tight text-blue-800 dark:text-blue-100 italic">
                            {viralScript.performance_prompt}
                        </p>
                    </div>
                    <div className="bg-brutal-yellow/5 border-2 border-brutal-dark p-4 shadow-brutal-sm">
                        <h4 className="font-mono text-[10px] font-bold uppercase text-brutal-dark dark:text-brutal-gray mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> Segment Strategy</h4>
                        <div className="space-y-3">
                           {viralScript.segment_map.map((seg, idx) => (
                             <div key={idx} className="flex items-center gap-3 font-mono text-xs font-bold text-brutal-dark dark:text-brutal-gray">
                                <div className="w-6 h-6 rounded-full border-2 border-brutal-dark flex items-center justify-center text-[10px] bg-white">{idx + 1}</div>
                                {seg}
                             </div>
                           ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
       )}

      {/* --- Step 2: Voice Studio --- */}
      <div className={`${!viralScript ? 'opacity-30 pointer-events-none' : ''} transition-opacity`}>
         <h3 className="font-display font-black text-xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3 mb-4">
            <SlidersHorizontal className="w-6 h-6" /> Synthesis Studio
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
             <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Gender</label>
                <select value={genderFilter} onChange={e => setGenderFilter(e.target.value as any)} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    <option value="All">All</option><option value="Male">Male</option><option value="Female">Female</option>
                </select>
            </div>
            <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Age</label>
                <select value={ageFilter} onChange={e => setAgeFilter(e.target.value as any)} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    <option value="All">All</option><option value="Young">Young</option><option value="Adult">Adult</option><option value="Neutral">Neutral</option>
                </select>
            </div>
             <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark lg:col-span-2">
                <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Voice Architecture</label>
                <select value={selectedVoiceId} onChange={e => setSelectedVoiceId(e.target.value)} disabled={availableVoices.length === 0} className="w-full p-3 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                    {availableVoices.map(v => <option key={v.id} value={v.id}>{v.name} ({v.description})</option>)}
                </select>
            </div>
        </div>
         <button onClick={handleGenerateVoice} disabled={ttsLoading || !editableTranscript || !selectedVoiceId} className="w-full flex items-center justify-center gap-3 bg-brutal-dark dark:border-white text-white font-display font-black text-lg uppercase p-4 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] hover:bg-brutal-yellow hover:text-brutal-dark disabled:opacity-50">
          {ttsLoading ? <><Loader2 className="w-5 h-5 animate-spin" /> Neural Streaming...</> : <><Mic className="w-5 h-5" /> Synthesize Audio Assets</>}
        </button>
      </div>

      <div className="space-y-4">
        {error && (
            <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 font-mono text-xs p-3 border-2 border-red-700 dark:border-red-500 flex items-start gap-2 shadow-brutal-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> 
                <span>{error}</span>
            </div>
        )}
        {audioUrl && (
            <div className="bg-brutal-gray/30 dark:bg-brutal-dark/80 border-2 border-brutal-dark dark:border-brutal-gray p-6 space-y-6 animate-fade-in shadow-brutal-sm">
              <audio src={audioUrl} controls ref={audioRef} className="w-full"></audio>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                    <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Speed</label>
                    <select value={playbackRate} onChange={e => setPlaybackRate(Number(e.target.value))} className="w-full p-2 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                        {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => <option key={rate} value={rate}>{rate}x</option>)}
                    </select>
                </div>
                <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                    <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Format</label>
                    <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="w-full p-2 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                        <option value="WAV">WAV (Lossless)</option><option value="MP3">MP3 (Universal)</option>
                    </select>
                </div>
                <div className={`relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark ${exportFormat !== 'MP3' ? 'opacity-30' : ''}`}>
                    <label className="absolute -top-2 left-2 -translate-y-1/2 bg-brutal-yellow text-brutal-dark px-1 font-mono text-[9px] font-bold uppercase border-2 border-brutal-dark">Bitrate</label>
                    <select value={mp3Quality} onChange={e => setMp3Quality(e.target.value as any)} disabled={exportFormat !== 'MP3'} className="w-full p-2 bg-transparent font-mono text-xs font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white">
                        <option value="Compressed">Compressed</option><option value="Standard">Standard</option><option value="Max">Maximum</option>
                    </select>
                </div>
                <button onClick={handleDownload} className="w-full flex items-center justify-center gap-2 bg-brutal-dark text-white font-mono font-bold text-sm uppercase p-2 border-2 border-brutal-dark shadow-brutal-sm transition-all hover:bg-brutal-yellow hover:text-brutal-dark">
                  <Download className="w-4 h-4" /> Export Asset
                </button>
              </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default VoiceOverGenerator;
