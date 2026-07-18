import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Smile, Hand, MapPin, Check, Plus, Users, Sparkles, Search, Heart, UserMinus } from 'lucide-react';
import { speakText } from '../utils';

interface GoldenFriendsProps {
  currentUser: any;
  textSize: 'normal' | 'large' | 'huge';
}

export default function GoldenFriends({ currentUser, textSize }: GoldenFriendsProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [waveTarget, setWaveTarget] = useState<string | null>(null);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'friends'>('all');

  // Real-time listener for current user's friends list
  useEffect(() => {
    if (!currentUser) return;

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setFriendsList(data.friends || []);
      }
    }, (error) => {
      console.error("Failed to sync user friends list from Firestore:", error);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Listen to real-time users collection in Firestore
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const uData = docSnap.data();
        // Do not list the current logged-in user themselves
        if (docSnap.id !== currentUser.uid) {
          list.push({ uid: docSnap.id, ...uData });
        }
      });
      setUsers(list);
      setLoading(false);
    }, (error) => {
      console.error("Failed to fetch club users:", error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'users');
      } catch (e) {
        console.error("Handled users directory list error:", e);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const getTextSizeClass = (baseSize: string) => {
    if (textSize === 'large') {
      if (baseSize === 'text-xs') return 'text-sm';
      if (baseSize === 'text-sm') return 'text-base';
      if (baseSize === 'text-base') return 'text-lg';
    }
    if (textSize === 'huge') {
      if (baseSize === 'text-xs') return 'text-base';
      if (baseSize === 'text-sm') return 'text-lg';
      if (baseSize === 'text-base') return 'text-xl';
    }
    return baseSize;
  };

  const handleToggleFriend = async (uid: string, name: string) => {
    if (!currentUser) return;

    const alreadyFriend = friendsList.includes(uid);
    let updatedFriends: string[] = [];

    if (alreadyFriend) {
      updatedFriends = friendsList.filter(id => id !== uid);
      speakText(`Removed ${name} from your cozy friends list.`);
    } else {
      updatedFriends = [...friendsList, uid];
      speakText(`Splendid! Added ${name} as a cozy friend! You are now connected.`);
    }

    // Optimistically update state
    setFriendsList(updatedFriends);

    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        friends: updatedFriends
      }, { merge: true });
    } catch (err) {
      console.error("Failed to update friends in Firestore:", err);
    }
  };

  const handleWave = (name: string) => {
    setWaveTarget(name);
    speakText(`Sending a warm waving hand hello to ${name}!`);
    setTimeout(() => {
      setWaveTarget(null);
    }, 4000);
  };

  // Filter and search logic
  const filteredUsers = users.filter((senior) => {
    // 1. Filter mode
    if (filterMode === 'friends' && !friendsList.includes(senior.uid)) {
      return false;
    }

    // 2. Search term
    if (searchTerm.trim() !== '') {
      const queryText = searchTerm.toLowerCase();
      const nameMatch = (senior.displayName || '').toLowerCase().includes(queryText);
      const locMatch = (senior.location || '').toLowerCase().includes(queryText);
      const hobbyMatch = (senior.hobbies || []).some((h: string) => h.toLowerCase().includes(queryText));
      return nameMatch || locMatch || hobbyMatch;
    }

    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] h-full">
      {/* Title block */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-[#1A1A1A] pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FF6B6B] rounded-2xl flex items-center justify-center border-3 border-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
            <Users className="w-7 h-7 text-white stroke-[2.5]" />
          </div>
          <div>
            <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
              👥 Club Friends Directory
            </h3>
            <p className="text-xs text-[#7D7870] font-black uppercase tracking-wider mt-0.5">
              Connect & chat with other friendly registered members
            </p>
          </div>
        </div>

        {/* Listen instructions */}
        <button
          onClick={() => speakText("This is the Club Friends Directory. You can search neighbors by name or hobbies, filter to only see your friends, and wave hello or add them permanently to your network!")}
          className="bg-[#4ECDC4] hover:bg-[#3db8af] text-[#1A1A1A] border-3 border-[#1A1A1A] px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer flex items-center gap-1.5"
        >
          Listen 🔊
        </button>
      </div>

      {waveTarget && (
        <div className="mb-6 p-4 bg-[#FFD93D] border-3 border-[#1A1A1A] rounded-2xl text-center text-[#1A1A1A] font-black text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-bounce">
          👋 You sent a warm wave hello to {waveTarget}! They are smiling! 😊
        </div>
      )}

      {/* Persistent Filters & Live Search */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Toggle Mode Button Group */}
        <div className="md:col-span-5 flex gap-2">
          <button
            onClick={() => {
              setFilterMode('all');
              speakText("Showing all registered neighbors.");
            }}
            className={`flex-1 px-4 py-3 rounded-xl border-3 font-black text-xs transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
              filterMode === 'all'
                ? 'bg-[#FFD93D] text-[#1A1A1A] border-[#1A1A1A]'
                : 'bg-white text-gray-700 border-[#1A1A1A] hover:bg-gray-50'
            }`}
          >
            🌍 All Club Neighbors ({users.length})
          </button>
          <button
            onClick={() => {
              setFilterMode('friends');
              speakText(`Showing your cozy friends. You have ${friendsList.length} connected friends.`);
            }}
            className={`flex-1 px-4 py-3 rounded-xl border-3 font-black text-xs transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
              filterMode === 'friends'
                ? 'bg-[#FF6B6B] text-white border-[#1A1A1A]'
                : 'bg-white text-gray-700 border-[#1A1A1A] hover:bg-gray-50'
            }`}
          >
            ❤️ My Cozy Friends ({friendsList.length})
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="md:col-span-7 relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#1A1A1A] stroke-[3]" />
          </div>
          <input
            type="text"
            placeholder="Search friends by name, hobbies (e.g. Gardening) or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold text-xs outline-none focus:bg-[#FDFBF7] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] placeholder-gray-400"
          />
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-center text-gray-500 font-bold text-sm">
          <div className="animate-spin inline-block w-8 h-8 border-4 border-t-[#FF6B6B] border-r-transparent rounded-full mb-3"></div>
          <p>Looking up our friendly neighbors...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredUsers.length === 0 ? (
            <div className="p-8 bg-[#FDFBF7] border-3 border-dashed border-[#1A1A1A] rounded-2xl text-center">
              <span className="text-4xl">🌟</span>
              <h4 className="font-black text-base text-[#1A1A1A] mt-3">
                {filterMode === 'friends' ? "No connected friends yet!" : "No neighbors found!"}
              </h4>
              <p className="text-xs font-bold text-[#7D7870] mt-1.5 leading-relaxed max-w-md mx-auto">
                {filterMode === 'friends' 
                  ? "Toggle back to 'All Club Neighbors' and click 'Add Friend' next to anyone's profile card to start your cozy circle!" 
                  : "We couldn't find anyone matching your search query. Try typing something else like 'Gardening' or 'Baking'!"}
              </p>
            </div>
          ) : (
            filteredUsers.map((senior) => {
              const isFriend = friendsList.includes(senior.uid);
              return (
                <div
                  key={senior.uid}
                  className="p-4 bg-[#FDFBF7] hover:bg-[#F3F1ED] border-3 border-[#1A1A1A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5"
                >
                  <div className="flex gap-4.5 items-start sm:items-center flex-1">
                    <img
                      src={senior.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt={senior.displayName}
                      className="w-16 h-16 rounded-full border-3 border-[#1A1A1A] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-[#1A1A1A] text-base truncate">
                          {senior.displayName || 'Club Friend'}
                        </h4>
                        {isFriend && (
                          <span className="text-[10px] bg-[#FF6B6B] text-white px-2 py-0.5 rounded-full border-2 border-[#1A1A1A] font-black uppercase">
                            Cozy Friend ❤️
                          </span>
                        )}
                        {senior.location && (
                          <span className="text-xs font-black text-[#1A1A1A] bg-[#4ECDC4] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 border-2 border-[#1A1A1A]">
                            <MapPin className="w-3 h-3" />
                            {senior.location}
                          </span>
                        )}
                      </div>

                      <p className={`text-[#1A1A1A] font-semibold leading-normal mt-1 max-w-xl ${getTextSizeClass('text-xs')}`}>
                        {senior.bio}
                      </p>

                      {/* Shared interests */}
                      {senior.hobbies && senior.hobbies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2.5">
                          {senior.hobbies.map((hobby: string) => (
                            <span
                              key={hobby}
                              className="bg-[#FFD93D]/30 border border-[#1A1A1A] text-[#1A1A1A] font-black text-[10px] px-2.5 py-0.5 rounded-md"
                            >
                              {hobby}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex gap-2 w-full sm:w-auto justify-end border-t-2 sm:border-t-0 pt-3 sm:pt-0 border-[#1A1A1A]">
                    {/* Wave button */}
                    <button
                      onClick={() => handleWave(senior.displayName)}
                      className="bg-[#FFD93D] hover:bg-[#ffe066] border-3 border-[#1A1A1A] text-[#1A1A1A] font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                      id={`btn-wave-${senior.uid}`}
                    >
                      <Hand className="w-4 h-4 text-[#1A1A1A] fill-[#1A1A1A]" />
                      <span>Wave Hello</span>
                    </button>

                    {/* Add/Remove Friend button */}
                    <button
                      onClick={() => handleToggleFriend(senior.uid, senior.displayName)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black border-3 border-[#1A1A1A] transition-all cursor-pointer flex items-center gap-1.5 hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
                        isFriend
                          ? 'bg-[#4ECDC4] text-[#1A1A1A] hover:bg-[#3db8af]'
                          : 'bg-white text-[#1A1A1A] hover:bg-gray-50'
                      }`}
                      id={`btn-add-friend-${senior.uid}`}
                    >
                      {isFriend ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Cozy Friend✓</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>Add Friend</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
