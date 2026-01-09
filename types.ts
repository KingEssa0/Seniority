
export type Language = 'en' | 'es' | 'fr' | 'de' | 'it' | 'zh' | 'ur' | 'hi' | 'pa' | 'nl' | 'ar' | 'pt';

export interface Notification {
  id: string;
  type: 'friend_request' | 'like' | 'comment' | 'challenge' | 'group_invite';
  fromId: string;
  fromName: string;
  fromAvatar: string;
  timestamp: any;
  read: boolean;
  relatedId?: string; 
}

export interface Group {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  members: string[];
  avatar: string;
  createdAt: any;
}

export interface User {
  id: string;
  uid: string;
  name: string;
  avatar: string;
  phoneNumber: string;
  location: string;
  bio?: string;
  following?: string[]; 
  followers?: string[];
  pendingRequests?: string[]; 
  sentRequests?: string[]; 
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
  comments?: Comment[];
}

export interface Game {
  id: string;
  name: string;
  icon: string;
  descriptionKey: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}
