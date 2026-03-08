import { initializeApp, getApps } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  // @ts-ignore - getReactNativePersistence exists at runtime
  getReactNativePersistence,
} from '@firebase/auth';
import { initializeFirestore, getFirestore, memoryLocalCache } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase JS SDK — funziona in Expo Go senza build nativo.
// Configurazione web app dal progetto Firebase (allergiapp-7bdf3).
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase (singleton pattern)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with React Native persistence
let auth: ReturnType<typeof getAuth>;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Auth already initialized (hot reload)
  auth = getAuth(app);
}
export { auth };

// Initialize Firestore with memory cache (come Altrove)
let db: ReturnType<typeof getFirestore>;
try {
  db = initializeFirestore(app, {
    localCache: memoryLocalCache(),
  });
} catch {
  // Firestore already initialized (hot reload)
  db = getFirestore(app);
}
export { db };

// Initialize Storage
const storage = getStorage(app);
export { storage };

export default app;
