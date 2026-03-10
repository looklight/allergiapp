'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Session } from '@supabase/supabase-js';

interface AuthState {
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  session: null,
  isAdmin: false,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    session: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    // Sessione iniziale
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        checkAdmin(session);
      } else {
        setState({ session: null, isAdmin: false, loading: false });
      }
    });

    // Ascolta cambi auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        checkAdmin(session);
      } else {
        setState({ session: null, isAdmin: false, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkAdmin(session: Session) {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    setState({
      session,
      isAdmin: data?.role === 'admin',
      loading: false,
    });
  }

  return state;
}
