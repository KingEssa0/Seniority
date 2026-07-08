import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "seniority-social",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:585247914931:web:c8f44a0abe73b9ab0029c6",
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAAsv8nbvBIuGBZgqwNUnFN7khG99pjJ7Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "seniority-social.firebaseapp.com",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "seniority-social.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "585247914931",
  measurementId: "G-R2H2MYN0BF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics safely (works seamlessly even inside sandboxed browser iframes)
isSupported().then((supported) => {
  if (supported) {
    getAnalytics(app);
  }
}).catch((e) => console.log("Analytics is not supported in this browser context:", e));

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with the specific database ID from the config
// Automatically defaults to '(default)' for the production project seniority-social
const defaultDbId = firebaseConfig.projectId === "seniority-social" ? "(default)" : "ai-studio-40876d33-e3ba-4f0b-80de-88495a658156";
const dbId = import.meta.env.VITE_FIREBASE_DATABASE_ID || defaultDbId;
export const db = dbId === "(default)" ? getFirestore(app) : getFirestore(app, dbId);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
// Prompt the user to select their account
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

