
import React, { useState, useEffect } from 'react';
import { KeyRound, Check, X, Eye, EyeOff, Loader2, AlertCircle, Info } from 'lucide-react';
import { validateGeminiApiKey } from '../services/keyValidation';

interface ApiKeyManagerProps {
  currentKey: string | null;
  onKeyUpdate: (key: string | null) => void;
  onClose: () => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ currentKey, onKeyUpdate, onClose }) => {
  const [keyInput, setKeyInput] = useState('');
  const [isKeyVisible, setIsKeyVisible] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setKeyInput(currentKey || '');
  }, [currentKey]);

  const handleSave = async () => {
    const trimmed = keyInput.trim();
    if (!trimmed) {
      onKeyUpdate(null);
      onClose();
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    // Strictly validate with a real API ping
    const result = await validateGeminiApiKey(trimmed);
    
    if (result.valid) {
      // Fix: Access process via type assertion on window to satisfy TypeScript and sync the key immediately
      const win = window as any;
      if (win.process && win.process.env) {
        win.process.env.API_KEY = trimmed;
      }
      onKeyUpdate(trimmed);
      // Give a tiny moment for state to propagate before closing
      setTimeout(onClose, 100);
    } else {
      setValidationError(result.message || "Invalid API key. Check Google AI Studio.");
    }
    setIsValidating(false);
  };
  
  const handleClear = () => {
      setKeyInput('');
      setValidationError(null);
  };

  return (
    <>
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 animate-fade-in" onClick={!isValidating ? onClose : undefined}></div>
        <div 
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-brutal-dark border-[6px] border-brutal-dark dark:border-white shadow-[12px_12px_0px_0px_#000] dark:shadow-[12px_12px_0px_0px_rgba(255,255,255,0.2)] w-full max-w-sm p-8 space-y-6 animate-fade-in-up z-[60]"
        >
            <div className="flex justify-between items-center border-b-4 border-brutal-dark dark:border-white pb-4">
                <h3 className="font-display font-black text-2xl uppercase tracking-tighter flex items-center gap-3">
                    <KeyRound className="w-6 h-6" />
                    ENGINE LOCK
                </h3>
                <button onClick={onClose} disabled={isValidating} className="p-1 hover:bg-brutal-gray dark:hover:bg-white/10 transition-colors">
                    <X className="w-6 h-6"/>
                </button>
            </div>
            
            <div className="space-y-2">
                <label className="block font-mono text-[10px] font-black uppercase tracking-widest text-brutal-dark/60 dark:text-white/40">Gemini API Key</label>
                <div className="relative">
                    <input
                        id="api-key-input"
                        type={isKeyVisible ? 'text' : 'password'}
                        value={keyInput}
                        onChange={(e) => {
                            setKeyInput(e.target.value);
                            if (validationError) setValidationError(null);
                        }}
                        disabled={isValidating}
                        placeholder="AIzaSy..."
                        className={`w-full px-4 py-4 bg-brutal-gray/20 dark:bg-white/5 border-4 ${validationError ? 'border-red-500' : 'border-brutal-dark dark:border-white'} text-brutal-dark dark:text-white font-mono text-sm focus:outline-none focus:bg-white dark:focus:bg-white/10 transition-all pr-12`}
                    />
                    <button
                        onClick={() => setIsKeyVisible(!isKeyVisible)}
                        disabled={isValidating}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-brutal-dark/50 dark:text-white/30 hover:text-brutal-dark dark:hover:text-white"
                    >
                        {isKeyVisible ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                </div>
            </div>

            <div className="bg-brutal-blue/5 border-2 border-brutal-blue p-3 flex items-start gap-3">
                <Info className="w-4 h-4 text-brutal-blue flex-shrink-0 mt-0.5" />
                <p className="text-[9px] font-mono leading-tight text-brutal-blue font-bold uppercase">
                    Verification performs a live 'ping' to Google servers. Use a valid key from ai.google.dev.
                </p>
            </div>

            {validationError && (
                <div className="flex items-start gap-3 text-red-600 dark:text-red-400 font-mono text-[11px] bg-red-50 dark:bg-red-900/20 p-4 border-2 border-red-500 animate-fade-in leading-tight">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span>{validationError}</span>
                </div>
            )}
            
            <div className="flex flex-col gap-3">
                <button
                    onClick={handleSave}
                    disabled={isValidating}
                    className="w-full flex items-center justify-center gap-3 bg-brutal-yellow text-brutal-dark font-display font-black text-xl uppercase p-5 border-4 border-brutal-dark shadow-brutal active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all disabled:opacity-50"
                >
                    {isValidating ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                    ) : (
                        <Check className="w-6 h-6" />
                    )}
                    {isValidating ? "VERIFYING..." : "VERIFY & SAVE"}
                </button>
                <button
                    onClick={handleClear}
                    disabled={isValidating}
                    className="w-full font-mono font-black uppercase text-[10px] p-2 text-brutal-dark/40 dark:text-white/40 hover:text-red-500 transition-colors"
                >
                    Clear Key
                </button>
            </div>
        </div>
    </>
  );
};

export default ApiKeyManager;
