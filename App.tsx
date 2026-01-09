
import React, { useState, useEffect, useMemo } from 'react';
// Removed missing AppState import
import { Language, Post, User, Notification, Game, Group } from './types.ts';
import { ICONS, TRANSLATIONS, LANGUAGE_NAMES } from './constants.tsx';
import { PostCard } from './components/PostCard.tsx';
import { AIAssistant } from './components/AIAssistant.tsx';
import { 
  auth, db, storage, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, getDoc, setDoc, where, limit,
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup,
  ref, uploadString, getDownloadURL
} from './services/firebase.ts';

const GAMES: Game[] = [
  { id: 'tictactoe', name: 'Tic Tac Toe', icon: '❌⭕', descriptionKey: 'Simple & Fun', difficulty: 'Easy' },
  { id: 'checkers', name: 'Checkers', icon: '🔴⚫', descriptionKey: 'Classic Board', difficulty: 'Medium' },
];

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const [posts, setPosts] = useState<Post[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [activeTab, setActiveTab] = useState<'home' | 'friends' | 'games' | 'profile'>('home');
  const [neighborTab, setNeighborTab] = useState<'all' | 'groups'>('all');
  const [viewingProfile, setViewingProfile] = useState<User | null>(null);
  
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);

  // Edit Profile States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  
  // Create Group States
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');

  // Game States
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gameMode, setGameMode] = useState<'selection' | 'mode' | 'challenge'>('selection');

  const profilePosts = useMemo(() => {
    if (!viewingProfile) return [];
    return posts.filter(p => p.authorId === viewingProfile.uid);
  }, [posts, viewingProfile]);

  const algorithmicFeed = useMemo(() => {
    if (!currentUser || activeTab !== 'home') return posts;
    return [...posts].sort((a, b) => {
      const getScore = (p: Post) => {
        let s = 0;
        const now = Date.now();
        const age = (now - (p.createdAt?.toMillis ? p.createdAt.toMillis() : now)) / 3600000;
        s += Math.max(0, 100 - age);
        if (currentUser.following?.includes(p.authorId)) s += 200;
        s += (p.likes?.length || 0) * 5;
        return s;
      };
      return getScore(b) - getScore(a);
    });
  }, [posts, currentUser, activeTab]);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDocRef = doc(db, "users", fbUser.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          const userData = { id: fbUser.uid, uid: fbUser.uid, ...userDoc.data() } as User;
          setCurrentUser(userData);
          
          const nq = query(collection(db, "notifications"), where("toId", "==", fbUser.uid), orderBy("timestamp", "desc"), limit(20));
          const unsubscribeNotifs = onSnapshot(nq, (snap) => {
            setNotifications(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
          });

          const gq = query(collection(db, "groups"), orderBy("createdAt", "desc"), limit(20));
          const unsubscribeGroups = onSnapshot(gq, (snap) => {
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
          });

          return () => {
            unsubscribeNotifs();
            unsubscribeGroups();
          };
        } else if (fbUser.providerData.some(p => p.providerId === 'google.com')) {
          // Case for new Google users who haven't had their Firestore doc created yet
          const newUser = { 
            id: fbUser.uid, 
            uid: fbUser.uid, 
            name: fbUser.displayName || fbUser.email?.split('@')[0] || "New Neighbor", 
            avatar: fbUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${fbUser.uid}`, 
            following: [], pendingRequests: [], sentRequests: [],
            phoneNumber: fbUser.phoneNumber || '',
            location: 'Community',
            bio: 'Just joined the neighborhood!'
          };
          await setDoc(userDocRef, newUser);
          setCurrentUser(newUser as User);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const pq = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
    const unsubscribePosts = onSnapshot(pq, (snap) => setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Post))));
    
    const uq = query(collection(db, "users"), limit(50));
    const unsubscribeUsers = onSnapshot(uq, (snap) => setUsers(snap.docs.map(d => ({ id: d.id, uid: d.id, ...d.data() } as User))));

    return () => {
      unsubscribePosts();
      unsubscribeUsers();
    };
  }, [currentUser]);

  const handleRequestNeighbor = async (target: User) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", target.uid), { pendingRequests: arrayUnion(currentUser.uid) });
    await updateDoc(doc(db, "users", currentUser.uid), { sentRequests: arrayUnion(target.uid) });
    await addDoc(collection(db, "notifications"), {
      toId: target.uid,
      type: 'friend_request',
      fromId: currentUser.uid,
      fromName: currentUser.name,
      fromAvatar: currentUser.avatar,
      timestamp: serverTimestamp(),
      read: false
    });
  };

  const handleAcceptRequest = async (fromId: string) => {
    if (!currentUser) return;
    await updateDoc(doc(db, "users", currentUser.uid), { 
      pendingRequests: arrayRemove(fromId),
      following: arrayUnion(fromId)
    });
    await updateDoc(doc(db, "users", fromId), { 
      sentRequests: arrayRemove(currentUser.uid),
      following: arrayUnion(currentUser.uid)
    });
  };

  const handleEditProfile = async () => {
    if (!currentUser || !editName.trim()) return;
    await updateDoc(doc(db, "users", currentUser.uid), {
      name: editName,
      bio: editBio
    });
    setCurrentUser(prev => prev ? { ...prev, name: editName, bio: editBio } : null);
    setIsEditingProfile(false);
  };

  const handleCreateGroup = async () => {
    if (!currentUser || !groupName.trim()) return;
    await addDoc(collection(db, "groups"), {
      name: groupName,
      description: groupDesc,
      createdBy: currentUser.uid,
      members: [currentUser.uid],
      avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${groupName}`,
      createdAt: serverTimestamp()
    });
    setGroupName(''); setGroupDesc(''); setIsCreatingGroup(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLoginMode) await signInWithEmailAndPassword(auth, authEmail, authPassword);
      else {
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        const newUser = { 
          id: res.user.uid, 
          uid: res.user.uid, 
          name: authEmail.split('@')[0], 
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${res.user.uid}`, 
          following: [], pendingRequests: [], sentRequests: [],
          phoneNumber: '', location: 'Community', bio: '' 
        };
        await setDoc(doc(db, "users", res.user.uid), newUser);
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleGoogleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      alert("Trouble signing in with Google. Please try again.");
    }
  };

  const handlePostSubmit = async () => {
    if (!newPostContent.trim()) return;
    setIsUploading(true);
    await addDoc(collection(db, "posts"), {
      authorId: currentUser!.uid, authorName: currentUser!.name, authorAvatar: currentUser!.avatar, authorLocation: 'Community',
      content: newPostContent, image: newPostImage, createdAt: serverTimestamp(), likes: [], comments: []
    });
    setNewPostContent(''); setNewPostImage(null); setIsUploading(false);
  };

  if (loading) return <div className="h-screen bg-white flex items-center justify-center"><ICONS.Bot className="w-12 h-12 animate-pulse text-indigo-600" /></div>;

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 font-sans">
      <div className="bg-white w-full max-w-sm p-10 rounded-[40px] border border-slate-100 text-center shadow-xl animate-fade-in">
        <h1 className="text-4xl font-serif font-black text-indigo-900 mb-8">Seniority</h1>
        
        <form onSubmit={handleAuth} className="space-y-4 mb-6">
          <input type="email" placeholder="Email Address" value={authEmail} onChange={e=>setAuthEmail(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none transition-all" required />
          <input type="password" placeholder="Password" value={authPassword} onChange={e=>setAuthPassword(e.target.value)} className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-indigo-100 rounded-2xl outline-none transition-all" required />
          <button className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 active:scale-[0.98] transition-transform">
            {isLoginMode ? 'Sign In' : 'Join Our Neighborhood'}
          </button>
        </form>

        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-slate-100"></div>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">or</span>
          <div className="flex-1 h-px bg-slate-100"></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          className="w-full flex items-center justify-center gap-3 py-4 bg-white border-2 border-slate-100 rounded-2xl font-black text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all mb-8 shadow-sm"
        >
          <ICONS.Google className="w-5 h-5" />
          Continue with Google
        </button>
        
        <button onClick={()=>setIsLoginMode(!isLoginMode)} className="text-slate-400 font-bold text-xs tracking-wider uppercase">
          {isLoginMode ? 'New here? Register with Email' : 'Have an account? Sign In'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900 selection:bg-indigo-50">
      <header className="fixed top-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-b flex items-center justify-between px-6 z-[100]">
        <h1 className="text-2xl font-serif font-black text-indigo-900 tracking-tight cursor-pointer" onClick={()=>setActiveTab('home')}>Seniority</h1>
        <div className="flex items-center space-x-5">
          <button onClick={()=>setShowNotifications(!showNotifications)} className="relative p-2 text-slate-400 hover:text-indigo-600 transition-colors">
            <ICONS.Bell className="w-6 h-6" />
            {notifications.some(n=>!n.read) && <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-600 rounded-full border-2 border-white" />}
          </button>
          <img src={currentUser.avatar} onClick={()=>{setViewingProfile(currentUser); setActiveTab('profile')}} className="w-8 h-8 rounded-full cursor-pointer border-2 border-slate-100" />
        </div>
      </header>

      {showNotifications && (
        <div className="fixed top-16 right-4 w-72 bg-white rounded-3xl border shadow-2xl z-[110] p-6 animate-slide-up max-h-[400px] overflow-y-auto">
          <h3 className="text-[10px] font-black uppercase text-slate-300 mb-4 tracking-widest">Notification Center</h3>
          {notifications.length === 0 ? <p className="text-center py-8 text-slate-200 font-medium italic text-sm">Everything is current.</p> : notifications.map(n => (
            <div key={n.id} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
              <img src={n.fromAvatar} className="w-9 h-9 rounded-full" />
              <div className="flex-1 text-sm">
                <p className="leading-snug"><strong className="text-indigo-900">{n.fromName}</strong> {n.type === 'friend_request' ? 'sent a neighbor request' : 'liked your shared memory'}</p>
                {n.type === 'friend_request' && !currentUser.following?.includes(n.fromId) && (
                  <button onClick={()=>handleAcceptRequest(n.fromId)} className="mt-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-black shadow-sm">Welcome Neighbor</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="w-full max-w-xl mx-auto pt-20 px-4">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-fade-in">
            <div className="bg-slate-50/50 p-6 rounded-3xl border border-slate-100">
              <textarea placeholder="Share a piece of your world..." value={newPostContent} onChange={e=>setNewPostContent(e.target.value)} className="w-full bg-transparent p-2 text-xl outline-none min-h-[80px] font-medium resize-none placeholder-slate-300" />
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button onClick={handlePostSubmit} disabled={isUploading} className="px-8 py-2.5 bg-indigo-600 text-white rounded-full font-black text-sm shadow-lg shadow-indigo-100">{isUploading ? 'Sending...' : 'Post Memory'}</button>
              </div>
            </div>
            {algorithmicFeed.map(p => <PostCard key={p.id} post={p} userLanguage={'en'} currentUserId={currentUser.uid} onAvatarClick={()=>{setViewingProfile(users.find(u=>u.uid===p.authorId)||null); setActiveTab('profile')}} />)}
          </div>
        )}

        {activeTab === 'profile' && viewingProfile && (
          <div className="space-y-10 animate-fade-in">
            <div className="bg-white py-10 rounded-[40px] border border-slate-100 flex flex-col items-center text-center gap-6 shadow-sm">
              <div className="relative">
                <img src={viewingProfile.avatar} className="w-28 h-28 rounded-full border-4 border-white shadow-lg" />
                {viewingProfile.uid === currentUser.uid && (
                  <button onClick={()=>{setEditName(currentUser.name); setEditBio(currentUser.bio||''); setIsEditingProfile(true)}} className="absolute bottom-0 right-0 bg-white p-2 rounded-full shadow-md border text-indigo-600">
                    <ICONS.Edit className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div>
                <h1 className="text-4xl font-serif font-black text-indigo-950">{viewingProfile.name}</h1>
                <p className="text-slate-400 font-medium italic mt-2 px-10">{viewingProfile.bio || "A valued neighbor in our community."}</p>
              </div>
              <div className="flex gap-12 text-sm uppercase tracking-widest font-black text-slate-300">
                <div className="text-center"><p className="text-indigo-950 text-xl">{profilePosts.length}</p><p>Posts</p></div>
                <div className="text-center"><p className="text-indigo-950 text-xl">{viewingProfile.following?.length || 0}</p><p>Neighbors</p></div>
              </div>
              {viewingProfile.uid !== currentUser.uid && !currentUser.following?.includes(viewingProfile.uid) && (
                <button onClick={()=>handleRequestNeighbor(viewingProfile)} className={`px-12 py-3.5 rounded-full font-black text-white transition-all ${currentUser.sentRequests?.includes(viewingProfile.uid) ? 'bg-slate-200' : 'bg-indigo-600 shadow-xl shadow-indigo-100'}`}>
                  {currentUser.sentRequests?.includes(viewingProfile.uid) ? 'Invitation Sent' : 'Connect'}
                </button>
              )}
            </div>

            {isEditingProfile && (
              <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
                <div className="bg-white w-full max-w-sm p-8 rounded-[32px] shadow-2xl space-y-4">
                  <h2 className="text-2xl font-serif font-black text-indigo-950">Update Profile</h2>
                  <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Full Name" className="w-full p-4 bg-slate-50 border rounded-xl outline-none" />
                  <textarea value={editBio} onChange={e=>setEditBio(e.target.value)} placeholder="Tell us about yourself..." className="w-full p-4 bg-slate-50 border rounded-xl outline-none min-h-[100px] resize-none" />
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleEditProfile} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black">Save</button>
                    <button onClick={()=>setIsEditingProfile(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black">Cancel</button>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-1 rounded-3xl overflow-hidden border border-slate-50">
              {profilePosts.map(p => (
                <div key={p.id} className="aspect-square bg-slate-50 relative group cursor-pointer overflow-hidden">
                  {p.image ? <img src={p.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" /> : <div className="p-3 text-[10px] text-slate-300 font-medium">{p.content}</div>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-8 animate-fade-in">
            <div className="flex bg-slate-100 p-1 rounded-2xl">
              <button onClick={()=>setNeighborTab('all')} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${neighborTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>All Neighbors</button>
              <button onClick={()=>setNeighborTab('groups')} className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all ${neighborTab === 'groups' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Groups</button>
            </div>

            {neighborTab === 'all' ? (
              <div className="space-y-3">
                {users.filter(u=>u.uid!==currentUser.uid).map(u => (
                  <div key={u.uid} className="bg-white p-5 rounded-[24px] border border-slate-50 flex items-center justify-between shadow-sm hover:border-indigo-100 transition-all">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={()=>{setViewingProfile(u); setActiveTab('profile')}}>
                      <img src={u.avatar} className="w-14 h-14 rounded-full border shadow-sm" />
                      <div>
                        <p className="font-serif font-black text-indigo-950 text-lg leading-tight">{u.name}</p>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">{u.location || 'Neighbor'}</p>
                      </div>
                    </div>
                    {currentUser.following?.includes(u.uid) ? (
                      <span className="text-[10px] font-black text-slate-200 uppercase tracking-[.2em]">Connected</span>
                    ) : (
                      <button onClick={()=>handleRequestNeighbor(u)} className="p-3 text-indigo-600 bg-indigo-50/50 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all">
                        {currentUser.sentRequests?.includes(u.uid) ? 'Sent' : <ICONS.Plus className="w-5 h-5" />}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-serif font-black text-indigo-950">Community Groups</h2>
                  <button onClick={()=>setIsCreatingGroup(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-black shadow-lg shadow-indigo-100">
                    <ICONS.Plus className="w-4 h-4" /> Create New
                  </button>
                </div>

                {isCreatingGroup && (
                  <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 space-y-4 mb-8">
                    <input type="text" placeholder="Group Name (e.g. Garden Lovers)" value={groupName} onChange={e=>setGroupName(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl outline-none" />
                    <textarea placeholder="What is this group about?" value={groupDesc} onChange={e=>setGroupDesc(e.target.value)} className="w-full p-4 bg-slate-50 rounded-xl outline-none h-24 resize-none" />
                    <div className="flex gap-2">
                      <button onClick={handleCreateGroup} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black">Create Group</button>
                      <button onClick={()=>setIsCreatingGroup(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black">Cancel</button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4">
                  {groups.length === 0 ? <p className="text-center py-20 text-slate-300 italic">No groups found. Start one today!</p> : groups.map(g => (
                    <div key={g.id} className="bg-white p-6 rounded-[32px] border border-slate-100 flex items-center gap-5 shadow-sm">
                      <img src={g.avatar} className="w-16 h-16 rounded-2xl shadow-inner" />
                      <div className="flex-1">
                        <h3 className="font-serif font-black text-indigo-950 text-lg leading-tight">{g.name}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">{g.description}</p>
                        <p className="text-[10px] text-slate-300 font-bold uppercase mt-1 tracking-wider">{g.members.length} Members</p>
                      </div>
                      <button className="px-5 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black tracking-widest uppercase">Enter</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'games' && (
          <div className="space-y-8 animate-fade-in">
            {gameMode === 'selection' && (
              <>
                <h2 className="text-2xl font-serif font-black text-indigo-950 mb-2">Game Tables</h2>
                <div className="grid gap-6">
                  {GAMES.map(g => (
                    <div key={g.id} onClick={()=>{setSelectedGame(g); setGameMode('mode')}} className="bg-white p-8 rounded-[40px] border border-slate-100 flex items-center justify-between cursor-pointer hover:border-indigo-200 transition-all shadow-sm group">
                      <div className="flex items-center gap-6">
                        <span className="text-5xl group-hover:scale-110 transition-transform duration-500">{g.icon}</span>
                        <div>
                          <h3 className="font-serif font-black text-xl text-indigo-950">{g.name}</h3>
                          <p className="text-sm text-slate-400 font-medium">{g.descriptionKey}</p>
                        </div>
                      </div>
                      <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${g.difficulty === 'Easy' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                        {g.difficulty}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {gameMode === 'mode' && selectedGame && (
              <div className="text-center py-20 space-y-12">
                <div className="space-y-4">
                  <span className="text-8xl">{selectedGame.icon}</span>
                  <h2 className="text-4xl font-serif font-black text-indigo-950">{selectedGame.name}</h2>
                </div>
                <div className="flex flex-col gap-4 max-w-xs mx-auto">
                  <button onClick={()=>alert("Solo session started!")} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-xl shadow-xl shadow-indigo-100">Play Solo</button>
                  <button onClick={()=>setGameMode('challenge')} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-xl">Challenge Neighbor</button>
                  <button onClick={()=>setGameMode('selection')} className="text-slate-400 font-bold uppercase tracking-widest text-xs mt-4">Back to Tables</button>
                </div>
              </div>
            )}

            {gameMode === 'challenge' && selectedGame && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-serif font-black text-indigo-950">Challenge a Neighbor</h2>
                  <button onClick={()=>setGameMode('mode')} className="text-slate-400 text-sm font-bold">Back</button>
                </div>
                <div className="grid gap-3">
                  {users.filter(u => currentUser.following?.includes(u.uid)).length === 0 ? (
                    <p className="text-center py-20 text-slate-300 italic">Connect with neighbors first to challenge them!</p>
                  ) : users.filter(u => currentUser.following?.includes(u.uid)).map(u => (
                    <div key={u.uid} className="bg-white p-4 rounded-2xl border border-slate-50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img src={u.avatar} className="w-10 h-10 rounded-full" />
                        <p className="font-black text-indigo-900">{u.name}</p>
                      </div>
                      <button onClick={()=>alert(`Challenge sent to ${u.name}!`)} className="px-5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black">Invite</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 inset-x-0 h-16 bg-white/90 backdrop-blur-md border-t flex items-center justify-around z-[100] px-4">
        <NavBtn icon={<ICONS.Home />} active={activeTab === 'home'} onClick={()=>setActiveTab('home')} />
        <NavBtn icon={<ICONS.Users />} active={activeTab === 'friends'} onClick={()=>setActiveTab('friends')} />
        <NavBtn icon={<ICONS.Gamepad />} active={activeTab === 'games'} onClick={()=>{setActiveTab('games'); setGameMode('selection')}} />
        <NavBtn icon={<ICONS.ProfileIcon />} active={activeTab === 'profile'} onClick={()=>{setViewingProfile(currentUser); setActiveTab('profile')}} />
      </nav>

      <AIAssistant language={'en'} />
    </div>
  );
};

const NavBtn: React.FC<{ icon: any, active: boolean, onClick: ()=>void }> = ({ icon, active, onClick }) => (
  <button onClick={onClick} className={`p-3 rounded-2xl transition-all duration-300 ${active ? 'text-indigo-600 bg-indigo-50/50 scale-110' : 'text-slate-300 hover:text-slate-400'}`}>
    {React.cloneElement(icon, { className: "w-7 h-7" })}
  </button>
);

export default App;
