import React, { useState } from 'react';
import { HelpCircle, Check, Users, Sparkles } from 'lucide-react';

interface Circle {
  id: string;
  name: string;
  emoji: string;
  description: string;
  memberCount: number;
  initialJoined: boolean;
}

interface InterestCirclesProps {
  textSize: 'normal' | 'large' | 'huge';
}

export default function InterestCircles({ textSize }: InterestCirclesProps) {
  const [circles, setCircles] = useState<Circle[]>([
    {
      id: "garden",
      name: "Green Thumbs Club",
      emoji: "🏡🌸",
      description: "Rose gardening, fertilizer tips, indoor plants, and beautiful garden photos.",
      memberCount: 142,
      initialJoined: true,
    },
    {
      id: "recipe",
      name: "The Recipe Swappers",
      emoji: "🍳🥧",
      description: "Baking sourdough, trading old family recipes, and cooking healthy warm dinners.",
      memberCount: 98,
      initialJoined: false,
    },
    {
      id: "stories",
      name: "Golden Storytellers",
      emoji: "📖✨",
      description: "Nostalgic memoirs, writing autobiographies, and discussing world history.",
      memberCount: 81,
      initialJoined: true,
    },
    {
      id: "pets",
      name: "Pet Companions",
      emoji: "🐶🐈",
      description: "Bird watching, puppy training, cat photos, and comforting pet stories.",
      memberCount: 115,
      initialJoined: false,
    },
    {
      id: "stitch",
      name: "Stitch & Chat Hub",
      emoji: "🧶🎨",
      description: "Knitting warm sweaters, embroidery, watercolor painting, and sharing crafts.",
      memberCount: 76,
      initialJoined: false,
    }
  ]);

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

  const handleToggleJoin = (id: string) => {
    setCircles(prev => prev.map(c => {
      if (c.id === id) {
        const joined = !c.initialJoined;
        return {
          ...c,
          initialJoined: joined,
          memberCount: c.memberCount + (joined ? 1 : -1)
        };
      }
      return c;
    }));
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] h-full">
      <div className="flex items-center gap-2 mb-6">
        <span className="text-3xl">🏆</span>
        <div>
          <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
            My Interest Circles
          </h3>
          <p className="text-xs text-[#7D7870] font-bold uppercase tracking-wider">
            Join groups with similar hobbies
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {circles.map((circle) => (
          <div
            key={circle.id}
            className={`p-4 rounded-2xl border-3 border-[#1A1A1A] transition-all ${
              circle.initialJoined
                ? 'bg-[#4ECDC4]/10 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]'
                : 'bg-white shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:bg-[#FDFBF7]'
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{circle.emoji}</span>
                <div>
                  <h4 className="font-black text-[#1A1A1A] text-base">{circle.name}</h4>
                  <p className="text-[10px] font-black text-[#FF6B6B] flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{circle.memberCount} active seniors</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleToggleJoin(circle.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black border-3 border-[#1A1A1A] transition-all cursor-pointer shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 hover:shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${
                  circle.initialJoined
                    ? 'bg-[#4ECDC4] text-[#1A1A1A]'
                    : 'bg-[#FFD93D] text-[#1A1A1A]'
                }`}
                id={`btn-join-circle-${circle.id}`}
              >
                {circle.initialJoined ? (
                  <span className="flex items-center gap-1 font-black">
                    Joined ✓
                  </span>
                ) : (
                  <span>Join Group</span>
                )}
              </button>
            </div>

            <p className={`text-[#1A1A1A] font-bold ${getTextSizeClass('text-xs')} leading-relaxed`}>
              {circle.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
