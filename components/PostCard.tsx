
import React, { useState } from 'react';
import { Post, Language } from '../types.ts';
import { ICONS, TRANSLATIONS, IS_RTL } from '../constants.tsx';
import { translateContent, checkPostSafety, describeImage } from '../services/gemini.ts';

interface PostCardProps {
  post: Post;
  userLanguage: Language;
  highContrast?: boolean;
  currentUserId: string;
  onLike?: () => void;
  onAvatarClick?: () => void;
}

const censorText = (text: string) => {
  const badWords = /\b(fuck|nigger|ass|shit|bitch|bastard|dick|pussy|cunt|faggot|kike|retard)\b/gi;
  return text.replace(badWords, '****');
};

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  userLanguage, 
  highContrast = false, 
  currentUserId, 
  onLike,
  onAvatarClick
}) => {
  const [translatedContent, setTranslatedContent] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);
  
  const [safetyResult, setSafetyResult] = useState<string | null>(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [isDescribing, setIsDescribing] = useState(false);

  const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.en;

  const handleTranslate = async () => {
    if (hasTranslated) {
      setHasTranslated(false);
      return;
    }
    if (translatedContent) {
      setHasTranslated(true);
      return;
    }
    setIsTranslating(true);
    const translated = await translateContent(post.content, userLanguage);
    if (translated && translated !== post.content) {
      setTranslatedContent(translated);
      setHasTranslated(true);
    }
    setIsTranslating(false);
  };

  const handleSafetyCheck = async () => {
    if (safetyResult) {
      setSafetyResult(null);
      return;
    }
    setIsCheckingSafety(true);
    const result = await checkPostSafety(post.content, userLanguage);
    setSafetyResult(result || "Unable to check.");
    setIsCheckingSafety(false);
  };

  const handleDescribePhoto = async () => {
    if (imageDescription) {
      setImageDescription(null);
      return;
    }
    if (!post.image) return;
    setIsDescribing(true);
    const result = await describeImage(post.image, userLanguage);
    setImageDescription(result || "I'm having trouble seeing the details.");
    setIsDescribing(false);
  };

  const isSafetySafe = safetyResult?.toUpperCase().includes('[SAFE]');
  const isLiked = post.likes.includes(currentUserId);
  const dateStr = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now';
  
  const displayContent = censorText(hasTranslated && translatedContent ? translatedContent : post.content);

  return (
    <div className={`rounded-[60px] mb-12 overflow-hidden transition-all shadow-xl border-4 bg-white border-white ${post.isMemory ? 'ring-12 ring-amber-50' : ''}`}>
      {post.isMemory && (
        <div className="bg-amber-100 text-amber-800 px-10 py-5 flex items-center space-x-3">
          <ICONS.Sparkles className="w-8 h-8" />
          <span className="font-black text-2xl uppercase tracking-widest">Memory Lane</span>
        </div>
      )}

      <div className="p-12">
        <div className="flex items-center space-x-6 mb-10">
          <img src={post.authorAvatar} onClick={onAvatarClick} className="w-24 h-24 rounded-[30px] border-4 shadow-lg cursor-pointer active-scale object-cover border-indigo-50" alt="" />
          <div className="flex-1 cursor-pointer" onClick={onAvatarClick}>
            <h3 className="text-4xl font-black text-indigo-950">{post.authorName}</h3>
            <p className="text-2xl font-bold text-slate-400">{dateStr} • {post.authorLocation}</p>
          </div>
          <button onClick={handleSafetyCheck} disabled={isCheckingSafety} className={`p-6 rounded-3xl transition-all active-scale ${safetyResult ? (isSafetySafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : 'bg-slate-50 text-slate-300'}`}>
            <ICONS.Shield className={`w-10 h-10 ${isCheckingSafety ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {safetyResult && (
          <div className={`mb-10 p-10 rounded-[40px] border-4 animate-slide-up ${isSafetySafe ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
             <h4 className="font-black text-3xl mb-3 flex items-center"><ICONS.Shield className="w-10 h-10 mr-4" />Safety Scan</h4>
             <p className="text-2xl font-medium leading-relaxed">{safetyResult.replace('[SAFE]', '').replace('[CAUTION]', '').trim()}</p>
          </div>
        )}

        <div className="mb-10 relative">
          <p className={`text-4xl md:text-5xl leading-tight font-medium whitespace-pre-wrap ${post.isMemory ? 'memory-content italic text-indigo-900' : 'text-slate-800'}`}>
            {displayContent}
          </p>
        </div>

        {post.image && (
          <div className="mb-10 relative group">
            <div className="rounded-[50px] overflow-hidden border-8 shadow-2xl relative border-slate-50">
              <img src={post.image} alt="" className="w-full h-auto object-cover max-h-[800px]" />
              <button onClick={handleDescribePhoto} disabled={isDescribing} className={`absolute bottom-8 right-8 px-8 py-5 rounded-[25px] font-black text-2xl shadow-2xl backdrop-blur-3xl transition-all active-scale flex items-center space-x-4 ${imageDescription ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-900'}`}>
                <ICONS.Eye className={`w-10 h-10 ${isDescribing ? 'animate-pulse' : ''}`} />
                <span>{isDescribing ? "..." : "Help me see"}</span>
              </button>
            </div>
            {imageDescription && (
              <div className="mt-8 p-10 rounded-[45px] bg-indigo-50 border-4 border-white shadow-inner italic text-3xl font-serif text-indigo-900 animate-slide-up leading-relaxed">
                "{imageDescription}"
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-10 border-t-4 border-slate-50">
          <button onClick={onLike} className={`transition-all active-scale flex items-center space-x-5 ${isLiked ? 'text-rose-500' : 'text-slate-300'}`}>
            <div className={`p-6 rounded-[30px] ${isLiked ? 'bg-rose-50 shadow-inner' : 'bg-slate-50'}`}>
              <ICONS.Heart className={`w-12 h-12 ${isLiked ? 'fill-current scale-110' : ''}`} />
            </div>
            <span className="text-4xl font-black">{post.likes.length}</span>
          </button>

          <button onClick={handleTranslate} disabled={isTranslating} className={`flex items-center space-x-4 px-10 py-5 rounded-[30px] font-black text-2xl transition-all active-scale ${hasTranslated ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
            <ICONS.Globe className="w-10 h-10" />
            <span>{isTranslating ? "..." : (hasTranslated ? "Original" : "Translate")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
