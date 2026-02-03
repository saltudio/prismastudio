import React, { useState, useEffect } from "react";
import { loginWithEmailPassword, registerWithEmailPassword } from "../auth";
import { ensureUserProfile } from "../userGate";
import { Lock, Mail, Zap, ShieldAlert, Fingerprint, Sun, Moon, Film, Popcorn, Ticket } from "lucide-react";

const ADMIN_WA_PHONE = "628990017000";

const LoginScreen: React.FC<{ onAuthError?: (error: string | null) => void }> = () => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

  const openWhatsApp = (reason: string) => {
    const text = `Hub Admin PRISMA Studio\nEmail: ${email}\nReason: ${reason}`;
    window.open(`https://wa.me/${ADMIN_WA_PHONE}?text=${encodeURIComponent(text)}`, "_blank");
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      const eTrim = email.trim().toLowerCase();
      if (mode === "login") {
        await loginWithEmailPassword(eTrim, password);
      } else {
        if (password !== confirmPassword) throw new Error("MISMATCH");
        const cred = await registerWithEmailPassword(eTrim, password);
        await ensureUserProfile(cred.user.uid, eTrim);
        openWhatsApp("New User Approval Request");
      }
    } catch (err: any) {
      if (err.message === "MISMATCH") setErrorMsg("Sandi tidak cocok");
      else setErrorMsg("Gagal masuk. Cek email/sandi atau hubungi admin untuk aktivasi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brutal-bg dark:bg-brutal-dark p-6 overflow-hidden selection:bg-brutal-yellow selection:text-brutal-dark">
      <button onClick={toggleTheme} className="fixed top-6 right-6 bg-white dark:bg-brutal-dark dark:text-white border-4 border-brutal-dark dark:border-white p-3 shadow-brutal-sm hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all z-50">
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-4xl animate-fade-in-up">
        <div className="bg-white dark:bg-brutal-dark border-[8px] border-brutal-dark dark:border-white shadow-[16px_16px_0px_0px_#000] dark:shadow-[16px_16px_0px_0px_rgba(255,255,255,0.2)] flex flex-col md:flex-row">
          
          {/* Left Brand Panel - Minimalist Landscape Focus */}
          <div className="bg-brutal-yellow p-10 md:w-5/12 border-b-[8px] md:border-b-0 md:border-r-[8px] border-brutal-dark dark:border-white flex flex-col items-center justify-center text-center">
            <div className="w-24 h-24 bg-white border-4 border-brutal-dark shadow-brutal flex items-center justify-center mb-8 -rotate-6">
              <Zap className="w-14 h-14 text-brutal-dark fill-brutal-yellow" />
            </div>
            <h1 className="font-display font-black text-5xl md:text-6xl text-brutal-dark uppercase tracking-tighter leading-[0.8] mb-8">PRISMA<br/>STUDIO</h1>
            <div className="flex gap-4 opacity-20 text-brutal-dark">
              <Film size={24} /> <Popcorn size={24} /> <Ticket size={24} />
            </div>
          </div>

          {/* Right Form Panel - Tighter Layout */}
          <div className="p-8 md:p-12 flex-grow flex flex-col justify-center">
            <div className="flex border-4 border-brutal-dark dark:border-white mb-8 overflow-hidden bg-brutal-gray/20">
              <button onClick={() => setMode("login")} className={`flex-1 font-display font-black text-xs uppercase p-4 tracking-widest ${mode === "login" ? "bg-brutal-dark text-white dark:bg-white dark:text-brutal-dark" : "dark:text-white"}`}>Login</button>
              <button onClick={() => setMode("register")} className={`flex-1 font-display font-black text-xs uppercase p-4 tracking-widest ${mode === "register" ? "bg-brutal-dark text-white dark:bg-white dark:text-brutal-dark" : "dark:text-white"}`}>Daftar</button>
            </div>

            {errorMsg && (
              <div className="mb-8 border-4 border-brutal-dark bg-red-500 p-5 shadow-brutal-sm text-white animate-fade-in">
                <div className="flex items-center gap-3 font-mono text-[10px] font-black uppercase mb-4 leading-tight">
                  <ShieldAlert size={18} className="flex-shrink-0" /> {errorMsg}
                </div>
                <button onClick={() => openWhatsApp("Bantuan Akses")} className="w-full bg-white text-brutal-dark p-3 border-4 border-brutal-dark flex items-center justify-center gap-3 font-display font-black text-[11px] uppercase shadow-brutal-sm hover:bg-brutal-yellow hover:-translate-y-0.5 transition-all">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.414 0 .004 5.412.001 12.049a11.82 11.82 0 001.578 5.919L0 24l6.135-1.61a11.803 11.803 0 005.911 1.592h.005c6.637 0 12.048-5.412 12.052-12.05a11.815 11.815 0 00-3.266-8.525z" fill="#25D366"/>
                  </svg>
                  HUBUNGI ADMIN
                </button>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border-2 border-brutal-dark flex items-center justify-center group-focus-within:bg-brutal-yellow transition-colors">
                  <Mail size={16} className="text-brutal-dark" />
                </div>
                <input value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-brutal-gray/10 dark:bg-white/5 border-4 border-brutal-dark dark:border-white p-4 pl-16 font-mono font-bold text-sm focus:bg-white dark:focus:bg-white/10 outline-none transition-all" placeholder="EMAIL ADDRESS" required />
              </div>
              
              <div className="relative group">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border-2 border-brutal-dark flex items-center justify-center group-focus-within:bg-brutal-yellow transition-colors">
                  <Lock size={16} className="text-brutal-dark" />
                </div>
                <input value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-brutal-gray/10 dark:bg-white/5 border-4 border-brutal-dark dark:border-white p-4 pl-16 font-mono font-bold text-sm focus:bg-white dark:focus:bg-white/10 outline-none transition-all" placeholder="PASSWORD" type="password" required />
              </div>

              {mode === "register" && (
                <div className="relative animate-fade-in group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border-2 border-brutal-dark flex items-center justify-center group-focus-within:bg-brutal-yellow transition-colors">
                    <Lock size={16} className="text-brutal-dark" />
                  </div>
                  <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-brutal-gray/10 dark:bg-white/5 border-4 border-brutal-dark dark:border-white p-4 pl-16 font-mono font-bold text-sm focus:bg-white dark:focus:bg-white/10 outline-none transition-all" placeholder="CONFIRM PASSWORD" type="password" required />
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-brutal-blue text-white font-display font-black text-2xl uppercase p-5 border-4 border-brutal-dark shadow-brutal active:translate-x-1 active:translate-y-1 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-4">
                {loading ? "PROCESSING..." : <>{mode === "login" ? "ENTER STUDIO" : "JOIN STUDIO"}<Fingerprint size={28} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;