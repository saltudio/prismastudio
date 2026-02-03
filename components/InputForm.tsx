import React, { useState } from 'react';
import { UserInput, SceneDensity, AspectRatio } from '../types';
import { Wand2, Loader2, FileText, Settings2, User, Palette, Monitor, RectangleVertical, RectangleHorizontal, Clock, BrainCircuit, KeyRound } from 'lucide-react';

interface InputFormProps {
  onSubmit: (data: UserInput) => void;
  isLoading: boolean;
  isKeyReady: boolean;
}

const InputForm: React.FC<InputFormProps> = ({ onSubmit, isLoading, isKeyReady }) => {
  const [script, setScript] = useState('');
  const [visualStyle, setVisualStyle] = useState('Studio Ghibli');
  const [sceneDensity, setSceneDensity] = useState<SceneDensity>('Standard');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [characterDescription, setCharacterDescription] = useState('');
  const [videoDuration, setVideoDuration] = useState('1 Minute');
  const [modelEngine, setModelEngine] = useState('gemini-flash-latest');
  
  const modelOptions = [
      { id: 'gemini-flash-latest', name: 'Gemini 2.5 Flash' },
      { id: 'gemini-flash-lite-latest', name: 'Gemini 2.5 Flash Lite' },
      { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Recommended)' },
  ];

  const visualStyles = {
    "STICKMAN SERIES": [
        "Stickman — 2D Classic",
        "Stickman — Blueprint",
        "Stickman — Chalkboard",
        "Stickman — 3D Render"
      ],
      "ANIMATION STYLE": [
        "Clay Animation",
        "Studio Ghibli",
        "Retro Anime",
        "Pixar Style",
        "Stop-motion Animation",
        "Cutout Animation",
        "3D CGI Animation"
      ],
      "REALISTIC & CINEMATIC": [
        "Cinematic 8K",
        "Documentary",
        "Cyberpunk",
        "Film Noir",
        "Low-Key Thriller"
      ]
  };

  const durations = [
    "30 Seconds", 
    "1 Minute", 
    "3 Minutes", 
    "5 Minutes",
    "8 Minutes",
    "10 Minutes"
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isKeyReady && script.trim()) {
      onSubmit({ 
        script, 
        visualStyle, 
        sceneDensity, 
        aspectRatio, 
        characterDescription, 
        videoDuration, 
        modelEngine 
      });
    }
  };

  return (
    <div className="bg-white dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal-lg mb-12">
      <div className="bg-brutal-dark p-6 text-white border-b-4 border-brutal-dark dark:border-brutal-gray">
        <h2 className="font-display font-black text-3xl uppercase tracking-tighter flex items-center gap-3">
          <Settings2 className="w-8 h-8" /> MISSION SETUP
        </h2>
        <p className="font-mono text-white/70 text-sm mt-1">Configure your Smart Script Analyzer and Visual Engine.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="divide-y-4 divide-brutal-dark dark:divide-brutal-gray">
            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-brutal-yellow text-brutal-dark w-8 h-8 flex items-center justify-center font-black border-2 border-brutal-dark shadow-brutal-sm">1</div>
                 <h3 className="font-display font-black text-xl uppercase tracking-tight text-brutal-dark dark:text-white">Narrative Input</h3>
              </div>
              <div>
                <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Script / Story
                </label>
                <textarea
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  placeholder="Paste your story, script, or rough idea here..."
                  className="w-full px-4 py-4 border-2 border-brutal-dark dark:border-brutal-gray/50 bg-brutal-gray/30 dark:bg-brutal-dark/80 font-mono text-sm text-brutal-dark dark:text-white placeholder-brutal-dark/40 dark:placeholder-brutal-gray/40 focus:outline-none focus:bg-white dark:focus:bg-brutal-dark focus:shadow-brutal transition-all rounded-none h-48 resize-y"
                  required
                />
              </div>
            </div>

            <div className="p-8 space-y-4">
              <div className="flex items-center gap-2 mb-4">
                 <div className="bg-brutal-yellow text-brutal-dark w-8 h-8 flex items-center justify-center font-black border-2 border-brutal-dark shadow-brutal-sm">2</div>
                 <h3 className="font-display font-black text-xl uppercase tracking-tight text-brutal-dark dark:text-white">Core Engine Selection</h3>
              </div>
              <div>
                <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                  <BrainCircuit className="w-4 h-4" /> Model Architecture
                </label>
                <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                  <select
                    value={modelEngine}
                    onChange={(e) => setModelEngine(e.target.value)}
                    className="w-full px-4 py-3 bg-transparent font-mono font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white"
                  >
                    {modelOptions.map(model => (
                      <option key={model.id} value={model.id}>{model.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brutal-dark dark:text-white">▼</div>
                </div>
              </div>
            </div>

            <div className="p-8 space-y-4">
               <div className="flex items-center gap-2 mb-4">
                 <div className="bg-brutal-yellow text-brutal-dark w-8 h-8 flex items-center justify-center font-black border-2 border-brutal-dark shadow-brutal-sm">3</div>
                 <h3 className="font-display font-black text-xl uppercase tracking-tight text-brutal-dark dark:text-white">Phase 1: Master Character DNA</h3>
              </div>
              <div>
                <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                  <User className="w-4 h-4" /> Protagonist Description
                </label>
                <textarea
                  value={characterDescription}
                  onChange={(e) => setCharacterDescription(e.target.value)}
                  placeholder="e.g., A young girl with short red bob hair, wearing a blue dress and a straw hat..."
                  className="w-full px-4 py-4 border-2 border-brutal-dark dark:border-brutal-gray/50 bg-brutal-gray/30 dark:bg-brutal-dark/80 font-mono text-sm text-brutal-dark dark:text-white placeholder-brutal-dark/40 dark:placeholder-brutal-gray/40 focus:outline-none focus:bg-white dark:focus:bg-brutal-dark focus:shadow-brutal transition-all rounded-none h-48 resize-y"
                />
              </div>
            </div>

            <div className="p-8 space-y-6">
               <div className="flex items-center gap-2 mb-4">
                 <div className="bg-brutal-yellow text-brutal-dark w-8 h-8 flex items-center justify-center font-black border-2 border-brutal-dark shadow-brutal-sm">4</div>
                 <h3 className="font-display font-black text-xl uppercase tracking-tight text-brutal-dark dark:text-white">Cinematic Configuration</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                   <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                     <Palette className="w-4 h-4" /> Art Direction
                   </label>
                   <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                     <select
                       value={visualStyle}
                       onChange={(e) => setVisualStyle(e.target.value)}
                       className="w-full px-4 py-3 bg-transparent font-mono font-bold focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white"
                     >
                       {Object.entries(visualStyles).map(([category, styles]) => (
                         <optgroup label={category} key={category}>
                           {styles.map(style => <option key={style} value={style}>{style}</option>)}
                         </optgroup>
                       ))}
                     </select>
                     <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brutal-dark dark:text-white">▼</div>
                   </div>
                </div>
                <div>
                   <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                     <Monitor className="w-4 h-4" /> Asset Density
                   </label>
                   <div className="flex gap-2">
                     {(['Concise', 'Standard', 'Detailed'] as SceneDensity[]).map((d) => (
                       <button
                         type="button"
                         key={d}
                         onClick={() => setSceneDensity(d)}
                         className={`flex-1 py-3 border-2 border-brutal-dark dark:border-brutal-gray font-mono text-xs font-bold uppercase transition-all shadow-brutal-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal ${
                           sceneDensity === d 
                             ? 'bg-brutal-yellow text-brutal-dark' 
                             : 'bg-white dark:bg-brutal-dark dark:text-white hover:bg-brutal-gray dark:hover:bg-brutal-dark/80'
                         }`}
                       >
                         {d}
                       </button>
                     ))}
                   </div>
                </div>
              </div>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                  <div>
                      <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                        <Monitor className="w-4 h-4" /> Project Ratio
                      </label>
                      <div className="flex flex-wrap gap-4">
                          <button type="button" onClick={() => setAspectRatio('16:9')} className={`flex items-center gap-2 px-3 py-3 border-2 border-brutal-dark dark:border-brutal-gray text-xs font-bold transition-all shadow-brutal-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal ${aspectRatio === '16:9' ? 'bg-brutal-yellow text-brutal-dark' : 'bg-white dark:bg-brutal-dark dark:text-white hover:bg-brutal-gray dark:hover:bg-brutal-dark/80'}`}>
                            <RectangleHorizontal className="w-4 h-4" /> 16:9
                          </button>
                          <button type="button" onClick={() => setAspectRatio('9:16')} className={`flex items-center gap-2 px-3 py-3 border-2 border-brutal-dark dark:border-brutal-gray text-xs font-bold transition-all shadow-brutal-sm hover:-translate-x-px hover:-translate-y-px hover:shadow-brutal ${aspectRatio === '9:16' ? 'bg-brutal-yellow text-brutal-dark' : 'bg-white dark:bg-brutal-dark dark:text-white hover:bg-brutal-gray dark:hover:bg-brutal-dark/80'}`}>
                            <RectangleVertical className="w-4 h-4" /> 9:16
                          </button>
                      </div>
                  </div>
                   <div>
                     <label className="block text-sm font-bold text-brutal-dark dark:text-brutal-gray mb-2 font-mono uppercase tracking-wider flex items-center gap-2">
                       <Clock className="w-4 h-4" /> Project Duration
                     </label>
                     <div className="relative border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal-sm bg-white dark:bg-brutal-dark">
                       <select
                         value={videoDuration}
                         onChange={(e) => setVideoDuration(e.target.value)}
                         className="w-full px-4 py-3 bg-transparent font-mono text-sm focus:outline-none appearance-none cursor-pointer rounded-none text-brutal-dark dark:text-white"
                       >
                         {durations.map(d => <option key={d} value={d}>{d}</option>)}
                       </select>
                       <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-brutal-dark dark:text-white">▼</div>
                     </div>
                  </div>
               </div>
            </div>
        </div>
        
        <div className="p-8 border-t-4 border-brutal-dark dark:border-brutal-gray bg-brutal-gray/60 dark:bg-brutal-dark/50">
            <button
              type="submit"
              disabled={isLoading || !isKeyReady}
              className="w-full flex items-center justify-center gap-4 bg-brutal-yellow text-brutal-dark font-display font-black text-2xl uppercase tracking-tighter p-6 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-brutal-dark/40 disabled:text-white/50"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span>PRISMA ANALYZING...</span>
                </>
              ) : !isKeyReady ? (
                <>
                  <KeyRound className="w-8 h-8" />
                  <span>Set Engine Key to Begin</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-8 h-8" />
                  <span>EXECUTE PRODUCTION</span>
                </>
              )}
            </button>
          </div>
      </form>
    </div>
  );
};

export default InputForm;