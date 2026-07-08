import React, { useState } from 'react';
import { LogOut, User, MapPin, Sparkles, Heart, Smile, Check, ShieldAlert } from 'lucide-react';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

interface HeaderProps {
  user: any;
  isDemo: boolean;
  onLogout: () => void;
  textSize: 'normal' | 'large' | 'huge';
  quote: string;
}

export default function Header({ user, isDemo, onLogout, textSize, quote }: HeaderProps) {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || '');
  const [bio, setBio] = useState(user.bio || '');
  const [location, setLocation] = useState(user.location || '');
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>(user.hobbies || []);
  const [saving, setSaving] = useState(false);

  const availableHobbies = [
    "Gardening", "Baking", "Knitting", "Reading", "History", 
    "Woodworking", "Walking", "Classical Music", "Cards", 
    "Painting", "Travel", "Dogs & Pets"
  ];

  const getTextSizeClass = (baseSize: string) => {
    if (textSize === 'large') {
      if (baseSize === 'text-xs') return 'text-sm';
      if (baseSize === 'text-sm') return 'text-base';
      if (baseSize === 'text-base') return 'text-lg';
      if (baseSize === 'text-lg') return 'text-xl';
    }
    if (textSize === 'huge') {
      if (baseSize === 'text-xs') return 'text-base';
      if (baseSize === 'text-sm') return 'text-lg';
      if (baseSize === 'text-base') return 'text-xl';
      if (baseSize === 'text-lg') return 'text-2xl';
    }
    return baseSize;
  };

  const handleToggleHobby = (hobby: string) => {
    if (selectedHobbies.includes(hobby)) {
      setSelectedHobbies(selectedHobbies.filter(h => h !== hobby));
    } else {
      setSelectedHobbies([...selectedHobbies, hobby]);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // For both Demo & Real users, let's update their local profiles.
      // If it's a real user, we'll write to Firestore 'users' collection too.
      if (!isDemo) {
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          displayName,
          bio,
          location,
          hobbies: selectedHobbies,
          photoURL: user.photoURL,
          email: user.email,
          updatedAt: new Date()
        }, { merge: true });
      }

      // Update the session user values
      user.displayName = displayName;
      user.bio = bio;
      user.location = location;
      user.hobbies = selectedHobbies;

      setShowProfileModal(false);
    } catch (err) {
      console.error("Error saving profile:", err);
      alert("Could not update profile. Try again shortly!");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <header className="bg-white border-b-4 border-[#1A1A1A] py-4 px-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left branding with an eye-catching, handcrafted Seniority Golden Sun & Blossom Logo */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#FFD93D] rounded-2xl flex items-center justify-center border-3 border-[#1A1A1A] shadow-[2.5px_2.5px_0px_0px_rgba(26,26,26,1)] hover:rotate-6 transition-transform duration-300 relative select-none">
              <span className="text-2xl">🌸</span>
              <span className="absolute -top-1.5 -right-1.5 text-xs animate-pulse">☀️</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-[#1A1A1A] tracking-tighter flex items-center gap-2">
                    <span>SENIORITY</span>
                    <span className="text-xl sm:text-2xl">🏡</span>
                  </h1>
                </div>
                <span className="bg-[#4ECDC4] text-[#1A1A1A] border-2 border-[#1A1A1A] text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider shadow-[1.5px_1.5px_0px_0px_rgba(26,26,26,1)]">
                  Social Club
                </span>
              </div>
              <p className="text-[10px] text-[#7D7870] font-black tracking-widest uppercase mt-0.5">
                Connecting Our Golden Generation
              </p>
            </div>
          </div>

          {/* Inspirational quotes strip */}
          <div className="hidden lg:block max-w-md bg-white border-3 border-[#1A1A1A] px-4 py-2.5 rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] rotate-[-0.5deg]">
            <p className="text-xs italic text-[#4A4741] font-black leading-relaxed">
              "{quote}"
            </p>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3.5 flex-wrap justify-center">
            {/* User Profile Summary */}
            <button
              onClick={() => setShowProfileModal(true)}
              className="flex items-center gap-2.5 bg-[#FDFBF7] hover:bg-[#F3F1ED] border-3 border-[#1A1A1A] px-3.5 py-1.5 rounded-2xl transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] group hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]"
              id="btn-edit-profile"
            >
              <img
                src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
                alt={user.displayName}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#1A1A1A] group-hover:scale-105 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="text-left hidden sm:block">
                <div className="text-sm font-black text-[#1A1A1A] truncate max-w-[120px]">
                  {user.displayName || 'Club Friend'}
                </div>
                {user.location && (
                  <div className="text-[10px] text-[#7D7870] font-bold flex items-center gap-0.5">
                    <MapPin className="w-3 h-3 text-[#FF6B6B]" />
                    <span>{user.location.split(',')[0]}</span>
                  </div>
                )}
              </div>
            </button>

            {/* Logout button */}
            <button
              onClick={onLogout}
              className="flex items-center gap-2 bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-black px-4 py-2 rounded-2xl border-3 border-[#1A1A1A] transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-sm hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]"
              id="btn-logout"
            >
              <LogOut className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Edit Profile Modal Dialog */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)] border-4 border-[#1A1A1A] animate-scaleIn">
            <div className="flex items-center justify-between border-b-4 border-[#1A1A1A] pb-4 mb-4">
              <div className="flex items-center gap-2.5 text-[#1A1A1A]">
                <User className="w-7 h-7 text-[#FF6B6B]" />
                <h3 className="text-xl sm:text-2xl font-black">My Club Profile Card</h3>
              </div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-[#1A1A1A] hover:bg-[#F3F1ED] font-black text-xl w-10 h-10 flex items-center justify-center rounded-xl border-2 border-transparent hover:border-[#1A1A1A] transition-all"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Image View */}
              <div className="flex items-center gap-4 p-3 bg-[#FDFBF7] rounded-2xl border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
                <img
                  src={user.photoURL}
                  alt={user.displayName}
                  className="w-16 h-16 rounded-full border-3 border-[#1A1A1A] object-cover"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h4 className="font-black text-base text-[#1A1A1A]">My Photo</h4>
                  <p className="text-xs font-bold text-[#7D7870]">Your beautiful and secure club profile photo.</p>
                </div>
              </div>

              {/* Name field */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-1">My Full Name:</label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full p-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Location field */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-1">Where I Live (Town/State):</label>
                <input
                  type="text"
                  placeholder="e.g., Seattle, WA"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full p-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none focus:border-[#4ECDC4]"
                />
              </div>

              {/* Bio field */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-1">My Greetings / About Me:</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell your club friends a bit about yourself! What makes you smile?"
                  className="w-full min-h-[100px] p-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none focus:border-[#4ECDC4] resize-none"
                />
              </div>

              {/* Hobbies Checklist */}
              <div>
                <label className="block text-sm font-black text-[#1A1A1A] mb-2">My Favorite Activities (Select to share with friends):</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {availableHobbies.map((hobby) => {
                    const isSelected = selectedHobbies.includes(hobby);
                    return (
                      <button
                        key={hobby}
                        type="button"
                        onClick={() => handleToggleHobby(hobby)}
                        className={`flex items-center justify-between p-2.5 rounded-xl border-3 text-left text-xs font-black transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#4ECDC4] border-[#1A1A1A] text-[#1A1A1A] shadow-[2px_2px_0px_0px_#1A1A1A]'
                            : 'bg-white border-[#EAE6DF] text-[#7D7870] hover:border-[#1A1A1A]'
                        }`}
                      >
                        <span>{hobby}</span>
                        {isSelected && <Check className="w-4 h-4 text-[#1A1A1A] stroke-[3]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3.5 justify-end pt-4 border-t-3 border-[#1A1A1A] mt-6">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-5 py-2.5 rounded-xl font-black bg-[#F3F1ED] hover:bg-slate-200 text-[#1A1A1A] border-3 border-[#1A1A1A] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl font-black bg-[#FF6B6B] hover:bg-[#ff5252] text-white border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] cursor-pointer"
                  id="btn-save-profile-submit"
                >
                  {saving ? 'Saving...' : 'Save Profile ✓'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
