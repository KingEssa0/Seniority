// Curated senior-friendly beautiful eye-safe image URLs
export const CURATED_IMAGES = [
  {
    id: "garden",
    name: "🌸 Blooming Garden",
    url: "https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "tea",
    name: "☕ Warm Tea Mug",
    url: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "dog",
    name: "🐕 Friendly Dog",
    url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "sunset",
    name: "🌅 Golden Sunset",
    url: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "bread",
    name: "🍞 Home Baked Bread",
    url: "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=600",
  },
  {
    id: "knitting",
    name: "🧶 Knitting Yarn",
    url: "https://images.unsplash.com/photo-1584992236310-6edddc08acff?auto=format&fit=crop&q=80&w=600",
  }
];

// Beautiful uplifting quotes for seniors to put on top of their timeline
export const INSPIRING_QUOTES = [
  "\"Beautiful memories are like stars in the night sky, forever shining to light our path.\" — Anonymous",
  "\"Age is not lost youth but a new stage of opportunity and strength.\" — Betty Friedan",
  "\"The longer I live, the more beautiful life becomes.\" — Frank Lloyd Wright",
  "\"Grow old along with me! The best is yet to be.\" — Robert Browning",
  "\"Keep a green tree in your heart and perhaps a singing bird will come.\" — Chinese Proverb",
  "\"Memories are a warm blanket on a winter night.\" — Anonymous",
  "\"Every day is a gift, and every connection is a treasure.\" — Warm Greeting",
  "\"We do not grow old; we become riper, wiser, and more beautiful.\" — Jean Paul Richter"
];

// Speech Synthesis Helper
let currentUtterance: SpeechSynthesisUtterance | null = null;

export function speakText(text: string, onEnd?: () => void) {
  if (!('speechSynthesis' in window)) {
    console.warn("Speech synthesis not supported in this browser");
    return;
  }

  // Stop any ongoing speech
  window.speechSynthesis.cancel();

  // Create clean text (removing extra spaces or emojis if needed, but SpeechSynthesis is smart with emojis)
  const cleanText = text.replace(/[😊❤️🤗🌟🌸📸🏡🍳🎨🐶❓☕🐕🌅🍞🧶]/g, '');

  currentUtterance = new SpeechSynthesisUtterance(cleanText);
  currentUtterance.rate = 0.9; // Slightly slower for senior readability
  currentUtterance.pitch = 1.05; // Friendly pitch

  if (onEnd) {
    currentUtterance.onend = () => {
      onEnd();
    };
    currentUtterance.onerror = () => {
      onEnd();
    };
  }

  window.speechSynthesis.speak(currentUtterance);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

// Demo Elder profiles for fallback login
export const DEMO_SENIORS = [
  {
    uid: "demo_margaret",
    displayName: "Margaret Jenkins",
    photoURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    email: "margaret.jenkins@seniority-social.com",
    bio: "Loving grandmother of four. Passionate about rose gardens, watercolor painting, and baking warm sourdough bread.",
    hobbies: ["Gardening", "Painting", "Baking", "Classical Music"],
    location: "Portland, OR",
  },
  {
    uid: "demo_arthur",
    displayName: "Arthur Pendelton",
    photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    email: "arthur.pendelton@seniority-social.com",
    bio: "Retired high school history teacher. Woodworking enthusiast, stamp collector, and lover of golden retriever dogs.",
    hobbies: ["Woodworking", "History", "Dog Walking", "Stamp Collecting"],
    location: "Boston, MA",
  },
  {
    uid: "demo_evelyn",
    displayName: "Evelyn Harris",
    photoURL: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&q=80&w=150",
    email: "evelyn.harris@seniority-social.com",
    bio: "Enjoy knitting sweaters for local animal shelters. Passionate about organic tea, mystery books, and piano music.",
    hobbies: ["Knitting", "Reading", "Tea Brewing", "Piano"],
    location: "Austin, TX",
  }
];
