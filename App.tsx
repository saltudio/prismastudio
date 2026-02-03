
import React, { useState, useEffect } from 'react';
import { onAuthChange, logout } from './auth';
import { ensureUserProfile, listenToUserProfile, UserProfile } from './userGate';
import LoginScreen from './components/LoginScreen';
import ApprovalModal from './components/ApprovalModal';
import AdminPage from './pages/AdminPage';
import BrutalistBackground from './components/BrutalistBackground';
import MainProductionApp from './components/App';
import { Loader2, Settings, ShieldAlert, RefreshCw, ExternalLink, Copy, Check } from 'lucide-react';

const ADMIN_EMAIL = "saltudio@gmail.com";

const App: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthChange(async (authUser) => {
      // Clear previous listeners if any
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (authUser) {
        setUser(authUser);
        setProfileLoading(true);
        
        // 1. Initial Profile Setup
        try {
          await ensureUserProfile(authUser.uid, authUser.email || "");
        } catch (err) {
          console.error("Profile Setup Error:", err);
        }

        // 2. Real-time Profile Listener
        // This ensures the app reactively updates when status changes to 'approved'
        unsubscribeProfile = listenToUserProfile(authUser.uid, (profile) => {
          setUserData(profile);
          setProfileLoading(false);
          setLoading(false);
        });

      } else {
        setUser(null);
        setUserData(null);
        setIsAdminView(false);
        setLoading(false);
        setProfileLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const handleCopyHost = () => {
    navigator.clipboard.writeText(window.location.host);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show loader while checking auth state OR profile state for logged in users
  if (loading || (user && profileLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-bg dark:bg-brutal-dark">
        <Loader2 className="w-12 h-12 animate-spin text-brutal-yellow" />
      </div>
    );
  }

  if (authError === 'UNAUTHORIZED_DOMAIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brutal-bg dark:bg-brutal-dark p-6 overflow-hidden">
        <BrutalistBackground />
        <div className="max-w-2xl w-full bg-white dark:bg-brutal-dark border-4 border-red-600 shadow-brutal p-10 relative z-50 text-center">
          <div className="bg-red-600 text-white p-8 mb-8 border-4 border-brutal-dark flex flex-col items-center gap-4">
            <ShieldAlert className="w-16 h-16" />
            <h1 className="font-display font-black text-3xl uppercase tracking-tighter leading-none">Gate Denied: Unauthorized Domain</h1>
          </div>
          
          <div className="space-y-6 mb-10 text-left">
            <div className="p-4 bg-brutal-gray/20 border-2 border-brutal-dark">
              <label className="font-mono text-[10px] font-bold uppercase mb-2 block">Environment Context:</label>
              <div className="flex gap-2">
                <code className="flex-grow font-mono text-xs break-all font-black bg-white p-2 border-2 border-brutal-dark">
                  {window.location.host}
                </code>
                <button onClick={handleCopyHost} className="p-2 border-2 border-brutal-dark bg-white">
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <p className="font-mono text-xs leading-relaxed opacity-70">
              Debug: {window.location.href}
            </p>

            <div className="bg-white p-6 border-l-8 border-red-600">
                <h3 className="font-display font-black text-sm uppercase mb-3 text-brutal-dark">Resolution Checklist:</h3>
                <ul className="font-mono text-[11px] space-y-2 list-disc ml-4 text-brutal-dark">
                  <li>Login to Firebase Console (prisma-92d72).</li>
                  <li>Authentication &gt; Settings &gt; Authorized Domains.</li>
                  <li>Add <b>{window.location.hostname}</b> to the list.</li>
                </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <a href="https://console.firebase.google.com/" target="_blank" className="flex items-center justify-center gap-3 bg-brutal-dark text-white font-display font-black uppercase p-5 border-2 border-brutal-dark shadow-brutal transition-all hover:bg-brutal-blue">
              <ExternalLink className="w-5 h-5" /> Firebase Console
            </a>
            <button onClick={() => window.location.reload()} className="flex items-center justify-center gap-3 bg-white text-brutal-dark border-2 border-brutal-dark p-5 font-display font-black uppercase shadow-brutal transition-all hover:bg-brutal-gray">
              <RefreshCw className="w-5 h-5" /> Refresh Gate
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onAuthError={setAuthError} />;
  }

  // Admin bypass and admin page view logic
  if (isAdminView && user.email === ADMIN_EMAIL) {
    return (
      <div className="relative min-h-screen">
        <div className="p-4 bg-white dark:bg-brutal-dark border-b-4 border-brutal-dark flex justify-between sticky top-0 z-50">
           <button onClick={() => setIsAdminView(false)} className="bg-brutal-blue text-white font-display font-black text-xs uppercase px-6 py-2 border-2 border-brutal-dark shadow-brutal-sm">&larr; Back to Production</button>
           <button onClick={logout} className="bg-red-500 text-white font-display font-black text-xs uppercase px-6 py-2 border-2 border-brutal-dark shadow-brutal-sm">Terminate Session</button>
        </div>
        <AdminPage />
      </div>
    );
  }

  // CORE LOGIC: If approved or admin, proceed to app. Else, show approval modal.
  const isApproved = userData?.status === 'approved' || user.email === ADMIN_EMAIL;
  
  if (!isApproved) {
    return <ApprovalModal status={userData?.status || 'pending'} email={user.email} uid={user.uid} />;
  }

  return (
    <div className="relative min-h-screen">
      <MainProductionApp user={user} userData={userData} />
      {user.email === ADMIN_EMAIL && (
        <button 
          onClick={() => setIsAdminView(true)}
          className="fixed bottom-6 left-6 z-50 bg-brutal-dark text-white font-display font-black text-xs uppercase px-6 py-3 border-2 border-brutal-dark shadow-brutal hover:bg-brutal-yellow hover:text-brutal-dark transition-all flex items-center gap-2"
        >
          <Settings className="w-4 h-4" /> Admin Controls
        </button>
      )}
    </div>
  );
};

export default App;
