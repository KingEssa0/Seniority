
import React, { useState, useRef, useEffect } from 'react';
import { ICONS, TRANSLATIONS } from '../constants.tsx';
import { askAssistant } from '../services/gemini.ts';
import { Language } from '../types.ts';

interface AIAssistantProps {
  language: Language;
  highContrast?: boolean;
  voiceEnabled?: boolean;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ language, highContrast = false, voiceEnabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const aiResponse = await askAssistant(userMsg, language);
    setMessages(prev => [...prev, { role: 'ai', text: aiResponse || '' }]);
    setIsLoading(false);
  };

  const handleVoiceToggle = () => {
    setIsListening(!isListening);
    // Placeholder for speech-to-text integration
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setInput("How do I add friends?");
      }, 2000);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const assistantBg = highContrast ? 'bg-black border-4 border-white' : 'bg-white mt-12 rounded-t-3xl md:mt-0 md:rounded-none shadow-2xl';
  const textColor = highContrast ? 'text-white' : 'text-slate-900';
  const chatAreaBg = highContrast ? 'bg-black' : 'bg-gray-50/50';

  return (
    <>
      {!isOpen ? (
        <div className="fixed bottom-28 right-4 z-40 md:bottom-24 md:right-8">
          <button
            onClick={() => setIsOpen(true)}
            className={`${highContrast ? 'bg-black border-4 border-yellow-400 text-yellow-400' : 'bg-indigo-600 text-white border-4 border-white'} p-5 rounded-full shadow-2xl flex items-center justify-center transition-all transform hover:scale-105 active-scale`}
            aria-label={t.aiHelp}
          >
            <ICONS.Bot className="w-10 h-10" />
          </button>
        </div>
      ) : (
        <div className={`fixed inset-0 z-50 flex flex-col bg-black/40 backdrop-blur-sm md:inset-auto md:bottom-24 md:right-8 md:w-96 md:h-[600px] md:rounded-3xl md:overflow-hidden ${highContrast ? '' : 'md:border md:border-gray-200'}`}>
          <div className={`flex-1 flex flex-col animate-slide-up ${assistantBg}`}>
            {/* Header */}
            <div className={`${highContrast ? 'bg-black border-b-2 border-white' : 'bg-white border-b border-gray-100'} px-6 py-4 flex justify-between items-center sticky top-0`}>
              <div className="flex items-center space-x-3">
                <div className={`${highContrast ? 'bg-white text-black' : 'bg-indigo-100 text-indigo-600'} p-2 rounded-xl`}>
                  <ICONS.Bot className="w-6 h-6" />
                </div>
                <div>
                  <h2 className={`font-bold text-xl ${textColor}`}>Golden Assistant</h2>
                  <p className={`text-sm ${highContrast ? 'text-yellow-400' : 'text-green-600'} font-semibold`}>• Online</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className={`p-2 rounded-full ${highContrast ? 'text-white hover:bg-gray-800' : 'text-gray-400 hover:bg-gray-100'} active-scale`}
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto p-6 space-y-6 ${chatAreaBg}`}>
              {messages.length === 0 && (
                <div className="text-center py-12 px-6">
                  <ICONS.Bot className={`w-16 h-16 mx-auto ${highContrast ? 'text-white' : 'text-indigo-200'} mb-4`} />
                  <p className={`${highContrast ? 'text-gray-300' : 'text-slate-500'} text-xl font-medium`}>
                    {t.helpPlaceholder}
                  </p>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] px-5 py-4 rounded-3xl text-lg shadow-sm ${
                      m.role === 'user' 
                        ? (highContrast ? 'bg-white text-black' : 'bg-indigo-600 text-white rounded-tr-none') 
                        : (highContrast ? 'bg-gray-900 border-2 border-white text-white' : 'bg-white border border-gray-100 text-slate-800 rounded-tl-none')
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className={`${highContrast ? 'text-yellow-400' : 'bg-indigo-100 text-indigo-600'} px-5 py-3 rounded-full animate-pulse text-lg font-bold`}>
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className={`p-6 ${highContrast ? 'bg-black border-t-2 border-white' : 'bg-white border-t border-gray-100'} pb-safe`}>
              <div className="flex flex-col space-y-4">
                <div className={`flex items-center space-x-3 ${highContrast ? 'bg-black border-2 border-white' : 'bg-gray-100'} rounded-full px-5 py-2`}>
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder={t.helpPlaceholder}
                    className={`flex-1 bg-transparent border-none focus:ring-0 text-xl py-2 ${textColor} placeholder-slate-400`}
                  />
                  {voiceEnabled && (
                    <button
                      onClick={handleVoiceToggle}
                      className={`p-3 rounded-full transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : (highContrast ? 'text-white' : 'text-indigo-600')}`}
                    >
                      <ICONS.Mic className="w-7 h-7" />
                    </button>
                  )}
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className={`p-3 rounded-full transition-colors ${input.trim() ? (highContrast ? 'bg-white text-black' : 'bg-indigo-600 text-white shadow-md active-scale') : 'text-gray-400'}`}
                  >
                    <svg className="w-6 h-6 rotate-90" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                    </svg>
                  </button>
                </div>
                {isListening && (
                  <p className={`text-center font-bold animate-pulse ${highContrast ? 'text-yellow-400' : 'text-red-500'}`}>Listening...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
