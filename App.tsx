
import React, { useState, useEffect, useRef } from 'react';
import { AppState, Language, Post, User, Message, Game, Circle, GameSession } from './types.ts';
import { ICONS, TRANSLATIONS, LANGUAGE_NAMES, IS_RTL } from './constants.tsx';
import { PostCard } from './components/PostCard.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { enhanceStory, summarizeFeed, teachGameTutorial } from './services/gemini.ts';
import { 
  auth, db, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, getDoc, setDoc, where, limit,
  onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  ref, uploadString, getDownloadURL, getDocs, deleteDoc
} from './services/firebase.ts';

const GAMES: Game[] = [
  { id: 'tictactoe', name: 'Tic Tac Toe', icon: '❌⭕', descriptionKey: 'chessDesc', difficulty: 'Easy' },
  { id: 'checkers', name: 'Checkers', icon: '🔴', descriptionKey: 'checkersDesc', difficulty: 'Medium' },
];

const COUNTRY_CODES = [
  { code: '+1', name: 'USA/Canada' },
  { code: '+44', name: 'UK' },
  { code: '+92', name: 'Pakistan' },
  { code: '+91', name: 'India' },
  { code: '+61', name: 'Australia' },
  { code: '+34', name: 'Spain' },
  { code: '+33', name: 'France' },
  { code: '+49', name: 'Germany' },
  { code: '+86', name: 'China' },
  { code: '+52', name: 'Mexico' },
];

const censorText = (text: string) => {
  const badWords = /\b(fuck|nigger|ass|shit|bitch|bastard|dick|pussy|cunt|faggot|kike|retard)\b/gi;
  return text.replace(badWords, '****');
};

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isProcessingAuth, setIsProcessingAuth] = useState(false);
  const [state, setState] = useState<AppState>({
    language: 'en',
    fontSize: 'large',
    highContrast: false,
    voiceEnabled: true,
    user: null
  });

  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeGame, setActiveGame] = useState<GameSession | null>(null);
  
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'games' | 'settings' | 'profile'>('home');
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);

  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPhoneCode, setAuthPhoneCode] = useState('+1');
  const [authPhone, setAuthPhone] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authName, setAuthName] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  const [friendSearchCode, setFriendSearchCode] = useState('+1');
  const [friendSearchPhone, setFriendSearchPhone] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [showRecap, setShowRecap] = useState(false);
  const [recapText, setRecapText] = useState<string | null>(null);
  const [isGeneratingRecap, setIsGeneratingRecap] = useState(false);
  const [isTeachingGame, setIsTeachingGame] = useState(false);
  const [gameTutorialText, setGameTutorialText] = useState<string | null>(null);
  const [selectedGameName, setSelectedGameName] = useState<string | null>(null);

  // Profile editing states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [editableBio, setEditableBio] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const profilePicRef = useRef<HTMLInputElement>(null);

  const t = TRANSLATIONS[state.language] || TRANSLATIONS.en;
  const isRtl = IS_RTL(state.language);

  // Authentication Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", fbUser.uid));
          if (userDoc.exists()) {
            const userData = { id: fbUser.uid, uid: fbUser.uid, ...userDoc.data() } as User;
            setCurrentUser(userData);
            setState(prev => ({ ...prev, user: userData, language: userData.language || 'en' }));
          }
        } catch (err) {
          console.error("Error in auth observer:", err);
        }
      } else {
        setCurrentUser(null);
        setState(prev => ({ ...prev, user: null }));
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Content Sync
  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(40));
    return onSnapshot(q, (snapshot) => {
      const allPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Post));
      setPosts(allPosts);
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "users"), limit(50));
    return onSnapshot(q, (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as User)));
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const q = query(collection(db, "gameSessions"), where("players", "array-contains", currentUser.uid), where("status", "==", "playing"), limit(1));
    return onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setActiveGame({ id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as GameSession);
      } else {
        setActiveGame(null);
      }
    });
  }, [currentUser]);

  const speakText = (text: string) => {
    if (!state.voiceEnabled || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = state.language === 'en' ? 'en-US' : state.language;
    utterance.rate = 0.85; 
    window.speechSynthesis.speak(utterance);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isProcessingAuth) return;
    setIsProcessingAuth(true);
    
    try {
      if (isLoginMode) {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        if (!authPhone) throw new Error("Please enter your phone number.");
        if (!authName) throw new Error("Please enter your name.");
        
        const fullPhone = authPhoneCode + authPhone.replace(/\D/g, '');
        
        let res;
        try {
          res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        } catch (authErr: any) {
          if (authErr.code === 'auth/email-already-in-use') {
            setIsLoginMode(true);
            setAuthPassword('');
            throw new Error("This email is already in use. We've switched you to 'Sign In' so you can log into your account!");
          }
          throw authErr;
        }
        
        const newUser: User = {
          id: res.user.uid,
          uid: res.user.uid,
          name: authName,
          phoneNumber: fullPhone,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(authName)}`,
          location: 'Community Member',
          bio: 'Proud to be a senior. Connecting with wisdom.',
          following: [],
          followers: [],
          language: state.language
        };
        
        await setDoc(doc(db, "users", res.user.uid), newUser);
        
        // Immediate local state update to bypass doc sync delay
        setCurrentUser(newUser);
        setState(prev => ({ ...prev, user: newUser }));
      }
    } catch (err: any) { 
      alert(err.message); 
    } finally {
      setIsProcessingAuth(false);
    }
  };

  const handleSearchByPhone = async () => {
    if (!friendSearchPhone.trim()) return;
    setIsSearching(true);
    try {
      const fullPhone = friendSearchCode + friendSearchPhone.replace(/\D/g, '');
      const q = query(collection(db, "users"), where("phoneNumber", "==", fullPhone));
      const snap = await getDocs(q);
      const res = snap.docs.map(doc => ({ id: doc.id, uid: doc.id, ...doc.data() } as User));
      setSearchResults(res);
      if (res.length === 0) alert("We couldn't find anyone with that number. Double check the country code!");
    } catch (err) {
      alert("Search failed. Please try again.");
    } finally { 
      setIsSearching(false); 
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim() && !newPostImage) return;
    setIsUploading(true);
    let imageUrl = null;
    try {
      if (newPostImage) {
        const storageRef = ref(storage, `posts/${currentUser?.uid}_${Date.now()}.jpg`);
        await uploadString(storageRef, newPostImage, 'data_url');
        imageUrl = await getDownloadURL(storageRef);
      }
      
      await addDoc(collection(db, "posts"), {
        authorId: currentUser!.uid,
        authorName: currentUser!.name,
        authorAvatar: currentUser!.avatar,
        authorLocation: currentUser!.location,
        content: censorText(newPostContent),
        image: imageUrl,
        createdAt: serverTimestamp(),
        likes: []
      });

      setNewPostContent('');
      setNewPostImage(null);
    } catch (err) {
      alert("Sharing failed. Check your internet connection.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleToggleFollow = async (targetUid: string) => {
    if (!currentUser) return;
    const isFollowing = currentUser.following?.includes(targetUid);
    const userRef = doc(db, "users", currentUser.uid);
    try {
      await updateDoc(userRef, {
        following: isFollowing ? arrayRemove(targetUid) : arrayUnion(targetUid)
      });
      setCurrentUser(prev => {
        if (!prev) return null;
        const updated = {
          ...prev,
          following: isFollowing 
            ? (prev.following || []).filter(id => id !== targetUid)
            : [...(prev.following || []), targetUid]
        };
        setState(s => ({ ...s, user: updated }));
        return updated;
      });
    } catch (err) {
      alert("Action failed.");
    }
  };

  const startNewGame = async (gameId: string, opponentId: string) => {
    if (!currentUser) return;
    const session: Partial<GameSession> = {
      gameId,
      players: [currentUser.uid, opponentId],
      status: 'playing',
      currentTurn: currentUser.uid,
      boardState: Array(9).fill(null),
      updatedAt: serverTimestamp()
    };
    try {
      await addDoc(collection(db, "gameSessions"), session);
      setActiveTab('games');
    } catch (err) {
      alert("Could not start game.");
    }
  };

  const handleGameMove = async (index: number) => {
    if (!activeGame || activeGame.currentTurn !== currentUser!.uid) return;
    const newBoard = [...activeGame.boardState];
    if (newBoard[index]) return;
    newBoard[index] = activeGame.players[0] === currentUser!.uid ? 'X' : 'O';
    
    const winPatterns = [
      [0,1,2],[3,4,5],[6,7,8],
      [0,3,6],[1,4,7],[2,5,8],
      [0,4,8],[2,4,6]
    ];
    let winner = null;
    for (const pattern of winPatterns) {
      const [a,b,c] = pattern;
      if (newBoard[a] && newBoard[a] === newBoard[b] && newBoard[a] === newBoard[c]) {
        winner = currentUser!.uid;
        break;
      }
    }

    const isDraw = !winner && newBoard.every(c => c !== null);
    const opponent = activeGame.players.find(p => p !== currentUser!.uid);

    await updateDoc(doc(db, "gameSessions", activeGame.id), {
      boardState: newBoard,
      currentTurn: opponent,
      status: (winner || isDraw) ? 'finished' : 'playing',
      winner: winner || (isDraw ? 'draw' : null),
      updatedAt: serverTimestamp()
    });
  };

  const handleProfilePicChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;
    
    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const storageRef = ref(storage, `avatars/${currentUser.uid}.jpg`);
        await uploadString(storageRef, base64, 'data_url');
        const url = await getDownloadURL(storageRef);
        
        const userRef = doc(db, "users", currentUser.uid);
        await updateDoc(userRef, { avatar: url });
        
        const updatedUser = { ...currentUser, avatar: url };
        setCurrentUser(updatedUser);
        setState(prev => ({ ...prev, user: updatedUser }));
        
        if (viewingProfile && viewingProfile.uid === currentUser.uid) {
            setViewingProfile(updatedUser);
        }
      } catch (err) {
        console.error("Profile upload error:", err);
        alert("Upload failed. Please check your connection.");
      } finally {
        setIsUploading(false);
        e.target.value = ''; // Reset input to allow re-selection
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveBio = async () => {
    if (!currentUser) return;
    setIsUploading(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, { bio: editableBio });
      
      const updatedUser = { ...currentUser, bio: editableBio };
      setCurrentUser(updatedUser);
      setState(prev => ({ ...prev, user: updatedUser }));
      
      if (viewingProfile && viewingProfile.uid === currentUser.uid) {
        setViewingProfile(updatedUser);
      }
      setIsEditingBio(false);
    } catch (err) {
      alert("Failed to save bio.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateRecap = async () => {
    if (isGeneratingRecap) return;
    setShowRecap(true);
    setIsGeneratingRecap(true);
    try {
      const summary = await summarizeFeed(posts.slice(0, 10), state.language);
      setRecapText(summary || "No recent updates to share.");
      if (state.voiceEnabled) speakText(summary || "");
    } catch (err) {
      setRecapText("I couldn't get the news right now. Try again shortly!");
    } finally {
      setIsGeneratingRecap(false);
    }
  };

  const handleTeachGame = async (gameName: string) => {
    setSelectedGameName(gameName);
    setIsTeachingGame(true);
    setGameTutorialText(null);
    try {
      const tutorial = await teachGameTutorial(gameName, state.language);
      setGameTutorialText(tutorial || "I'm sorry, I couldn't find the rules for this game.");
    } catch (err) {
      setGameTutorialText("Could not load rules.");
    }
  };

  if (loading) return (
    <div className="h-screen bg-indigo-600 flex flex-col items-center justify-center text-white p-12 text-center">
      <ICONS.Bot className="w-40 h-40 animate-bounce mb-8 opacity-90" />
      <h1 className="text-6xl font-black tracking-tighter">Seniority</h1>
      <p className="text-2xl font-bold mt-4 opacity-75 italic">Waking up the neighborhood...</p>
    </div>
  );

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-indigo-50/30 font-sans">
      <div className="bg-white w-full max-w-xl p-12 rounded-[60px] shadow-[0_40px_100px_-20px_rgba(79,70,229,0.2)] space-y-10 animate-fade-in border-8 border-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-3 bg-indigo-600 shadow-md"></div>
        <div className="text-center">
          <div className="w-24 h-24 bg-indigo-600 rounded-[35px] flex items-center justify-center text-white mx-auto mb-6 shadow-2xl shadow-indigo-100">
             <ICONS.Home className="w-14 h-14" />
          </div>
          <h1 className="text-6xl font-black text-indigo-950 tracking-tight">Seniority</h1>
          <p className="text-xl font-bold text-slate-400 mt-2">The neighborhood social network.</p>
        </div>
        
        <form onSubmit={handleAuth} className="space-y-6">
          {!isLoginMode && (
            <>
              <div className="space-y-2">
                <label className="text-xl font-black text-slate-800 ml-4 uppercase tracking-widest opacity-60">Full Name</label>
                <input type="text" placeholder="e.g. Grandma Rose" value={authName} onChange={e=>setAuthName(e.target.value)} className="w-full p-6 text-2xl border-4 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-400 rounded-3xl outline-none transition-all placeholder-slate-200 font-medium" required />
              </div>
              <div className="space-y-2">
                <label className="text-xl font-black text-slate-800 ml-4 uppercase tracking-widest opacity-60">Phone Number</label>
                <div className="flex space-x-3">
                  <select value={authPhoneCode} onChange={e=>setAuthPhoneCode(e.target.value)} className="p-6 text-2xl border-4 border-slate-50 rounded-3xl bg-slate-50 font-bold outline-none cursor-pointer hover:border-indigo-100">
                    {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.name})</option>)}
                  </select>
                  <input type="tel" placeholder="Your phone number" value={authPhone} onChange={e=>setAuthPhone(e.target.value)} className="flex-1 p-6 text-2xl border-4 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-400 rounded-3xl outline-none transition-all placeholder-slate-200 font-medium" required />
                </div>
              </div>
            </>
          )}
          <div className="space-y-2">
            <label className="text-xl font-black text-slate-800 ml-4 uppercase tracking-widest opacity-60">Email Address</label>
            <input type="email" placeholder="example@email.com" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} className="w-full p-6 text-2xl border-4 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-400 rounded-3xl outline-none transition-all placeholder-slate-200 font-medium" required />
          </div>
          <div className="space-y-2">
            <label className="text-xl font-black text-slate-800 ml-4 uppercase tracking-widest opacity-60">Secret Password</label>
            <div className="relative">
              <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} className="w-full p-6 text-2xl border-4 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-400 rounded-3xl outline-none transition-all placeholder-slate-200 font-medium" required />
              <button type="button" onClick={()=>setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-indigo-600 transition-colors p-2">
                {showPassword ? <ICONS.EyeOff className="w-10 h-10" /> : <ICONS.Eye className="w-10 h-10" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={isProcessingAuth} className={`w-full py-8 ${isProcessingAuth ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100'} text-white text-3xl font-black rounded-[35px] transition-all active-scale flex items-center justify-center space-x-4`}>
            {isProcessingAuth ? (
              <div className="w-10 h-10 border-8 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (isLoginMode ? 'Sign In' : 'Sign Up')}
          </button>
        </form>
        
        <button onClick={()=>{setIsLoginMode(!isLoginMode); setAuthPassword('');}} className="w-full text-2xl font-black text-slate-400 hover:text-indigo-600 transition-all underline decoration-4 underline-offset-8 decoration-slate-100 hover:decoration-indigo-100">
          {isLoginMode ? "New here? Come and join us!" : "Already a member? Sign in instead"}
        </button>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${state.highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} pb-40 transition-colors duration-500`}>
      <header className="fixed top-0 inset-x-0 h-24 bg-white/95 backdrop-blur-3xl border-b border-indigo-50 flex items-center justify-between px-8 z-50 shadow-sm">
        <div className="flex items-center space-x-4 cursor-pointer active-scale" onClick={()=>setActiveTab('home')}>
          <div className="bg-indigo-600 p-3 rounded-[20px] text-white shadow-xl shadow-indigo-100"><ICONS.Home className="w-10 h-10" /></div>
          <span className="text-4xl font-black tracking-tight text-indigo-950">Seniority</span>
        </div>
        <div className="flex items-center space-x-6">
          <button onClick={handleGenerateRecap} className="group flex items-center bg-white text-indigo-600 px-6 py-4 rounded-[25px] font-black text-xl space-x-3 active-scale shadow-sm border-4 border-indigo-50 hover:border-indigo-100 transition-all">
            <ICONS.Radio className={`w-8 h-8 ${isGeneratingRecap ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Daily Digest</span>
          </button>
          <img src={currentUser.avatar} onClick={()=>{setViewingProfile(currentUser); setActiveTab('profile')}} className="w-16 h-16 rounded-2xl border-4 border-white shadow-2xl cursor-pointer active-scale ring-4 ring-indigo-50/50 object-cover" alt="Profile" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto pt-32 px-6">
        {activeTab === 'home' && (
          <div className="space-y-12 animate-slide-up">
            <div className="p-12 rounded-[60px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.06)] space-y-8 border-4 border-white bg-white relative group transition-all duration-500">
              <div className="flex items-start space-x-6">
                <img src={currentUser.avatar} className="w-24 h-24 rounded-[30px] shadow-xl border-4 border-indigo-50 object-cover" alt="Me" />
                <textarea 
                  placeholder={t.share} 
                  value={newPostContent} 
                  onChange={e=>setNewPostContent(e.target.value)} 
                  className="flex-1 p-4 text-4xl border-none focus:ring-0 min-h-[180px] outline-none font-medium resize-none bg-transparent transition-colors text-slate-800 placeholder-slate-200" 
                />
              </div>
              {newPostImage && (
                <div className="relative group/img overflow-hidden rounded-[45px] border-8 border-slate-50 shadow-2xl">
                  <img src={newPostImage} className="w-full max-h-[600px] object-cover" alt="Shared" />
                  <button onClick={()=>setNewPostImage(null)} className="absolute top-6 right-6 bg-black/60 text-white p-5 rounded-full backdrop-blur-md transition-all shadow-xl active-scale border-4 border-white/20"><svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="4"/></svg></button>
                </div>
              )}
              <div className="flex justify-between items-center border-t-8 border-slate-50 pt-10 transition-colors">
                <div className="flex space-x-6">
                  <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={e=>{
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      setNewPostImage(reader.result as string);
                      e.target.value = ''; // Reset input to allow re-selection
                    };
                    reader.readAsDataURL(file);
                  }} />
                  <button onClick={()=>fileInputRef.current?.click()} className="p-8 rounded-[30px] active-scale shadow-inner transition-all border-4 border-transparent bg-slate-50 text-indigo-600"><ICONS.ImagePlus className="w-12 h-12" /></button>
                </div>
                <button 
                  onClick={handlePostSubmit} 
                  disabled={(!newPostContent.trim() && !newPostImage) || isUploading} 
                  className="px-20 py-7 text-white text-4xl font-black rounded-[35px] shadow-2xl transition-all bg-indigo-600 shadow-indigo-200"
                >
                  {isUploading ? <div className="w-10 h-10 border-8 border-white/30 border-t-white rounded-full animate-spin"></div> : "Share"}
                </button>
              </div>
            </div>

            <div className="space-y-16">
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  userLanguage={state.language} 
                  currentUserId={currentUser.uid} 
                  onAvatarClick={()=>{
                    const found = users.find(u => u.uid === post.authorId);
                    setViewingProfile(found || null);
                    setActiveTab('profile');
                  }} 
                  onLike={async ()=>{
                    const isLiked = post.likes.includes(currentUser.uid);
                    const postRef = doc(db, "posts", post.id);
                    await updateDoc(postRef, { likes: isLiked ? arrayRemove(currentUser.uid) : arrayUnion(currentUser.uid) });
                  }} 
                />
              ))}
              {posts.length === 0 && (
                <div className="text-center py-40 space-y-8 opacity-25">
                  <ICONS.Smile className="w-48 h-48 mx-auto" />
                  <p className="text-5xl font-black">Waiting for the neighborhood news...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-12 animate-slide-up">
            <h1 className="text-6xl font-black tracking-tight flex items-center space-x-6">
              <span>Community Members</span>
              <div className="h-1.5 bg-indigo-600 flex-1 rounded-full opacity-10"></div>
            </h1>
            <div className="bg-white p-12 rounded-[60px] shadow-2xl space-y-8 border-8 border-white">
              <h2 className="text-3xl font-black text-indigo-950 ml-2">Find someone by phone</h2>
              <div className="flex space-x-6">
                <select value={friendSearchCode} onChange={e=>setFriendSearchCode(e.target.value)} className="p-8 text-3xl border-4 border-slate-50 rounded-[35px] bg-slate-50 font-black outline-none cursor-pointer hover:border-indigo-100">
                  {COUNTRY_CODES.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                </select>
                <input 
                  type="tel" 
                  placeholder="123 4567" 
                  value={friendSearchPhone} 
                  onChange={e=>setFriendSearchPhone(e.target.value)} 
                  onKeyDown={e=>e.key === 'Enter' && handleSearchByPhone()}
                  className="flex-1 p-8 text-4xl border-4 border-slate-50 bg-slate-50 focus:bg-white focus:border-indigo-500 rounded-[35px] outline-none transition-all font-black placeholder-slate-200" 
                />
                <button onClick={handleSearchByPhone} className="p-10 bg-indigo-600 text-white rounded-[40px] active-scale shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all"><ICONS.Search className="w-12 h-12" /></button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {(searchResults.length > 0 ? searchResults : users).filter(u=>u.uid!==currentUser.uid).map(u => (
                <div key={u.id} className="bg-white p-12 rounded-[65px] shadow-xl flex flex-col items-center text-center space-y-8 border-4 border-white hover:border-indigo-100 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700" />
                  <div className="relative z-10">
                    <img src={u.avatar} className="w-40 h-40 rounded-[45px] border-8 border-white shadow-2xl group-hover:scale-105 transition-transform duration-500 object-cover bg-slate-50" alt={u.name} />
                    {currentUser.following?.includes(u.uid) && <div className="absolute -top-4 -right-4 bg-green-500 text-white p-3 rounded-full border-4 border-white shadow-xl animate-bounce"><ICONS.UserCheck className="w-8 h-8" /></div>}
                  </div>
                  <div className="flex-1 z-10">
                    <h3 className="text-5xl font-black leading-tight text-indigo-950">{u.name}</h3>
                    <p className="text-3xl font-bold text-indigo-600/50 mt-2">{u.phoneNumber}</p>
                    <p className="text-2xl font-medium text-slate-400 mt-6 line-clamp-2 italic px-4 font-serif">"{u.bio || "Hello neighbor!"}"</p>
                  </div>
                  <div className="flex w-full space-x-6 pt-6 z-10">
                    <button onClick={()=>handleToggleFollow(u.uid)} className={`flex-1 py-6 rounded-[30px] font-black text-2xl transition-all shadow-xl active-scale hover:scale-105 ${currentUser.following?.includes(u.uid) ? 'bg-slate-100 text-slate-500 border-4 border-slate-200 shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>
                      {currentUser.following?.includes(u.uid) ? 'Following' : 'Follow'}
                    </button>
                    <button onClick={()=>startNewGame('tictactoe', u.uid)} className="px-10 py-6 bg-green-50 text-green-700 rounded-[30px] font-black text-2xl border-4 border-green-100 active-scale shadow-sm hover:shadow-md transition-all">Play</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'games' && (
          <div className="space-y-12 animate-slide-up">
            <h1 className="text-6xl font-black tracking-tight">Neighborhood Games</h1>
            {activeGame ? (
              <div className="bg-white p-16 rounded-[70px] shadow-2xl text-center space-y-12 border-8 border-indigo-50 relative overflow-hidden">
                <div className="space-y-4">
                  <h2 className="text-7xl font-black text-indigo-950 tracking-tighter">Tic Tac Toe</h2>
                  <p className="text-3xl font-bold text-slate-400">Playing with <span className="text-indigo-600">{users.find(u=>u.uid === activeGame.players.find(p=>p!==currentUser.uid))?.name}</span></p>
                </div>

                {activeGame.status === 'finished' ? (
                  <div className="space-y-10 animate-fade-in py-10">
                    <div className="text-[12rem] animate-bounce">🏆</div>
                    <h3 className="text-7xl font-black text-indigo-900">
                      {activeGame.winner === currentUser.uid ? "You Won!" : (activeGame.winner === 'draw' ? "It's a Draw!" : "A close game! Try again!")}
                    </h3>
                    <button onClick={async ()=>await deleteDoc(doc(db, "gameSessions", activeGame.id))} className="px-20 py-8 bg-indigo-600 text-white text-4xl font-black rounded-[40px] shadow-2xl active-scale hover:bg-indigo-700 transition-all">Back to Menu</button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-8 max-w-md mx-auto p-10 bg-indigo-50 rounded-[60px] shadow-inner border-4 border-indigo-100">
                      {activeGame.boardState.map((cell, idx) => (
                        <button 
                          key={idx} 
                          onClick={()=>handleGameMove(idx)} 
                          className={`h-40 bg-white rounded-[40px] text-8xl font-black flex items-center justify-center shadow-xl active-scale transition-all border-4 ${!cell && activeGame.currentTurn === currentUser.uid ? 'border-indigo-300 hover:border-indigo-500' : 'border-transparent'}`}
                        >
                          <span className={cell === 'X' ? 'text-indigo-600 drop-shadow-sm' : 'text-rose-500 drop-shadow-sm'}>{cell}</span>
                        </button>
                      ))}
                    </div>
                    <div className={`p-10 rounded-[45px] text-5xl font-black shadow-lg transition-all ${activeGame.currentTurn === currentUser.uid ? 'bg-green-100 text-green-700 animate-pulse border-4 border-green-300' : 'bg-slate-100 text-slate-400 border-4 border-slate-200'}`}>
                      {activeGame.currentTurn === currentUser.uid ? "Your Turn!" : "Friend is thinking..."}
                    </div>
                    <button onClick={async ()=>await updateDoc(doc(db, "gameSessions", activeGame.id), {status: 'finished', winner: activeGame.players.find(p=>p!==currentUser.uid)})} className="text-3xl font-black text-rose-300 hover:text-rose-500 transition-colors underline decoration-4 underline-offset-8 decoration-rose-50">Stop Game</button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {GAMES.map(game => (
                  <div key={game.id} className="bg-white p-16 rounded-[75px] shadow-2xl text-center space-y-10 border-8 border-white hover:border-indigo-100 transition-all group overflow-hidden relative">
                    <div className="absolute -bottom-10 -right-10 text-[15rem] opacity-5 font-black group-hover:scale-150 transition-transform duration-1000 select-none">{game.name[0]}</div>
                    <div className="text-[10rem] drop-shadow-2xl group-hover:scale-110 transition-transform duration-700">{game.icon}</div>
                    <div className="relative z-10">
                      <h3 className="text-6xl font-black text-indigo-950 tracking-tighter">{game.name}</h3>
                      <p className="text-3xl font-bold text-slate-300 mt-3 uppercase tracking-widest">{game.difficulty}</p>
                    </div>
                    <div className="space-y-6 relative z-10">
                      <button onClick={()=>setActiveTab('friends')} className="w-full py-8 bg-indigo-600 text-white rounded-[40px] font-black text-3xl shadow-[0_20px_40px_-10px_rgba(79,70,229,0.3)] active-scale hover:bg-indigo-700">Invite a Neighbor</button>
                      <button onClick={()=>handleTeachGame(game.name)} className="w-full py-6 bg-slate-50 text-slate-600 rounded-[35px] font-black text-2xl active-scale border-4 border-slate-100 hover:border-slate-200">Rule Book</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && viewingProfile && (
          <div className="space-y-12 animate-slide-up">
            <div className="bg-white p-20 rounded-[80px] shadow-2xl text-center md:text-left md:flex items-center md:space-x-20 border-8 border-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-50/30 rounded-full -mr-64 -mt-64 blur-3xl select-none" />
              <div className="relative inline-block mx-auto md:mx-0 z-10">
                <img src={viewingProfile.avatar} className="w-80 h-80 rounded-[70px] border-[12px] border-white shadow-2xl object-cover bg-slate-50" alt={viewingProfile.name} />
                {viewingProfile.uid === currentUser.uid && (
                  <>
                    <input type="file" ref={profilePicRef} hidden accept="image/*" onChange={handleProfilePicChange} />
                    <button onClick={()=>profilePicRef.current?.click()} className="absolute -bottom-8 -right-8 bg-indigo-600 text-white p-8 rounded-full shadow-2xl border-8 border-white active-scale hover:bg-indigo-700 transition-all">
                      {isUploading ? <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <ICONS.ImagePlus className="w-12 h-12" />}
                    </button>
                  </>
                )}
              </div>
              <div className="mt-16 md:mt-0 flex-1 z-10">
                <h1 className="text-9xl font-black text-indigo-950 tracking-tighter">{viewingProfile.name}</h1>
                <p className="text-5xl font-bold text-indigo-600 mt-4 flex items-center justify-center md:justify-start">
                  <span className="opacity-40 text-3xl mr-3 font-serif italic">#</span>
                  {viewingProfile.phoneNumber}
                </p>
                
                <div className="mt-12 relative group">
                  {isEditingBio ? (
                    <div className="space-y-6">
                      <textarea 
                        value={editableBio}
                        onChange={(e) => setEditableBio(e.target.value)}
                        className="w-full p-10 bg-indigo-50 rounded-[50px] italic font-serif text-4xl text-slate-700 shadow-inner leading-relaxed border-4 border-indigo-200 outline-none focus:border-indigo-400 min-h-[200px] resize-none"
                        placeholder="Tell us a bit about yourself..."
                      />
                      <div className="flex space-x-4">
                        <button onClick={handleSaveBio} className="flex-1 py-6 bg-green-600 text-white text-3xl font-black rounded-[30px] active-scale shadow-lg hover:bg-green-700 transition-all">
                          {isUploading ? "Saving..." : "Save Bio"}
                        </button>
                        <button onClick={() => setIsEditingBio(false)} className="px-10 py-6 bg-slate-100 text-slate-500 text-3xl font-black rounded-[30px] active-scale">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="p-10 bg-indigo-50/50 rounded-[50px] italic font-serif text-4xl text-slate-700 shadow-inner leading-relaxed border-2 border-indigo-100/50">
                        "{viewingProfile.bio || "Connecting with my community."}"
                      </div>
                      {viewingProfile.uid === currentUser.uid && (
                        <button 
                          onClick={() => {
                            setEditableBio(viewingProfile.bio || "");
                            setIsEditingBio(true);
                          }}
                          className="absolute -top-6 -right-6 p-4 bg-white text-indigo-600 rounded-full shadow-xl border-4 border-indigo-50 active-scale hover:scale-110 transition-all"
                        >
                          <ICONS.PenLine className="w-8 h-8" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {viewingProfile.uid === currentUser.uid && !isEditingBio && (
                  <div className="mt-12 flex flex-wrap gap-6 justify-center md:justify-start">
                    <button onClick={()=>signOut(auth)} className="px-16 py-7 bg-rose-50 text-rose-600 text-3xl font-black rounded-[35px] active-scale border-4 border-rose-100 shadow-sm transition-all hover:bg-rose-100">Sign Out</button>
                    <button onClick={()=>setActiveTab('settings')} className="px-12 py-7 bg-slate-50 text-slate-600 text-3xl font-black rounded-[35px] active-scale border-4 border-slate-100 transition-all"><ICONS.Settings className="w-10 h-10" /></button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-12 animate-slide-up">
            <h1 className="text-6xl font-black tracking-tight">App Settings</h1>
            <div className="bg-white p-16 rounded-[70px] shadow-2xl space-y-12 border-8 border-white">
               <div className="flex justify-between items-center p-10 bg-slate-50 rounded-[45px] shadow-inner border-4 border-slate-100">
                  <div className="space-y-2">
                    <span className="text-4xl font-black text-indigo-950">App Language</span>
                    <p className="text-xl font-bold text-slate-400">Change your experience</p>
                  </div>
                  <select 
                    value={state.language} 
                    onChange={e => setState({...state, language: e.target.value as Language})} 
                    className="p-8 rounded-3xl text-3xl font-black bg-white border-4 border-indigo-100 outline-none cursor-pointer focus:border-indigo-400 shadow-sm"
                  >
                    {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (<option key={code} value={code}>{name}</option>))}
                  </select>
               </div>
               <div className="flex justify-between items-center p-10 bg-slate-50 rounded-[45px] shadow-inner border-4 border-slate-100">
                  <div className="space-y-2">
                    <span className="text-4xl font-black text-indigo-950">Audio Reader</span>
                    <p className="text-xl font-bold text-slate-400">Hear summaries read aloud</p>
                  </div>
                  <button 
                    onClick={() => {
                      const newVal = !state.voiceEnabled;
                      setState({...state, voiceEnabled: newVal});
                      if (newVal) speakText("Voice assistance turned on.");
                    }} 
                    className={`px-12 py-6 rounded-[30px] text-3xl font-black transition-all shadow-xl active-scale ${state.voiceEnabled ? 'bg-indigo-600 text-white' : 'bg-white text-slate-400 border-4 border-slate-200 shadow-none'}`}
                  >
                    {state.voiceEnabled ? 'Enabled' : 'Disabled'}
                  </button>
               </div>
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-8 left-8 right-8 h-32 bg-white/95 backdrop-blur-3xl rounded-[60px] border-4 border-white shadow-[0_40px_100px_rgba(0,0,0,0.2)] flex items-center justify-around px-6 z-50">
        <NavBtn icon={<ICONS.Home />} label="Home" active={activeTab === 'home'} onClick={()=>setActiveTab('home')} />
        <NavBtn icon={<ICONS.Users />} label="Neighbors" active={activeTab === 'friends'} onClick={()=>setActiveTab('friends')} />
        <NavBtn icon={<ICONS.Gamepad />} label="Games" active={activeTab === 'games'} onClick={()=>setActiveTab('games')} />
        <NavBtn icon={<ICONS.Settings />} label="Settings" active={activeTab === 'settings'} onClick={()=>setActiveTab('settings')} />
      </nav>

      {/* Popups */}
      {(showRecap || isTeachingGame) && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-3xl z-[100] flex items-center justify-center p-8 animate-fade-in">
          <div className="bg-white w-full max-w-2xl rounded-[80px] p-20 space-y-16 animate-slide-up border-[16px] border-white shadow-[0_50px_100px_rgba(0,0,0,0.5)] relative">
            <div className="flex justify-between items-center border-b-8 border-indigo-50 pb-10">
              <h2 className="text-7xl font-black text-indigo-950 tracking-tighter">{isTeachingGame ? "Rule Book" : "Daily Digest"}</h2>
              <button 
                onClick={()=>{setShowRecap(false); setIsTeachingGame(false); window.speechSynthesis.cancel();}} 
                className="p-6 hover:bg-slate-50 rounded-full active-scale transition-colors border-4 border-transparent hover:border-slate-100"
              >
                <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeWidth="6" strokeLinecap="round"/></svg>
              </button>
            </div>
            <div className="text-5xl leading-tight italic text-slate-700 max-h-[50vh] overflow-y-auto font-serif px-6 custom-scrollbar text-center md:text-left">
              {isGeneratingRecap ? (
                <div className="flex flex-col items-center py-24 space-y-8 animate-pulse">
                  <ICONS.Radio className="w-24 h-24 text-indigo-400 animate-spin-slow" />
                  <p className="font-sans font-black text-indigo-600 tracking-wide uppercase text-2xl">Transmitting stories...</p>
                </div>
              ) : (isTeachingGame ? gameTutorialText : recapText)}
            </div>
            <button 
              onClick={()=>{setShowRecap(false); setIsTeachingGame(false); window.speechSynthesis.cancel();}} 
              className="w-full py-10 bg-indigo-600 text-white text-5xl font-black rounded-[45px] shadow-2xl shadow-indigo-100 active-scale hover:bg-indigo-700 transition-all"
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      <AIAssistant language={state.language} voiceEnabled={state.voiceEnabled} />
    </div>
  );
};

const NavBtn: React.FC<{ icon: any, label: string, active: boolean, onClick: ()=>void }> = ({ icon, label, active, onClick }) => (
  <button onClick={onClick} className={`flex-1 flex flex-col items-center justify-center space-y-2 transition-all active-scale group ${active ? 'text-indigo-600' : 'text-slate-300'}`}>
    <div className={`p-4 rounded-3xl transition-all duration-500 ${active ? 'bg-indigo-50 shadow-inner' : 'group-hover:bg-slate-50'}`}>
      {React.cloneElement(icon, { className: `w-14 h-14 ${active ? 'scale-110' : ''} transition-all duration-300` })}
    </div>
    <span className={`text-sm font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-40'}`}>{label}</span>
  </button>
);

export default App;
