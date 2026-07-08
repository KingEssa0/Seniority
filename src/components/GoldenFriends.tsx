import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Smile, Hand, MapPin, Check, Plus, Users, Sparkles } from 'lucide-react';

interface GoldenFriendsProps {
  currentUser: any;
  textSize: 'normal' | 'large' | 'huge';
}

export default function GoldenFriends({ currentUser, textSize }: GoldenFriendsProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [waveTarget, setWaveTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to real-time users collection in Firestore
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

  const handleToggleFriend = (uid: string) => {
    if (friendsList.includes(uid)) {
      setFriendsList(friendsList.filter(id => id !== uid));
    } else {
      setFriendsList([...friendsList, uid]);
    }
  };

  const handleWave = (name: string) => {
    setWaveTarget(name);
    setTimeout(() => {
      setWaveTarget(null);
    }, 3000);
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-3xl">👥</span>
        <div>
          <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
            Club Friends Directory
          </h3>
          <p className="text-xs text-[#7D7870] font-bold uppercase tracking-wider">
            Connect with other friendly registered members
          </p>
        </div>
      </div>

      {waveTarget && (
        <div className="mb-6 p-4 bg-[#FFD93D] border-3 border-[#1A1A1A] rounded-2xl text-center text-[#1A1A1A] font-black text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-bounce">
          👋 You sent a warm wave hello to {waveTarget}! They are smiling! 😊
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-500 font-bold text-sm">
          <div className="animate-spin inline-block w-6 h-6 border-3 border-t-[#FF6B6B] border-r-transparent rounded-full mb-2"></div>
          <p>Looking up our friendly neighbors...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {users.length === 0 ? (
            <div className="p-6 bg-[#FDFBF7] border-3 border-dashed border-[#1A1A1A] rounded-2xl text-center">
              <span className="text-4xl">🌟</span>
              <h4 className="font-black text-base text-[#1A1A1A] mt-3">You are the first member!</h4>
              <p className="text-xs font-bold text-[#7D7870] mt-1.5 leading-relaxed">
                Welcome as a founding friend of the Seniority Social Club! As other wonderful neighbors sign up manually, they will appear right here in this cozy directory.
              </p>
            </div>
          ) : (
            users.map((senior) => {
              const isFriend = friendsList.includes(senior.uid);
              return (
                <div
                  key={senior.uid}
                  className="p-4 bg-[#FDFBF7] hover:bg-[#F3F1ED] border-3 border-[#1A1A1A] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                >
                  <div className="flex gap-3 items-start sm:items-center">
                    <img
                      src={senior.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt={senior.displayName}
                      className="w-14 h-14 rounded-full border-3 border-[#1A1A1A] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-[#1A1A1A] text-base">
                          {senior.displayName || 'Club Friend'}
                        </h4>
                        {senior.location && (
                          <span className="text-xs font-black text-[#1A1A1A] bg-[#4ECDC4] px-2.5 py-0.5 rounded-full flex items-center gap-0.5 border-2 border-[#1A1A1A]">
                            <MapPin className="w-3 h-3" />
                            {senior.location}
                          </span>
                        )}
                      </div>

                      <p className={`text-[#1A1A1A] font-semibold leading-normal mt-0.5 ${getTextSizeClass('text-xs')}`}>
                        {senior.bio}
                      </p>

                      {/* Shared interests */}
                      {senior.hobbies && senior.hobbies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {senior.hobbies.map((hobby: string) => (
                            <span
                              key={hobby}
                              className="bg-[#FFD93D]/30 border border-[#1A1A1A] text-[#1A1A1A] font-black text-[10px] px-2 py-0.5 rounded-md"
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
                      className="bg-[#FFD93D] hover:bg-[#ffe066] border-3 border-[#1A1A1A] text-[#1A1A1A] font-black px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1 cursor-pointer transition-all hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                      id={`btn-wave-${senior.uid}`}
                    >
                      <Hand className="w-4 h-4 text-[#1A1A1A] fill-[#1A1A1A]" />
                      <span>Wave Hello 👋</span>
                    </button>

                    {/* Add Friend button */}
                    <button
                      onClick={() => handleToggleFriend(senior.uid)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-3 border-[#1A1A1A] transition-all cursor-pointer flex items-center gap-1 hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] ${
                        isFriend
                          ? 'bg-[#4ECDC4] text-[#1A1A1A]'
                          : 'bg-white text-[#1A1A1A]'
                      }`}
                      id={`btn-add-friend-${senior.uid}`}
                    >
                      {isFriend ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span>Friend✓</span>
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
