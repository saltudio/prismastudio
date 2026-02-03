// Fix: Added React to imports to resolve "Cannot find namespace 'React'" error
import React, { useState, useEffect, useCallback } from 'react';
import Header from './Header';
import InputForm from './InputForm';
import OutputDisplay from './OutputDisplay';
import BrutalistBackground from './BrutalistBackground';
import { UserInput, ProductionPackage } from '../types';
import { generateMoviePackage } from '../services/geminiService';
import { UserProfile } from '../userGate';

interface AppProps {
  user: any;
  userData: UserProfile | null;
}

/**
 * Main Production App Component
 * Orchestrates the production workflow after user authorization.
 */
const MainApp: React.FC<AppProps> = ({ user, userData }) => {
  const [loading, setLoading] = useState(false);
  const [productionData, setProductionData] = useState<ProductionPackage | null>(null);
  const [isKeyReady, setIsKeyReady] = useState(false);
  const [isKeyManagerOpen, setIsKeyManagerOpen] = useState(false);

  const checkKeyStatus = useCallback(() => {
    const currentKey = process.env.API_KEY;
    setIsKeyReady(!!currentKey && currentKey.length > 10);
  }, []);

  useEffect(() => {
    checkKeyStatus();

    // Event listener for instant reactivity from Header/ApiKeyManager
    const handleKeyUpdate = () => {
      checkKeyStatus();
    };

    const handleKeyInvalid = () => {
      setIsKeyReady(false);
      setIsKeyManagerOpen(true);
      alert("The API Key appears to be invalid or expired. Please check your Engine Settings.");
    };

    window.addEventListener('PRISMA_KEY_UPDATE', handleKeyUpdate);
    window.addEventListener('PRISMA_API_KEY_INVALID', handleKeyInvalid);
    
    // Also keep the interval as a fallback for external changes
    const interval = setInterval(checkKeyStatus, 2000);
    
    return () => {
      window.removeEventListener('PRISMA_KEY_UPDATE', handleKeyUpdate);
      window.removeEventListener('PRISMA_API_KEY_INVALID', handleKeyInvalid);
      clearInterval(interval);
    };
  }, [checkKeyStatus]);

  const handleProductionExecute = async (input: UserInput) => {
    setLoading(true);
    try {
      const data = await generateMoviePackage(input);
      if (data) {
        setProductionData(data);
      }
    } catch (error: any) {
      console.error("Production Core Failure:", error);
      alert(`Production Failed: ${error.message || 'Unknown internal error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleTokensUpdate = (tokens: { cst: string, bst: string, gst: string, vst: string }) => {
    if (productionData) {
      setProductionData({
        ...productionData,
        ...tokens
      });
    }
  };

  const handlePromptsUpdate = (prompts: any[]) => {
      if (productionData) {
          setProductionData({
              ...productionData,
              visualPrompts: prompts
          });
      }
  };

  return (
    <div className="relative min-h-screen">
      <BrutalistBackground />
      <Header 
        isKeyReady={isKeyReady} 
        onToggleKeyManager={() => setIsKeyManagerOpen(!isKeyManagerOpen)}
        isKeyManagerForcedOpen={isKeyManagerOpen}
        onKeyManagerClose={() => setIsKeyManagerOpen(false)}
      />
      
      <main className="max-w-6xl mx-auto px-6 py-12 relative z-10">
        {!productionData ? (
          <InputForm 
            onSubmit={handleProductionExecute} 
            isLoading={loading} 
            isKeyReady={isKeyReady} 
          />
        ) : (
          <OutputDisplay 
            data={productionData} 
            onTokensUpdate={handleTokensUpdate}
            onPromptsUpdate={handlePromptsUpdate}
          />
        )}
      </main>
    </div>
  );
};

export default MainApp;
