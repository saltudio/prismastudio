import React, { useState } from 'react';
import { ProductionPackage } from '../types';
import { Camera, Download, List, User, Hash, Loader2, CheckCircle2, Tag, Globe, Image as ImageIcon, PlayCircle, FolderArchive, Copy, Music, ClipboardCopy, ClipboardList, Check, Mic, Sparkles, FileText, Share2, Youtube, Music2, Wand2, Eye, Clipboard } from 'lucide-react';
import SceneCard from './SceneCard';
import CharacterCard from './CharacterCard';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import VoiceOverGenerator from './VoiceOverGenerator';
import { refinePackagePrompts } from '../services/geminiService';

interface OutputDisplayProps {
  data: ProductionPackage;
  onTokensUpdate: (tokens: { cst: string, bst: string, gst: string, vst: string }) => void;
  onPromptsUpdate: (prompts: any[]) => void;
}

const CopyField: React.FC<{ label: string; value: string; icon: any; sublabel?: string }> = ({ label, value, icon: Icon, sublabel }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray p-6 shadow-brutal-sm group flex flex-col h-full transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-brutal">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-brutal-dark text-white dark:bg-brutal-gray dark:text-brutal-dark p-2 border-2 border-brutal-dark">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-display font-black text-sm uppercase tracking-tight text-brutal-dark dark:text-white leading-none">
              {label}
            </h4>
            {sublabel && <p className="font-mono text-[10px] uppercase opacity-50 mt-1">{sublabel}</p>}
          </div>
        </div>
        <button 
          onClick={handleCopy}
          className="bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray p-2 hover:bg-brutal-yellow transition-all shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
        >
          {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <div className="flex-grow font-mono text-xs text-brutal-dark dark:text-white whitespace-pre-wrap leading-relaxed bg-brutal-gray/20 dark:bg-brutal-dark/50 p-4 border-2 border-dashed border-brutal-dark/30">
        {value || "No data generated..."}
      </div>
    </div>
  );
};

const OutputDisplay: React.FC<OutputDisplayProps> = ({ data, onTokensUpdate, onPromptsUpdate }) => {
  const [activeTab, setActiveTab] = useState<'strategy' | 'visuals'>('visuals');
  const [commonBaseImage, setCommonBaseImage] = useState<string | null>(null);
  const [isBatchRendering, setIsBatchRendering] = useState(false);
  const [renderTrigger, setRenderTrigger] = useState(0);
  
  const [generatedImages, setGeneratedImages] = useState<Record<string, string>>({});
  const [isZipping, setIsZipping] = useState(false);
  const [isRefining, setIsRefining] = useState(false);

  const [copiedAllImg, setCopiedAllImg] = useState(false);
  const [copiedAllVid, setCopiedAllVid] = useState(false);

  const tabs = [
    { id: 'strategy', label: 'STRATEGY', icon: Globe },
    { id: 'visuals', label: 'PRODUCTION', icon: Camera },
  ] as const;

  const handleImageGenerated = (id: string, url: string) => {
    setGeneratedImages(prev => ({
      ...prev,
      [id]: url
    }));
  };

  const handleBulkDownload = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder("production_assets");
      if (!folder) return;

      folder.file("project_metadata.json", JSON.stringify(data, null, 2));

      for (const [filename, dataUrl] of Object.entries(generatedImages)) {
         if (dataUrl) {
            const base64Data = (dataUrl as string).split(',')[1];
            folder.file(`${filename}.png`, base64Data, { base64: true });
         }
      }

      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `PRISM_ASSETS_${data.metadata?.topic.replace(/\s+/g, '_').toUpperCase()}.zip`);
    } catch (e) {
      console.error("Zip failed", e);
    } finally {
      setIsZipping(false);
    }
  };

  const downloadPackage = () => {
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = `PROJECT_${data.metadata?.topic.replace(/\s+/g, '_').toUpperCase()}.json`;
    document.body.appendChild(element);
    element.click();
  };

  const handleLockContinuityTokens = async (tokens: { cst: string, bst: string, gst: string, vst: string }, imageUrl: string) => {
      setIsRefining(true);
      try {
          onTokensUpdate(tokens);
          setCommonBaseImage(imageUrl);
          const refinedPrompts = await refinePackagePrompts(data, tokens);
          if (refinedPrompts) {
              onPromptsUpdate(refinedPrompts);
          }
      } catch (err: any) {
          console.error("Refinement failed:", err);
      } finally {
          setIsRefining(false);
      }
  };
  
  const handleClearContinuity = () => {
    onTokensUpdate({ cst: '', bst: '', gst: '', vst: '' });
    setCommonBaseImage(null);
  };

  const handleBatchRender = () => {
    setIsBatchRendering(true);
    setRenderTrigger(prev => prev + 1);
    const totalScenes = data.visualPrompts.length;
    const waitTime = totalScenes * 3000 + 5000;
    setTimeout(() => setIsBatchRendering(false), waitTime); 
  };

  const copyAllImagePrompts = () => {
    const text = data.visualPrompts.map((p, i) => `SCENE ${i + 1} (${p.label}):\n${p.prompt}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAllImg(true);
    setTimeout(() => setCopiedAllImg(false), 2000);
  };

  const copyAllVideoPrompts = () => {
    const text = data.visualPrompts.map((p, i) => `SCENE ${i + 1} (${p.label}):\n${p.videoPrompt || 'No motion data.'}`).join('\n\n');
    navigator.clipboard.writeText(text);
    setCopiedAllVid(true);
    setTimeout(() => setCopiedAllVid(false), 2000);
  };

  const visualPrompts = Array.isArray(data.visualPrompts) ? data.visualPrompts : [];
  const characterPrompts = visualPrompts.filter(p => p.type === 'character' || p.requiresCharacter === true);

  return (
    <div className="animate-fade-in space-y-8 max-w-7xl mx-auto px-4 sm:px-0">
      <div className="bg-white dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal p-6 md:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-display font-black text-3xl md:text-5xl text-brutal-dark dark:text-white uppercase tracking-tighter leading-none mb-2">
              PRISMA STUDIO
            </h2>
            <div className="flex flex-wrap gap-2">
                <p className="font-mono text-brutal-dark font-bold uppercase tracking-wider text-[10px] md:text-xs border-2 border-brutal-dark inline-block px-3 py-1 bg-brutal-yellow shadow-brutal-sm">
                Ref: {data.metadata?.topic || "No Topic"}
                </p>
                <p className="font-mono text-brutal-dark dark:text-white dark:border-brutal-gray dark:bg-brutal-dark font-bold uppercase tracking-wider text-[10px] md:text-xs border-2 border-brutal-dark inline-block px-3 py-1 bg-white shadow-brutal-sm">
                Style: {data.metadata?.visualStyle || "Default"}
                </p>
            </div>
          </div>
          <div className="bg-brutal-dark text-white px-6 py-3 font-mono text-xs md:text-sm font-bold uppercase tracking-widest border-2 border-brutal-dark dark:border-white shadow-brutal-sm">
             Mood: {data.metadata?.mood || "Neutral"}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal overflow-hidden min-h-[600px]">
        <div className="flex flex-col sm:flex-row border-b-4 border-brutal-dark dark:border-brutal-gray bg-brutal-gray dark:bg-brutal-dark/50">
          <div className="flex overflow-x-auto no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 px-6 md:px-10 py-5 font-bold font-mono text-sm uppercase tracking-wider transition-all border-r-2 border-brutal-dark dark:border-brutal-gray whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'bg-brutal-yellow text-brutal-dark shadow-[inset_0_-4px_0_0_#000]' 
                    : 'bg-white dark:bg-brutal-dark dark:text-white text-brutal-dark hover:bg-brutal-dark hover:text-white'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="flex-grow flex justify-end p-3 bg-white dark:bg-brutal-dark/30 gap-2 border-t-2 sm:border-t-0 sm:border-l-2 border-brutal-dark dark:border-brutal-gray">
            <button 
              onClick={handleBulkDownload}
              disabled={isZipping}
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white bg-brutal-dark px-5 py-2 hover:bg-brutal-yellow hover:text-brutal-dark transition-all disabled:opacity-50 shadow-brutal-sm active:translate-x-0.5 active:translate-y-0.5"
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
              {isZipping ? "Zipping..." : "Export Assets"}
            </button>
            <button onClick={downloadPackage} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brutal-dark bg-white border-2 border-brutal-dark px-5 py-2 hover:bg-brutal-dark hover:text-white transition-all shadow-brutal-sm">
              <Download className="w-4 h-4" /> JSON
            </button>
          </div>
        </div>

        <div className="p-4 md:p-10 bg-brutal-bg/50 dark:bg-brutal-dark/30">
          {activeTab === 'strategy' && (
            <div className="max-w-6xl mx-auto animate-fade-in">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                {/* ROW 1: SEO & REVENUE */}
                <div className="flex flex-col gap-6">
                  <div className="bg-brutal-dark text-white p-4 border-2 border-brutal-dark font-display font-black text-sm uppercase flex items-center gap-3 shadow-brutal-sm">
                    <Youtube className="w-5 h-5 text-red-600" /> SEO & REVENUE SUITE
                  </div>
                  <div className="bg-brutal-yellow border-2 border-brutal-dark p-6 shadow-brutal-sm flex-shrink-0">
                    <h4 className="font-mono text-[10px] font-bold text-brutal-dark uppercase tracking-widest mb-2 opacity-70">PRIMARY HERO TITLE</h4>
                    <div className="font-display font-black text-xl md:text-2xl text-brutal-dark break-words leading-tight">
                      {data.seo?.bestTitle || "Untitled"}
                    </div>
                  </div>
                  <CopyField 
                    label="A/B VARIATIONS" 
                    sublabel="Engagement Hooks"
                    icon={ClipboardList}
                    value={(data.seo?.altTitles || []).join('\n\n')}
                  />
                  <CopyField 
                    label="VIDEO DESCRIPTION" 
                    sublabel="Meta & CTA Suite"
                    icon={ClipboardCopy}
                    value={data.seo?.videoDescription || ""}
                  />
                </div>

                {/* ROW 2: CREATIVE & AUDIO */}
                <div className="flex flex-col gap-6">
                  <div className="bg-brutal-dark text-white p-4 border-2 border-brutal-dark font-display font-black text-sm uppercase flex items-center gap-3 shadow-brutal-sm">
                    <Sparkles className="w-5 h-5 text-brutal-yellow" /> CREATIVE ASSETS
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <CopyField 
                        label="SEARCH TAGS" 
                        sublabel="Keyword Density"
                        icon={Tag}
                        value={data.seo?.tags || ""}
                      />
                      <CopyField 
                        label="VIRAL HASHTAGS" 
                        icon={Hash}
                        value={data.seo?.hashtags || ""}
                      />
                  </div>
                  <CopyField 
                    label="AUDIO PRODUCTION" 
                    sublabel="Suno AI Music Prompt"
                    icon={Music}
                    value={data.seo?.sunoPrompt || ""}
                  />
                  <CopyField 
                    label="THUMBNAIL PROMPT" 
                    sublabel="High CTR Optimized"
                    icon={Wand2}
                    value={data.seo?.thumbnailPrompt || ""}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-16 animate-fade-in max-w-6xl mx-auto">
               <VoiceOverGenerator story={data.story} topic={data.metadata.topic} duration={data.metadata.duration} visualStyle={data.metadata.visualStyle} />

               <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-4 mb-8 border-b-4 border-brutal-dark pb-4">
                  <div className="bg-brutal-yellow text-brutal-dark p-3 border-2 border-brutal-dark shadow-brutal-sm">
                      <User className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight">Phase 1: Master Character ID (CST)</h3>
                      <p className="font-mono text-[10px] text-brutal-dark/60 dark:text-white/40 uppercase tracking-widest">Global reference for cinematic continuity</p>
                  </div>
                </div>
                
                {commonBaseImage && (
                    <div className="mb-8 bg-green-500/10 border-4 border-green-600 p-6 shadow-brutal flex items-center gap-6 animate-fade-in">
                        <div className="w-20 h-20 border-4 border-green-600 flex-shrink-0 bg-white shadow-brutal-sm">
                            <img src={commonBaseImage} alt="Reference" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h4 className="font-black font-display text-green-700 dark:text-green-400 uppercase text-lg flex items-center gap-2">
                                <CheckCircle2 className="w-6 h-6" /> Continuity Locked
                            </h4>
                            <p className="text-[10px] font-mono text-green-700 dark:text-green-400 font-bold uppercase mt-1 tracking-wider opacity-80">All Cinematic Prompts are being refreshed with direct descriptors.</p>
                        </div>
                    </div>
                )}
                
                <div className="px-4 md:px-0">
                  {characterPrompts.slice(0, 1).map((prompt, idx) => (
                      <CharacterCard 
                      key={`char-${idx}`} 
                      character={{
                          name: prompt.label,
                          role: "Production Reference",
                          ageAndAppearance: prompt.visualDescription || "",
                          personality: "",
                          visualPrompt: prompt.prompt
                      }}
                      onAccept={handleLockContinuityTokens}
                      onImageGenerated={(url) => handleImageGenerated(`master_character`, url)}
                      onClear={handleClearContinuity}
                      isMasterCharacter={true}
                      />
                  ))}
                </div>
              </div>

              <div>
                 <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b-4 border-brutal-dark pb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-brutal-yellow text-brutal-dark p-3 border-2 border-brutal-dark shadow-brutal-sm">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight">Phase 2: Scene Production</h3>
                            <p className="font-mono text-[10px] text-brutal-dark/60 dark:text-white/40 uppercase tracking-widest">
                              Full Storyboard Layout • Cinematic Logic
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                        <button 
                          onClick={copyAllImagePrompts} 
                          className="flex-1 sm:flex-none bg-white text-brutal-dark px-5 py-3 font-mono font-bold text-[10px] uppercase border-2 border-brutal-dark shadow-brutal-sm hover:bg-brutal-gray transition-all flex items-center justify-center gap-2 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          {copiedAllImg ? <Check className="w-4 h-4 text-green-600" /> : <Clipboard className="w-4 h-4" />}
                          Copy All Images
                        </button>
                        <button 
                          onClick={copyAllVideoPrompts} 
                          className="flex-1 sm:flex-none bg-white text-brutal-dark px-5 py-3 font-mono font-bold text-[10px] uppercase border-2 border-brutal-dark shadow-brutal-sm hover:bg-brutal-gray transition-all flex items-center justify-center gap-2 active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                        >
                          {copiedAllVid ? <Check className="w-4 h-4 text-green-600" /> : <PlayCircle className="w-4 h-4" />}
                          Copy All Motion
                        </button>
                        <button 
                            onClick={handleBatchRender}
                            disabled={isBatchRendering || isRefining}
                            className="flex-1 sm:flex-none bg-brutal-dark text-white px-8 py-3 font-display font-black uppercase text-sm tracking-widest shadow-brutal hover:bg-brutal-yellow hover:text-brutal-dark transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isBatchRendering ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                            {isBatchRendering ? "Rendering..." : "Render All"}
                        </button>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10 items-stretch">
                  {data.visualPrompts.map((prompt, idx) => (
                    <SceneCard 
                      key={`scene-${idx}`} 
                      scene={{
                        sceneNumber: `KF-${idx + 1}`,
                        title: prompt.label,
                        moodGuide: prompt.moodGuide,
                        visualPrompt: prompt.prompt,
                        requiresCharacter: prompt.requiresCharacter,
                        visualDescription: prompt.visualDescription,
                        cameraAngle: prompt.cameraAngle,
                        audioAtmosphere: prompt.audioAtmosphere,
                        audioCue: prompt.audioCue,
                        dialogue: prompt.dialogue,
                        videoPrompt: prompt.videoPrompt,
                      }}
                      commonBaseImage={commonBaseImage}
                      triggerRender={renderTrigger}
                      defaultAspectRatio={data.metadata?.aspectRatio as any || '16:9'}
                      onImageGenerated={(url) => handleImageGenerated(`scene_${idx + 1}`, url)}
                      continuityTokens={{ cst: data.cst, bst: data.bst, gst: data.gst, vst: data.vst }}
                      mood={data.metadata?.mood || "Cinematic"}
                      visualStyle={data.metadata.visualStyle}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OutputDisplay;
