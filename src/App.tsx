import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, query, orderBy, onSnapshot, getDocs, addDoc, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { Post, UserProfile } from './types';
import { INSPIRING_QUOTES, speakText, stopSpeaking } from './utils';

// Components
import Login from './components/Login';
import AccessibilityBar from './components/AccessibilityBar';
import Header from './components/Header';
import CreatePostForm from './components/CreatePostForm';
import PostCard from './components/PostCard';
import GoldenFriends from './components/GoldenFriends';
import ActivityHub from './components/ActivityHub';

// Icons
import { Compass, Sparkles, BookOpen, Users, Star, MessageCircle, Info } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [loading, setLoading] = useState(true);

  // Accessibility States
  const [textSize, setTextSize] = useState<'normal' | 'large' | 'huge'>(() => {
    return (localStorage.getItem('seniority_textSize') as any) || 'normal';
  });
  const [audioGuide, setAudioGuide] = useState<boolean>(() => {
    return localStorage.getItem('seniority_audioGuide') === 'true';
  });

  // Navigation & Filtering
  const [activeTab, setActiveTab] = useState<'timeline' | 'friends' | 'memory-lane' | 'activity-hub'>('timeline');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Feed & Database States
  const [posts, setPosts] = useState<Post[]>([]);
  const [quote, setQuote] = useState('');
  const [showTutorial, setShowTutorial] = useState(false);

  // Real-time Date and Clock State
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync Accessibility selections to localStorage
  useEffect(() => {
    localStorage.setItem('seniority_textSize', textSize);
  }, [textSize]);

  useEffect(() => {
    localStorage.setItem('seniority_audioGuide', String(audioGuide));
    if (!audioGuide) {
      stopSpeaking();
    } else {
      speakText("Speech assistance is now enabled! You can click any listen button to hear stories read aloud.");
    }
  }, [audioGuide]);

  // Pick a lovely quote on mount
  useEffect(() => {
    const randomQuote = INSPIRING_QUOTES[Math.floor(Math.random() * INSPIRING_QUOTES.length)];
    setQuote(randomQuote);
  }, []);

  // Set up Firebase Auth listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Real user logged in
        // Check if they have an existing user profile document in Firestore
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let profileData = {
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Club Friend',
            photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
            email: firebaseUser.email || '',
            bio: 'Just joined the wonderful Seniority Social Club! 👋',
            hobbies: ['Gardening', 'Reading'],
            location: 'Sunny Town',
          };

          if (userDocSnap.exists()) {
            profileData = { ...profileData, ...userDocSnap.data() };
          } else {
            // Seed a default user profile document for them
            await setDoc(userDocRef, profileData);
          }

          setUser(profileData);
          setIsDemo(false);
        } catch (err) {
          console.error("Error fetching user profile:", err);
          // Fallback to basic profile if Firestore fails
          setUser({
            uid: firebaseUser.uid,
            displayName: firebaseUser.displayName || 'Club Friend',
            photoURL: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
            email: firebaseUser.email || '',
            bio: 'Happy to connect!',
            hobbies: [],
            location: '',
          });
          setIsDemo(false);
          try {
            handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
          } catch (e) {
            console.error("Handled Firestore user profile error:", e);
          }
        }
      } else {
        // No Firebase user. Keep user as null.
        setUser(null);
        setIsDemo(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Posts Stream Subscription
  useEffect(() => {
    if (!user) return;

    const postsQuery = query(collection(db, 'posts'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(postsQuery, async (snapshot) => {
      const list: Post[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Post);
      });
      setPosts(list);
    }, (error) => {
      console.error("Posts subscription failed:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'posts');
      } catch (e) {
        console.error("Handled posts subscription error:", e);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleLoginSuccess = (loggedInUser: any, isDemoUser: boolean) => {
    setUser(loggedInUser);
    setIsDemo(false);
    
    // Wave a warm voice greeting
    speakText(`Welcome to Seniority, ${loggedInUser.displayName?.split(' ')[0]}! Happy to have you in our club today.`);
  };

  const handleLogout = async () => {
    try {
      stopSpeaking();
      await signOut(auth);
      setUser(null);
      setIsDemo(false);
    } catch (err) {
      console.error("Sign-out failed:", err);
    }
  };

  // Helper for text size responsive utility
  const getTextSizeClass = (baseSize: string) => {
    if (textSize === 'large') {
      if (baseSize === 'text-sm') return 'text-base';
      if (baseSize === 'text-base') return 'text-lg';
      if (baseSize === 'text-lg') return 'text-xl';
      if (baseSize === 'text-xl') return 'text-2xl';
      if (baseSize === 'text-2xl') return 'text-3xl';
      if (baseSize === 'text-3xl') return 'text-4xl';
    }
    if (textSize === 'huge') {
      if (baseSize === 'text-sm') return 'text-lg';
      if (baseSize === 'text-base') return 'text-xl';
      if (baseSize === 'text-lg') return 'text-2xl';
      if (baseSize === 'text-xl') return 'text-3xl';
      if (baseSize === 'text-2xl') return 'text-4xl';
      if (baseSize === 'text-3xl') return 'text-5xl';
    }
    return baseSize;
  };

  // Filter posts based on Category and Search inputs
  const filteredPosts = posts.filter((post) => {
    const matchesCategory = categoryFilter === 'All' || post.category === categoryFilter;
    const matchesSearch =
      post.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.category.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Memories-only filter for "Memory Lane" Tab
  const memoryLanePosts = posts.filter((post) => post.category === 'Memories');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex flex-col items-center justify-center p-6">
        <div className="text-center animate-bounce">
          <span className="text-7xl">🌸</span>
          <h2 className="text-3xl font-black text-[#1A1A1A] mt-6 tracking-tight">
            Polishing the Silver Club...
          </h2>
          <p className="text-sm text-[#FF6B6B] font-black tracking-widest uppercase mt-3">
            Seniority is Loading
          </p>
        </div>
      </div>
    );
  }

  // Not Authenticated -> Show Login screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-[#1A1A1A] font-sans transition-all">
      {/* Top Accessibility Bar */}
      <AccessibilityBar
        textSize={textSize}
        setTextSize={setTextSize}
        audioGuide={audioGuide}
        setAudioGuide={setAudioGuide}
        onShowTutorial={() => setShowTutorial(true)}
      />

      {/* Main App Branding Header */}
      <Header
        user={user}
        isDemo={isDemo}
        onLogout={handleLogout}
        textSize={textSize}
        quote={quote}
      />

      {/* Main Container Grid */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* Navigation Tabs bar */}
        <div className="flex flex-wrap overflow-x-auto gap-3 mb-8 pb-2 border-b-4 border-[#1A1A1A]" id="nav-tabs">
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex items-center gap-2 px-6 py-3.5 font-black text-base sm:text-lg rounded-xl border-3 border-[#1A1A1A] transition-all cursor-pointer flex-shrink-0 ${
              activeTab === 'timeline'
                ? 'bg-[#FF6B6B] text-white shadow-[3px_3px_0px_0px_#1A1A1A] scale-105'
                : 'bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#F3F1ED]'
            }`}
            id="tab-timeline"
          >
            <Compass className="w-5 h-5 stroke-[2.5]" />
            <span>🏡 Community Square</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`flex items-center gap-2 px-6 py-3.5 font-black text-base sm:text-lg rounded-xl border-3 border-[#1A1A1A] transition-all cursor-pointer flex-shrink-0 ${
              activeTab === 'friends'
                ? 'bg-[#FF6B6B] text-white shadow-[3px_3px_0px_0px_#1A1A1A] scale-105'
                : 'bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#F3F1ED]'
            }`}
            id="tab-friends"
          >
            <Compass className="w-5 h-5 stroke-[2.5] animate-spin-slow" />
            <span>👥 Golden Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('memory-lane')}
            className={`flex items-center gap-2 px-6 py-3.5 font-black text-base sm:text-lg rounded-xl border-3 border-[#1A1A1A] transition-all cursor-pointer flex-shrink-0 ${
              activeTab === 'memory-lane'
                ? 'bg-[#FF6B6B] text-white shadow-[3px_3px_0px_0px_#1A1A1A] scale-105'
                : 'bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#F3F1ED]'
            }`}
            id="tab-memory-lane"
          >
            <BookOpen className="w-5 h-5 stroke-[2.5]" />
            <span>📸 Memory Lane</span>
          </button>

          <button
            onClick={() => setActiveTab('activity-hub')}
            className={`flex items-center gap-2 px-6 py-3.5 font-black text-base sm:text-lg rounded-xl border-3 border-[#1A1A1A] transition-all cursor-pointer flex-shrink-0 ${
              activeTab === 'activity-hub'
                ? 'bg-[#FF6B6B] text-white shadow-[3px_3px_0px_0px_#1A1A1A] scale-105'
                : 'bg-white text-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#F3F1ED]'
            }`}
            id="tab-activity-hub"
          >
            <Star className="w-5 h-5 stroke-[2.5] text-[#FFD93D] fill-[#FFD93D]" />
            <span>🎯 Golden Activity Hub</span>
          </button>
        </div>

        {/* Outer Layout wrapper */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Main Feed panel - 8 Columns */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* 1. COMMUNITY SQUARE (Timeline) View */}
            {activeTab === 'timeline' && (
              <>
                {/* Create post form */}
                <CreatePostForm
                  user={user}
                  textSize={textSize}
                  onPostCreated={() => {
                    // Force quote renewal or nice visual cheer
                    const quotesList = INSPIRING_QUOTES.filter(q => q !== quote);
                    setQuote(quotesList[Math.floor(Math.random() * quotesList.length)]);
                  }}
                />

                {/* Timeline Filters and Search */}
                <div className="bg-white rounded-3xl p-5 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] space-y-4">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <h3 className={`${getTextSizeClass('text-base')} font-black text-[#1A1A1A]`}>
                      🏡 Filter Stories:
                    </h3>
                    
                    {/* Search Input bar */}
                    <input
                      type="text"
                      placeholder="🔍 Search stories, names, hobbies..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-4 py-2.5 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none text-sm w-full sm:max-w-xs focus:border-[#4ECDC4] text-[#1A1A1A]"
                      id="input-search-posts"
                    />
                  </div>

                  {/* Horizontal Category quick buttons */}
                  <div className="flex flex-wrap gap-2">
                    {['All', 'General', 'Memories', 'Gardening', 'Cooking', 'Crafts', 'Pets', 'Help'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${
                          categoryFilter === cat
                            ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A]'
                            : 'bg-white border-[#EAE6DF] text-[#1A1A1A] hover:border-[#1A1A1A]'
                        }`}
                        id={`btn-filter-category-${cat}`}
                      >
                        {cat === 'All' && '🌎 All Topics'}
                        {cat === 'General' && '🌸 Chat'}
                        {cat === 'Memories' && '📸 Memories'}
                        {cat === 'Gardening' && '🏡 Gardening'}
                        {cat === 'Cooking' && '🍳 Recipes'}
                        {cat === 'Crafts' && '🎨 Crafts'}
                        {cat === 'Pets' && '🐶 Pets'}
                        {cat === 'Help' && '❓ Seeking Advice'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Post Cards Feed */}
                <div className="space-y-4">
                  {filteredPosts.length === 0 ? (
                    <div className="bg-white rounded-3xl p-8 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] text-center text-gray-500">
                      <p className="text-lg font-black text-[#1A1A1A] mb-2">No posts found.</p>
                      <p className="text-sm font-bold text-[#7D7870]">Be the first to share a lovely update under this category! Click the 'Speak' button to write effortlessly.</p>
                    </div>
                  ) : (
                    filteredPosts.map((post) => (
                      <PostCard
                        key={post.id}
                        post={post}
                        currentUser={user}
                        textSize={textSize}
                        audioGuide={audioGuide}
                      />
                    ))
                  )}
                </div>
              </>
            )}

            {/* 3. FRIENDS View */}
            {activeTab === 'friends' && (
              <GoldenFriends currentUser={user} textSize={textSize} />
            )}

            {/* 4. MEMORY LANE View (Nostalgic Photos and autobiographies) */}
            {activeTab === 'memory-lane' && (
              <div className="bg-[#FFD93D]/10 rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl animate-bounce">📸</span>
                  <div>
                    <h2 className={`${getTextSizeClass('text-xl')} font-black text-[#1A1A1A]`}>
                      The Memory Lane Gallery
                    </h2>
                    <p className="text-sm text-[#7D7870] font-bold">
                      Flip through lovely retro photos, memories, and heartwarming life stories.
                    </p>
                  </div>
                </div>

                {/* Grid layout of memories */}
                {memoryLanePosts.length === 0 ? (
                  <p className="text-[#7D7870] font-black italic text-center py-10 bg-white rounded-2xl border-3 border-dashed border-[#1A1A1A] shadow-[3px_3px_0px_0px_#1A1A1A]">
                    Memory Lane is currently quiet. Write a new post and choose "📸 Memory Lane" topic to pin it here forever!
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {memoryLanePosts.map((post) => (
                      <div key={post.id} className="bg-white rounded-2xl p-4.5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] transition-all">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <img src={post.userPhoto} alt={post.userName} className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] object-cover" />
                            <div>
                              <h4 className="font-black text-[#1A1A1A] text-xs">{post.userName}</h4>
                              <p className="text-[10px] text-[#7D7870] font-bold">Memory Keeper</p>
                            </div>
                          </div>
                          
                          {post.imageUrl && (
                            <div className="rounded-xl overflow-hidden mb-3 aspect-video border-2 border-[#1A1A1A]">
                              <img src={post.imageUrl} alt="Memory" className="w-full h-full object-cover" />
                            </div>
                          )}

                          <p className={`text-[#1A1A1A] italic font-bold leading-relaxed mb-3 line-clamp-4 ${getTextSizeClass('text-sm')}`}>
                            "{post.content}"
                          </p>
                        </div>

                        <div className="border-t-2 border-[#1A1A1A] pt-3 flex items-center justify-between">
                          <button
                            onClick={() => {
                              speakText(`Memory shared by ${post.userName}: ${post.content}`);
                            }}
                            className="text-xs font-black text-[#1A1A1A] bg-[#FFD93D] border-2 border-[#1A1A1A] hover:bg-[#ffe066] px-3 py-1 rounded-lg flex items-center gap-1 transition-all shadow-[2px_2px_0px_0px_#1A1A1A]"
                          >
                            Listen 🔊
                          </button>
                          <span className="text-[10px] font-black text-[#1A1A1A] bg-[#4ECDC4] border-2 border-[#1A1A1A] px-2.5 py-0.5 rounded-full">
                            ❤ {post.reactions?.love?.length || 0} Loves
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'activity-hub' && (
              <ActivityHub
                currentUser={user}
                textSize={textSize}
                onPostCreated={() => {
                  // Reset or swap quote on success
                }}
              />
            )}

          </div>

          {/* Right Sidebar - 4 Columns */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick Greeting Panel */}
            <div className="bg-[#FF6B6B] text-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-1 mb-2">
                  <Sparkles className="w-5 h-5 text-[#FFD93D] fill-[#FFD93D] stroke-[2]" />
                  <span className="text-xs uppercase font-black tracking-widest text-[#FFD93D]">
                    Uplifting Daily Cheer
                  </span>
                </div>
                <h4 className="text-2xl font-black mb-3 leading-snug">
                  Hello, {user.displayName?.split(' ')[0]}! 🌟
                </h4>
                <p className="text-white font-bold leading-relaxed text-sm">
                  "Beautiful connections make the heart grow younger. Take a moment today to wave hello to a new club friend or share a sweet memory from your childhood!"
                </p>
                <div className="mt-4 border-t-2 border-white/20 pt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-white font-black">
                  <div className="flex flex-col">
                    <span className="text-[#FFD93D]">📅 {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                    <span className="text-white/85 font-mono mt-0.5">⏰ {currentDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <span className="bg-[#4ECDC4] border-2 border-[#1A1A1A] text-[#1A1A1A] px-2 py-0.5 rounded-full self-start sm:self-auto">524 online 🟢</span>
                </div>
              </div>
            </div>

            {/* Golden Friends Mini Column */}
            {activeTab !== 'friends' && (
              <div className="max-h-[450px] overflow-y-auto rounded-3xl border-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all">
                <GoldenFriends currentUser={user} textSize={textSize} />
              </div>
            )}

          </div>

        </div>

      </main>

      {/* 2026 Copyright block */}
      <footer className="bg-[#F3F1ED] border-t-4 border-[#1A1A1A] py-8 text-center text-[#1A1A1A] font-bold text-sm mt-12">
        <p className="mb-2">🌸 Seniority Seniors Social Club • Built for Comfort & Connection</p>
        <p className="text-xs text-[#7D7870] font-black">Connecting our golden generation with security, comfort, and absolute peace of mind.</p>
      </footer>

      {/* Tutorial / Help Overlay Dialog */}
      {showTutorial && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] animate-scaleIn">
            <div className="flex items-center gap-2 text-[#1A1A1A] border-b-3 border-[#1A1A1A] pb-3 mb-4">
              <Info className="w-7 h-7 text-[#FF6B6B]" />
              <h3 className="text-xl font-black">Welcome to Seniority! 🌸</h3>
            </div>

            <div className="space-y-4 text-[#1A1A1A] font-bold text-sm sm:text-base leading-relaxed">
              <p>
                We designed this social media application specifically to be easy, warm, and highly readable.
              </p>
              
              <div className="space-y-2.5">
                <div className="flex items-start gap-2">
                  <span className="bg-[#FFD93D] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">1</span>
                  <p>**Aa Buttons**: Use the buttons on top to instantly make all words on the screen larger if you find them small!</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="bg-[#FFD93D] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">2</span>
                  <p>**Listen Buttons 🔊**: Tap any Listen button on a post or comment. A gentle, clear voice will read the story aloud for you.</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="bg-[#FFD93D] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">3</span>
                  <p>**Speak Your Post 🎙️**: Tap the microphone button in the writing box, speak your story, and it will automatically type it out!</p>
                </div>

                <div className="flex items-start gap-2">
                  <span className="bg-[#FFD93D] text-[#1A1A1A] border-2 border-[#1A1A1A] rounded-full w-6 h-6 flex items-center justify-center text-xs font-black flex-shrink-0 mt-0.5">4</span>
                  <p>**Send Smiles & Waves**: Leave heartwarming reactions like "Smile" 😊 or "Love" ❤️, and Wave Hello to friendly people!</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-5 border-t-3 border-[#1A1A1A] mt-5">
              <button
                onClick={() => setShowTutorial(false)}
                className="bg-[#FF6B6B] hover:bg-[#ff5252] text-white border-3 border-[#1A1A1A] font-black px-6 py-2.5 rounded-xl shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] cursor-pointer transition-all text-base"
              >
                Wonderful, Let's Go! ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
