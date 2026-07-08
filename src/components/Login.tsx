import React, { useState } from 'react';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { Heart, User, Mail, Lock, Eye, EyeOff, Sparkles, AlertCircle, HelpCircle, ArrowRight, Check } from 'lucide-react';

interface LoginProps {
  onLoginSuccess: (user: any, isDemo: boolean) => void;
}

// Gorgeous senior-friendly custom avatars
const GENTLE_AVATARS = [
  { name: "Sweet Rose", url: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=150" },
  { name: "Cozy Tea Cup", url: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&q=80&w=150" },
  { name: "Friendly Dog", url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=150" },
  { name: "Golden Sunset", url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=150" },
  { name: "Happy Kitten", url: "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&q=80&w=150" },
  { name: "Watercolor Canvas", url: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&q=80&w=150" },
  { name: "Smiling Margaret", url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150" },
  { name: "Cheerful Arthur", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150" }
];

const AVAILABLE_HOBBIES = [
  "Gardening", "Baking", "Knitting", "Reading", "History", 
  "Woodworking", "Walking", "Classical Music", "Cards", 
  "Painting", "Travel", "Dogs & Pets"
];

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<React.ReactNode | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(GENTLE_AVATARS[0].url);
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);

  const handleToggleHobby = (hobby: string) => {
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter(h => h !== hobby));
    } else {
      setSelectedHobbies([...selectedHobbies, hobby]);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      // Fetch user profile from Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      let profileData = {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || 'Club Friend',
        photoURL: firebaseUser.photoURL || GENTLE_AVATARS[0].url,
        email: firebaseUser.email || '',
        bio: 'Just joined the wonderful Seniority Social Club! 👋',
        hobbies: ['Gardening', 'Reading'],
        location: 'Sunny Town',
      };

      if (userDocSnap.exists()) {
        profileData = { ...profileData, ...userDocSnap.data() };
      } else {
        await setDoc(userDocRef, profileData);
      }

      onLoginSuccess(profileData, false);
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/unauthorized-domain') {
        friendlyMessage = (
          <div className="space-y-2">
            <p className="font-extrabold">Firebase Authorized Domain Check Failed</p>
            <p className="text-xs leading-relaxed font-semibold">
              To enable Google Sign-In for this preview app, please add your preview domain to your 
              <strong> Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong>:
            </p>
            <code className="block bg-white p-2 border-2 border-[#1A1A1A] rounded text-xs select-all font-mono break-all text-left">
              {window.location.hostname}
            </code>
            <p className="text-xs font-semibold">
              In the meantime, you can <strong>sign up and log in using the manual Email &amp; Password option below instantly!</strong>
            </p>
          </div>
        ) as any;
      } else if (err.code === 'auth/popup-blocked') {
        friendlyMessage = "The Google sign-in window was blocked by your browser. Please allow popups for this site and click again!";
      } else if (err.code === 'auth/cancelled-popup-request') {
        friendlyMessage = "Google sign-in was cancelled. Please try again or use the Email/Password fields!";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // 1. Sign Up
        if (!displayName.trim()) {
          throw new Error("Please tell us your beautiful name!");
        }
        if (password.length < 6) {
          throw new Error("For your safety, passwords must be at least 6 characters.");
        }

        const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
        
        // Update Firebase User Profile Info
        await updateProfile(result.user, {
          displayName: displayName.trim(),
          photoURL: selectedAvatar
        });

        // Seed profile document in Firestore
        const userProfile = {
          uid: result.user.uid,
          displayName: displayName.trim(),
          photoURL: selectedAvatar,
          email: email.trim(),
          bio: bio.trim() || 'Just joined the wonderful Seniority Social Club! 👋',
          hobbies: selectedHobbies,
          location: location.trim() || 'Sunny Town',
          createdAt: new Date(),
        };

        await setDoc(doc(db, 'users', result.user.uid), userProfile);
        onLoginSuccess(userProfile, false);
      } else {
        // 2. Log In
        const result = await signInWithEmailAndPassword(auth, email.trim(), password);
        
        // Fetch custom profile details from Firestore
        const userProfile = {
          uid: result.user.uid,
          displayName: result.user.displayName || 'Club Friend',
          photoURL: result.user.photoURL || selectedAvatar,
          email: result.user.email || '',
          bio: 'Happy to connect!',
          hobbies: [],
          location: 'Sunny Town',
        };

        onLoginSuccess(userProfile, false);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
      let friendlyMessage = err.message;
      if (err.code === 'auth/email-already-in-use') {
        friendlyMessage = "An account with this email already exists. Try logging in instead!";
      } else if (err.code === 'auth/invalid-credential') {
        friendlyMessage = "The email or password didn't match. Please type them carefully and try again!";
      } else if (err.code === 'auth/weak-password') {
        friendlyMessage = "For your security, please make your password a little stronger (6 or more letters).";
      } else if (err.code === 'auth/invalid-email') {
        friendlyMessage = "Please double check your email address. It should look like name@domain.com";
      }
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col font-sans text-[#2D2D2D] overflow-x-hidden selection:bg-[#4ECDC4]/30">
      {/* Accessible Header */}
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
          <span className="hidden sm:inline text-base font-bold text-[#7D7870]">Need assistance?</span>
          <button 
            onClick={() => {
              alert("Support call initiated! A warm helper will reach out to you shortly to assist.");
            }}
            className="px-5 py-2 bg-[#F3F1ED] rounded-xl font-bold text-[#4A4741] border-3 border-[#1A1A1A] hover:bg-[#EAE6DF] transition-all text-sm active:translate-y-0.5"
          >
            Call Free Support
          </button>
        </div>
      </header>

      {/* Main split */}
      <main className="flex-1 flex flex-col md:flex-row">
        {/* Left Section: Branding & Heartfelt Description */}
        <section className="w-full md:w-1/2 p-8 md:p-16 flex flex-col justify-center gap-8 bg-[#FDFBF7] border-b-4 md:border-b-0 md:border-r-4 border-[#1A1A1A]">
          <div className="space-y-6 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-[#FFD93D]/50 border-2 border-[#1A1A1A] rounded-full text-xs font-black uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#E65C00] fill-[#FFD93D]" />
              Safe, Warm & Cozy Social Club
            </div>
            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] text-[#1A1A1A] tracking-tight">
              Stay close to<br />
              <span className="text-[#4ECDC4] underline decoration-wavy decoration-[#FF6B6B] decoration-3">your club</span><br />
              and family.
            </h1>
            <p className="text-lg md:text-xl text-[#6D6A62] leading-relaxed font-semibold">
              Seniority is a peaceful sanctuary designed strictly for seniors. Share memories, tattle about gardening, find golden friends, and keep connected without any complex noise or tracking.
            </p>
          </div>

          {/* Value cards for reassurance */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl">
            <div className="bg-white p-5 rounded-2xl border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-2xl">👀</span>
              <h4 className="font-black text-base mt-2">Highly Readable</h4>
              <p className="text-xs font-bold text-[#7D7870] mt-1 leading-relaxed">Large words, speech readers, and simple buttons designed for comfortable browsing.</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
              <span className="text-2xl">🤝</span>
              <h4 className="font-black text-base mt-2">Zero Spam & Ads</h4>
              <p className="text-xs font-bold text-[#7D7870] mt-1 leading-relaxed">A clean, safe environment focused purely on heartwarming smiles and genuine care.</p>
            </div>
          </div>
        </section>

        {/* Right Section: Vibrant Form Screen */}
        <section className="w-full md:w-1/2 bg-[#FFD93D]/35 p-6 md:p-12 flex flex-col items-center justify-center relative overflow-hidden">
          {/* Subtle dots background */}
          <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '24px 24px' }}></div>
          
          <div className="z-10 w-full max-w-lg bg-white rounded-3xl p-6 md:p-8 border-4 border-[#1A1A1A] shadow-[10px_10px_0px_0px_rgba(26,26,26,1)] my-4">
            
            {/* Tabs for Login / Signup */}
            <div className="flex border-b-3 border-[#1A1A1A] mb-6">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setError(null); }}
                className={`flex-1 py-3 text-center text-lg font-black transition-all cursor-pointer border-r-2 border-[#1A1A1A] ${
                  !isSignUp 
                    ? 'bg-[#FFD93D] text-[#1A1A1A] font-extrabold' 
                    : 'bg-white text-[#7D7870] hover:bg-[#F3F1ED]'
                }`}
              >
                Sign In 🔐
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setError(null); }}
                className={`flex-1 py-3 text-center text-lg font-black transition-all cursor-pointer ${
                  isSignUp 
                    ? 'bg-[#FFD93D] text-[#1A1A1A] font-extrabold' 
                    : 'bg-white text-[#7D7870] hover:bg-[#F3F1ED]'
                }`}
              >
                Create Account 📝
              </button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-2xl font-black text-[#1A1A1A]">
                {isSignUp ? "Join Our Golden Circle!" : "Welcome Back, Friend!"}
              </h2>
              <p className="text-sm font-bold text-[#6D6A62] mt-1">
                {isSignUp 
                  ? "Signing up takes just a minute. Pick a lovely profile picture below!" 
                  : "Log in with your email address to see your friends and stories."}
              </p>
            </div>

            {error && (
              <div className="p-4 mb-5 bg-amber-50 border-3 border-[#1A1A1A] rounded-2xl text-amber-950 text-sm flex gap-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF6B6B]" />
                <div>
                  <p className="font-extrabold">Please Note</p>
                  <div className="text-sm font-semibold">{error}</div>
                </div>
              </div>
            )}

            {/* Google Authentication Quick Buttons */}
            <div className="mb-6">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-4 bg-white hover:bg-[#F3F1ED] text-[#1A1A1A] font-black text-base rounded-2xl border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-y-1 transition-all cursor-pointer flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                <span className="text-base font-black">
                  {isSignUp ? "Sign Up with Google 🌐" : "Log In with Google 🌐"}
                </span>
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-0.5 bg-gray-200"></div>
                <span className="text-[10px] font-black text-[#7D7870] uppercase tracking-widest select-none">
                  or use your email details
                </span>
                <div className="flex-1 h-0.5 bg-gray-200"></div>
              </div>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              
              {isSignUp && (
                <>
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-black text-[#1A1A1A] mb-1">My Beautiful Name:</label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-gray-400">
                        <User className="w-5 h-5" />
                      </span>
                      <input
                        type="text"
                        placeholder="e.g., Margaret Jenkins"
                        required={isSignUp}
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-base outline-none focus:border-[#4ECDC4] placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-black text-[#1A1A1A] mb-1">Where I Live (Town, State):</label>
                    <input
                      type="text"
                      placeholder="e.g., Portland, OR"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-base outline-none focus:border-[#4ECDC4] placeholder:text-gray-400"
                    />
                  </div>

                  {/* Avatar chooser */}
                  <div>
                    <label className="block text-sm font-black text-[#1A1A1A] mb-2">Pick a Profile Picture: 🌸</label>
                    <div className="grid grid-cols-4 gap-2.5 p-3.5 bg-[#FDFBF7] border-3 border-[#1A1A1A] rounded-2xl max-h-[145px] overflow-y-auto shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                      {GENTLE_AVATARS.map((avatar) => {
                        const isSelected = selectedAvatar === avatar.url;
                        return (
                          <button
                            key={avatar.name}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar.url)}
                            className={`relative rounded-xl overflow-hidden aspect-square border-3 transition-all ${
                              isSelected ? 'border-[#FF6B6B] scale-105 shadow-md' : 'border-[#1A1A1A] opacity-75 hover:opacity-100'
                            }`}
                            title={avatar.name}
                          >
                            <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" />
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#FF6B6B]/20 flex items-center justify-center">
                                <span className="bg-white rounded-full p-0.5 border-2 border-[#1A1A1A]">
                                  <Check className="w-3.5 h-3.5 text-[#FF6B6B] stroke-[4]" />
                                </span>
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Greeting / About me */}
                  <div>
                    <label className="block text-sm font-black text-[#1A1A1A] mb-1">A Little Welcome Note (Optional):</label>
                    <input
                      type="text"
                      placeholder="e.g., Loving grandparent of three. Passionate about rose gardens..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-sm outline-none focus:border-[#4ECDC4] placeholder:text-gray-400"
                    />
                  </div>
                </>
              )}

              {/* Email Address */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-1">My Email Address:</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    placeholder="e.g., mail@seniority.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-base outline-none focus:border-[#4ECDC4] placeholder:text-gray-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-1">My Password:</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-gray-400">
                    <Lock className="w-5 h-5" />
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter 6 or more letters/numbers"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-11 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-base outline-none focus:border-[#4ECDC4] placeholder:text-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Show Password Friendly Checkbox */}
              <div className="flex items-center gap-2 px-1">
                <input
                  type="checkbox"
                  id="chk-show-pw"
                  checked={showPassword}
                  onChange={() => setShowPassword(!showPassword)}
                  className="w-4.5 h-4.5 rounded border-[#1A1A1A] accent-[#FF6B6B] cursor-pointer"
                />
                <label htmlFor="chk-show-pw" className="text-xs font-bold text-[#6D6A62] select-none cursor-pointer">
                  Show my password letters so I don't make a typo.
                </label>
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-sm font-black text-[#1A1A1A] mb-2">My Golden Hobbies (Select some to find matching friends):</label>
                  <div className="grid grid-cols-2 gap-2">
                    {AVAILABLE_HOBBIES.slice(0, 8).map((hobby) => {
                      const isSelected = selectedHobbies.includes(hobby);
                      return (
                        <button
                          key={hobby}
                          type="button"
                          onClick={() => handleToggleHobby(hobby)}
                          className={`px-3 py-2 text-xs font-bold rounded-xl border-2 transition-all cursor-pointer ${
                            isSelected 
                              ? 'bg-[#4ECDC4] border-[#1A1A1A] text-[#1A1A1A]' 
                              : 'bg-white border-[#EAE6DF] text-[#7D7870] hover:border-[#1A1A1A]'
                          }`}
                        >
                          {hobby}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full h-16 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black text-xl rounded-2xl border-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] active:translate-y-1 transition-all cursor-pointer mt-4 flex items-center justify-center gap-3"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Saving details...</span>
                  </>
                ) : (
                  <>
                    <span>{isSignUp ? "Join the Social Club! 🎉" : "Sign Me In! 🏡"}</span>
                    <ArrowRight className="w-5 h-5 stroke-[3]" />
                  </>
                )}
              </button>

            </form>

            {/* Support/Assistance Reassurance Footer */}
            <div className="mt-6 pt-4 border-t-2 border-dashed border-[#1A1A1A] text-center text-xs font-bold text-[#7D7870] leading-normal flex items-center justify-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#FF6B6B]" />
              <span>Forgot your password? Or got stuck? Feel free to call us anytime!</span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer without Google/Firebase references */}
      <footer className="h-16 bg-[#1A1A1A] text-white flex flex-col sm:flex-row items-center justify-between px-6 md:px-12 py-3 text-center sm:text-left gap-2">
        <div className="flex gap-4 md:gap-8">
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Privacy Policy</span>
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Terms of Service</span>
          <span className="text-xs font-bold opacity-60 hover:opacity-100 cursor-pointer">Accessibility Guidelines</span>
        </div>
        <div className="text-xs font-bold">&copy; 2026 Seniority Social Club. Made purely for cozy, beautiful friendships.</div>
      </footer>
    </div>
  );
}
