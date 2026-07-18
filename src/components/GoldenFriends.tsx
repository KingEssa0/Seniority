import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import { Smile, Hand, MapPin, Check, Plus, Users, Sparkles, Search, Heart, UserMinus, Bell } from 'lucide-react';
import { speakText } from '../utils';
import { UI_TRANSLATIONS } from '../translations';
import { subscribeToPushNotifications } from '../utils/pushNotifications';

interface GoldenFriendsProps {
  currentUser: any;
  textSize: 'normal' | 'large' | 'huge';
  isSidebar?: boolean;
  currentLang?: string;
  onViewAccount?: (userId: string) => void;
}

export default function GoldenFriends({
  currentUser,
  textSize,
  isSidebar = false,
  currentLang = 'en',
  onViewAccount,
}: GoldenFriendsProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendsList, setFriendsList] = useState<string[]>([]);
  const [waveTarget, setWaveTarget] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [registeringNotifications, setRegisteringNotifications] = useState(false);
  const [notificationStatusMsg, setNotificationStatusMsg] = useState<string | null>(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Search and Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'friends'>('all');

  // Check notification permission state on mount
  useEffect(() => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
    } else {
      const permission = Notification.permission;
      setNotificationPermission(permission);
      if (permission === 'default') {
        setShowNotificationModal(true);
      }
    }
  }, []);

  const handleEnableNotifications = async () => {
    if (!currentUser) return;
    setRegisteringNotifications(true);
    setNotificationStatusMsg(null);
    speakText("Requesting your approval to send notifications to your device.");
    
    const res = await subscribeToPushNotifications(currentUser.uid);
    setRegisteringNotifications(false);
    setShowNotificationModal(false);
    
    if (res.success) {
      setNotificationPermission('granted');
      setNotificationStatusMsg("Splendid! Push notifications are successfully configured.");
      speakText("Perfect! You will now receive a beautiful notification whenever someone waves or connects with you, even if the website is closed.");
    } else {
      setNotificationStatusMsg(`Could not activate notifications: ${res.error}`);
      speakText(`Notification setup could not be completed: ${res.error}`);
    }
  };

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

  // Listen to real-time users collection in Firestore and seed if empty
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), async (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        const uData = docSnap.data();
        // Do not list the current logged-in user themselves
        if (docSnap.id !== currentUser.uid) {
          list.push({ uid: docSnap.id, ...uData });
        }
      });

      // Seed a few beautiful senior profiles into Firestore if the database is empty or has only the user
      // This makes the directory fully functional, interactive, and alive out of the box!
      if (list.length === 0 && snapshot.size <= 1) {
        setLoading(true);
        const seedUsers = [
          {
            uid: 'seed_mabel',
            displayName: 'Mabel Jenkins',
            photoURL: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150',
            bio: 'Avid organic gardener & sourdough baker. Love hosting tea parties and talking about vintage postcards! 🌸',
            hobbies: ['Gardening', 'Baking', 'Tea Parties'],
            location: 'Oak Valley',
            friends: []
          },
          {
            uid: 'seed_arthur',
            displayName: 'Arthur Pendelton',
            photoURL: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=150',
            bio: 'Retired woodworker and chess enthusiast. Always up for a friendly chess match or sharing woodworking tips! ♟️',
            hobbies: ['Chess', 'Woodworking', 'History'],
            location: 'Sunny Town',
            friends: []
          },
          {
            uid: 'seed_clara',
            displayName: 'Clara Higgins',
            photoURL: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=150',
            bio: 'Quilting club leader & cozy mystery novel lover. Happy to share stitching patterns or book recommendations! 📚',
            hobbies: ['Quilting', 'Reading', 'Knitting'],
            location: 'Pine Hills',
            friends: []
          }
        ];

        try {
          for (const sUser of seedUsers) {
            await setDoc(doc(db, 'users', sUser.uid), sUser);
          }
        } catch (e) {
          console.error("Failed to seed initial users:", e);
        }
        setLoading(false);
      } else {
        setUsers(list);
        setLoading(false);
      }
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

      // Trigger Push Notification to recipient device if they have subscriptions
      if (!alreadyFriend) {
        const targetUser = users.find(u => u.uid === uid);
        if (targetUser && targetUser.pushSubscriptions && targetUser.pushSubscriptions.length > 0) {
          try {
            await fetch('/api/send-push', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                subscriptions: targetUser.pushSubscriptions,
                title: 'New Friend Connected! 🤝',
                body: `${currentUser.displayName || 'A neighbor'} added you as a friend on Seniority!`,
                url: '/'
              })
            });
          } catch (pushErr) {
            console.error("Failed to trigger push notification:", pushErr);
          }
        }
      }
    } catch (err) {
      console.error("Failed to update friends in Firestore:", err);
    }
  };

  const handleWave = async (uid: string, name: string) => {
    setWaveTarget(name);
    speakText(`Sending a warm waving hand hello to ${name}!`);
    setTimeout(() => {
      setWaveTarget(null);
    }, 4000);

    const targetUser = users.find(u => u.uid === uid);
    if (targetUser && targetUser.pushSubscriptions && targetUser.pushSubscriptions.length > 0) {
      try {
        await fetch('/api/send-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriptions: targetUser.pushSubscriptions,
            title: 'Warm Wave Hello! 👋',
            body: `${currentUser.displayName || 'A neighbor'} waved hello to you! Click to say hi back!`,
            url: '/'
          })
        });
      } catch (pushErr) {
        console.error("Failed to send wave push notification:", pushErr);
      }
    }
  };

  // Filter and search logic
  const filteredUsers = users.filter((senior) => {
    // 1. Filter mode (Only applied when not in sidebar, or if sidebar search is active)
    if (!isSidebar && filterMode === 'friends' && !friendsList.includes(senior.uid)) {
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

  const t = (key: string): string => {
    return UI_TRANSLATIONS[currentLang]?.[key] || UI_TRANSLATIONS['en']?.[key] || key;
  };

  // SIDEBAR COMPACT LAYOUT
  if (isSidebar) {
    return (
      <div className="bg-white rounded-3xl p-5 border-4 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col max-h-[500px]">
        {/* Compact Title Row */}
        <div className="flex items-center justify-between border-b-2 border-[#1A1A1A] pb-3.5 mb-3.5">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#FF6B6B]" />
            <h3 className={`${getTextSizeClass('text-sm')} font-black text-[#1A1A1A]`}>
              {t('friendlyNeighbors')}
            </h3>
            <span className="bg-[#4ECDC4] text-[#1A1A1A] border border-[#1A1A1A] px-1.5 py-0.2 rounded-full text-[9px] font-black">
              {users.length}
            </span>
          </div>
          <button
            onClick={() => speakText(`Friendly Neighbors Directory. Here you can see ${users.length} registered members, wave hello to them, or add them to your cozy friends.`)}
            className="text-[10px] font-black text-[#1A1A1A] bg-[#4ECDC4] border-2 border-[#1A1A1A] px-2 py-0.5 rounded-lg shadow-[1px_1px_0px_0px_#1A1A1A] cursor-pointer"
          >
            🔊
          </button>
        </div>

        {waveTarget && (
          <div className="mb-3 p-2 bg-[#FFD93D] border-2 border-[#1A1A1A] rounded-xl text-center text-[#1A1A1A] font-black text-[11px] animate-bounce">
            👋 {t('waveSent')} {waveTarget}! 😊
          </div>
        )}

        {/* Mini Search Bar */}
        <div className="relative mb-3.5">
          <Search className="w-4 h-4 text-[#1A1A1A] absolute left-2.5 top-2.5 stroke-[2.5]" />
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-2.5 py-1.5 bg-white border-2 border-[#1A1A1A] rounded-xl font-bold text-[11px] outline-none placeholder-gray-400 focus:bg-[#FDFBF7]"
          />
        </div>

        {/* Scrollable list */}
        <div className="overflow-y-auto pr-1 space-y-4 max-h-[300px]">
          {loading ? (
            <div className="py-6 text-center text-gray-500 font-bold text-xs">
              <div className="animate-spin inline-block w-5 h-5 border-2 border-t-[#FF6B6B] border-r-transparent rounded-full mb-1"></div>
              <p>Looking up neighbors...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <p className="text-[11px] font-bold text-[#7D7870] italic text-center py-4">{t('noNeighbors')}</p>
          ) : (
            filteredUsers.map((senior) => {
              const isFriend = friendsList.includes(senior.uid);
              return (
                <div
                  key={senior.uid}
                  className="p-3.5 bg-[#FDFBF7] border-2 border-[#1A1A1A] rounded-xl flex items-center justify-between gap-3 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#F3F1ED] transition-colors"
                >
                  <div
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => onViewAccount?.(senior.uid)}
                    title={`Click to view ${senior.displayName || 'Club Friend'}'s profile card`}
                  >
                    <img
                      src={senior.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt={senior.displayName}
                      className="w-10 h-10 rounded-full border-2 border-[#1A1A1A] object-cover flex-shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-black text-[#1A1A1A] text-xs truncate hover:underline">
                          {senior.displayName || 'Club Friend'}
                        </span>
                        {isFriend && <Heart className="w-3.5 h-3.5 text-[#FF6B6B] fill-[#FF6B6B] flex-shrink-0" />}
                      </div>
                      <span className="text-[9px] font-black text-gray-500 block truncate">
                        📍 {senior.location || 'Cozy Town'}
                      </span>
                    </div>
                  </div>

                  {/* Tiny Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleWave(senior.uid, senior.displayName)}
                      className="bg-[#FFD93D] hover:bg-[#ffe066] border-2 border-[#1A1A1A] text-[#1A1A1A] p-2 rounded-lg shadow-[1.5px_1.5px_0px_0px_#1A1A1A] active:translate-y-0.5 cursor-pointer"
                      title={`Wave hello to ${senior.displayName}`}
                    >
                      <Hand className="w-4 h-4 fill-[#1A1A1A]" />
                    </button>

                    <button
                      onClick={() => handleToggleFriend(senior.uid, senior.displayName)}
                      className={`p-2 rounded-lg border-2 border-[#1A1A1A] shadow-[1.5px_1.5px_0px_0px_#1A1A1A] active:translate-y-0.5 cursor-pointer ${
                        isFriend ? 'bg-[#4ECDC4] text-[#1A1A1A]' : 'bg-white text-[#1A1A1A]'
                      }`}
                      title={isFriend ? 'Connected Friend' : 'Add Friend'}
                    >
                      {isFriend ? (
                        <Check className="w-4 h-4 stroke-[3]" />
                      ) : (
                        <Plus className="w-4 h-4 stroke-[3]" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  // MAIN SPACIOUS DIRECTORY LAYOUT
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
              👥 {t('friendlyNeighbors')}
            </h3>
            <p className="text-xs text-[#7D7870] font-black uppercase tracking-wider mt-0.5">
              {t('neighborDirHelp')}
            </p>
          </div>
        </div>

        {/* Listen instructions */}
        <button
          onClick={() => speakText("This is the Club Friends Directory. You can search neighbors by name or hobbies, filter to only see your friends, and wave hello or add them permanently to your network!")}
          className="bg-[#4ECDC4] hover:bg-[#3db8af] text-[#1A1A1A] border-3 border-[#1A1A1A] px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer flex items-center gap-1.5"
        >
          {t('listenButton')}
        </button>
      </div>

      {waveTarget && (
        <div className="mb-6 p-4 bg-[#FFD93D] border-3 border-[#1A1A1A] rounded-2xl text-center text-[#1A1A1A] font-black text-sm shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-bounce">
          👋 {t('waveSent')} {waveTarget}! 😊
        </div>
      )}

      {/* Push Notification Helper Banner */}
      {notificationPermission !== 'granted' && notificationPermission !== 'unsupported' && (
        <div className="mb-6 p-4 bg-[#F0FDF4] border-3 border-[#1A1A1A] rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex items-start gap-3 flex-1">
            <div className="w-10 h-10 bg-[#4ECDC4] rounded-xl flex items-center justify-center border-2 border-[#1A1A1A] shrink-0 shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]">
              <Bell className="w-5 h-5 text-[#1A1A1A]" />
            </div>
            <div>
              <h4 className="font-black text-[#1A1A1A] text-sm flex items-center gap-1.5">
                🔔 Get Phone & Computer Alerts!
              </h4>
              <p className="text-xs text-[#5D5850] font-bold mt-0.5 leading-relaxed">
                Receive instant notifications when friendly neighbors wave at you or connect with you — even if your web browser is closed! Perfect for staying in touch.
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowNotificationModal(true)}
            disabled={registeringNotifications}
            className="w-full md:w-auto bg-[#FFD93D] hover:bg-[#ffe066] disabled:bg-gray-200 text-[#1A1A1A] border-3 border-[#1A1A1A] px-4 py-2.5 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer whitespace-nowrap active:translate-y-0.5"
          >
            {registeringNotifications ? '⏳ Enabling...' : '🔔 Enable Notifications'}
          </button>
        </div>
      )}

      {notificationStatusMsg && (
        <div className="mb-6 p-4 bg-[#EFF6FF] border-3 border-[#1A1A1A] rounded-2xl flex items-center gap-2.5 text-xs text-[#1A1A1A] font-black shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
          <span>📢</span>
          <span className="flex-1">{notificationStatusMsg}</span>
          <button 
            onClick={() => setNotificationStatusMsg(null)}
            className="ml-auto text-gray-500 hover:text-black font-black cursor-pointer px-1.5"
          >
            ✕
          </button>
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
            🌍 {t('allTopics')} ({users.length})
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
            ❤️ {t('friendlyNeighbors')} ({friendsList.length})
          </button>
        </div>

        {/* Search Input Bar */}
        <div className="md:col-span-7 relative">
          <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#1A1A1A] stroke-[3]" />
          </div>
          <input
            type="text"
            placeholder={t('searchPlaceholder')}
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
                {t('noNeighbors')}
              </h4>
              <p className="text-xs font-bold text-[#7D7870] mt-1.5 leading-relaxed max-w-md mx-auto">
                {filterMode === 'friends' 
                  ? "Toggle back to see all neighbors and click add next to anyone's card!" 
                  : "Try looking for another name or hobby!"}
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
                  <div 
                    className="flex gap-4.5 items-start sm:items-center flex-1 cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => onViewAccount?.(senior.uid)}
                    title={`Click to view ${senior.displayName || 'Club Friend'}'s full profile card`}
                  >
                    <img
                      src={senior.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                      alt={senior.displayName}
                      className="w-16 h-16 rounded-full border-3 border-[#1A1A1A] object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-black text-[#1A1A1A] text-base truncate hover:underline">
                          {senior.displayName || 'Club Friend'}
                        </h4>
                        {isFriend && (
                          <span className="text-[10px] bg-[#FF6B6B] text-white px-2 py-0.5 rounded-full border-2 border-[#1A1A1A] font-black uppercase">
                            ❤️ Connected
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
                  <div className="flex gap-2 w-full sm:w-auto justify-end border-t-2 sm:border-t-0 pt-3 sm:pt-0 border-[#1A1A1A] flex-wrap sm:flex-nowrap">
                    {/* View Profile button */}
                    <button
                      onClick={() => onViewAccount?.(senior.uid)}
                      className="bg-white hover:bg-gray-50 border-3 border-[#1A1A1A] text-[#1A1A1A] font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                      id={`btn-view-profile-${senior.uid}`}
                    >
                      <span>👤 Profile</span>
                    </button>

                    {/* Wave button */}
                    <button
                      onClick={() => handleWave(senior.uid, senior.displayName)}
                      className="bg-[#FFD93D] hover:bg-[#ffe066] border-3 border-[#1A1A1A] text-[#1A1A1A] font-black px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 cursor-pointer transition-all hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"
                      id={`btn-wave-${senior.uid}`}
                    >
                      <Hand className="w-4 h-4 text-[#1A1A1A] fill-[#1A1A1A]" />
                      <span>👋 Wave</span>
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
                          <span>✓ Friend</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[3]" />
                          <span>+ Friend</span>
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

      {/* Modern, friendly Custom Modal Popup for Notification Permission */}
      {showNotificationModal && (
        <div className="fixed inset-0 bg-[#1A1A1A]/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" id="notification-prompt-modal">
          <div 
            className="bg-[#FDFBF7] border-4 border-[#1A1A1A] rounded-3xl p-6 max-w-md w-full shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] transition-all transform scale-100"
            role="dialog"
            aria-modal="true"
          >
            <div className="text-center">
              <div className="w-16 h-16 bg-[#FFD93D] rounded-2xl mx-auto flex items-center justify-center border-3 border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] mb-4">
                <Bell className="w-8 h-8 text-[#1A1A1A] stroke-[2.5]" />
              </div>
              
              <h3 className="text-2xl font-black text-[#1A1A1A] mb-2">
                Allow notifications? 🔔
              </h3>
              
              <p className="text-sm font-bold text-[#5D5850] mb-6 leading-relaxed">
                Arey, friendly neighbor! We want to notify you instantly when sweet neighbors wave at you or connect with you — even when your browser is closed! Very beautiful to stay in touch, na? Please allow!
              </p>
              
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleEnableNotifications}
                  disabled={registeringNotifications}
                  className="w-full bg-[#4ECDC4] hover:bg-[#3db8af] disabled:bg-gray-300 text-[#1A1A1A] border-3 border-[#1A1A1A] py-3 rounded-2xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] active:translate-y-0.5 transition-all cursor-pointer"
                  id="btn-allow-notifications-confirm"
                >
                  {registeringNotifications ? "⏳ Activating..." : "Yes, Allow! 👍"}
                </button>
                
                <button
                  onClick={() => {
                    setShowNotificationModal(false);
                    speakText("No problem, friend! You can always activate notifications later using the banner.");
                  }}
                  disabled={registeringNotifications}
                  className="w-full bg-[#FF6B6B] hover:bg-[#ff5252] disabled:opacity-50 text-white border-3 border-[#1A1A1A] py-3 rounded-2xl font-black text-sm shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] active:translate-y-0.5 transition-all cursor-pointer"
                  id="btn-allow-notifications-cancel"
                >
                  Maybe Later ❌
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

