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
  apiKey: 'AIzaSyAnVDaPPkfd2gryea3o8-LoDJ5oVycv4sQ',
  authDomain: 'allergiapp-7bdf3.firebaseapp.com',
  projectId: 'allergiapp-7bdf3',
  storageBucket: 'allergiapp-7bdf3.firebasestorage.app',
  messagingSenderId: '283693662836',
  appId: '1:283693662836:web:38abbdf3fe259bb1988721',
  measurementId: 'G-N05D83SNW2',
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
