// ─────────────────────────────────────────────────────────────────────────────
// Firebase client – LAZY initialisation
//
// Next.js runs every imported module on the server during static pre-rendering.
// Calling initializeApp() / getAuth() at module scope throws auth/invalid-api-key
// because NEXT_PUBLIC_* vars are absent on the build server.
//
// Solution: export getter functions; Firebase is only initialised when a getter
// is first called, which only happens inside browser-side React hooks/effects.
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";

let _app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _storage: FirebaseStorage | undefined;

function initApp(): FirebaseApp {
  if (_app) return _app;
  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
  if (typeof window !== "undefined") {
    const missing = Object.entries(config)
      .filter(([, v]) => !v)
      .map(([k]) => `NEXT_PUBLIC_FIREBASE_${k.replace(/([A-Z])/g, "_$1").toUpperCase()}`);
    if (missing.length > 0) {
      console.error(
        `[Firebase] Missing env vars:\n${missing.join("\n")}\n` +
        `Copy .env.example to .env.local and restart the dev server.`
      );
    }
  }
  _app = getApps().length ? getApp() : initializeApp(config);
  return _app;
}

export function getClientAuth(): Auth {
  if (!_auth) _auth = getAuth(initApp());
  return _auth;
}

export function getClientDb(): Firestore {
  if (!_db) _db = getFirestore(initApp());
  return _db;
}

export function getClientStorage(): FirebaseStorage {
  if (!_storage) _storage = getStorage(initApp());
  return _storage;
}
