import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { CURATED_IMAGES } from '../utils';
import { Mic, MicOff, Image, Send, HelpCircle, AlertCircle, Smile } from 'lucide-react';

interface CreatePostFormProps {
  user: any;
  textSize: 'normal' | 'large' | 'huge';
  onPostCreated: () => void;
}

export default function CreatePostForm({ user, textSize, onPostCreated }: CreatePostFormProps) {
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('General');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [customImageUrl, setCustomImageUrl] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const recognitionRef = useRef<any>(null);

  // Dynamic text size class builders
  const getTextSizeClass = (baseSize: string) => {
    if (textSize === 'large') {
      if (baseSize === 'text-sm') return 'text-base';
      if (baseSize === 'text-base') return 'text-lg';
      if (baseSize === 'text-lg') return 'text-xl';
      if (baseSize === 'text-xl') return 'text-2xl';
      if (baseSize === 'text-2xl') return 'text-3xl';
    }
    if (textSize === 'huge') {
      if (baseSize === 'text-sm') return 'text-lg';
      if (baseSize === 'text-base') return 'text-xl';
      if (baseSize === 'text-lg') return 'text-2xl';
      if (baseSize === 'text-xl') return 'text-3xl';
      if (baseSize === 'text-2xl') return 'text-4xl';
    }
    return baseSize;
  };

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';

      rec.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }

        if (finalTranscript) {
          setContent((prev) => prev + (prev ? ' ' : '') + finalTranscript);
        }
      };

      rec.onerror = (event: any) => {
        console.error('Speech recognition error', event);
        setSpeechError('Could not recognize voice. Please make sure microphone is connected and allowed.');
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setSpeechError('Voice typing is not supported on this browser. Try Google Chrome!');
      return;
    }

    setSpeechError(null);
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const imageUrlToSave = customImageUrl.trim() || selectedImage || null;

      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        userName: user.displayName || 'Anonymous Club Member',
        userPhoto: user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        content: content.trim(),
        category,
        imageUrl: imageUrlToSave,
        reactions: {
          smile: [],
          love: [],
          support: [],
          inspiring: []
        },
        commentsCount: 0,
        createdAt: serverTimestamp(),
      });

      setContent('');
      setSelectedImage(null);
      setCustomImageUrl('');
      setShowImagePicker(false);
      onPostCreated();
    } catch (err) {
      console.error('Error creating post: ', err);
      alert('Could not publish your post. Please check your internet connection.');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: 'General', label: '🌸 General / Chat' },
    { value: 'Memories', label: '📸 Memory Lane' },
    { value: 'Gardening', label: '🏡 Gardening & Plants' },
    { value: 'Cooking', label: '🍳 Cooking & Recipes' },
    { value: 'Crafts', label: '🎨 Crafts & Knitting' },
    { value: 'Pets', label: '🐶 Pet Lovers' },
    { value: 'Help', label: '❓ Seeking Advice' },
  ];

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] mb-8">
      <form onSubmit={handleCreatePost}>
        {/* Header Greeting */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={user.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150'}
            alt={user.displayName}
            className="w-12 h-12 rounded-full border-3 border-[#1A1A1A] object-cover"
            referrerPolicy="no-referrer"
          />
          <div>
            <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
              What's on your mind today, {user.displayName?.split(' ')[0]}?
            </h3>
            <p className="text-sm text-[#7D7870] font-bold">Share your stories, wisdom, or photos!</p>
          </div>
        </div>

        {/* Text Area */}
        <div className="relative mb-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your message here, or click the big 'Speak' button to talk to the screen..."
            className={`w-full min-h-[140px] p-4 bg-white border-3 border-[#1A1A1A] rounded-2xl outline-none transition-all resize-none text-[#1A1A1A] leading-relaxed font-bold focus:border-[#4ECDC4] ${getTextSizeClass(
              'text-lg'
            )}`}
            required
            id="input-post-content"
          />

          {/* Voice Dictation Button inside Text Area */}
          <button
            type="button"
            onClick={toggleListening}
            className={`absolute bottom-4 right-4 flex items-center gap-2 px-4 py-2.5 rounded-xl font-black border-2 border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer ${
              isListening
                ? 'bg-[#FF6B6B] hover:bg-[#ff5252] text-white animate-pulse'
                : 'bg-[#FFD93D] hover:bg-[#ffe066] text-[#1A1A1A]'
            }`}
            title="Speech to Text"
            id="btn-voice-dictation"
          >
            {isListening ? (
              <>
                <Mic className="w-5 h-5 stroke-[2.5]" />
                <span className="text-sm font-black">Listening... (Tap to stop)</span>
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 text-[#1A1A1A] stroke-[2.5]" />
                <span className="text-sm font-black">Speak Your Post 🎙️</span>
              </>
            )}
          </button>
        </div>

        {speechError && (
          <div className="mb-4 p-3 bg-amber-50 rounded-xl border-3 border-[#1A1A1A] text-amber-900 text-sm flex items-start gap-2 font-bold shadow-[2px_2px_0px_0px_#1A1A1A]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#FF6B6B] mt-0.5" />
            <span>{speechError}</span>
          </div>
        )}

        {/* Category & Action Row */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
          {/* Category Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className={`font-black text-[#1A1A1A] ${getTextSizeClass('text-sm')}`}>
              Topic Channel:
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-white border-3 border-[#1A1A1A] text-[#1A1A1A] px-3.5 py-2 rounded-xl font-black focus:outline-none focus:border-[#4ECDC4] cursor-pointer text-base"
              id="select-post-category"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Attach Image & Post Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Image Picker Trigger */}
            <button
              type="button"
              onClick={() => setShowImagePicker(!showImagePicker)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black border-3 border-[#1A1A1A] transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${
                selectedImage || customImageUrl
                  ? 'bg-[#4ECDC4] text-[#1A1A1A]'
                  : 'bg-white text-[#1A1A1A] hover:bg-[#F3F1ED]'
              }`}
              id="btn-toggle-images"
            >
              <Image className="w-5 h-5 text-[#1A1A1A] stroke-[2.5]" />
              <span>
                {selectedImage || customImageUrl ? 'Image Attached! ✓' : 'Add Photo 📸'}
              </span>
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 bg-[#FF6B6B] hover:bg-[#ff5252] disabled:bg-red-400 text-white font-black px-6 py-2.5 rounded-xl shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer text-lg hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)]"
              id="btn-submit-post"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 stroke-[2.5]" />
                  <span>Share with Club 🌸</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Expandable Image Picker Panel */}
        {showImagePicker && (
          <div className="mt-4 p-4 bg-[#FDFBF7] border-3 border-[#1A1A1A] rounded-2xl shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] animate-fadeIn">
            <h4 className="text-sm font-black text-[#1A1A1A] mb-3">
              Choose a lovely ready-made photo or type a custom image link below:
            </h4>

            {/* Quick Picker */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 mb-3">
              {CURATED_IMAGES.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setSelectedImage(img.url);
                    setCustomImageUrl('');
                  }}
                  className={`relative aspect-square rounded-xl overflow-hidden border-3 transition-all cursor-pointer hover:scale-105 ${
                    selectedImage === img.url
                      ? 'border-[#FF6B6B] scale-105 ring-2 ring-[#FF6B6B]/20'
                      : 'border-[#1A1A1A] hover:border-[#FF6B6B]'
                  }`}
                >
                  <img src={img.url} alt={img.name} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-black/60 text-[10px] font-black text-white py-1 text-center truncate">
                    {img.name}
                  </div>
                </button>
              ))}
            </div>

            {/* Custom Input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Or paste any picture link from the internet (e.g. https://example.com/flower.jpg)..."
                value={customImageUrl}
                onChange={(e) => {
                  setCustomImageUrl(e.target.value);
                  setSelectedImage(null);
                }}
                className="flex-1 px-3 py-2 border-3 border-[#1A1A1A] rounded-xl bg-white text-sm font-bold outline-none focus:border-[#4ECDC4]"
              />
              {(selectedImage || customImageUrl) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setCustomImageUrl('');
                  }}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-xl text-xs font-black border-2 border-red-300 transition-all cursor-pointer"
                >
                  Clear Photo
                </button>
              )}
            </div>

            {/* Miniature Preview */}
            {(selectedImage || customImageUrl) && (
              <div className="mt-3 flex items-center gap-2">
                <span className="text-xs font-black text-[#1A1A1A]">Preview:</span>
                <img
                  src={selectedImage || customImageUrl}
                  alt="Attachment preview"
                  className="w-12 h-12 object-cover rounded-lg border-2 border-[#1A1A1A]"
                  onError={(e) => {
                    // fallback if invalid URL
                    (e.target as any).src = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=150';
                  }}
                />
              </div>
            )}
          </div>
        )}
      </form>
    </div>
  );
}
