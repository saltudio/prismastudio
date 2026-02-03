import React, { useState, useEffect } from 'react';
import { Camera, Loader2, AlertCircle, Sparkles, RefreshCw, Check, Eye, Download, X, Copy, Wand2, EyeOff, Lock, Unlock, Zap, Map } from 'lucide-react';
import { generateImage, enhanceVisualPrompt, enhanceVideoPrompt, generateSfxCues } from '../services/geminiService';
import { SfxCues } from '../types';

interface SceneCardProps {
  scene: {
    sceneNumber: string;
    title: string;
    moodGuide?: string;
    visualPrompt: string;
    requiresCharacter?: boolean;
    visualDescription?: string;
    cameraAngle?: string;
    audioAtmosphere?: string;
    audioCue?: string;
    dialogue?: string;
    videoPrompt?: string;
  };
  commonBaseImage?: string | null;
  triggerRender?: number;
  defaultAspectRatio?: '16:9' | '9:16';
  onImageGenerated?: (url: string) => void;
  continuityTokens: { cst: string; bst: string; gst: string; vst: string };
  mood: string;
  visualStyle: string;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, commonBaseImage, triggerRender, defaultAspectRatio = '16:9', onImageGenerated, continuityTokens, mood, visualStyle }) => {
  const [image, setImage] = useState<string | null>(null);
  const [visualPrompt, setVisualPrompt] = useState(scene.visualPrompt);
  const [videoPrompt, setVideoPrompt] = useState(scene.videoPrompt || '');
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const [useBaseImage, setUseBaseImage] = useState(scene.requiresCharacter ?? true);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>(defaultAspectRatio as any);
  const [showSceneDetails, setShowSceneDetails] = useState(false);
  
  const [imgLoading, setImgLoading] = useState(false);
  const [enhanceLoading, setEnhanceLoading] = useState(false);
  const [enhanceVideoLoading, setEnhanceVideoLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isVideoPromptCopied, setIsVideoPromptCopied] = useState(false);

  const [sfxCues, setSfxCues] = useState<SfxCues | null>(null);
  const [sfxLoading, setSfxLoading] = useState(false);
  const [sfxError, setSfxError] = useState<string | null>(null);

  useEffect(() => {
    if (triggerRender && triggerRender > 0 && !image && !imgLoading) {
      handleGenerateImage();
    }
  }, [triggerRender]);

  useEffect(() => {
    setVisualPrompt(scene.visualPrompt);
    setVideoPrompt(scene.videoPrompt || '');
  }, [scene.visualPrompt, scene.videoPrompt]);

  useEffect(() => {
    if (commonBaseImage && scene.requiresCharacter) {
      setUseBaseImage(true);
    } else {
      setUseBaseImage(false);
    }
  }, [commonBaseImage, scene.requiresCharacter]);

  const handleGenerateImage = async () => {
    setImgLoading(true);
    setError(null);
    try {
      const refImage = (commonBaseImage && useBaseImage) ? commonBaseImage : undefined;
      
      let finalPrompt = visualPrompt
        .replace(/\[CST\]/g, continuityTokens.cst || '')
        .replace(/\[BST\]/g, continuityTokens.bst || '')
        .replace(/\[GST\]/g, continuityTokens.gst || '')
        .replace(/\[VST\]/g, continuityTokens.vst || '');

      const generationPrompt = refImage 
        ? `${finalPrompt}. MAINTAIN IDENTICAL CHARACTER FEATURES FROM THE REFERENCE IMAGE.`
        : finalPrompt;

      const imgUrl = await generateImage(generationPrompt, aspectRatio, 'gemini-2.5-flash-image', refImage);
      setImage(imgUrl);
      if (onImageGenerated) onImageGenerated(imgUrl);

    } catch (err: any) {
      setError(err.message || "Failed to visualize scene.");
    } finally {
      setImgLoading(false);
    }
  };

  const handleEnhancePrompt = async () => {
    setEnhanceLoading(true);
    setError(null);
    try {
      const enhanced = await enhanceVisualPrompt(visualPrompt, visualStyle, aspectRatio);
      setVisualPrompt(enhanced);
    } catch (err: any) {
      setError(err.message || "Failed to enhance prompt.");
    } finally {
      setEnhanceLoading(false);
    }
  };
  
  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(visualPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  const handleCopyVideoPrompt = () => {
    navigator.clipboard.writeText(videoPrompt);
    setIsVideoPromptCopied(true);
    setTimeout(() => setIsVideoPromptCopied(false), 2000);
  };

  const handleEnhanceVideoPrompt = async () => {
    if (!videoPrompt) return;
    setEnhanceVideoLoading(true);
    setError(null);
    try {
        const enhanced = await enhanceVideoPrompt(videoPrompt, visualPrompt, visualStyle, aspectRatio);
        setVideoPrompt(enhanced);
    } catch (err: any) {
        setError(err.message || "Failed to enhance video prompt.");
    } finally {
        setEnhanceVideoLoading(false);
    }
  };
  
  const toggleSceneDetails = async () => {
      if (!showSceneDetails && !sfxCues && !sfxLoading) {
          setSfxLoading(true);
          setSfxError(null);
          try {
              const cues = await generateSfxCues(mood, scene.title);
              setSfxCues(cues);
          } catch (err: any) {
              setSfxError(err.message || 'Failed to load SFX cues.');
          } finally {
              setSfxLoading(false);
          }
      }
      setShowSceneDetails(!showSceneDetails);
  };

  const AspectRatioButton: React.FC<{ value: '16:9' | '9:16' }> = ({ value }) => (
    <button
      onClick={() => setAspectRatio(value as any)}
      className={`flex-1 py-2 font-mono text-xs font-bold uppercase transition-all border-l-2 border-brutal-dark dark:border-brutal-gray ${
        aspectRatio === value 
          ? 'bg-brutal-yellow text-brutal-dark' 
          : 'bg-white dark:bg-brutal-dark dark:text-white hover:bg-brutal-gray dark:hover:bg-brutal-dark/80'
      }`}
    >
      {value}
    </button>
  );

  return (
    <div className={`flex flex-col bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal`}>
      <div className="flex gap-4 items-center border-b-2 border-brutal-dark dark:border-brutal-gray p-4 bg-white dark:bg-brutal-dark/50">
        <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center font-mono font-bold text-lg border-2 border-brutal-dark shadow-brutal-sm bg-brutal-yellow text-brutal-dark">
          {scene.sceneNumber}
        </div>
        <div className="flex-grow">
            <h3 className="font-sans font-bold text-xl text-brutal-dark dark:text-white uppercase tracking-tight leading-tight">{scene.title}</h3>
            <div className="flex gap-2 items-center mt-1">
              <span className={`font-mono text-[9px] font-bold text-white px-1.5 py-0.5 inline-block flex items-center gap-1 ${scene.requiresCharacter ? 'bg-blue-600' : 'bg-purple-600'}`}>
                 {scene.requiresCharacter ? 'CHARACTER' : 'ATMOSPHERE'}
                 {!scene.requiresCharacter && <Map className="w-2.5 h-2.5" />}
              </span>
            </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {scene.moodGuide && (
          <div className="bg-brutal-yellow/10 border-2 border-brutal-yellow p-3 flex items-start gap-3 shadow-brutal-sm">
             <Zap className="w-4 h-4 text-brutal-dark mt-0.5 fill-brutal-yellow" />
             <div>
                <p className="font-mono text-[10px] font-bold uppercase text-brutal-dark/60 dark:text-white/40 mb-1">Director's Mood Guide (High CTR)</p>
                <p className="font-sans text-xs font-bold text-brutal-dark dark:text-white leading-tight italic">"{scene.moodGuide}"</p>
             </div>
          </div>
        )}

        <div className={`w-full ${aspectRatio === '9:16' ? 'aspect-[9/16]' : 'aspect-video'} bg-brutal-gray/30 dark:bg-brutal-dark/80 border-2 border-brutal-dark dark:border-brutal-gray flex items-center justify-center relative group shadow-brutal-sm`}>
          {image ? (
            <>
              <img src={image} alt={`Scene ${scene.sceneNumber}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => setIsFullScreen(true)} className="bg-white text-brutal-dark p-3 border-2 border-brutal-dark shadow-brutal-sm hover:bg-brutal-yellow"><Eye className="w-5 h-5"/></button>
                <a href={image} download={`scene-${scene.sceneNumber}.png`} className="bg-white text-brutal-dark p-3 border-2 border-brutal-dark shadow-brutal-sm hover:bg-brutal-yellow"><Download className="w-5 h-5"/></a>
              </div>
            </>
          ) : (
            <div className="text-center p-4">
              {imgLoading ? <Loader2 className="w-10 h-10 text-brutal-dark/50 dark:text-brutal-gray/50 animate-spin" /> : <Camera className="w-10 h-10 text-brutal-dark/20 dark:text-brutal-gray/20" />}
            </div>
          )}
        </div>
        
        <div className="border-2 border-brutal-dark dark:border-brutal-gray flex bg-white dark:bg-brutal-dark shadow-brutal-sm">
            <AspectRatioButton value="16:9" />
            <AspectRatioButton value="9:16" />
        </div>
        
        <button onClick={handleGenerateImage} disabled={imgLoading} className="w-full bg-brutal-dark text-white font-display font-black text-lg uppercase p-4 border-2 border-brutal-dark dark:border-white shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-brutal-yellow hover:text-brutal-dark disabled:opacity-50 flex items-center justify-center gap-3">
          {imgLoading ? <><Loader2 className="w-5 h-5 animate-spin"/> Generating...</> : image ? <><RefreshCw className="w-5 h-5"/> Regenerate</> : <><Sparkles className="w-5 h-5"/> Generate Scene</>}
        </button>

        <div>
          <div className="flex justify-between items-center mb-2">
              <label className="font-mono text-xs font-bold text-brutal-dark dark:text-brutal-gray uppercase tracking-wider">Image Prompt</label>
              <div className="flex items-center gap-1">
                  <button onClick={handleEnhancePrompt} disabled={enhanceLoading} className="p-1 text-blue-500 dark:text-blue-400 hover:bg-brutal-gray dark:hover:bg-brutal-dark/50" title="Enhance Prompt">
                      {enhanceLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
                  </button>
                  <button onClick={handleCopyPrompt} className="p-1 hover:bg-brutal-gray dark:hover:bg-brutal-dark/50 text-brutal-dark dark:text-brutal-gray" title="Copy Prompt">
                      {isCopied ? <Check className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
                  </button>
              </div>
          </div>
          <textarea
              value={visualPrompt}
              onChange={(e) => setVisualPrompt(e.target.value)}
              className="w-full font-mono text-xs p-3 border-2 border-brutal-dark dark:border-brutal-gray bg-brutal-gray/30 dark:bg-brutal-dark/80 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-brutal-dark/90 focus:shadow-brutal h-28 resize-y"
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="font-mono text-xs font-bold text-brutal-dark dark:text-brutal-gray uppercase tracking-wider">Video Motion Prompt</label>
            <div className="flex items-center gap-2">
              <button onClick={handleEnhanceVideoPrompt} disabled={!videoPrompt || enhanceVideoLoading || imgLoading} className="p-1 text-purple-500 dark:text-purple-400 hover:bg-brutal-gray dark:hover:bg-brutal-dark/50 disabled:opacity-30" title="Enhance Motion to Timestamped Sequence">
                {enhanceVideoLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Wand2 className="w-4 h-4"/>}
              </button>
              <button onClick={handleCopyVideoPrompt} className="p-1 hover:bg-brutal-gray dark:hover:bg-brutal-dark/50 text-brutal-dark dark:text-brutal-gray" title="Copy Video Prompt">
                  {isVideoPromptCopied ? <Check className="w-4 h-4 text-green-600"/> : <Copy className="w-4 h-4"/>}
              </button>
            </div>
          </div>
          <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              placeholder="Video motion prompt."
              className="w-full font-mono text-xs p-3 border-2 border-brutal-dark dark:border-brutal-gray bg-brutal-gray/30 dark:bg-brutal-dark/80 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-brutal-dark/90 focus:shadow-brutal h-20 resize-y whitespace-pre-wrap"
          />
        </div>

        {commonBaseImage && scene.requiresCharacter && (
          <div className="p-3 border-2 border-brutal-dark dark:border-brutal-gray bg-brutal-gray/30 dark:bg-brutal-dark/80 flex justify-between items-center animate-fade-in">
            <div className="flex items-center gap-3">
              <img src={commonBaseImage} className={`w-10 h-10 object-cover border-2 border-brutal-dark dark:border-brutal-gray ${useBaseImage ? '' : 'grayscale'}`} alt="Base character"/>
              <div className="flex flex-col">
                <span className="text-xs font-mono font-bold uppercase text-brutal-dark dark:text-brutal-gray">Lock Character Ref</span>
                <span className="text-[9px] font-mono text-green-600 dark:text-green-400 font-bold uppercase">Continuity Active</span>
              </div>
            </div>
            <button onClick={() => setUseBaseImage(!useBaseImage)} className="p-2 hover:bg-brutal-dark/10 dark:hover:bg-white/10">
              {useBaseImage ? <Lock className="w-5 h-5 text-green-600"/> : <Unlock className="w-5 h-5 text-brutal-dark/50 dark:text-brutal-gray/50"/>}
            </button>
          </div>
        )}

        {error && (
            <div className="text-left text-xs font-mono text-red-700 dark:text-red-300 border-2 border-red-700 dark:border-red-500 p-3 bg-red-50 dark:bg-red-900/50 whitespace-pre-wrap flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
            </div>
        )}
        
        <div className="border-t-2 border-brutal-dark dark:border-brutal-gray pt-4">
            <button onClick={toggleSceneDetails} className="font-mono text-xs font-bold uppercase text-brutal-dark/60 dark:text-brutal-gray/60 hover:text-brutal-dark dark:hover:text-brutal-gray underline decoration-dotted flex items-center gap-2">
                {showSceneDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showSceneDetails ? 'Hide Scene Details' : 'Show Scene Details'}
            </button>
            {showSceneDetails && (
                 <div className="mt-4 space-y-3 animate-fade-in">
                    {sfxLoading && (
                        <div className="flex items-center gap-2 text-xs font-mono text-brutal-dark/60 dark:text-brutal-gray/60">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading SFX Cues...</span>
                        </div>
                    )}
                    {sfxError && (
                        <div className="text-xs font-mono text-red-500 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {sfxError}
                        </div>
                    )}
                    {sfxCues && (
                        <div>
                            <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-brutal-dark dark:text-brutal-gray mb-2">SFX CUE AUDIO:</h4>
                            <div className="font-mono text-xs text-brutal-dark dark:text-white bg-brutal-gray/30 dark:bg-brutal-dark/80 p-3 border-2 border-brutal-dark dark:border-brutal-gray/50 space-y-2">
                                <p><strong className="text-brutal-dark/60 dark:text-brutal-gray/60">Primary (must-have):</strong> {sfxCues.primary}</p>
                                <p><strong className="text-brutal-dark/60 dark:text-brutal-gray/60">Secondary (texture):</strong> {sfxCues.secondary}</p>
                                {sfxCues.oneShot && <p><strong className="text-brutal-dark/60 dark:text-brutal-gray/60">One-shot (impact):</strong> {sfxCues.oneShot}</p>}
                                {sfxCues.avoid && <p><strong className="text-brutal-dark/60 dark:text-brutal-gray/60">Avoid (if needed):</strong> {sfxCues.avoid}</p>}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
      
       {isFullScreen && image && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-dark/95 p-4" onClick={() => setIsFullScreen(false)}>
           <button className="absolute top-6 right-6 text-white border-2 border-white hover:bg-white hover:text-brutal-dark transition-colors p-2" onClick={() => setIsFullScreen(false)}><X className="w-8 h-8" /></button>
           <div className="border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] bg-black">
               <img src={image} alt="Full view" className="max-w-[90vw] max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
           </div>
        </div>
      )}
    </div>
  );
};

export default SceneCard;
