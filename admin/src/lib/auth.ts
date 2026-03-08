'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from './firebase';

interface AuthState {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

export const AuthContext = createContext<AuthState>({
  user: null,
  isAdmin: false,
  loading: true,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>({
    user: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const tokenResult = await user.getIdTokenResult();
        setState({
          user,
          isAdmin: tokenResult.claims.admin === true,
          loading: false,
        });
      } else {
        setState({ user: null, isAdmin: false, loading: false });
      }
    });
    return unsubscribe;
  }, []);

  return state;
}
