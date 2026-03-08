import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import { AuthService } from '../services/auth';
import type { RestaurantUserProfile } from '../types/restaurants';
import type { DietaryNeeds } from '../types';

interface AuthContextValue {
  user: User | null;
  userProfile: RestaurantUserProfile | null;
  dietaryNeeds: DietaryNeeds;
  isLoading: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
}

const EMPTY_DIETARY_NEEDS: DietaryNeeds = { allergens: [], diets: [] };

const AuthContext = createContext<AuthContextValue>({
  user: null,
  userProfile: null,
  dietaryNeeds: EMPTY_DIETARY_NEEDS,
  isLoading: true,
  isAuthenticated: false,
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<RestaurantUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProfile = async (u: User) => {
    const profile = await AuthService.getUserProfile(u.uid);
    setUserProfile(profile);
  };

  const refreshProfile = async () => {
    if (user) await loadProfile(user);
  };

  useEffect(() => {
    const unsubscribe = AuthService.onAuthStateChanged(async (u) => {
      setUser(u);
      try {
        if (u) {
          await loadProfile(u);
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.warn('[AuthContext] Failed to load profile:', error);
        setUserProfile(null);
      } finally {
        setIsLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      dietaryNeeds: userProfile?.dietaryNeeds ?? EMPTY_DIETARY_NEEDS,
      isLoading,
      isAuthenticated: !!user,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
