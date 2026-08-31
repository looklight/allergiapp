'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { supabase } from './supabase';
import { resetLists } from './storage';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  session: null,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    loading: true,
  });

  // Chi era collegato l'ultima volta che abbiamo guardato. Serve a distinguere
  // il cambio di persona dal rinnovo del token, che arriva sullo stesso
  // canale ogni ora e non deve buttare via niente.
  const utente = useRef<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      utente.current = session?.user.id ?? null;
      setState({ session, loading: false });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (id !== utente.current) {
        utente.current = id;
        // Vetrine e piatti letti prima erano di un'altra persona
        resetLists();
      }
      setState({ session, loading: false });
    });

    return () => subscription.unsubscribe();
  }, []);

  return state;
}
