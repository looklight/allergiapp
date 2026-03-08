import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail as firebaseSendPasswordReset,
  deleteUser,
  type User,
} from 'firebase/auth';
import {
  doc, setDoc, getDoc, updateDoc, deleteDoc, getDocs,
  collection, query, where, collectionGroup, writeBatch, Timestamp,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { RestaurantUserProfile } from '../types/restaurants';

async function createUserProfile(user: User, displayName: string): Promise<void> {
  const profile: Omit<RestaurantUserProfile, 'uid'> = {
    displayName,
    email: user.email ?? '',
    photoURL: user.photoURL ?? undefined,
    createdAt: Timestamp.now(),
    restaurantsAdded: 0,
    dishesAdded: 0,
    reviewsAdded: 0,
    contributionsAdded: 0,
  };
  await setDoc(doc(db, 'users', user.uid), profile);
}

async function signUp(email: string, password: string, displayName: string): Promise<User> {
  const { user } = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(user, { displayName });
  await createUserProfile(user, displayName);
  return user;
}

async function signIn(email: string, password: string): Promise<User> {
  const { user } = await signInWithEmailAndPassword(auth, email, password);
  return user;
}

async function signOut(): Promise<void> {
  await firebaseSignOut(auth);
}

function getCurrentUser(): User | null {
  return auth.currentUser;
}

function onAuthStateChanged(callback: (user: User | null) => void): () => void {
  return firebaseOnAuthStateChanged(auth, callback);
}

async function getUserProfile(userId: string): Promise<RestaurantUserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', userId));
    if (!snap.exists()) return null;
    return { uid: snap.id, ...snap.data() } as RestaurantUserProfile;
  } catch (error) {
    console.warn('[Auth] Errore nel recupero profilo utente:', error);
    return null;
  }
}

async function updateUserAvatar(userId: string, avatarId: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { avatarId });
}

async function updateProfileColor(userId: string, color: string): Promise<void> {
  await updateDoc(doc(db, 'users', userId), { profileColor: color });
}

async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  const currentUser = auth.currentUser;
  if (currentUser) {
    await updateProfile(currentUser, { displayName });
  }
  await updateDoc(doc(db, 'users', userId), { displayName });

  // Aggiorna il nome a cascata nei ristoranti e contributi dell'utente
  propagateDisplayName(userId, displayName).catch((err) =>
    console.warn('[Auth] Errore propagazione displayName:', err)
  );
}

async function propagateDisplayName(userId: string, displayName: string): Promise<void> {
  // Ristoranti aggiunti dall'utente
  const restaurantsSnap = await getDocs(
    query(collection(db, 'restaurants'), where('addedBy', '==', userId), where('status', '==', 'active'))
  );

  // Contributi dell'utente
  const contributionsSnap = await getDocs(
    query(collectionGroup(db, 'contributions'), where('userId', '==', userId), where('status', '==', 'active'))
  );

  // Batch update (max 500 per batch)
  const allDocs = [
    ...restaurantsSnap.docs.map((d) => ({ ref: d.ref, field: 'addedByName' })),
    ...contributionsSnap.docs.map((d) => ({ ref: d.ref, field: 'displayName' })),
  ];

  for (let i = 0; i < allDocs.length; i += 500) {
    const batch = writeBatch(db);
    allDocs.slice(i, i + 500).forEach(({ ref, field }) => {
      batch.update(ref, { [field]: displayName });
    });
    await batch.commit();
  }
}

async function deleteAccount(userId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId));
  const currentUser = auth.currentUser;
  if (currentUser) {
    await deleteUser(currentUser);
  }
}

async function sendPasswordReset(email: string): Promise<void> {
  await firebaseSendPasswordReset(auth, email);
}

export const AuthService = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  getUserProfile,
  updateUserAvatar,
  updateProfileColor,
  updateDisplayName,
  deleteAccount,
  sendPasswordReset,
  isAvailable: () => true,
};
