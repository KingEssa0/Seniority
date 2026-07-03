import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: "emerald-ocean-jj1d7",
  appId: "1:341745223000:web:0944eb2606caea2e45112d",
  apiKey: "AIzaSyDtuXyBLjyzMwNnkFeG_u2ZePe1H-x6eqg",
  authDomain: "emerald-ocean-jj1d7.firebaseapp.com",
  storageBucket: "emerald-ocean-jj1d7.firebasestorage.app",
  messagingSenderId: "341745223000",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);

// Initialize Firestore with the specific database ID from the config
export const db = getFirestore(app, "ai-studio-40876d33-e3ba-4f0b-80de-88495a658156");

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
// Prompt the user to select their account
googleProvider.setCustomParameters({
  prompt: 'select_account'
});
