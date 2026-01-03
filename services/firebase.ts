
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, getDoc, getDocs, setDoc, where, limit, 
  collectionGroup, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
  getStorage, ref, uploadString, getDownloadURL 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBvv_MSUtZuj3nRdBbUm70rL7IgOTrtfMs",
  authDomain: "seniority-60557.firebaseapp.com",
  projectId: "seniority-60557",
  storageBucket: "seniority-60557.firebasestorage.app",
  messagingSenderId: "888829898296",
  appId: "1:888829898296:web:e928d8b8812b5453b400cd",
  measurementId: "G-KR5XQ7Q5K6"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Initialize Firestore with modern persistent cache settings to avoid deprecation warnings
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
});

export const storage = getStorage(app);

export { 
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, 
  updateDoc, doc, arrayUnion, arrayRemove, getDoc, getDocs, setDoc, where, limit,
  signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged,
  ref, uploadString, getDownloadURL, collectionGroup, deleteDoc
};
