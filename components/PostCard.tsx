
import React, { useState } from 'react';
import { Post, Language, Comment } from '../types.ts';
import { ICONS, TRANSLATIONS } from '../constants.tsx';
import { translateContent } from '../services/gemini.ts';
import { db, updateDoc, doc, arrayUnion } from '../services/firebase.ts';

interface PostCardProps {
  post: Post;
  userLanguage: Language;
  currentUserId: string;
  onAvatarClick?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({ post, userLanguage, currentUserId, onAvatarClick }) => {
  const [commentInput, setCommentInput] = useState('');
  const [showComments, setShowComments] = useState(false);

  const handleLike = async () => {
    const isLiked = post.likes.includes(currentUserId);
    await updateDoc(doc(db, "posts", post.id), {
      likes: isLiked ? post.likes.filter(id => id !== currentUserId) : arrayUnion(currentUserId)
    });
  };

  const handleAddComment = async () => {
    if (!commentInput.trim()) return;
    const userSnap = await (await import('../services/firebase.ts')).getDoc(doc(db, "users", currentUserId));
    const userData = userSnap.data();
    const newComment = { id: Date.now().toString(), authorId: currentUserId, authorName: userData?.name || "Neighbor", authorAvatar: userData?.avatar || "", content: commentInput, createdAt: new Date() };
    await updateDoc(doc(db, "posts", post.id), { comments: arrayUnion(newComment) });
    setCommentInput('');
  };

  const isLiked = post.likes.includes(currentUserId);

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden mb-10 transition-all hover:border-indigo-100 shadow-sm">
      <div className="p-7">
        <div className="flex items-center space-x-4 mb-8">
          <img src={post.authorAvatar} onClick={onAvatarClick} className="w-11 h-11 rounded-full border-2 border-slate-50 cursor-pointer object-cover shadow-sm" />
          <div className="flex-1 cursor-pointer" onClick={onAvatarClick}>
            <h3 className="text-base font-serif font-black text-indigo-950 leading-tight">{post.authorName}</h3>
            <p className="text-[10px] uppercase tracking-[.2em] font-black text-slate-300">{post.authorLocation}</p>
          </div>
        </div>

        <p className="text-2xl font-medium text-slate-800 mb-8 leading-snug">
          {post.content}
        </p>

        {post.image && (
          <div className="rounded-2xl overflow-hidden border border-slate-50 mb-8">
            <img src={post.image} className="w-full h-auto object-cover max-h-[450px]" alt="Shared Memory" />
          </div>
        )}

        <div className="flex items-center space-x-8">
          <button onClick={handleLike} className={`flex items-center space-x-2 transition-all active:scale-90 ${isLiked ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'}`}>
            <ICONS.Heart className={`w-6 h-6 ${isLiked ? 'fill-current' : ''}`} />
            <span className="text-sm font-black">{post.likes.length}</span>
          </button>
          <button onClick={()=>setShowComments(!showComments)} className="flex items-center space-x-2 text-slate-300 hover:text-indigo-400 transition-all">
            <ICONS.MessageCircle className="w-6 h-6" />
            <span className="text-sm font-black">{post.comments?.length || 0}</span>
          </button>
        </div>
      </div>

      {showComments && (
        <div className="bg-slate-50/30 px-7 py-8 border-t border-slate-50 animate-slide-up">
          <div className="space-y-6 mb-8">
            {post.comments?.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <img src={comment.authorAvatar} className="w-8 h-8 rounded-full border shadow-sm" />
                <div className="flex-1">
                  <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-slate-50 shadow-sm">
                    <p className="text-xs font-black text-indigo-900 mb-1">{comment.authorName}</p>
                    <p className="text-sm text-slate-700 leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3">
            <input type="text" placeholder="Share a kind thought..." value={commentInput} onChange={e=>setCommentInput(e.target.value)} className="flex-1 bg-white p-4 rounded-2xl border-2 border-transparent focus:border-indigo-100 text-sm outline-none shadow-sm transition-all" />
            <button onClick={handleAddComment} className="bg-indigo-600 text-white px-6 rounded-2xl font-black text-sm shadow-lg shadow-indigo-100">Send</button>
          </div>
        </div>
      )}
    </div>
  );
};
