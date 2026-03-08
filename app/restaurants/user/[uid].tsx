import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../../constants/theme';
import { AuthService } from '../../../services/auth';
import { RestaurantService, type UserContributionWithRestaurant } from '../../../services/restaurantService';
import { useAuth } from '../../../contexts/AuthContext';
import StarRating from '../../../components/StarRating';
import ProfileCard from '../../../components/ProfileCard';
import type { RestaurantUserProfile } from '../../../types/restaurants';

export default function PublicProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated } = useAuth();

  const [profile, setProfile] = useState<RestaurantUserProfile | null>(null);
  const [contributions, setContributions] = useState<UserContributionWithRestaurant[]>([]);
  const [restaurantNames, setRestaurantNames] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    if (!isAuthenticated) {
      router.replace('/auth/login');
      return;
    }

    (async () => {
      try {
        const [prof, contribs] = await Promise.all([
          AuthService.getUserProfile(uid),
          RestaurantService.getContributionsByUser(uid),
        ]);
        setProfile(prof);
        setContributions(contribs);

        const uniqueIds = [...new Set(contribs.map(c => c.restaurantId))];
        const names: Record<string, string> = {};
        await Promise.all(
          uniqueIds.map(async (rid) => {
            const r = await RestaurantService.getRestaurant(rid);
            if (r) names[rid] = r.name;
          })
        );
        setRestaurantNames(names);
      } catch (err) {
        console.warn('[PublicProfile] Errore caricamento:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [uid, isAuthenticated]);

  // Loading & error states use a simple header (no profile color)
  if (isLoading || !profile) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.simpleHeader, { paddingTop: insets.top }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
            <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profilo</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          {isLoading ? (
            <ActivityIndicator color={theme.colors.primary} size="large" />
          ) : (
            <Text style={styles.errorText}>Profilo non trovato.</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ProfileCard profile={profile} onBack={() => router.back()}>
        {contributions.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recensioni</Text>
            {contributions.map((c) => {
              const restaurantName = restaurantNames[c.restaurantId] ?? 'Ristorante';
              const date = c.createdAt.toDate().toLocaleDateString('it-IT', {
                day: 'numeric', month: 'short', year: 'numeric',
              });
              return (
                <Surface key={c.id} style={styles.reviewCard} elevation={1}>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => router.push(`/restaurants/${c.restaurantId}`)}
                  >
                    <View style={styles.reviewHeader}>
                      <MaterialCommunityIcons name="store" size={16} color={theme.colors.primary} />
                      <Text style={styles.reviewRestaurant} numberOfLines={1}>
                        {restaurantName}
                      </Text>
                      <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.textSecondary} />
                    </View>
                    {c.rating != null && c.rating > 0 && (
                      <View style={styles.reviewRating}>
                        <StarRating rating={c.rating} size={14} />
                      </View>
                    )}
                    {c.text ? (
                      <Text style={styles.reviewText} numberOfLines={3}>{c.text}</Text>
                    ) : null}
                    {c.dishes.length > 0 && (
                      <Text style={styles.reviewDishes}>
                        {c.dishes.length} piatt{c.dishes.length === 1 ? 'o' : 'i'} aggiunti
                      </Text>
                    )}
                    <Text style={styles.reviewDate}>{date}</Text>
                  </TouchableOpacity>
                </Surface>
              );
            })}
          </>
        )}
      </ProfileCard>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  simpleHeader: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  reviewCard: {
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    padding: 16,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reviewRestaurant: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    flex: 1,
  },
  reviewRating: {
    marginTop: 8,
  },
  reviewText: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
    marginTop: 8,
  },
  reviewDishes: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 6,
  },
  reviewDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 4,
  },
});
