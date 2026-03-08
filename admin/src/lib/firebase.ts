import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyAnVDaPPkfd2gryea3o8-LoDJ5oVycv4sQ',
  authDomain: 'allergiapp-7bdf3.firebaseapp.com',
  projectId: 'allergiapp-7bdf3',
  storageBucket: 'allergiapp-7bdf3.firebasestorage.app',
  messagingSenderId: '283693662836',
  appId: '1:283693662836:web:38abbdf3fe259bb1988721',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const db = getFirestore(app);
