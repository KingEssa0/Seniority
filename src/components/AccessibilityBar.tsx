import React from 'react';
import { Type, Volume2, VolumeX, Sparkles, HelpCircle } from 'lucide-react';
import LanguageSelector from './LanguageSelector';

interface AccessibilityBarProps {
  textSize: 'normal' | 'large' | 'huge';
  setTextSize: (size: 'normal' | 'large' | 'huge') => void;
  audioGuide: boolean;
  setAudioGuide: (active: boolean) => void;
  onShowTutorial: () => void;
}

export default function AccessibilityBar({
  textSize,
  setTextSize,
  audioGuide,
  setAudioGuide,
  onShowTutorial,
}: AccessibilityBarProps) {
  return (
    <div className="bg-[#F3F1ED] border-b-4 border-[#1A1A1A] py-3.5 px-4 shadow-sm">
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Left Side: Welcoming accessibility label */}
        <div className="flex items-center gap-2.5 text-[#1A1A1A]">
          <span className="text-2xl">🌸</span>
          <span className="font-black text-lg sm:text-xl tracking-tight">
            Senior Display & Audio Assistance
          </span>
        </div>

        {/* Right Side: Visual & Audio Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Text Size Control */}
          <div className="flex items-center bg-white rounded-2xl border-3 border-[#1A1A1A] p-1 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
            <span className="text-xs font-black uppercase tracking-wider text-[#4A4741] px-3 flex items-center gap-1 border-r-2 border-[#1A1A1A]">
              <Type className="w-4 h-4 text-[#FF6B6B]" /> Text Size:
            </span>
            <button
              onClick={() => setTextSize('normal')}
              className={`px-3 py-1 rounded-xl text-xs font-black transition-all ${
                textSize === 'normal'
                  ? 'bg-[#FF6B6B] text-white border-2 border-[#1A1A1A]'
                  : 'text-gray-750 hover:bg-[#F3F1ED]'
              }`}
              id="btn-text-normal"
            >
              Aa (Normal)
            </button>
            <button
              onClick={() => setTextSize('large')}
              className={`px-3 py-1 rounded-xl text-sm font-black transition-all ${
                textSize === 'large'
                  ? 'bg-[#FF6B6B] text-white border-2 border-[#1A1A1A]'
                  : 'text-gray-750 hover:bg-[#F3F1ED]'
              }`}
              id="btn-text-large"
            >
              Aa+ (Large)
            </button>
            <button
              onClick={() => setTextSize('huge')}
              className={`px-3 py-1 rounded-xl text-base font-black transition-all ${
                textSize === 'huge'
                  ? 'bg-[#FF6B6B] text-white border-2 border-[#1A1A1A]'
                  : 'text-gray-750 hover:bg-[#F3F1ED]'
              }`}
              id="btn-text-huge"
            >
              Aa++ (Huge)
            </button>
          </div>

          {/* Voice Assistant Toggle */}
          <button
            onClick={() => setAudioGuide(!audioGuide)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black border-3 border-[#1A1A1A] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-sm cursor-pointer ${
              audioGuide
                ? 'bg-[#FFD93D] text-[#1A1A1A]'
                : 'bg-white text-[#1A1A1A] hover:bg-[#F3F1ED]'
            }`}
            id="btn-audio-guide"
          >
            {audioGuide ? (
              <>
                <Volume2 className="w-5 h-5 text-[#FF6B6B]" />
                <span>Speech: ON 🔊</span>
              </>
            ) : (
              <>
                <VolumeX className="w-5 h-5 text-gray-500" />
                <span>Speech: OFF 🔇</span>
              </>
            )}
          </button>

          {/* Language Selector Dropdown */}
          <LanguageSelector />

          {/* Simple Guide / Help Button */}
          <button
            onClick={onShowTutorial}
            className="flex items-center gap-2 bg-[#4ECDC4] hover:bg-[#3fb8b0] border-3 border-[#1A1A1A] text-[#1A1A1A] px-4 py-2.5 rounded-2xl font-black transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-sm cursor-pointer"
            id="btn-show-tutorial"
          >
            <HelpCircle className="w-5 h-5 text-[#1A1A1A]" />
            <span>How to use?</span>
          </button>
        </div>
      </div>
    </div>
  );
}
