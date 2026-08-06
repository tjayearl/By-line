import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCpkfljdPUuIImqw6tmTR0hj5wXY0sXSfM",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "byline-kbc.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "byline-kbc",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "byline-kbc.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "720164419734",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:720164419734:web:ecddb9d35c22c9969b6ab7",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

