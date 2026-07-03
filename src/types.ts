export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL: string;
  email: string;
  bio: string;
  hobbies: string[];
  location: string;
  createdAt: any;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  category: string;
  imageUrl?: string;
  reactions: {
    smile: string[];     // userIds who clicked 😊
    love: string[];      // userIds who clicked ❤️
    support: string[];   // userIds who clicked 🤗
    inspiring: string[]; // userIds who clicked 🌟
  };
  commentsCount: number;
  createdAt: any;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  content: string;
  createdAt: any;
}

export interface Circle {
  id: string;
  name: string;
  description: string;
  emoji: string;
  memberCount: number;
}
