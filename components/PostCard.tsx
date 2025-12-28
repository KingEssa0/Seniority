
import React, { useState } from 'react';
import { Post, Language } from '../types';
import { ICONS, TRANSLATIONS, IS_RTL } from '../constants';
import { translateContent, checkPostSafety, describeImage } from '../services/gemini';

interface PostCardProps {
  post: Post;
  userLanguage: Language;
  highContrast?: boolean;
  currentUserId: string;
  onLike?: () => void;
  onAvatarClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ 
  post, 
  userLanguage, 
  highContrast = false, 
  currentUserId, 
  onLike,
  onAvatarClick
}) => {
  const [content, setContent] = useState(post.content);
  const [isTranslating, setIsTranslating] = useState(false);
  const [hasTranslated, setHasTranslated] = useState(false);
  
  const [safetyResult, setSafetyResult] = useState<string | null>(null);
  const [isCheckingSafety, setIsCheckingSafety] = useState(false);
  const [imageDescription, setImageDescription] = useState<string | null>(null);
  const [isDescribing, setIsDescribing] = useState(false);

  const t = TRANSLATIONS[userLanguage] || TRANSLATIONS.en;
  const isRtl = IS_RTL(userLanguage);

  const handleTranslate = async () => {
    if (hasTranslated) {
      setContent(post.content);
      setHasTranslated(false);
      return;
    }
    setIsTranslating(true);
    const translated = await translateContent(post.content, userLanguage);
    setContent(translated || post.content);
    setIsTranslating(false);
    setHasTranslated(true);
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

  const cardStyle = highContrast ? 'bg-black border-4 border-white text-white' : 'bg-white shadow-xl border border-indigo-50 text-slate-900';
  const textColor = highContrast ? 'text-white' : 'text-slate-900';
  const mutedText = highContrast ? 'text-gray-300' : 'text-slate-500';
  const accentColor = highContrast ? 'text-yellow-400' : 'text-indigo-600';

  const isSafetySafe = safetyResult?.toUpperCase().includes('[SAFE]');
  const isLiked = post.likes.includes(currentUserId);
  
  const dateStr = post.createdAt?.toDate ? post.createdAt.toDate().toLocaleDateString() : 'Just now';

  return (
    <div className={`rounded-[50px] mb-10 overflow-hidden transition-all ${cardStyle} ${post.isMemory && !highContrast ? 'ring-12 ring-amber-50/50' : ''}`}>
      {post.isMemory && (
        <div className={`${highContrast ? 'bg-yellow-400 text-black' : 'bg-amber-100 text-amber-800'} px-10 py-4 flex items-center space-x-3`}>
          <ICONS.Sparkles className="w-8 h-8" />
          <span className="font-black text-xl uppercase tracking-widest">{t.memory}</span>
        </div>
      )}

      <div className="p-10 md:p-12">
        <div className="flex items-center space-x-6 mb-10">
          <div className="relative cursor-pointer" onClick={onAvatarClick}>
            <img src={post.authorAvatar} alt="" className="w-24 h-24 rounded-[30px] border-4 border-white shadow-xl" />
          </div>
          <div className="flex-1 cursor-pointer" onClick={onAvatarClick}>
            <h3 className={`text-4xl font-black leading-tight ${post.isMemory && !highContrast ? 'font-serif italic' : ''}`}>{post.authorName}</h3>
            <p className={`${mutedText} text-2xl font-medium`}>{dateStr} • {post.authorLocation}</p>
          </div>
          <button onClick={handleSafetyCheck} disabled={isCheckingSafety} className={`p-5 rounded-3xl transition-all active-scale ${safetyResult ? (isSafetySafe ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700') : (highContrast ? 'text-white' : 'text-slate-300')}`}>
            <ICONS.Shield className={`w-10 h-10 ${isCheckingSafety ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {safetyResult && (
          <div className={`mb-10 p-8 rounded-3xl border-4 animate-slide-up ${isSafetySafe ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
             <h4 className="font-black text-2xl mb-2 flex items-center"><ICONS.Shield className="w-8 h-8 mr-3" />{isSafetySafe ? t.safetySafe : t.safetyCaution}</h4>
             <p className="text-2xl font-medium">{safetyResult.replace('[SAFE]', '').replace('[CAUTION]', '').trim()}</p>
          </div>
        )}

        <div className="mb-10">
          <p className={`text-3xl md:text-5xl leading-snug font-medium whitespace-pre-wrap ${post.isMemory && !highContrast ? 'memory-content' : ''}`}>
            {content}
          </p>
        </div>

        {post.image && (
          <div className="mb-10 relative">
            <div className={`rounded-[50px] overflow-hidden border-8 border-white shadow-2xl relative`}>
              <img src={post.image} alt="" className="w-full h-auto object-cover max-h-[700px]" />
              <button onClick={handleDescribePhoto} disabled={isDescribing} className={`absolute bottom-8 right-8 px-8 py-5 rounded-3xl font-black text-2xl shadow-2xl backdrop-blur-xl transition-all active-scale flex items-center space-x-3 ${imageDescription ? 'bg-indigo-600 text-white' : 'bg-white/90 text-slate-800'}`}>
                <ICONS.Eye className={`w-10 h-10 ${isDescribing ? 'animate-pulse' : ''}`} />
                <span>{isDescribing ? "..." : t.describePhoto}</span>
              </button>
            </div>
            {imageDescription && (
              <div className="mt-8 p-8 rounded-[40px] bg-indigo-50 border-4 border-white shadow-inner italic text-3xl font-serif text-indigo-900 animate-slide-up">
                "{imageDescription}"
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-10 border-t-4 border-slate-50">
          <div className="flex space-x-12">
            <button onClick={onLike} className={`transition-all active-scale flex items-center space-x-4 ${isLiked ? 'text-red-500 font-black' : mutedText}`}>
              <div className={`p-5 rounded-3xl ${isLiked ? 'bg-red-50' : 'bg-slate-50'}`}>
                <ICONS.Heart className={`w-12 h-12 ${isLiked ? 'fill-current scale-110' : ''}`} />
              </div>
              <span className="text-4xl">{post.likes.length}</span>
            </button>
          </div>

          <button onClick={handleTranslate} disabled={isTranslating} className={`flex items-center space-x-4 px-8 py-5 rounded-3xl font-black text-2xl transition-all ${hasTranslated ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-50 text-indigo-600'}`}>
            <ICONS.Globe className="w-10 h-10" />
            <span>{isTranslating ? "..." : (hasTranslated ? "Original" : "Translate")}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
