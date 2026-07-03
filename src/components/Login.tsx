import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { DEMO_SENIORS } from '../utils';
import { Sparkles, ShieldAlert, Heart, MessageSquare } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, isDemo: boolean) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      onLoginSuccess(result.user, false);
    } catch (err: any) {
      console.error("Google Sign-In Error: ", err);
      if (err.code === 'auth/popup-blocked') {
        setError("The login popup was blocked by your browser. Please allow popups or use the instant 'Senior Demo Profiles' below!");
      } else if (err.code === 'auth/operation-not-supported-in-this-environment') {
        setError("Google Sign-In is restricted by your browser's security or iframe constraints. Please use the beautiful 'Senior Demo Profiles' below to log in instantly!");
      } else {
        setError(err.message || "An error occurred during Google Sign-In. Try the Senior Demo Profiles!");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (senior: typeof DEMO_SENIORS[0]) => {
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess(senior, true);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-[#2D2D2D] overflow-x-hidden">
      {/* Header */}
      <header className="h-20 px-6 md:px-12 flex items-center justify-between border-b-4 border-[#1A1A1A] bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FF6B6B] rounded-xl flex items-center justify-center border-2 border-[#1A1A1A]">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
              <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
              <path d="M12 8l0 8" />
              <path d="M8 12l8 0" />
            </svg>
          </div>
          <span className="text-2xl md:text-3xl font-black tracking-tighter text-[#1A1A1A]">SENIORITY</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-base font-bold text-[#7D7870]">Need a hand?</span>
          <button 
            onClick={() => {
              alert("Support call initiated! Our warm support helpers will call you shortly on your registered number.");
            }}
            className="px-4 py-1.5 bg-[#F3F1ED] rounded-full font-bold text-[#4A4741] border-2 border-[#1A1A1A] hover:bg-slate-100 transition-all text-sm"
          >
            Call Support
          </button>
        </div>
      </header>

      {/* Main split */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Section: Branding & Main Firebase Login */}
        <section className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center gap-8 bg-[#FDFBF7]">
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] text-[#1A1A1A]">
              Stay close to<br />
              <span className="text-[#4ECDC4] underline decoration-wavy decoration-[#FF6B6B] decoration-2">the ones</span><br />
              you love.
            </h1>
            <p className="text-xl md:text-2xl text-[#6D6A62] leading-relaxed max-w-md font-medium">
              Sharing photos, life stories, and memories with your family shouldn't be complicated. Seniority makes it easy.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-amber-50 border-3 border-[#1A1A1A] rounded-2xl text-amber-900 text-sm flex gap-3 shadow-[4px_4px_0px_0px_#1A1A1A]">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-amber-600" />
              <div>
                <p className="font-extrabold">Friendly Notice</p>
                <p className="font-medium">{error}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-4 mt-2">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="flex items-center justify-center gap-4 w-full max-w-[420px] h-20 bg-white border-4 border-[#1A1A1A] rounded-2xl shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer"
              id="btn-google-login"
            >
              {loading ? (
                <span className="flex items-center gap-2 font-black text-xl">
                  <svg className="animate-spin h-6 w-6 text-[#FF6B6B]" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                <>
                  <svg width="28" height="28" viewBox="0 0 24 24" className="flex-shrink-0">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="text-xl sm:text-2xl font-black text-[#1A1A1A]">Sign in with Google</span>
                </>
              )}
            </button>
            <p className="text-xs sm:text-sm font-bold text-[#9D9A92] uppercase tracking-widest px-1">
              Secure signup powered by Firebase & Google Auth
            </p>
          </div>
        </section>

        {/* Right Section: Vibrant Sunshine Yellow & Demo profiles */}
        <section className="w-full md:w-1/2 bg-[#FFD93D] p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden border-t-4 md:border-t-0 md:border-l-4 border-[#1A1A1A]">
          {/* Subtle dots background */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '32px 32px' }}></div>
          
          <div className="z-10 w-full max-w-md space-y-6">
            <div className="text-center mb-2">
              <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#FF6B6B] text-white text-xs font-black uppercase tracking-widest rounded-full border-2 border-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]">
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                Senior Demo Accounts
              </span>
              <h2 className="text-2xl md:text-3xl font-black text-[#1A1A1A] mt-3">Select a profile to log in instantly!</h2>
              <p className="text-sm font-bold text-[#4A4741] mt-1">Perfect for secure previews inside browser sandboxes.</p>
            </div>

            {/* Render the DEMO profiles as gorgeous playful overlapping cards */}
            <div className="flex flex-col gap-4">
              {DEMO_SENIORS.map((senior, idx) => {
                // Alternating rotations for that retro aesthetic
                const rotateClass = idx === 0 ? 'rotate-[-1.5deg]' : idx === 1 ? 'rotate-[1deg]' : 'rotate-[-0.5deg]';
                
                return (
                  <button
                    key={senior.uid}
                    onClick={() => handleDemoLogin(senior)}
                    disabled={loading}
                    className={`bg-white p-4 rounded-2xl border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] hover:translate-y-1 hover:translate-x-1 hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer text-left w-full group ${rotateClass}`}
                    id={`btn-demo-${senior.uid}`}
                  >
                    <div className="flex items-center gap-4">
                      <img
                        src={senior.photoURL}
                        alt={senior.displayName}
                        className="w-14 h-14 rounded-full border-3 border-[#1A1A1A] object-cover bg-amber-100"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className="font-black text-lg text-[#1A1A1A] group-hover:text-[#FF6B6B] transition-colors truncate">
                            {senior.displayName}
                          </h4>
                          <span className="text-xs font-black bg-[#4ECDC4] text-[#1A1A1A] border-2 border-[#1A1A1A] px-2 py-0.5 rounded-md flex-shrink-0">
                            {senior.location.split(',')[0]}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-[#7D7870] mt-0.5 truncate">
                          {senior.bio}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Static Card decoration matching Design HTML */}
            <div className="bg-white p-4 rounded-xl border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] rotate-[1.5deg] flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF6B6B] border-2 border-[#1A1A1A] flex items-center justify-center font-bold text-xs text-white">★</div>
              <p className="font-extrabold text-[#1A1A1A] text-sm">Arthur and Margaret just liked your post!</p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="h-16 bg-[#1A1A1A] text-white flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 py-3 text-center sm:text-left gap-2">
        <div className="flex gap-4 md:gap-8">
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Privacy Policy</span>
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Terms of Service</span>
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Accessibility</span>
        </div>
        <div className="text-xs font-bold">&copy; 2026 Seniority Social. Built for genuine connection.</div>
      </footer>
    </div>
  );
}
