
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ur' | 'hi' | 'pa' | 'nl' | 'ar' | 'pt';

export interface User {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  phoneNumber: string; // Full number with country code
  location: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  language?: Language;
}

export interface GameSession {
  id: string;
  gameId: string;
  players: string[]; // UIDs
  status: 'waiting' | 'playing' | 'finished';
  currentTurn: string; // UID
  boardState: any[];
  winner?: string;
  updatedAt: any;
}

export interface Circle {
  id: string;
  name: string;
  icon: string;
  color: string;
  members: string[];
  description?: string;
}

export interface Post {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  authorLocation: string;
  content: string;
  image?: string;
  createdAt: any;
  likes: string[];
  isMemory?: boolean;
  circleId?: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any;
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  descriptionKey: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface AppState {
  language: Language;
  fontSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  voiceEnabled: boolean;
  user: User | null;
}
