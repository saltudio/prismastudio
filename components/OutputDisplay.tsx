import React, { useState } from 'react';
import { ProductionPackage } from '../types';
import { Camera, Download, List, User, Hash, Loader2, CheckCircle2, Tag, Globe, Image as ImageIcon, PlayCircle, FolderArchive, Copy, Music, ClipboardCopy, ClipboardList, Check, Mic, Sparkles, FileText, Share2, Youtube, Music2, Wand2, Eye } from 'lucide-react';
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
    <div className="bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray p-6 shadow-brutal-sm group">
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
      <div className="font-mono text-xs text-brutal-dark dark:text-white whitespace-pre-wrap leading-relaxed bg-brutal-gray/20 dark:bg-brutal-dark/50 p-4 border-2 border-dashed border-brutal-dark/30">
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
  
  const [storyText] = useState(data.story);

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

      const finalData = { ...data, story: storyText };
      folder.file("project_metadata.json", JSON.stringify(finalData, null, 2));

      let count = 0;
      for (const [filename, dataUrl] of Object.entries(generatedImages)) {
         if (dataUrl) {
            const base64Data = (dataUrl as string).split(',')[1];
            folder.file(`${filename}.png`, base64Data, { base64: true });
            count++;
         }
      }

      if (count === 0) {
        alert("No images generated yet.");
        setIsZipping(false);
        return;
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
    const finalData = { ...data, story: storyText };
    const element = document.createElement("a");
    const file = new Blob([JSON.stringify(finalData, null, 2)], {type: 'application/json'});
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
              alert("CONTINUITY SUCCESS: Locked.");
          }
      } catch (err: any) {
          console.error("Refinement failed:", err);
          alert("Continuity locked.");
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
    // Adjust total wait time for batch based on scene count
    const totalScenes = data.visualPrompts.length;
    const waitTime = totalScenes * 3000 + 5000;
    setTimeout(() => setIsBatchRendering(false), waitTime); 
  };

  const visualPrompts = Array.isArray(data.visualPrompts) ? data.visualPrompts : [];
  const characterPrompts = visualPrompts.filter(p => p.type === 'character' || p.requiresCharacter === true);
  const scenePrompts = visualPrompts; // Show all generated keyframes

  return (
    <div className="animate-fade-in space-y-8">
      <div className="bg-white dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="font-display font-black text-3xl md:text-4xl text-brutal-dark dark:text-white uppercase tracking-tighter leading-none mb-2">
              PRISMA STUDIO
            </h2>
            <div className="flex flex-wrap gap-2">
                <p className="font-mono text-brutal-dark font-bold uppercase tracking-wider text-xs border-2 border-brutal-dark inline-block px-2 py-1 bg-brutal-yellow">
                Ref: {data.metadata?.topic || "No Topic"}
                </p>
                <p className="font-mono text-brutal-dark dark:text-white dark:border-brutal-gray dark:bg-brutal-dark font-bold uppercase tracking-wider text-xs border-2 border-brutal-dark inline-block px-2 py-1 bg-white">
                Style: {data.metadata?.visualStyle || "Default"}
                </p>
            </div>
          </div>
          <div className="bg-brutal-dark text-white px-4 py-2 font-mono text-xs font-bold uppercase tracking-widest border-2 border-brutal-dark dark:border-white">
             Mood: {data.metadata?.mood || "Neutral"}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-brutal-dark/50 border-4 border-brutal-dark dark:border-brutal-gray shadow-brutal overflow-hidden min-h-[600px]">
        <div className="flex border-b-4 border-brutal-dark dark:border-brutal-gray overflow-x-auto bg-brutal-gray dark:bg-brutal-dark/50">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-3 px-8 py-5 font-bold font-mono text-sm uppercase tracking-wider transition-all border-r-2 border-brutal-dark dark:border-brutal-gray ${
                activeTab === tab.id 
                  ? 'bg-brutal-yellow text-brutal-dark' 
                  : 'bg-white dark:bg-brutal-dark dark:text-white text-brutal-dark hover:bg-brutal-dark'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
          <div className="flex-grow flex justify-end p-3 bg-white dark:bg-brutal-dark/30 border-l-2 border-brutal-dark dark:border-brutal-gray gap-2">
            <button 
              onClick={handleBulkDownload}
              disabled={isZipping}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white bg-brutal-dark px-4 py-2 hover:bg-brutal-yellow transition-all disabled:opacity-50"
            >
              {isZipping ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderArchive className="w-4 h-4" />}
              {isZipping ? "Zipping..." : "Bulk .ZIP"}
            </button>
            <button onClick={downloadPackage} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-brutal-dark bg-white border-2 border-brutal-dark px-4 py-2 hover:bg-brutal-dark hover:text-white transition-all">
              <Download className="w-4 h-4" /> Project JSON
            </button>
          </div>
        </div>

        <div className="p-8 bg-brutal-bg/50 dark:bg-brutal-dark/30">
          {activeTab === 'strategy' && (
            <div className="max-w-6xl mx-auto space-y-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <Youtube className="w-6 h-6 text-red-600" /> YouTube Title Suite
                  </h3>
                  <div className="bg-brutal-yellow border-2 border-brutal-dark p-6 shadow-brutal">
                    <h4 className="font-mono text-xs font-bold text-brutal-dark uppercase tracking-widest mb-2">Primary Hero Title</h4>
                    <div className="font-display font-black text-2xl text-brutal-dark break-words">
                      {data.seo?.bestTitle || "Untitled"}
                    </div>
                  </div>
                  <CopyField 
                    label="A/B Variations" 
                    sublabel="SEO Optimized | Max 100 Chars"
                    icon={ClipboardList}
                    value={(data.seo?.altTitles || []).join('\n\n')}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <FileText className="w-6 h-6 text-brutal-blue" /> Meta Description
                  </h3>
                  <CopyField 
                    label="Video Description" 
                    sublabel="Max 1000 Chars | Included CTA: Sub/Like/Share"
                    icon={ClipboardCopy}
                    value={data.seo?.videoDescription || ""}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CopyField 
                  label="Search Tags" 
                  sublabel="Max 500 Chars"
                  icon={Tag}
                  value={data.seo?.tags || ""}
                />
                <CopyField 
                  label="Viral Hashtags" 
                  sublabel="Max 500 Chars | Style-Related"
                  icon={Hash}
                  value={data.seo?.hashtags || ""}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <Music2 className="w-6 h-6 text-purple-600" /> Audio Production
                  </h3>
                  <CopyField 
                    label="Suno AI Music Prompt" 
                    sublabel={`Mood: ${data.metadata.mood} | Style: ${data.metadata.visualStyle}`}
                    icon={Music}
                    value={data.seo?.sunoPrompt || ""}
                  />
                </div>

                <div className="space-y-6">
                  <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight flex items-center gap-3">
                    <ImageIcon className="w-6 h-6 text-green-600" /> Visual Marketing
                  </h3>
                  <CopyField 
                    label="YouTube Thumbnail Prompt" 
                    sublabel="High CTR Optimized"
                    icon={Wand2}
                    value={data.seo?.thumbnailPrompt || ""}
                  />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'visuals' && (
            <div className="space-y-16">
               <div>
                  <div className="flex items-center gap-4 mb-6 border-b-4 border-brutal-dark pb-4">
                    <div className="bg-brutal-yellow text-brutal-dark p-2 border-2 border-brutal-dark">
                        <Mic className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight">Phase 0: Voice Over</h3>
                    </div>
                  </div>
                  <VoiceOverGenerator story={data.story} topic={data.metadata.topic} duration={data.metadata.duration} visualStyle={data.metadata.visualStyle} />
               </div>

              <div>
                <div className="flex items-center gap-4 mb-6 border-b-4 border-brutal-dark pb-4">
                  <div className="bg-brutal-yellow text-brutal-dark p-2 border-2 border-brutal-dark">
                      <User className="w-6 h-6" />
                  </div>
                  <div>
                      <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight">Phase 1: Master Character ID (CST)</h3>
                      <p className="font-mono text-xs text-brutal-dark/70 dark:text-white/50 uppercase">Extract & Lock Continuity Tokens for consistent scene generation</p>
                  </div>
                </div>
                
                {commonBaseImage && (
                    <div className="mb-8 bg-green-50 dark:bg-green-900/50 border-2 border-green-600 p-4 shadow-brutal-sm flex items-center gap-4 animate-fade-in">
                        <div className="w-16 h-16 border-2 border-green-600 flex-shrink-0 bg-white">
                            <img src={commonBaseImage} alt="Reference" className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <h4 className="font-bold font-mono text-green-800 dark:text-green-300 uppercase text-sm flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4" /> Continuity Tokens Locked
                            </h4>
                            <p className="text-xs font-mono text-green-700 dark:text-green-400">All Scene Production prompts are being refreshed with literal descriptors.</p>
                        </div>
                    </div>
                )}
                
                {characterPrompts.slice(0, 1).map((prompt, idx) => (
                    <CharacterCard 
                    key={`char-${idx}`} 
                    character={{
                        name: prompt.label,
                        role: "Reference ID",
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

              <div>
                 <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-4 border-brutal-dark pb-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-brutal-yellow text-brutal-dark p-2 border-2 border-brutal-dark">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="font-display font-black text-2xl text-brutal-dark dark:text-white uppercase tracking-tight">Phase 2: Scene Production</h3>
                            <p className="font-mono text-[10px] text-brutal-dark/60 dark:text-white/40 uppercase">
                              {scenePrompts.length} Keyframes Generated One-Shot (All Scenes)
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {isRefining && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-brutal-yellow text-brutal-dark border-2 border-brutal-dark font-mono text-[10px] font-bold animate-pulse">
                                <Sparkles className="w-3 h-3 animate-spin" />
                                REFRESHING CINEMATIC PROMPTS...
                            </div>
                        )}
                        <button 
                            onClick={handleBatchRender}
                            disabled={isBatchRendering || isRefining}
                            className="bg-brutal-dark text-white px-6 py-3 font-display font-black uppercase tracking-widest shadow-brutal hover:bg-brutal-yellow hover:text-brutal-dark transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isBatchRendering ? <Loader2 className="w-5 h-5 animate-spin" /> : <PlayCircle className="w-5 h-5" />}
                            {isBatchRendering ? "Rendering Staggered..." : "Render All Scenes"}
                        </button>
                    </div>
                  </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {scenePrompts.map((prompt, idx) => (
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
                      staggerDelay={idx * 3000} // Sufficient stagger for up to 40 scenes
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
