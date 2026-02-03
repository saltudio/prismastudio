
import React, { useState, useRef } from 'react';
import { Character } from '../types';
import { Palette, Loader2, Image as ImageIcon, Sparkles, CheckCircle, Eye, X, AlertCircle, Copy, Check, UploadCloud, Wand2, Trash2 } from 'lucide-react';
import { extractContinuityTokensFromImage, generateImage } from '../services/geminiService';

interface CharacterCardProps {
  character: Character;
  onAccept?: (tokens: { cst: string, bst: string, gst: string, vst: string }, imageUrl: string) => void;
  onImageGenerated?: (url: string) => void;
  onClear?: () => void;
  isMasterCharacter?: boolean;
  continuityTokens?: { cst: string; bst: string; gst: string; vst: string };
}

type Tokens = { cst: string, bst: string, gst: string, vst: string };

const CharacterCard: React.FC<CharacterCardProps> = ({ character, onAccept, onImageGenerated, onClear, isMasterCharacter = false }) => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [extractedTokens, setExtractedTokens] = useState<Tokens | null>(null);

  const [loadingState, setLoadingState] = useState<'idle' | 'generating' | 'extracting'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isAccepted, setIsAccepted] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
        setExtractedTokens(null); // Reset tokens when new image is uploaded
        setIsAccepted(false);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleClear = () => {
    setUploadedImage(null);
    setExtractedTokens(null);
    setIsAccepted(false);
    setError(null);
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
    if (onClear) {
        onClear();
    }
  };

  const handleGenerateCharacter = async () => {
    setLoadingState('generating');
    setError(null);
    setUploadedImage(null);
    setExtractedTokens(null);
    setIsAccepted(false);

    try {
        // FIX: Changed model to a gemini image model that supports '3:4' aspect ratio, as per guidelines.
        const imageUrl = await generateImage(character.visualPrompt, '3:4', 'gemini-2.5-flash-image');
        setUploadedImage(imageUrl);
    } catch (err: any) {
        setError(err.message || "An unknown error occurred during character generation.");
    } finally {
        setLoadingState('idle');
    }
  };

  const handleExtract = async () => {
    if (!uploadedImage) return;

    setLoadingState('extracting');
    setError(null);
    setExtractedTokens(null);
    setIsAccepted(false);

    try {
        const [header, base64Data] = uploadedImage.split(',');
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/png';
        
        const tokens = await extractContinuityTokensFromImage(base64Data, mimeType, character.visualPrompt);
        setExtractedTokens(tokens);
        if (onImageGenerated) onImageGenerated(uploadedImage); // Pass the uploaded image URL up

    } catch (err: any) {
      setError(err.message || "An unknown error occurred during token extraction.");
    } finally {
      setLoadingState('idle');
    }
  };

  const handleAccept = () => {
      if (uploadedImage && onAccept && extractedTokens) {
          onAccept(extractedTokens, uploadedImage);
          setIsAccepted(true);
      }
  };
  
  const TokenDisplay: React.FC<{ label: string; value: string }> = ({ label, value }) => {
      const [isCopied, setIsCopied] = useState(false);
      const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      };
      return (
        <div className="bg-brutal-gray/30 dark:bg-brutal-dark/80 p-3 border-2 border-brutal-dark dark:border-brutal-gray/50">
            <div className="flex justify-between items-center mb-1">
                <h4 className="font-mono text-[10px] font-bold text-blue-600 uppercase tracking-wider">{label}</h4>
                <button onClick={handleCopy} className="p-1 hover:bg-brutal-dark/10 dark:hover:bg-white/10">
                    {isCopied ? <Check className="w-3 h-3 text-green-500"/> : <Copy className="w-3 h-3"/>}
                </button>
            </div>
            <p className="font-mono text-xs text-brutal-dark dark:text-white leading-relaxed break-words">{value}</p>
        </div>
      );
  }

  return (
    <div className={`bg-white dark:bg-brutal-dark border-2 border-brutal-dark dark:border-brutal-gray shadow-brutal ${isAccepted ? 'ring-4 ring-green-500' : ''}`}>
      <div className="border-b-2 border-brutal-dark dark:border-brutal-gray p-4 bg-brutal-yellow">
        <h3 className="font-display font-black text-xl text-brutal-dark uppercase tracking-tighter break-words">{character.name}</h3>
        <p className="text-brutal-dark/80 font-mono text-xs uppercase tracking-widest">{character.role}</p>
      </div>

      <div className="p-6 space-y-6">
        <div className="aspect-square bg-brutal-gray/30 dark:bg-brutal-dark/80 border-2 border-brutal-dark dark:border-brutal-gray flex items-center justify-center relative group shadow-brutal-sm">
          {uploadedImage ? (
            <>
              <img src={uploadedImage} alt="Character Reference" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button onClick={() => setIsFullScreen(true)} className="bg-white text-brutal-dark p-3 border-2 border-brutal-dark shadow-brutal-sm hover:bg-brutal-yellow"><Eye className="w-5 h-5"/></button>
              </div>
            </>
          ) : (
             <div className="text-center p-4">
                {loadingState === 'generating' 
                    ? <Loader2 className="w-10 h-10 text-brutal-dark/50 dark:text-brutal-gray/50 animate-spin" />
                    : <ImageIcon className="w-10 h-10 text-brutal-dark/20 dark:text-brutal-gray/20" />
                }
                <p className="mt-2 text-xs font-mono text-brutal-dark/50 dark:text-brutal-gray/50">
                    {loadingState === 'generating' ? 'Generating...' : 'Upload or Generate...'}
                </p>
             </div>
          )}
        </div>

        <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp"
            className="hidden"
        />

        {extractedTokens && (
            <div className="space-y-2 animate-fade-in">
                <TokenDisplay label="[CST] Character Style Token" value={extractedTokens.cst} />
                <TokenDisplay label="[BST] Background Style Token" value={extractedTokens.bst} />
                <TokenDisplay label="[GST] Global Style Token" value={extractedTokens.gst} />
                <TokenDisplay label="[VST] Film Look Token" value={extractedTokens.vst} />
            </div>
        )}

        {error && (
            <div className="text-left text-xs font-mono text-red-700 dark:text-red-300 border-2 border-red-700 dark:border-red-500 p-3 bg-red-50 dark:bg-red-900/50 whitespace-pre-wrap flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
                <span>{error}</span>
            </div>
        )}

        <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loadingState !== 'idle'}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-brutal-dark dark:text-white dark:border-white dark:hover:bg-brutal-gray dark:hover:text-brutal-dark text-brutal-dark font-display font-black text-base uppercase p-4 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-brutal-gray disabled:opacity-50"
                >
                <UploadCloud className="w-5 h-5"/> Upload
                </button>
                <button
                onClick={handleGenerateCharacter}
                disabled={loadingState !== 'idle'}
                className="w-full flex items-center justify-center gap-3 bg-white dark:bg-brutal-dark dark:text-white dark:border-white dark:hover:bg-brutal-gray dark:hover:text-brutal-dark text-brutal-dark font-display font-black text-base uppercase p-4 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-brutal-gray disabled:opacity-50"
                >
                {loadingState === 'generating' ? <Loader2 className="w-5 h-5 animate-spin"/> : <Wand2 className="w-5 h-5"/>}
                {loadingState === 'generating' ? 'Wait...' : 'Generate'}
                </button>
            </div>
            
            {uploadedImage && (
              <button
                onClick={handleClear}
                disabled={loadingState !== 'idle'}
                className="w-full flex items-center justify-center gap-3 bg-red-500 text-white font-display font-black text-sm uppercase p-3 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-red-600 disabled:opacity-50"
              >
                  <Trash2 className="w-4 h-4"/> Clear Reference
              </button>
            )}

            {uploadedImage && (
              <button
                onClick={handleExtract}
                disabled={loadingState !== 'idle'}
                className="w-full flex items-center justify-center gap-3 bg-brutal-dark dark:border-white text-white font-display font-black text-lg uppercase p-4 border-2 border-brutal-dark shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-brutal-yellow hover:text-brutal-dark disabled:opacity-50"
              >
                 {loadingState === 'extracting' ? <><Loader2 className="w-5 h-5 animate-spin"/> Analyzing...</> : <><Sparkles className="w-5 h-5"/> Extract Tokens</>}
              </button>
            )}
            
            {extractedTokens && onAccept && (
              <button
                onClick={handleAccept}
                disabled={isAccepted || loadingState !== 'idle'}
                className="w-full flex items-center justify-center gap-3 bg-green-500 text-white font-display font-black text-lg uppercase p-4 border-2 border-brutal-dark dark:border-green-300 shadow-brutal transition-all hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] hover:bg-green-600 disabled:bg-green-600 disabled:opacity-70"
              >
                 <CheckCircle className="w-5 h-5"/> {isAccepted ? "Tokens Locked" : "Accept & Lock Tokens"}
              </button>
            )}
        </div>
      </div>

      {isFullScreen && uploadedImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brutal-dark/95 p-4" onClick={() => setIsFullScreen(false)}>
           <button className="absolute top-6 right-6 text-white border-2 border-white hover:bg-white hover:text-brutal-dark transition-colors p-2" onClick={() => setIsFullScreen(false)}><X className="w-8 h-8" /></button>
           <div className="border-4 border-white shadow-[8px_8px_0px_0px_rgba(255,255,255,0.5)] bg-black">
               <img src={uploadedImage} alt="Full view" className="max-w-[90vw] max-h-[85vh] object-contain" onClick={(e) => e.stopPropagation()} />
           </div>
        </div>
      )}
    </div>
  );
};

export default CharacterCard;
