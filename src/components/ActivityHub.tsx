import React, { useState, useEffect } from 'react';
import { 
  Brain, 
  Sparkles, 
  Heart, 
  Compass, 
  Plus, 
  Award, 
  BookOpen, 
  Send, 
  Volume2, 
  RefreshCw, 
  Feather, 
  Smile, 
  Sun, 
  Droplet, 
  Image,
  ArrowRight,
  Check,
  Trophy
} from 'lucide-react';
import { speakText, stopSpeaking } from '../utils';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

interface ActivityHubProps {
  currentUser: any;
  textSize: 'normal' | 'large' | 'huge';
  onPostCreated?: () => void;
}

const TRIVIA_QUESTIONS = [
  {
    category: "Classic Movies & Stars 🎬",
    question: "Who played the legendary Dorothy in the 1939 classic movie 'The Wizard of Oz'?",
    options: ["Judy Garland", "Shirley Temple", "Grace Kelly", "Elizabeth Taylor"],
    answer: "Judy Garland",
    funFact: "Judy Garland was only 16 years old when she played Dorothy, and her famous ruby slippers were actually silver in the original book!"
  },
  {
    category: "Golden Tunes 🎵",
    question: "Which legendary musician sang the beautiful song 'What a Wonderful World' in 1967?",
    options: ["Louis Armstrong", "Frank Sinatra", "Nat King Cole", "Elvis Presley"],
    answer: "Louis Armstrong",
    funFact: "Louis Armstrong's gravelly, warm voice made this song an international anthem of peace and hope!"
  },
  {
    category: "Cozy Nature & Gardens 🌸",
    question: "Which of these beautiful flowers is known for turning its face to follow the path of the sun?",
    options: ["Sunflower", "Rose", "Tulip", "Orchid"],
    answer: "Sunflower",
    funFact: "This charming solar movement is called heliotropism! Young sunflowers track the sun from east to west every day."
  },
  {
    category: "Sweet Retro Sweets 🥧",
    question: "What delicious fruit is traditionally baked inside a classic American Thanksgiving pie with a lattice crust?",
    options: ["Apple", "Blueberry", "Cherry", "Pumpkin"],
    answer: "Apple",
    funFact: "Apple pies were actually brought to America by English, Dutch, and Swedish settlers, and became a beloved national symbol!"
  },
  {
    category: "Great History & Landmarks 🏛️",
    question: "Which beautiful copper monument stands tall in the New York Harbor as a universal symbol of freedom and welcome?",
    options: ["The Statue of Liberty", "The Golden Gate Bridge", "Mount Rushmore", "The Empire State Building"],
    answer: "The Statue of Liberty",
    funFact: "The Statue of Liberty was a magnificent gift of friendship from the people of France to the United States in 1886."
  }
];

const COZY_WORD_JUMBLES = [
  { jumbled: "N-E-D-R-A-G", original: "GARDEN", clue: "A peaceful place where beautiful roses, tomatoes, and memories grow." },
  { jumbled: "T-I-K-N-I-N-G", original: "KNITTING", clue: "A cozy craft of looping wool yarn into warm sweaters and scarves." },
  { jumbled: "I-B-S-C-T-I-U", original: "BISCUIT", clue: "A warm, flaky baked treat that tastes amazing with a hot cup of tea." },
  { jumbled: "S-H-I-E-N-S-N-U", original: "SUNSHINE", clue: "A golden source of warmth, vitamin D, and happiness on a clear day." },
  { jumbled: "P-H-I-H-A-C-Y-T", original: "CHAPPATHY", clue: "A lovely warm traditional flatbread perfect with soup." }
];

const CARD_TEMPLATES = [
  { id: 'cozy', name: 'Warm Cottage 🏡', bg: 'bg-[#FDFBF7]', text: 'text-[#1A1A1A]', border: 'border-[#1A1A1A]', accent: '#FF6B6B' },
  { id: 'sun', name: 'Golden Sunshine 🌅', bg: 'bg-[#FFD93D]/10', text: 'text-[#1A1A1A]', border: 'border-[#FFD93D]', accent: '#FFD93D' },
  { id: 'mint', name: 'Fresh Herbal Mint 🌿', bg: 'bg-[#4ECDC4]/10', text: 'text-[#1A1A1A]', border: 'border-[#4ECDC4]', accent: '#4ECDC4' },
  { id: 'vintage', name: 'Retro Telegram 📜', bg: 'bg-[#F3F1ED]', text: 'text-[#3E3A35]', border: 'border-[#3E3A35]', accent: '#7D7870' }
];

export default function ActivityHub({ currentUser, textSize, onPostCreated }: ActivityHubProps) {
  const [subTab, setSubTab] = useState<'games' | 'wellness' | 'memoir' | 'cards'>('games');

  // TRIVIA STATES
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showTriviaResult, setShowTriviaResult] = useState(false);
  const [triviaScore, setTriviaScore] = useState(0);

  // WORD JUMBLE STATES
  const [jumbleIndex, setJumbleIndex] = useState(0);
  const [userJumbleGuess, setUserJumbleGuess] = useState('');
  const [jumbleFeedback, setJumbleFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');

  // MEMORY MATCH GAME
  const [cards, setCards] = useState<{ id: number; symbol: string; isFlipped: boolean; isMatched: boolean }[]>([]);
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [memoryMoves, setMemoryMoves] = useState(0);
  const [isMemoryFinished, setIsMemoryFinished] = useState(false);

  // BREATHING STATE
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<'idle' | 'Inhale' | 'Hold' | 'Exhale'>('idle');
  const [breathingTimer, setBreathingTimer] = useState(0);

  // LOGS STATE
  const [waterCount, setWaterCount] = useState(() => Number(localStorage.getItem('seniority_water') || '0'));
  const [walkCount, setWalkCount] = useState(() => Number(localStorage.getItem('seniority_walk') || '0'));
  const [smileCount, setSmileCount] = useState(() => Number(localStorage.getItem('seniority_smile') || '0'));

  // MEMOIR COMPILER
  const [memoirTitle, setMemoirTitle] = useState('My Warmest Childhood Memory 🏡');
  const [memoirBody, setMemoirBody] = useState('');
  const [isMemoirPublishing, setIsMemoirPublishing] = useState(false);
  const [memoirFeedback, setMemoirFeedback] = useState('');

  // CUSTOM GREETING CARD MAKER
  const [selectedTemplate, setSelectedTemplate] = useState(CARD_TEMPLATES[0]);
  const [cardRecipient, setCardRecipient] = useState('');
  const [cardMessage, setCardMessage] = useState('');
  const [cardStamp, setCardStamp] = useState('🌸');
  const [isCardPublishing, setIsCardPublishing] = useState(false);
  const [cardFeedback, setCardFeedback] = useState('');

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

  // Setup memory game on mount
  useEffect(() => {
    resetMemoryGame();
  }, []);

  const resetMemoryGame = () => {
    const symbols = ["🌸", "🐕", "🥧", "🧶", "🎨", "🌅"];
    // Duplicate symbols for matching pairs
    const deck = [...symbols, ...symbols]
      .map((sym, index) => ({
        id: index,
        symbol: sym,
        isFlipped: false,
        isMatched: false
      }))
      // Shuffle deck
      .sort(() => Math.random() - 0.5);
    setCards(deck);
    setSelectedCards([]);
    setMemoryMoves(0);
    setIsMemoryFinished(false);
  };

  const handleCardClick = (id: number) => {
    if (selectedCards.length >= 2 || cards[id].isFlipped || cards[id].isMatched) return;

    const updatedCards = [...cards];
    updatedCards[id].isFlipped = true;
    setCards(updatedCards);

    const newSelected = [...selectedCards, id];
    setSelectedCards(newSelected);

    if (newSelected.length === 2) {
      setMemoryMoves(prev => prev + 1);
      const [firstIdx, secondIdx] = newSelected;
      
      if (cards[firstIdx].symbol === cards[secondIdx].symbol) {
        // MATCH FOUND
        setTimeout(() => {
          const matchedDeck = updatedCards.map((c, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...c, isMatched: true };
            }
            return c;
          });
          setCards(matchedDeck);
          setSelectedCards([]);
          speakText("Match found! How wonderful!");
          
          if (matchedDeck.every(c => c.isMatched)) {
            setIsMemoryFinished(true);
            speakText("Splendid! You matched all the beautiful retro symbols. Wonderful concentration!");
          }
        }, 500);
      } else {
        // NO MATCH -> Flip back after delay
        setTimeout(() => {
          const resetDeck = updatedCards.map((c, idx) => {
            if (idx === firstIdx || idx === secondIdx) {
              return { ...c, isFlipped: false };
            }
            return c;
          });
          setCards(resetDeck);
          setSelectedCards([]);
        }, 1200);
      }
    }
  };

  // Trivia Answer Handle
  const handleTriviaAnswer = (option: string) => {
    if (showTriviaResult) return;
    setSelectedOption(option);
    setShowTriviaResult(true);
    const correct = option === TRIVIA_QUESTIONS[triviaIndex].answer;
    if (correct) {
      setTriviaScore(prev => prev + 1);
      speakText("Correct answer! Beautiful. " + TRIVIA_QUESTIONS[triviaIndex].funFact);
    } else {
      speakText(`That was a lovely guess. The correct answer is ${TRIVIA_QUESTIONS[triviaIndex].answer}. Here is a fun fact: ${TRIVIA_QUESTIONS[triviaIndex].funFact}`);
    }
  };

  const nextTriviaQuestion = () => {
    setSelectedOption(null);
    setShowTriviaResult(false);
    setTriviaIndex((prev) => (prev + 1) % TRIVIA_QUESTIONS.length);
  };

  // Word Jumble Handle
  const handleJumbleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanGuess = userJumbleGuess.trim().toUpperCase();
    const original = COZY_WORD_JUMBLES[jumbleIndex].original;
    if (cleanGuess === original) {
      setJumbleFeedback('correct');
      speakText(`Correct! The word is ${original}. What a wonderful vocabulary!`);
    } else {
      setJumbleFeedback('wrong');
      speakText("That's a nice guess! Look closely at the scrambled letters and try again.");
    }
  };

  const nextJumble = () => {
    setUserJumbleGuess('');
    setJumbleFeedback('idle');
    setJumbleIndex((prev) => (prev + 1) % COZY_WORD_JUMBLES.length);
  };

  // Deep Breathing Guide Loop
  useEffect(() => {
    if (!isBreathing) {
      setBreathingPhase('idle');
      setBreathingTimer(0);
      return;
    }

    setBreathingPhase('Inhale');
    setBreathingTimer(4);
    speakText("Gently breathe in, feeling the warm sunshine...");

    const interval = setInterval(() => {
      setBreathingTimer((prev) => {
        if (prev <= 1) {
          // Switch phase
          setBreathingPhase((currentPhase) => {
            if (currentPhase === 'Inhale') {
              speakText("Now hold it with a peaceful smile...");
              setBreathingTimer(4);
              return 'Hold';
            } else if (currentPhase === 'Hold') {
              speakText("Slowly and gently exhale, releasing all worry...");
              setBreathingTimer(4);
              return 'Exhale';
            } else {
              speakText("Breathe in again...");
              setBreathingTimer(4);
              return 'Inhale';
            }
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isBreathing]);

  // Wellness Increment Logs
  const changeWaterLog = (amount: number) => {
    const newVal = Math.max(0, waterCount + amount);
    setWaterCount(newVal);
    localStorage.setItem('seniority_water', String(newVal));
    if (amount > 0) speakText("Yum! Stay hydrated. Another fresh glass of water logged!");
  };

  const changeWalkLog = (amount: number) => {
    const newVal = Math.max(0, walkCount + amount);
    setWalkCount(newVal);
    localStorage.setItem('seniority_walk', String(newVal));
    if (amount > 0) speakText("Fantastic walking! Every single step keeps our hearts healthy and strong!");
  };

  const changeSmileLog = (amount: number) => {
    const newVal = Math.max(0, smileCount + amount);
    setSmileCount(newVal);
    localStorage.setItem('seniority_smile', String(newVal));
    if (amount > 0) speakText("A beautiful smile logged! Smiling is contagious and lights up our lives!");
  };

  // Memoir Publisher
  const handlePublishMemoir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoirBody.trim()) return;

    setIsMemoirPublishing(true);
    setMemoirFeedback('');
    try {
      const fullContent = `📸 [My Precious Memoir: ${memoirTitle}]\n\n${memoirBody}`;
      await addDoc(collection(db, 'posts'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Club Friend',
        userPhoto: currentUser.photoURL,
        content: fullContent,
        category: 'Memories',
        commentsCount: 0,
        reactions: {
          smile: [],
          love: [currentUser.uid], // self-love reaction
          support: [],
          inspiring: []
        },
        createdAt: new Date()
      });

      setMemoirBody('');
      setMemoirFeedback('Your memoir story has been published successfully onto the Community Square timeline! 🎉');
      speakText("Splendid! Your precious memoir has been published to the club square. Friends can now read and enjoy it!");
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error("Error publishing memoir:", err);
      setMemoirFeedback('Could not publish story. Please try again shortly.');
    } finally {
      setIsMemoirPublishing(false);
    }
  };

  // Greeting Card Creator
  const handleSendCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardMessage.trim()) return;

    setIsCardPublishing(true);
    setCardFeedback('');
    try {
      const recipientLabel = cardRecipient ? `to ${cardRecipient}` : 'to All Friends';
      const fullCardContent = `💌 [Sent a Beautiful Social Card ${recipientLabel}]\n\nStamp: ${cardStamp}\n"${cardMessage}"\n\n— Handcrafted in the Golden Activity Hub 🌟`;
      await addDoc(collection(db, 'posts'), {
        userId: currentUser.uid,
        userName: currentUser.displayName || 'Club Friend',
        userPhoto: currentUser.photoURL,
        content: fullCardContent,
        category: 'General',
        commentsCount: 0,
        reactions: {
          smile: [],
          love: [currentUser.uid],
          support: [],
          inspiring: []
        },
        createdAt: new Date()
      });

      setCardMessage('');
      setCardRecipient('');
      setCardFeedback(`Your beautiful greeting card ${recipientLabel} has been created and posted to the timeline! 💌`);
      speakText("Wonderful! Your cute retro greeting card has been delivered directly to the community timeline.");
      if (onPostCreated) onPostCreated();
    } catch (err) {
      console.error("Error sending card:", err);
      setCardFeedback('Could not deliver card. Please try again shortly.');
    } finally {
      setIsCardPublishing(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 border-4 border-[#1A1A1A] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
      {/* Title & Speech trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-4 border-[#1A1A1A] pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#FFD93D] rounded-2xl flex items-center justify-center border-3 border-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
            <Trophy className="w-7 h-7 text-[#1A1A1A] stroke-[2.5]" />
          </div>
          <div>
            <h2 className={`${getTextSizeClass('text-2xl')} font-black text-[#1A1A1A]`}>
              🎯 Golden Activity Hub
            </h2>
            <p className="text-xs text-[#7D7870] font-black tracking-wider uppercase mt-0.5">
              Cozy Games, Wellness Logs, Memoir Writing, and Custom Greeting Cards
            </p>
          </div>
        </div>

        <button
          onClick={() => speakText("Welcome to your Golden Activity Hub! Choose one of the four cozy folders below to play gentle games, record your daily wellness steps, write a beautiful memoir, or create custom greeting cards for your friends!")}
          className="bg-[#4ECDC4] hover:bg-[#3db8af] text-[#1A1A1A] border-3 border-[#1A1A1A] px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer flex items-center gap-2"
        >
          <Volume2 className="w-4 h-4 stroke-[3]" />
          Listen to Instructions 🔊
        </button>
      </div>

      {/* Sub tabs navigation */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        <button
          onClick={() => setSubTab('games')}
          className={`px-4 py-3 rounded-xl border-3 font-black text-sm transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
            subTab === 'games'
              ? 'bg-[#FFD93D] text-[#1A1A1A] border-[#1A1A1A]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          🧩 Cozy Games & Puzzles
        </button>
        <button
          onClick={() => setSubTab('wellness')}
          className={`px-4 py-3 rounded-xl border-3 font-black text-sm transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
            subTab === 'wellness'
              ? 'bg-[#4ECDC4] text-[#1A1A1A] border-[#1A1A1A]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          🌿 Cozy Wellness Log
        </button>
        <button
          onClick={() => setSubTab('memoir')}
          className={`px-4 py-3 rounded-xl border-3 font-black text-sm transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
            subTab === 'memoir'
              ? 'bg-[#FF6B6B] text-white border-[#1A1A1A]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          ✍️ My Memoir Compiler
        </button>
        <button
          onClick={() => setSubTab('cards')}
          className={`px-4 py-3 rounded-xl border-3 font-black text-sm transition-all cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
            subTab === 'cards'
              ? 'bg-[#A8E6CF] text-[#1A1A1A] border-[#1A1A1A]'
              : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'
          }`}
        >
          💌 Sweet Greeting Cards
        </button>
      </div>

      {/* SUB-TAB CONTENTS */}
      <div className="border-3 border-[#1A1A1A] rounded-2xl p-5 bg-[#FDFBF7]">

        {/* 1. COZY GAMES */}
        {subTab === 'games' && (
          <div className="space-y-8">
            
            {/* Memory Card Match Game */}
            <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
                <div>
                  <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A] flex items-center gap-2`}>
                    🌸 Concentrating Memory Card Match
                  </h3>
                  <p className="text-xs text-[#7D7870] font-semibold">
                    Flip and match pairs of colorful nostalgic emojis to keep the mind bright and focused!
                  </p>
                </div>
                <button
                  onClick={resetMemoryGame}
                  className="bg-white hover:bg-[#F3F1ED] border-2 border-[#1A1A1A] text-xs font-black px-3.5 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5 stroke-[3]" />
                  Shuffle Cards
                </button>
              </div>

              {/* Memory Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 mb-4">
                {cards.map((card) => {
                  const isShown = card.isFlipped || card.isMatched;
                  return (
                    <button
                      key={card.id}
                      onClick={() => handleCardClick(card.id)}
                      disabled={card.isMatched}
                      className={`aspect-square rounded-xl border-3 border-[#1A1A1A] text-3xl flex items-center justify-center transition-all ${
                        card.isMatched
                          ? 'bg-[#4ECDC4]/20 border-gray-300 opacity-60 cursor-default'
                          : isShown
                          ? 'bg-[#FFD93D] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                          : 'bg-[#FF6B6B] hover:bg-[#ff5252] text-white cursor-pointer shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] active:translate-y-0.5'
                      }`}
                    >
                      {isShown ? card.symbol : "❓"}
                    </button>
                  );
                })}
              </div>

              {/* Score panel */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3 text-sm font-black text-[#1A1A1A]">
                <span>Moves Taken: <strong className="text-[#FF6B6B]">{memoryMoves}</strong></span>
                {isMemoryFinished ? (
                  <span className="text-[#4ECDC4] bg-[#4ECDC4]/10 border-2 border-[#1A1A1A] px-3 py-1 rounded-lg animate-bounce">
                    🎉 Splendid! Finished perfectly!
                  </span>
                ) : (
                  <span className="text-[#7D7870]">Find all 6 matches!</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Retro Trivia Challenge */}
              <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between">
                <div>
                  <span className="bg-[#FF6B6B] text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-[#1A1A1A]">
                    {TRIVIA_QUESTIONS[triviaIndex].category}
                  </span>
                  
                  <h4 className={`${getTextSizeClass('text-base')} font-black text-[#1A1A1A] mt-3 mb-4`}>
                    {TRIVIA_QUESTIONS[triviaIndex].question}
                  </h4>

                  {/* Options List */}
                  <div className="space-y-2">
                    {TRIVIA_QUESTIONS[triviaIndex].options.map((opt) => {
                      const isCorrectAnswer = opt === TRIVIA_QUESTIONS[triviaIndex].answer;
                      const isSelected = opt === selectedOption;
                      
                      let btnStyle = "bg-white border-[#EAE6DF] text-[#1A1A1A] hover:border-[#1A1A1A]";
                      if (showTriviaResult) {
                        if (isCorrectAnswer) {
                          btnStyle = "bg-[#4ECDC4] text-[#1A1A1A] border-[#1A1A1A] scale-102 font-black shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]";
                        } else if (isSelected) {
                          btnStyle = "bg-[#FF6B6B] text-white border-[#1A1A1A] opacity-80";
                        } else {
                          btnStyle = "bg-gray-50 text-gray-400 border-gray-100 opacity-50";
                        }
                      }

                      return (
                        <button
                          key={opt}
                          disabled={showTriviaResult}
                          onClick={() => handleTriviaAnswer(opt)}
                          className={`w-full text-left p-3 rounded-xl border-3 text-xs font-bold transition-all ${
                            !showTriviaResult && 'cursor-pointer hover:bg-[#FDFBF7]'
                          } ${btnStyle}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {/* Results with Fun Fact */}
                  {showTriviaResult && (
                    <div className="mt-4 p-3 bg-[#4ECDC4]/10 border-2 border-[#1A1A1A] rounded-xl text-xs font-semibold text-[#1A1A1A]">
                      <p className="font-extrabold text-[#1A1A1A] mb-1">
                        {selectedOption === TRIVIA_QUESTIONS[triviaIndex].answer ? "🌟 Brilliant! You got it!" : "🌿 That was a lovely guess!"}
                      </p>
                      <p className="leading-relaxed">{TRIVIA_QUESTIONS[triviaIndex].funFact}</p>
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4 flex items-center justify-between text-xs font-black">
                  <span>Score: <strong className="text-[#4ECDC4] text-sm">{triviaScore}</strong> correct answers</span>
                  <button
                    onClick={nextTriviaQuestion}
                    className="bg-[#FFD93D] hover:bg-[#ffe066] border-2 border-[#1A1A1A] px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_#1A1A1A] transition-all cursor-pointer flex items-center gap-1"
                  >
                    Next Question
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Cozy Word Unscramble */}
              <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between">
                <div>
                  <span className="bg-[#4ECDC4] text-[#1A1A1A] text-[10px] font-black uppercase px-2 py-0.5 rounded-full border-2 border-[#1A1A1A]">
                    Vocabulary Brain Teaser 🧠
                  </span>

                  <div className="my-4 text-center">
                    <p className="text-[10px] uppercase font-black text-gray-400 tracking-widest select-none">Unscramble the letters:</p>
                    <h4 className="text-3xl font-black text-[#FF6B6B] tracking-widest my-2 select-all font-mono">
                      {COZY_WORD_JUMBLES[jumbleIndex].jumbled}
                    </h4>
                    <p className="text-xs text-[#7D7870] font-bold italic leading-relaxed mt-1">
                      💡 Clue: "{COZY_WORD_JUMBLES[jumbleIndex].clue}"
                    </p>
                  </div>

                  <form onSubmit={handleJumbleSubmit} className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Type your guess here..."
                      value={userJumbleGuess}
                      onChange={(e) => setUserJumbleGuess(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border-2 border-[#1A1A1A] rounded-xl font-bold outline-none text-xs focus:border-[#4ECDC4] uppercase"
                    />
                    <button
                      type="submit"
                      className="bg-[#4ECDC4] hover:bg-[#3db8af] text-[#1A1A1A] border-2 border-[#1A1A1A] px-4 py-2 rounded-xl text-xs font-black shadow-[2px_2px_0px_0px_#1A1A1A] cursor-pointer"
                    >
                      Guess!
                    </button>
                  </form>

                  {/* Feedback message */}
                  {jumbleFeedback !== 'idle' && (
                    <div className="mt-3 text-xs font-bold">
                      {jumbleFeedback === 'correct' ? (
                        <p className="text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                          ✓ Splendid! You solved it perfectly!
                        </p>
                      ) : (
                        <p className="text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">
                          ✗ Almost! Try rearranging the letters again!
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={nextJumble}
                    className="bg-[#FFD93D] hover:bg-[#ffe066] border-2 border-[#1A1A1A] px-4 py-1.5 rounded-lg shadow-[2px_2px_0px_0px_#1A1A1A] transition-all cursor-pointer flex items-center gap-1 text-xs font-black"
                  >
                    Next Word
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. COZY WELLNESS LOG */}
        {subTab === 'wellness' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
              <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A] mb-1 flex items-center gap-2`}>
                🧘 Daily Deep Breathing Companion
              </h3>
              <p className="text-xs text-[#7D7870] font-semibold mb-4">
                Take a lovely moment to relax. Let's do gentle deep breathing with friendly audio voice prompts!
              </p>

              {/* Breathing bubble container */}
              <div className="flex flex-col items-center justify-center p-8 bg-[#FDFBF7] rounded-2xl border-2 border-dashed border-[#1A1A1A] min-h-[260px]">
                <div 
                  className={`w-32 h-32 rounded-full border-4 border-[#1A1A1A] flex flex-col items-center justify-center text-center font-black transition-all duration-[4000ms] ${
                    breathingPhase === 'Inhale' 
                      ? 'bg-[#4ECDC4] scale-135 text-[#1A1A1A] shadow-[0px_0px_30px_rgba(78,205,196,0.5)]'
                      : breathingPhase === 'Hold'
                      ? 'bg-[#FFD93D] scale-135 text-[#1A1A1A] shadow-[0px_0px_30px_rgba(255,217,61,0.5)] animate-pulse'
                      : breathingPhase === 'Exhale'
                      ? 'bg-[#FF6B6B] scale-95 text-white shadow-none'
                      : 'bg-white text-gray-400 scale-100'
                  }`}
                >
                  <span className="text-sm uppercase tracking-wider">{breathingPhase === 'idle' ? "Ready?" : breathingPhase}</span>
                  {breathingPhase !== 'idle' && (
                    <span className="text-2xl mt-1">{breathingTimer}s</span>
                  )}
                </div>

                <p className="text-sm font-black text-[#1A1A1A] mt-6 text-center max-w-sm">
                  {breathingPhase === 'Inhale' && "🌬️ Breathe in slowly and naturally..."}
                  {breathingPhase === 'Hold' && "🌸 Hold it gently with an appreciative smile..."}
                  {breathingPhase === 'Exhale' && "💨 Exhale soft and relaxed, letting go..."}
                  {breathingPhase === 'idle' && "Click the button below to start breathing peacefully!"}
                </p>

                <button
                  onClick={() => setIsBreathing(!isBreathing)}
                  className={`mt-5 px-6 py-2.5 rounded-xl border-3 border-[#1A1A1A] font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] text-xs transition-all cursor-pointer ${
                    isBreathing
                      ? 'bg-[#FF6B6B] text-white hover:bg-[#ff5252]'
                      : 'bg-[#4ECDC4] text-[#1A1A1A] hover:bg-[#3db8af]'
                  }`}
                >
                  {isBreathing ? "Pause Breathing Companion 🛑" : "Start Peaceful Breathing 🧘"}
                </button>
              </div>
            </div>

            {/* Wholesome Daily Counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Walk Count */}
              <div className="bg-white rounded-xl p-4 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between items-center text-center">
                <div className="w-10 h-10 bg-[#FFD93D] rounded-full flex items-center justify-center border-2 border-[#1A1A1A] text-xl mb-2">
                  🚶
                </div>
                <h4 className="font-black text-sm text-[#1A1A1A]">Daily Sunshine Walk</h4>
                <p className="text-xs text-[#7D7870] font-semibold mt-0.5">Track your gentle outdoor walks</p>
                <div className="text-3xl font-black text-[#1A1A1A] my-3">{walkCount} <span className="text-xs font-bold">blocks</span></div>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeWalkLog(-1)}
                    className="w-8 h-8 rounded-lg bg-[#F3F1ED] border-2 border-[#1A1A1A] font-black text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeWalkLog(1)}
                    className="px-4 h-8 rounded-lg bg-[#FFD93D] border-2 border-[#1A1A1A] font-black text-xs shadow-[1px_1px_0px_0px_#1A1A1A] cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Walk
                  </button>
                </div>
              </div>

              {/* Water glasses */}
              <div className="bg-white rounded-xl p-4 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between items-center text-center">
                <div className="w-10 h-10 bg-[#4ECDC4] rounded-full flex items-center justify-center border-2 border-[#1A1A1A] text-xl mb-2">
                  💧
                </div>
                <h4 className="font-black text-sm text-[#1A1A1A]">Hydration Cup Log</h4>
                <p className="text-xs text-[#7D7870] font-semibold mt-0.5">8 glasses a day keeps you fresh</p>
                <div className="text-3xl font-black text-[#1A1A1A] my-3">{waterCount} <span className="text-xs font-bold">glasses</span></div>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeWaterLog(-1)}
                    className="w-8 h-8 rounded-lg bg-[#F3F1ED] border-2 border-[#1A1A1A] font-black text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeWaterLog(1)}
                    className="px-4 h-8 rounded-lg bg-[#4ECDC4] border-2 border-[#1A1A1A] font-black text-xs shadow-[1px_1px_0px_0px_#1A1A1A] cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log Glass
                  </button>
                </div>
              </div>

              {/* Smiles logged */}
              <div className="bg-white rounded-xl p-4 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A] flex flex-col justify-between items-center text-center">
                <div className="w-10 h-10 bg-[#FF6B6B] rounded-full flex items-center justify-center border-2 border-[#1A1A1A] text-xl mb-2">
                  😊
                </div>
                <h4 className="font-black text-sm text-[#1A1A1A]">SMILES shared today</h4>
                <p className="text-xs text-[#7D7870] font-semibold mt-0.5">A happy heart is a young heart</p>
                <div className="text-3xl font-black text-[#1A1A1A] my-3">{smileCount} <span className="text-xs font-bold">smiles</span></div>
                <div className="flex gap-2">
                  <button
                    onClick={() => changeSmileLog(-1)}
                    className="w-8 h-8 rounded-lg bg-[#F3F1ED] border-2 border-[#1A1A1A] font-black text-sm cursor-pointer"
                  >
                    -
                  </button>
                  <button
                    onClick={() => changeSmileLog(1)}
                    className="px-4 h-8 rounded-lg bg-[#FF6B6B] text-white border-2 border-[#1A1A1A] font-black text-xs shadow-[1px_1px_0px_0px_#1A1A1A] cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-white" /> Log Smile
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 3. MY MEMOIR COMPILER */}
        {subTab === 'memoir' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">✍️</span>
                <div>
                  <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
                    Nostalgic Autobiography Compiler
                  </h3>
                  <p className="text-xs text-[#7D7870] font-semibold">
                    Write down your heartwarming memories, first job details, childhood hobbies, and publish them to inspire the newer generation!
                  </p>
                </div>
              </div>

              <form onSubmit={handlePublishMemoir} className="space-y-4">
                {/* Memoir selection suggestions */}
                <div className="bg-[#FFD93D]/10 p-3.5 rounded-xl border-2 border-dashed border-[#1A1A1A] space-y-2">
                  <p className="text-xs font-black text-[#1A1A1A]">🌟 Memoir Writing Prompts: (Click to select topic)</p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "My Warmest Childhood Memory 🏡",
                      "How I Met My Best Friend 👥",
                      "A Beautiful Advice to the Youth 💡",
                      "My First Ever Job & Salary 💼",
                      "Sweet Lessons from My Grandparents 👴👵"
                    ].map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => setMemoirTitle(prompt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all cursor-pointer ${
                          memoirTitle === prompt
                            ? 'bg-[#FFD93D] border-[#1A1A1A] text-[#1A1A1A]'
                            : 'bg-white border-gray-200 text-[#1A1A1A] hover:border-gray-400'
                        }`}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-xs font-black text-[#1A1A1A] mb-1">Memoir Title / Header:</label>
                  <input
                    type="text"
                    required
                    value={memoirTitle}
                    onChange={(e) => setMemoirTitle(e.target.value)}
                    className="w-full p-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none text-xs focus:border-[#FF6B6B]"
                  />
                </div>

                {/* Body Content */}
                <div>
                  <label className="block text-xs font-black text-[#1A1A1A] mb-1">My Personal Story (Speak or type with care):</label>
                  <textarea
                    required
                    value={memoirBody}
                    onChange={(e) => setMemoirBody(e.target.value)}
                    placeholder="In the winter of 1956, our cozy neighborhood had the biggest snowfall ever..."
                    className="w-full min-h-[140px] p-3 bg-white border-3 border-[#1A1A1A] rounded-xl font-bold outline-none text-xs focus:border-[#FF6B6B] resize-none"
                  />
                </div>

                {/* Feedback */}
                {memoirFeedback && (
                  <p className="text-xs font-black text-green-600 bg-green-50 p-2.5 rounded-lg border border-green-200">
                    {memoirFeedback}
                  </p>
                )}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={isMemoirPublishing}
                    className="bg-[#FF6B6B] hover:bg-[#ff5252] text-white border-3 border-[#1A1A1A] px-6 py-2.5 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Feather className="w-4 h-4 text-white" />
                    {isMemoirPublishing ? "Publishing story..." : "Publish Memoir to Timeline ✓"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 4. SWEET GREETING CARDS */}
        {subTab === 'cards' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border-3 border-[#1A1A1A] shadow-[4px_4px_0px_0px_#1A1A1A]">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-3xl">💌</span>
                <div>
                  <h3 className={`${getTextSizeClass('text-lg')} font-black text-[#1A1A1A]`}>
                    Social Postcard & Greeting Card Maker
                  </h3>
                  <p className="text-xs text-[#7D7870] font-semibold">
                    Handcraft a custom cozy card, select stamp icons, select borders, and send them with heartwarming notes!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* Form controls - 6 Columns */}
                <form onSubmit={handleSendCard} className="lg:col-span-6 space-y-4">
                  
                  {/* Select Stamp */}
                  <div>
                    <label className="block text-xs font-black text-[#1A1A1A] mb-1.5">Select Greeting Stamp Emoji:</label>
                    <div className="flex gap-2">
                      {["🌸", "☀️", "🦋", "🥧", "☕", "🕊️", "🐾", "💐"].map((stamp) => (
                        <button
                          key={stamp}
                          type="button"
                          onClick={() => setCardStamp(stamp)}
                          className={`w-10 h-10 rounded-xl border-2 text-xl flex items-center justify-center transition-all cursor-pointer ${
                            cardStamp === stamp
                              ? 'bg-[#FFD93D] border-[#1A1A1A] scale-110 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                              : 'bg-white border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {stamp}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Select Theme Template */}
                  <div>
                    <label className="block text-xs font-black text-[#1A1A1A] mb-1.5">Select Postcard Design Theme:</label>
                    <div className="grid grid-cols-2 gap-2">
                      {CARD_TEMPLATES.map((tmpl) => (
                        <button
                          key={tmpl.id}
                          type="button"
                          onClick={() => setSelectedTemplate(tmpl)}
                          className={`p-2.5 rounded-xl border-2 text-left text-xs font-black transition-all cursor-pointer ${
                            selectedTemplate.id === tmpl.id
                              ? 'bg-[#FFD93D] border-[#1A1A1A] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
                              : 'bg-white border-gray-200 hover:border-gray-400'
                          }`}
                        >
                          {tmpl.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Recipient */}
                  <div>
                    <label className="block text-xs font-black text-[#1A1A1A] mb-1">To (Recipient name or 'All Friends'):</label>
                    <input
                      type="text"
                      placeholder="e.g., Arthur Pendelton or All Club Friends"
                      value={cardRecipient}
                      onChange={(e) => setCardRecipient(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-[#1A1A1A] rounded-xl font-bold outline-none text-xs focus:border-[#4ECDC4]"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs font-black text-[#1A1A1A] mb-1">Your Lovely Message (Short & Sweet):</label>
                    <textarea
                      required
                      maxLength={140}
                      rows={3}
                      placeholder="Wishing you a beautiful sunset and a cozy warm tea cup today! Happy to connect with you in Seniority!"
                      value={cardMessage}
                      onChange={(e) => setCardMessage(e.target.value)}
                      className="w-full p-2.5 bg-white border-2 border-[#1A1A1A] rounded-xl font-bold outline-none text-xs focus:border-[#4ECDC4] resize-none"
                    />
                    <div className="text-right text-[10px] text-gray-400 font-bold mt-0.5">
                      {cardMessage.length}/140 characters
                    </div>
                  </div>

                  {cardFeedback && (
                    <p className="text-xs font-black text-green-600 bg-green-50 p-2 rounded-lg border border-green-200">
                      {cardFeedback}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isCardPublishing}
                    className="w-full bg-[#4ECDC4] hover:bg-[#3db8af] text-[#1A1A1A] border-3 border-[#1A1A1A] py-2.5 rounded-xl text-xs font-black shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-y-0.5 hover:translate-x-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4 text-[#1A1A1A]" />
                    {isCardPublishing ? "Sending postcard..." : "Publish Greeting Card ✓"}
                  </button>

                </form>

                {/* Preview Card - 6 Columns */}
                <div className="lg:col-span-6 space-y-2">
                  <p className="text-xs font-black text-[#1A1A1A]">💌 Postcard Live Preview:</p>
                  
                  {/* Styled Postcard Design Frame */}
                  <div className={`p-6 rounded-3xl border-4 ${selectedTemplate.border} ${selectedTemplate.bg} ${selectedTemplate.text} shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] relative overflow-hidden min-h-[220px] flex flex-col justify-between`}>
                    
                    {/* Postcard stamp overlay top right */}
                    <div className="absolute top-4 right-4 w-12 h-14 bg-white border-2 border-dashed border-[#1A1A1A] rounded flex flex-col items-center justify-center shadow-xs">
                      <span className="text-lg">{cardStamp}</span>
                      <span className="text-[6px] font-black text-[#1A1A1A] tracking-tighter uppercase mt-0.5">Club Stamp</span>
                    </div>

                    <div>
                      {/* Recipient */}
                      <p className="text-xs font-black text-gray-400 uppercase tracking-wider mb-3">
                        To: {cardRecipient || "All Club Friends 👥"}
                      </p>

                      {/* Main Note */}
                      <p className="text-base font-bold italic leading-relaxed pr-10">
                        "{cardMessage || "Wishing you a beautiful day filled with smiling moments and cozy tea! ❤️"}"
                      </p>
                    </div>

                    {/* From */}
                    <div className="border-t border-dashed border-gray-300 pt-3 mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <img 
                          src={currentUser.photoURL} 
                          alt="Sender" 
                          className="w-6 h-6 rounded-full border border-[#1A1A1A] object-cover" 
                        />
                        <span className="text-xs font-black">{currentUser.displayName}</span>
                      </div>
                      <span className="text-[10px] font-black text-[#7D7870] uppercase tracking-wider">
                        Seniority Club Card
                      </span>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
