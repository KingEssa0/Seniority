import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { Post, Comment } from '../types';
import { speakText, stopSpeaking } from '../utils';
import { Volume2, VolumeX, MessageSquare, Heart, Smile, Sparkles, Send, Megaphone } from 'lucide-react';

interface PostCardProps {
  post: Post;
  currentUser: any;
  textSize: 'normal' | 'large' | 'huge';
  audioGuide: boolean;
  currentLang: string;
  onViewAccount?: (userId: string) => void;
}

export default function PostCard({ post, currentUser, textSize, audioGuide, currentLang, onViewAccount }: PostCardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isReadingPost, setIsReadingPost] = useState(false);
  const [readingCommentId, setReadingCommentId] = useState<string | null>(null);

  // Translation States
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showTranslated, setShowTranslated] = useState(false);

  const handleTranslate = async () => {
    if (translatedText) {
      setShowTranslated(!showTranslated);
      return;
    }

    setIsTranslating(true);
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: post.content,
          targetLanguage: currentLang
        })
      });
      const data = await response.json();
      if (data.translatedText) {
        setTranslatedText(data.translatedText);
        setShowTranslated(true);
      }
    } catch (err) {
      console.error("Translation error:", err);
    } finally {
      setIsTranslating(false);
    }
  };

  // Subscribing to comments in real-time
  useEffect(() => {
    let unsubscribe = () => {};
    if (showComments) {
      // Query without orderBy('createdAt') to avoid index requirements in Firestore
      const q = query(
        collection(db, 'comments'),
        where('postId', '==', post.id)
      );
      unsubscribe = onSnapshot(q, (snapshot) => {
        const list: Comment[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as Comment);
        });
        // Sort comments by createdAt in memory
        list.sort((a, b) => {
          const getMs = (val: any) => {
            if (!val) return 0;
            if (typeof val.toDate === 'function') return val.toDate().getTime();
            if (val.seconds !== undefined) return val.seconds * 1000 + (val.nanoseconds || 0) / 1000000;
            return new Date(val).getTime() || 0;
          };
          return getMs(a.createdAt) - getMs(b.createdAt);
        });
        setComments(list);
      }, (error) => {
        console.error("Comments subscription failed:", error);
      });
    }
    return () => unsubscribe();
  }, [showComments, post.id]);

  // Adjust text sizes dynamically
  const getTextSizeClass = (baseSize: string) => {
    if (textSize === 'large') {
      if (baseSize === 'text-xs') return 'text-sm';
      if (baseSize === 'text-sm') return 'text-base';
      if (baseSize === 'text-base') return 'text-lg';
      if (baseSize === 'text-lg') return 'text-xl';
      if (baseSize === 'text-xl') return 'text-2xl';
    }
    if (textSize === 'huge') {
      if (baseSize === 'text-xs') return 'text-base';
      if (baseSize === 'text-sm') return 'text-lg';
      if (baseSize === 'text-base') return 'text-xl';
      if (baseSize === 'text-lg') return 'text-2xl';
      if (baseSize === 'text-xl') return 'text-3xl';
    }
    return baseSize;
  };

  // Speaks post out loud
  const handleReadAloud = () => {
    if (isReadingPost) {
      stopSpeaking();
      setIsReadingPost(false);
    } else {
      setIsReadingPost(true);
      setReadingCommentId(null);
      const textToRead = showTranslated && translatedText ? translatedText : post.content;
      const textToSpeak = `Post shared by ${post.userName}. Post says: ${textToRead}`;
      speakText(textToSpeak, () => {
        setIsReadingPost(false);
      });
    }
  };

  // Speaks a comment out loud
  const handleReadCommentAloud = (c: Comment) => {
    if (readingCommentId === c.id) {
      stopSpeaking();
      setReadingCommentId(null);
    } else {
      setReadingCommentId(c.id);
      setIsReadingPost(false);
      const textToSpeak = `Comment from ${c.userName} says: ${c.content}`;
      speakText(textToSpeak, () => {
        setReadingCommentId(null);
      });
    }
  };

  // Handles likes / reactions
  const toggleReaction = async (reactionType: 'smile' | 'love' | 'support' | 'inspiring') => {
    const postRef = doc(db, 'posts', post.id);
    const uids = post.reactions[reactionType] || [];
    const hasReacted = uids.includes(currentUser.uid);

    try {
      if (hasReacted) {
        await updateDoc(postRef, {
          [`reactions.${reactionType}`]: arrayRemove(currentUser.uid),
        });
      } else {
        await updateDoc(postRef, {
          [`reactions.${reactionType}`]: arrayUnion(currentUser.uid),
        });
      }
    } catch (err) {
      console.error("Failed to update reaction:", err);
    }
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmittingComment(true);
    try {
      // 1. Add comment document
      await addDoc(collection(db, 'comments'), {
        postId: post.id,
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Club Friend',
        userPhoto: currentUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
        content: commentText.trim(),
        createdAt: serverTimestamp(),
      });

      // 2. Increment commentsCount on the post
      const postRef = doc(db, 'posts', post.id);
      await updateDoc(postRef, {
        commentsCount: (post.commentsCount || 0) + 1,
      });

      setCommentText('');
    } catch (err) {
      console.error("Comment submit error:", err);
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    } finally {
      setSubmittingComment(false);
    }
  };

  // Pretty dates for seniors (e.g. "Just now", "2 hours ago", "Yesterday")
  const formatFriendlyDate = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHr = Math.floor(diffMin / 60);

    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    
    // Yesterday check
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    }

    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'General': return 'bg-[#4ECDC4] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Memories': return 'bg-[#FFD93D] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Gardening': return 'bg-[#85e39d] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Cooking': return 'bg-[#ffd59a] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Crafts': return 'bg-[#ff9bb5] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Pets': return 'bg-[#9cd4ff] text-[#1A1A1A] border-[#1A1A1A]';
      case 'Help': return 'bg-[#FF6B6B] text-white border-[#1A1A1A] animate-pulse';
      default: return 'bg-[#F3F1ED] text-[#1A1A1A] border-[#1A1A1A]';
    }
  };

  const smileReacts = post.reactions?.smile || [];
  const loveReacts = post.reactions?.love || [];
  const supportReacts = post.reactions?.support || [];
  const inspiringReacts = post.reactions?.inspiring || [];

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] transition-all mb-6">
      {/* Post Top Card Row */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div 
          className="flex items-center gap-3 cursor-pointer hover:opacity-85 group transition-all"
          onClick={() => onViewAccount?.(post.userId)}
          title={`Click to view ${post.userName || 'this member'}'s club profile`}
        >
          <img
            src={post.userPhoto}
            alt={post.userName}
            className="w-14 h-14 rounded-full border-3 border-[#1A1A1A] object-cover group-hover:scale-105 transition-transform"
            referrerPolicy="no-referrer"
          />
          <div>
            <h4 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A] group-hover:underline`}>
              {post.userName}
            </h4>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-black border-2 ${getCategoryColor(post.category)}`}>
                {post.category === 'General' && '🌸 Chat'}
                {post.category === 'Memories' && '📸 Memory Lane'}
                {post.category === 'Gardening' && '🏡 Gardening'}
                {post.category === 'Cooking' && '🍳 Cooking'}
                {post.category === 'Crafts' && '🎨 Crafts'}
                {post.category === 'Pets' && '🐶 Pets'}
                {post.category === 'Help' && '❓ Seeking Advice'}
              </span>
              <span className="text-xs text-[#7D7870] font-black">
                • {formatFriendlyDate(post.createdAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Read Aloud Trigger for the blind/tired seniors */}
          <button
            onClick={handleReadAloud}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A] ${
              isReadingPost
                ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A]'
                : 'bg-[#F3F1ED] border-[#1A1A1A] text-[#1A1A1A] hover:bg-white'
            }`}
            title="Read post aloud"
            id={`btn-read-aloud-${post.id}`}
          >
            {isReadingPost ? (
              <>
                <Volume2 className="w-5 h-5 text-[#FF6B6B]" />
                <span className="text-xs font-black">Reading... (Stop)</span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5 text-[#FF6B6B]" />
                <span className="text-xs font-black">Listen 🔊</span>
              </>
            )}
          </button>

          {/* Elegant On-Demand Translate Button */}
          {currentLang !== 'en' && (
            <button
              onClick={handleTranslate}
              disabled={isTranslating}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_#1A1A1A] ${
                showTranslated
                  ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A] scale-105'
                  : 'bg-white border-[#1A1A1A] text-[#1A1A1A] hover:bg-[#F3F1ED]'
              }`}
              title="Translate Story"
              id={`btn-translate-${post.id}`}
            >
              <span className="text-sm">🌍</span>
              <span className="text-xs font-black">
                {isTranslating ? 'Translating...' : showTranslated ? 'Original 🇺🇸' : 'Translate 🌍'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Post Body Content */}
      <div className="mb-4">
        <div className={`text-[#1A1A1A] font-bold leading-relaxed break-words ${getTextSizeClass('text-lg')}`} id={`post-content-${post.id}`}>
          <ReactMarkdown
            components={{
              p: ({ children }) => <p className="mb-2">{children}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
              li: ({ children }) => <li className="mb-0.5">{children}</li>,
              strong: ({ children }) => <strong className="font-extrabold text-[#FF6B6B]">{children}</strong>,
              em: ({ children }) => <em className="italic">{children}</em>,
              a: ({ href, children }) => <a href={href} className="text-[#4ECDC4] underline font-black hover:text-[#3db8af]" target="_blank" rel="noopener noreferrer">{children}</a>,
              h1: ({ children }) => <h1 className="text-2xl font-black mb-2 mt-3 text-[#1A1A1A]">{children}</h1>,
              h2: ({ children }) => <h2 className="text-xl font-black mb-2 mt-3 text-[#1A1A1A]">{children}</h2>,
              h3: ({ children }) => <h3 className="text-lg font-black mb-1 mt-2 text-[#1A1A1A]">{children}</h3>,
              blockquote: ({ children }) => <blockquote className="border-l-4 border-[#FFD93D] pl-4 italic my-2 bg-gray-50 p-2 rounded">{children}</blockquote>,
              code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded font-mono text-sm">{children}</code>
            }}
          >
            {showTranslated && translatedText ? translatedText : post.content}
          </ReactMarkdown>
        </div>

        {showTranslated && translatedText && (
          <div className="mt-2 text-xs font-bold text-[#FF6B6B] flex items-center gap-1.5 bg-[#4ECDC4]/10 border-2 border-dashed border-[#4ECDC4] px-3 py-1.5 rounded-xl w-fit">
            <span>🌸</span>
            <span>Warm translation by Gemini</span>
          </div>
        )}

        {post.imageUrl && (
          <div className="mt-4 rounded-2xl overflow-hidden max-h-[350px] border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
            <img
              src={post.imageUrl}
              alt="Shared post"
              className="w-full h-full object-cover"
              onError={(e) => {
                // hide on broken link
                (e.target as any).style.display = 'none';
              }}
            />
          </div>
        )}
      </div>

      {/* Heartwarming reactions buttons bar */}
      <div className="flex flex-wrap items-center gap-2.5 border-t-3 border-b-3 border-[#1A1A1A] py-3.5 mb-4">
        <span className="text-xs font-black text-[#7D7870] uppercase tracking-wider mr-1">React:</span>
        
        {/* Smile Reaction */}
        <button
          onClick={() => toggleReaction('smile')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] ${
            smileReacts.includes(currentUser.uid)
              ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A] scale-105'
              : 'bg-white border-[#EAE6DF] text-gray-700 hover:border-[#1A1A1A]'
          }`}
          id={`reaction-smile-${post.id}`}
        >
          <span className="text-lg">😊</span>
          <span className="text-xs">Smile</span>
          {smileReacts.length > 0 && (
            <span className="bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs px-1.5 py-0.5 rounded-full font-black ml-1">
              {smileReacts.length}
            </span>
          )}
        </button>

        {/* Love Reaction */}
        <button
          onClick={() => toggleReaction('love')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] ${
            loveReacts.includes(currentUser.uid)
              ? 'bg-[#FF6B6B] border-[#1A1A1A] text-white scale-105'
              : 'bg-white border-[#EAE6DF] text-gray-700 hover:border-[#1A1A1A]'
          }`}
          id={`reaction-love-${post.id}`}
        >
          <span className="text-lg">❤️</span>
          <span className="text-xs">Love</span>
          {loveReacts.length > 0 && (
            <span className="bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs px-1.5 py-0.5 rounded-full font-black ml-1">
              {loveReacts.length}
            </span>
          )}
        </button>

        {/* Support Reaction */}
        <button
          onClick={() => toggleReaction('support')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] ${
            supportReacts.includes(currentUser.uid)
              ? 'bg-[#4ECDC4] border-[#1A1A1A] text-[#1A1A1A] scale-105'
              : 'bg-white border-[#EAE6DF] text-gray-700 hover:border-[#1A1A1A]'
          }`}
          id={`reaction-support-${post.id}`}
        >
          <span className="text-lg">🤗</span>
          <span className="text-xs">Support</span>
          {supportReacts.length > 0 && (
            <span className="bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs px-1.5 py-0.5 rounded-full font-black ml-1">
              {supportReacts.length}
            </span>
          )}
        </button>

        {/* Inspiring Reaction */}
        <button
          onClick={() => toggleReaction('inspiring')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black border-3 transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] ${
            inspiringReacts.includes(currentUser.uid)
              ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A] scale-105'
              : 'bg-white border-[#EAE6DF] text-gray-700 hover:border-[#1A1A1A]'
          }`}
          id={`reaction-inspiring-${post.id}`}
        >
          <span className="text-lg">🌟</span>
          <span className="text-xs">Inspire</span>
          {inspiringReacts.length > 0 && (
            <span className="bg-white border-2 border-[#1A1A1A] text-[#1A1A1A] text-xs px-1.5 py-0.5 rounded-full font-black ml-1">
              {inspiringReacts.length}
            </span>
          )}
        </button>
      </div>

      {/* Comment Section Toggle & Add Comment box */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 bg-[#F3F1ED] border-3 border-[#1A1A1A] rounded-xl px-4 py-2 font-black text-sm text-[#1A1A1A] cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all"
          id={`btn-toggle-comments-${post.id}`}
        >
          <MessageSquare className="w-5 h-5 text-[#FF6B6B]" />
          <span>
            {post.commentsCount || 0} {post.commentsCount === 1 ? 'Comment' : 'Comments'}
          </span>
          <span className="text-xs bg-[#4ECDC4] text-[#1A1A1A] border-2 border-[#1A1A1A] px-2 py-0.5 rounded-full font-black">
            {showComments ? 'Hide ▴' : 'Show & Reply ▾'}
          </span>
        </button>
      </div>

      {/* Expanded Comments List & Form */}
      {showComments && (
        <div className="mt-4 border-t-3 border-[#1A1A1A] pt-4 animate-fadeIn">
          {/* Comments Feed */}
          <div className="space-y-3.5 mb-4 max-h-[300px] overflow-y-auto pr-2">
            {comments.length === 0 ? (
              <p className="text-[#7D7870] font-black italic text-sm text-center py-4 bg-[#FDFBF7] border-3 border-dashed border-[#1A1A1A] rounded-xl">
                No replies yet. Be the first to leave a friendly word below! 👇
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="bg-[#FDFBF7] rounded-2xl p-3.5 border-3 border-[#1A1A1A] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={c.userPhoto}
                        alt={c.userName}
                        className="w-8 h-8 rounded-full border-2 border-[#1A1A1A] object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="font-black text-[#1A1A1A] text-xs sm:text-sm">{c.userName}</span>
                      <span className="text-[10px] text-[#7D7870] font-black">• {formatFriendlyDate(c.createdAt)}</span>
                    </div>

                    {/* Speech helper for each comment */}
                    <button
                      onClick={() => handleReadCommentAloud(c)}
                      className={`p-1.5 rounded-lg border-2 border-[#1A1A1A] transition-all cursor-pointer ${
                        readingCommentId === c.id
                          ? 'bg-[#FFD93D] text-[#1A1A1A] scale-105'
                          : 'bg-white text-gray-500 hover:text-[#1A1A1A]'
                      }`}
                      title="Read comment aloud"
                    >
                      {readingCommentId === c.id ? (
                        <Volume2 className="w-3.5 h-3.5 text-[#FF6B6B]" />
                      ) : (
                        <VolumeX className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                  <div className={`text-[#1A1A1A] font-bold leading-relaxed break-words ${getTextSizeClass('text-sm')}`}>
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1">{children}</ol>,
                        strong: ({ children }) => <strong className="font-extrabold text-[#FF6B6B]">{children}</strong>,
                        a: ({ href, children }) => <a href={href} className="text-[#4ECDC4] underline font-black" target="_blank" rel="noopener noreferrer">{children}</a>
                      }}
                    >
                      {c.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Input Form */}
          <form onSubmit={handleAddComment} className="flex gap-2">
            <input
              type="text"
              placeholder="Write a sweet, uplifting reply..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className={`flex-1 px-4 py-2.5 bg-white border-3 border-[#1A1A1A] rounded-xl outline-none font-bold text-[#1A1A1A] focus:border-[#4ECDC4] ${getTextSizeClass(
                'text-sm'
              )}`}
              required
              id={`input-comment-${post.id}`}
            />
            <button
              type="submit"
              disabled={submittingComment || !commentText.trim()}
              className="bg-[#4ECDC4] hover:bg-[#3fb8b0] text-[#1A1A1A] font-black px-4 rounded-xl border-3 border-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] transition-all flex items-center justify-center gap-1 cursor-pointer"
              id={`btn-submit-comment-${post.id}`}
            >
              <Send className="w-4 h-4 text-[#1A1A1A] stroke-[2.5]" />
              <span className="text-sm">Reply</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
