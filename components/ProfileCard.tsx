import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { getAvatarById } from '../constants/avatars';
import DietaryNeedsChips from './DietaryNeedsChips';
import i18n from '../utils/i18n';
import type { UserProfile } from '../services/auth';

interface ProfileStats {
  restaurants: number;
  reviews: number;
  favorites: number;
}

interface ProfileCardProps {
  profile: UserProfile;
  stats?: ProfileStats;
  onBack: () => void;
  onEdit?: () => void;
  onEditDietary?: () => void;
  title?: string;
  headerRight?: React.ReactNode;
  children?: React.ReactNode;
}

export default function ProfileCard({ profile, stats, onBack, onEdit, onEditDietary, title = 'Profilo', headerRight, children }: ProfileCardProps) {
  const insets = useSafeAreaInsets();

  const avatarOption = profile.avatar_url ? getAvatarById(profile.avatar_url) : undefined;
  const initial = profile.display_name?.charAt(0)?.toUpperCase();

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(i18n.locale, { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      {/* Header standard verde */}
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={onBack} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        {headerRight ?? <View style={{ width: 24 }} />}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Profilo: avatar + nome in riga, stile Airbnb */}
        <Surface style={styles.profileCard} elevation={1}>
          <View style={styles.profileRow}>
            {avatarOption?.source ? (
              <Image source={avatarOption.source} style={styles.avatarImage} />
            ) : initial ? (
              <View style={styles.avatarFallback}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
            ) : (
              <MaterialCommunityIcons name="account-circle-outline" size={AVATAR_SIZE} color={theme.colors.primary} />
            )}
            <View style={styles.profileText}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{profile.display_name || 'Utente'}</Text>
                {profile.is_anonymous && (
                  <MaterialCommunityIcons name="incognito" size={18} color={theme.colors.textSecondary} />
                )}
              </View>
              {memberSince ? (
                <Text style={styles.memberSince}>Membro da {memberSince}</Text>
              ) : null}
            </View>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} hitSlop={8} activeOpacity={0.6}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Stats */}
          <View style={styles.divider} />
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.restaurants ?? 0}</Text>
              <Text style={styles.statLabel}>Ristoranti</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.reviews ?? 0}</Text>
              <Text style={styles.statLabel}>Recensioni</Text>
            </View>
            <View style={styles.statSep} />
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{stats?.favorites ?? 0}</Text>
              <Text style={styles.statLabel}>Preferiti</Text>
            </View>
          </View>

          {/* Esigenze alimentari (allergeni + diete) */}
          {((profile.allergens?.length ?? 0) > 0 || (profile.dietary_preferences?.length ?? 0) > 0) && (
            <>
              <View style={styles.divider} />
              <View style={styles.dietaryHeaderRow}>
                <Text style={styles.allergensLabel}>Profilo alimentare</Text>
                {onEditDietary && (
                  <TouchableOpacity
                    onPress={onEditDietary}
                    hitSlop={8}
                    activeOpacity={0.6}
                    style={styles.dietaryEditButton}
                  >
                    <MaterialCommunityIcons name="pencil-outline" size={14} color={theme.colors.primary} />
                    <Text style={styles.dietaryEditButtonText}>Modifica</Text>
                  </TouchableOpacity>
                )}
              </View>
              <DietaryNeedsChips
                allergens={profile.allergens ?? []}
                diets={profile.dietary_preferences ?? []}
                lang={i18n.locale?.split('-')[0] ?? 'it'}
              />
            </>
          )}
        </Surface>

        {children}
      </ScrollView>
    </View>
  );
}

const AVATAR_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  profileCard: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    padding: 20,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarImage: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    resizeMode: 'contain',
  },
  avatarFallback: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  profileText: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  memberSince: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  statSep: {
    width: 1,
    height: 28,
    backgroundColor: theme.colors.divider,
  },
  allergensLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  dietaryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dietaryEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.primaryLight,
  },
  dietaryEditButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
