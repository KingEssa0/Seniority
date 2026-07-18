import React, { useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'zh-CN', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' }
];

interface LanguageSelectorProps {
  currentLang: string;
  onLanguageChange: (langCode: string) => void;
}

export default function LanguageSelector({ currentLang, onLanguageChange }: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left z-50">
      {/* Styled Translation Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-[#F3F1ED] border-3 border-[#1A1A1A] text-[#1A1A1A] px-4 py-2.5 rounded-2xl font-black transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-sm cursor-pointer"
        id="btn-language-selector"
      >
        <Globe className="w-5 h-5 text-[#FF6B6B]" />
        <span>{activeLangObj.flag} {activeLangObj.name}</span>
        <ChevronDown className="w-4 h-4 text-[#1A1A1A] stroke-[3]" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 cursor-default" 
            onClick={() => setIsOpen(false)}
          ></div>

          <div 
            className="absolute right-0 mt-3.5 w-64 bg-white border-4 border-[#1A1A1A] rounded-2xl shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] z-50 max-h-96 overflow-y-auto animate-scaleIn"
            id="language-dropdown-menu"
          >
            <div className="p-3 border-b-2 border-[#1A1A1A] bg-[#FDFBF7]">
              <span className="font-black text-xs uppercase tracking-wider text-[#7D7870]">
                Choose your cozy language:
              </span>
            </div>
            <div className="py-1 flex flex-col">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang.code);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-4 py-3 text-sm font-black flex items-center justify-between transition-colors border-b last:border-b-0 border-gray-100 cursor-pointer ${
                      isSelected 
                        ? 'bg-[#FFD93D] text-[#1A1A1A]' 
                        : 'text-[#2D2D2D] hover:bg-[#F3F1ED]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="text-xl">{lang.flag}</span>
                      <span>{lang.name}</span>
                    </span>
                    {isSelected && (
                      <Check className="w-4.5 h-4.5 text-[#1A1A1A] stroke-[4]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
