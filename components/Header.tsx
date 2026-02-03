// Fix: Added React to imports to resolve "Cannot find namespace 'React'" error
import React, { useState, useEffect } from 'react';
import { Film, Sun, Moon, KeyRound, LogOut } from 'lucide-react';
import ApiKeyManager from './ApiKeyManager';
import { logout } from '../auth';

interface HeaderProps {
  isKeyReady?: boolean;
  onToggleKeyManager?: () => void;
  isKeyManagerForcedOpen?: boolean;
  onKeyManagerClose?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  isKeyReady: propIsKeyReady, 
  onToggleKeyManager: propOnToggleKeyManager,
  isKeyManagerForcedOpen,
  onKeyManagerClose
}) => {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  const activeKeyManagerOpen = isKeyManagerForcedOpen !== undefined ? isKeyManagerForcedOpen : isKeyManagerOpen;

  // Initialize theme
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const checkKeyStatus = () => {
    const currentKey = process.env.API_KEY;
    setHasKey(!!currentKey && currentKey.length > 10);
  };

  useEffect(() => {
    checkKeyStatus();
    // Monitor for manual changes
    const interval = setInterval(checkKeyStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const handleKeyUpdate = (newKey: string | null) => {
    if (newKey) {
      localStorage.setItem('GEMINI_API_KEY', newKey);
      process.env.API_KEY = newKey;
      setHasKey(true);
    } else {
      localStorage.removeItem('GEMINI_API_KEY');
      process.env.API_KEY = '';
      setHasKey(false);
    }
    
    // Dispatch a custom event to notify the rest of the app immediately
    window.dispatchEvent(new CustomEvent('PRISMA_KEY_UPDATE', { detail: { hasKey: !!newKey } }));
    
    if (onKeyManagerClose) onKeyManagerClose();
    setIsKeyManagerOpen(false);
  };

  const toggleKeyManager = () => {
    if (propOnToggleKeyManager) {
      propOnToggleKeyManager();
    } else {
      setIsKeyManagerOpen(!isKeyManagerOpen);
    }
  };

  const closeKeyManager = () => {
    if (onKeyManagerClose) {
      onKeyManagerClose();
    } else {
      setIsKeyManagerOpen(false);
    }
  };

  const isReady = propIsKeyReady !== undefined ? propIsKeyReady : hasKey;

  return (
    <>
      <header className="bg-white dark:bg-brutal-dark/80 dark:backdrop-blur-sm border-b-4 border-brutal-dark dark:border-brutal-gray sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between h-[85px]">
          <div className="flex items-center gap-4">
            <div className="bg-brutal-yellow p-2 text-brutal-dark border-2 border-brutal-dark shadow-brutal-sm">
              <Film className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-display font-black text-3xl text-brutal-dark dark:text-white tracking-tighter uppercase leading-[0.8]">
                PRISMA
              </h1>
              <h2 className="font-display font-black text-3xl text-brutal-dark dark:text-white tracking-tighter uppercase leading-[0.8]">
                STUDIO
              </h2>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
              <button 
              onClick={toggleTheme}
              className="bg-white dark:bg-brutal-dark dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-brutal-dark border-2 border-brutal-dark px-3 py-2 text-brutal-dark hover:bg-brutal-dark hover:text-white transition-all shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center"
              title="Toggle Theme"
            >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button 
              onClick={toggleKeyManager}
              className={`border-2 border-brutal-dark px-3 py-2 text-brutal-dark hover:bg-brutal-dark hover:text-white transition-all shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2 ${
                isReady ? 'bg-green-400 dark:bg-green-500' : 'bg-brutal-yellow animate-pulse'
              }`}
              title="API Key Manager"
            >
                <KeyRound className="w-4 h-4" />
            </button>

              <button 
                onClick={logout}
                className="bg-red-500 text-white border-2 border-brutal-dark px-3 py-2 hover:bg-red-600 transition-all shadow-brutal-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] flex items-center gap-2 font-display font-black uppercase text-[10px]"
                title="Terminate Session"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Terminate</span>
              </button>
          </div>
        </div>
      </header>

      {activeKeyManagerOpen && (
        <ApiKeyManager 
          currentKey={process.env.API_KEY || ''} 
          onKeyUpdate={handleKeyUpdate} 
          onClose={closeKeyManager} 
        />
      )}
    </>
  );
};

export default Header;
