import { supabase } from './supabase';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type { DietaryNeeds } from '../types';

// Tipo utente compatibile con l'interfaccia usata nell'app
export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

// Profilo utente dalla tabella profiles
export interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  allergens: string[];
  dietary_preferences: string[];
  profile_color: string | null;
  role: 'user' | 'restaurant_owner' | 'admin';
  created_at: string;
}

function mapUser(user: SupabaseUser | null): AppUser | null {
  if (!user) return null;
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: user.user_metadata?.display_name ?? user.email ?? null,
  };
}

async function signUp(email: string, password: string, displayName: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  });
  if (error) throw error;
  if (!data.user) throw new Error('Registrazione fallita');

  // Crea il profilo (lazy creation garantisce che esista sempre)
  await ensureProfile(data.user.id, displayName);

  return mapUser(data.user)!;
}

async function signIn(email: string, password: string): Promise<AppUser> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return mapUser(data.user)!;
}

async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

async function getCurrentUser(): Promise<AppUser | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return mapUser(user);
}

function onAuthStateChanged(callback: (user: AppUser | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event: string, session: Session | null) => {
      callback(mapUser(session?.user ?? null));
    }
  );
  return () => subscription.unsubscribe();
}

async function ensureProfile(userId: string, displayName?: string | null): Promise<UserProfile> {
  // Prova a leggere il profilo
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (data) return data;

  // Profilo mancante — crealo (lazy creation)
  const { data: created, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: displayName ?? null })
    .select()
    .single();
  if (error) throw error;
  return created;
}

async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn('[Auth] Errore nel recupero profilo utente:', error);
    return null;
  }
}

async function updateUserAvatar(userId: string, avatarId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: avatarId })
    .eq('id', userId);
  if (error) throw error;
}

async function updateProfileColor(userId: string, color: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ profile_color: color })
    .eq('id', userId);
  if (error) throw error;
}

async function updateDisplayName(userId: string, displayName: string): Promise<void> {
  // Aggiorna sia auth metadata che profilo
  const { error: authError } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });
  if (authError) throw authError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ display_name: displayName })
    .eq('id', userId);
  if (profileError) throw profileError;
}

async function deleteAccount(userId: string): Promise<void> {
  // Chiama la Edge Function che elimina profilo + auth.users con service_role
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Utente non autenticato');

  const { data, error } = await supabase.functions.invoke('delete-account', {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  // Sign out locale (sessione non piu valida)
  await supabase.auth.signOut();
}

async function updateDietaryNeeds(userId: string, dietaryNeeds: DietaryNeeds): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      allergens: dietaryNeeds.allergens,
      dietary_preferences: dietaryNeeds.diets,
    })
    .eq('id', userId);
  if (error) throw error;
}

async function sendPasswordReset(email: string): Promise<void> {
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}

export const AuthService = {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  onAuthStateChanged,
  ensureProfile,
  getUserProfile,
  updateUserAvatar,
  updateProfileColor,
  updateDisplayName,
  deleteAccount,
  sendPasswordReset,
  updateDietaryNeeds,
};
