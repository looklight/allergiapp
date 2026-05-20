import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { getRestrictionById } from '../constants/foodRestrictions';
import i18n from '../utils/i18n';
import { getDisplayName } from '../utils/getDisplayName';
import type { UserProfile } from '../services/auth';
import Avatar from './Avatar';
import AppHeader from '../app/components/AppHeader';

interface ProfileStats {
  likes?: number;
  reviews?: number;
  favorites?: number;
}

interface ProfileCardProps {
  profile: UserProfile;
  stats?: ProfileStats;
  /** Override del numero "like" — se passato, sostituisce il <Text> statico
   *  (usato per renderizzare AnimatedLikesCounter sul profilo proprio). */
  likesSlot?: React.ReactNode;
  onBack: () => void;
  onEdit?: () => void;
  onEditDietary?: () => void;
  onAvatarPress?: () => void;
  title?: string;
  children?: React.ReactNode;
}

export default function ProfileCard({ profile, stats, likesSlot, onBack, onEdit, onEditDietary, onAvatarPress, title = i18n.t('restaurants.profileCard.title'), children }: ProfileCardProps) {
  const insets = useSafeAreaInsets();
  const displayName = getDisplayName(profile);

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(i18n.locale, { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      <AppHeader title={title} onLeadingPress={onBack} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
      >
        {/* Profilo: avatar + nome in riga, stile Airbnb */}
        <Surface style={styles.profileCard} elevation={0}>
          <View style={styles.profileRow}>
            {onAvatarPress ? (
              <TouchableOpacity
                onPress={onAvatarPress}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={i18n.t('restaurants.profileCard.openAvatars')}
              >
                <Avatar
                  avatarId={profile.avatar_url}
                  isAnonymous={profile.is_anonymous}
                  initial={displayName ?? undefined}
                  size={110}
                />
              </TouchableOpacity>
            ) : (
              <Avatar
                avatarId={profile.avatar_url}
                isAnonymous={profile.is_anonymous}
                initial={displayName ?? undefined}
                size={110}
              />
            )}
            <View style={styles.profileText}>
              <View style={styles.nameRow}>
                <Text style={styles.displayName}>{displayName || i18n.t('restaurants.profileCard.defaultName')}</Text>
                {profile.is_anonymous && (
                  <MaterialCommunityIcons name="incognito" size={18} color={theme.colors.textSecondary} />
                )}
              </View>
              {memberSince ? (
                <Text style={styles.memberSince}>{i18n.t('restaurants.profileCard.memberSince', { date: memberSince })}</Text>
              ) : null}
            </View>
            {onEdit && (
              <TouchableOpacity onPress={onEdit} hitSlop={8} activeOpacity={0.6}>
                <MaterialCommunityIcons name="pencil-outline" size={20} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Profilo alimentare (integrato sopra le stats).
              Mostrato sempre sul profilo proprio (onEditDietary presente) così
              che l'utente possa aggiungere esigenze anche dopo aver scelto "nessuna". */}
          {(() => {
            const hasNeeds =
              (profile.allergens?.length ?? 0) > 0 ||
              (profile.dietary_preferences?.length ?? 0) > 0;
            if (!hasNeeds && !onEditDietary) return null;
            return (
              <>
                <View style={styles.divider} />
                <View style={styles.dietaryHeaderRow}>
                  <Text style={styles.allergensLabel}>{i18n.t('restaurants.profileCard.dietaryProfile')}</Text>
                  {onEditDietary && (
                    <TouchableOpacity
                      onPress={onEditDietary}
                      hitSlop={8}
                      activeOpacity={0.6}
                      style={styles.dietaryEditButton}
                    >
                      <MaterialCommunityIcons
                        name={hasNeeds ? 'pencil-outline' : 'plus'}
                        size={14}
                        color={theme.colors.textSecondary}
                      />
                      <Text style={styles.dietaryEditButtonText}>
                        {hasNeeds ? i18n.t('common.edit') : i18n.t('common.add')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
                {hasNeeds ? (
                  <View style={styles.allergensRow}>
                    {[...(profile.dietary_preferences ?? []), ...(profile.allergens ?? [])].map((id) => {
                      const r = getRestrictionById(id);
                      if (!r) return null;
                      const lang = i18n.locale?.split('-')[0] as keyof typeof r.translations;
                      const name = r.translations[lang] ?? r.translations.it ?? r.translations.en;
                      return (
                        <View key={id} style={styles.allergenBadge}>
                          <Text style={styles.allergenBadgeText}>{name}</Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <View style={styles.allergensRow}>
                    <View style={styles.allergenBadgeEmpty}>
                      <Text style={styles.allergenBadgeEmptyText}>
                        {i18n.t('restaurants.profileCard.dietaryEmpty')}
                      </Text>
                    </View>
                  </View>
                )}
              </>
            );
          })()}

          {/* Stats — render solo le metriche fornite */}
          {(stats?.reviews != null || stats?.likes != null || stats?.favorites != null) && (
            <>
              <View style={styles.divider} />
              <View style={styles.statsRow}>
                {stats?.reviews != null && (
                  <View style={styles.statItem}>
                    <Text style={styles.statNumber}>{stats.reviews}</Text>
                    <Text style={styles.statLabel}>{i18n.t('restaurants.profileCard.statReviews')}</Text>
                  </View>
                )}
                {stats?.reviews != null && stats?.likes != null && <View style={styles.statSep} />}
                {stats?.likes != null && (
                  <View style={styles.statItem}>
                    {likesSlot ?? <Text style={styles.statNumber}>{stats.likes}</Text>}
                    <Text style={styles.statLabel}>{i18n.t('restaurants.profileCard.statLikes')}</Text>
                  </View>
                )}
                {stats?.favorites != null && (
                  <>
                    <View style={styles.statSep} />
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{stats.favorites}</Text>
                      <Text style={styles.statLabel}>{i18n.t('restaurants.profileCard.statFavorites')}</Text>
                    </View>
                  </>
                )}
              </View>
            </>
          )}

        </Surface>

        {children}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
  allergensRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  allergenBadge: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  allergenBadgeText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  allergenBadgeEmpty: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
  },
  allergenBadgeEmptyText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  dietaryEditButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  dietaryEditButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
