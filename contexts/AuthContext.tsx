import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthService, type AppUser, type UserProfile } from '../services/auth';
import { Crashlytics } from '../services/crashlytics';
import { useLastSeen } from '../hooks/useLastSeen';
import type { DietaryNeeds } from '../types';

interface AuthContextValue {
  user: AppUser | null;
  userProfile: UserProfile | null;
  dietaryNeeds: DietaryNeeds;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;
  refreshProfile: () => Promise<void>;
}

const EMPTY_DIETARY_NEEDS: DietaryNeeds = { allergens: [], diets: [] };

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  dietaryNeeds: EMPTY_DIETARY_NEEDS,
  isLoading: true,
  isAuthenticated: false,
  needsOnboarding: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (u: AppUser) => {
    // ensureProfile crea il profilo se mancante (lazy creation);
    // il trigger DB assegna username automatico.
    const profile = await AuthService.ensureProfile(u.uid);
    setUserProfile(profile);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (u) => {
      setUser(u);
      Crashlytics.setUserId(u?.uid ?? null);
      try {
        if (u) {
          await loadProfile(u);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.warn('[AuthContext] Failed to load profile:', error);
        Crashlytics.recordError(error as Error, 'AuthProfileLoadError');
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  // Presence "Ultimo accesso" per la dashboard admin: aggiorna last_seen_at
  // all'avvio con sessione e al ritorno in foreground (throttlato).
  useLastSeen(user?.uid ?? null);

  const dietaryNeeds: DietaryNeeds = userProfile
    ? {
        allergens: userProfile.allergens as DietaryNeeds['allergens'],
        diets: userProfile.dietary_preferences as DietaryNeeds['diets'],
      }
    : EMPTY_DIETARY_NEEDS;

  const needsOnboarding = !!user && !!userProfile && !userProfile.onboarding_complete;

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      dietaryNeeds,
      isLoading,
      isAuthenticated: !!user,
      needsOnboarding,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
