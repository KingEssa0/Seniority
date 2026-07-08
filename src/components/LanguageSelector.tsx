import React, { useEffect, useState } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'es', name: 'Español (Spanish)', flag: '🇪🇸' },
  { code: 'fr', name: 'Français (French)', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch (German)', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano (Italian)', flag: '🇮🇹' },
  { code: 'pt', name: 'Português (Portuguese)', flag: '🇵🇹' },
  { code: 'zh-CN', name: '中文 (Chinese)', flag: '🇨🇳' },
  { code: 'ja', name: '日本語 (Japanese)', flag: '🇯🇵' },
  { code: 'ru', name: 'Русский (Russian)', flag: '🇷🇺' },
  { code: 'hi', name: 'हिन्दी (Hindi)', flag: '🇮🇳' },
  { code: 'ar', name: 'العربية (Arabic)', flag: '🇸🇦' },
  { code: 'ur', name: 'اردو (Urdu)', flag: '🇵🇰' }
];

export default function LanguageSelector() {
  const [currentLang, setCurrentLang] = useState('en');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if google translate cookie already exists
    const getCookie = (name: string) => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) return parts.pop()?.split(';').shift();
      return null;
    };

    const transCookie = getCookie('googtrans');
    if (transCookie) {
      const lang = transCookie.split('/').pop();
      if (lang && SUPPORTED_LANGUAGES.some(l => l.code === lang)) {
        setCurrentLang(lang);
      }
    }

    // Insert Google Translate script if not present
    if (!window.document.getElementById('google-translate-script')) {
      const script = window.document.createElement('script');
      script.id = 'google-translate-script';
      script.src = '//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      window.document.body.appendChild(script);

      // Define initialization function
      (window as any).googleTranslateElementInit = () => {
        new (window as any).google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: SUPPORTED_LANGUAGES.map(l => l.code).join(','),
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false
        }, 'google_translate_element');
      };
    }
  }, []);

  const handleLanguageChange = (langCode: string) => {
    setCurrentLang(langCode);
    setIsOpen(false);

    // Set standard Google Translate cookies to trigger translation
    const cookieStringValue = `/en/${langCode}`;
    
    // Set for both root and current domain to ensure compatibility
    document.cookie = `googtrans=${cookieStringValue}; path=/;`;
    document.cookie = `googtrans=${cookieStringValue}; path=/; domain=${window.location.hostname};`;
    
    // Reload the page to apply Google Translation instantly & cleanly
    window.location.reload();
  };

  const activeLangObj = SUPPORTED_LANGUAGES.find(l => l.code === currentLang) || SUPPORTED_LANGUAGES[0];

  return (
    <div className="relative inline-block text-left z-50">
      {/* Hidden google translate container */}
      <div id="google_translate_element" className="hidden"></div>

      {/* Styled Translation Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white hover:bg-[#F3F1ED] border-3 border-[#1A1A1A] text-[#1A1A1A] px-4 py-2.5 rounded-2xl font-black transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-sm cursor-pointer"
        id="btn-language-selector"
      >
        <Globe className="w-5 h-5 text-[#FF6B6B]" />
        <span>Language: {activeLangObj.flag} {activeLangObj.name}</span>
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
            className="absolute right-0 mt-3.5 w-64 bg-white border-4 border-[#1A1A1A] rounded-2xl shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] z-50 max-h-96 overflow-y-auto"
            id="language-dropdown-menu"
          >
            <div className="p-3 border-b-2 border-[#1A1A1A] bg-[#FDFBF7]">
              <span className="font-black text-xs uppercase tracking-wider text-[#7D7870]">
                Choose your cozy language:
              </span>
            </div>
            <div className="py-1">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = currentLang === lang.code;
                return (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`w-full text-left px-4 py-3 text-sm font-black flex items-center justify-between transition-colors border-b last:border-b-0 border-gray-100 ${
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
