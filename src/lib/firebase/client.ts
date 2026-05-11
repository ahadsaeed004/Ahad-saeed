import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const requiredVars = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Warn clearly in dev if .env.local is not configured
if (typeof window !== "undefined") {
  const missing = Object.entries(requiredVars)
    .filter(([, v]) => !v)
    .map(([k]) => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`);

  if (missing.length > 0) {
    console.error(
      `[Firebase] Missing environment variables:\n${missing.join("\n")}\n\n` +
      `Copy .env.example to .env.local and fill in your Firebase project credentials.\n` +
      `Get them from: Firebase Console → Project Settings → Your Apps`
    );
  }
}

const firebaseConfig = requiredVars;

// Prevent re-initialization in hot-reload / multiple imports
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;