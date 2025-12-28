
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ur' | 'hi' | 'pa' | 'nl' | 'ar' | 'pt';

export interface User {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  location: string;
  bio?: string;
  following?: string[];
  followers?: string[];
  language?: Language;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar: string;
  content: string;
  createdAt: any;
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
}

export interface Chat {
  id: string;
  participants: string[];
  lastMessage?: string;
  updatedAt: any;
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
