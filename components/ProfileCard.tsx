import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
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
  /** Elemento reso subito sotto la sezione profilo e reso "sticky" in alto allo scroll. */
  stickyHeader?: React.ReactNode;
  /** Ref alla ScrollView interna — consente al chiamante di scrollare a un offset (es. a una card). */
  scrollRef?: React.RefObject<ScrollView | null>;
  children?: React.ReactNode;
}

export default function ProfileCard({ profile, stats, likesSlot, onBack, onEdit, onEditDietary, onAvatarPress, title = i18n.t('restaurants.profileCard.title'), stickyHeader, scrollRef, children }: ProfileCardProps) {
  const insets = useSafeAreaInsets();
  const displayName = getDisplayName(profile);

  // Per tenere lo sticky header agganciato anche quando il contenuto sotto è poco
  // (es. filtro che lascia 1 sola card): garantiamo che il contenuto sia alto almeno
  // (posizione dell'header sticky) + (altezza viewport). Così resta una schermata di
  // spazio sotto l'header e lo scroll non rimbalza su.
  const [viewportH, setViewportH] = useState(0);
  const [stickyY, setStickyY] = useState(0);
  const fillMinHeight = stickyHeader && viewportH > 0 ? stickyY + viewportH : null;

  const memberSince = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString(i18n.locale, { month: 'long', year: 'numeric' })
    : '';

  return (
    <View style={styles.container}>
      <AppHeader
        title={title}
        onLeadingPress={onBack}
        actions={
          onEdit
            ? [{ icon: 'pencil-outline', onPress: onEdit, accessibilityLabel: i18n.t('common.edit') }]
            : undefined
        }
      />

      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 24 },
          fillMinHeight != null && { minHeight: fillMinHeight },
        ]}
        stickyHeaderIndices={stickyHeader ? [1] : undefined}
      >
        {/* Profilo: avatar + nome in riga, stile Airbnb.
            Niente card contenitore: il contenuto usa tutta la larghezza
            cosi' la colonna testo accanto all'avatar ha piu' spazio. */}
        <View style={styles.profileSection}>
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
              {(stats?.reviews != null || stats?.likes != null) && (
                <View style={styles.inlineStatsRow}>
                  {stats?.reviews != null && (
                    <View style={styles.inlineStat}>
                      <Text style={styles.inlineStatNumber}>{stats.reviews}</Text>
                      <Text style={styles.inlineStatLabel}>{i18n.t('restaurants.profileCard.statReviews')}</Text>
                    </View>
                  )}
                  {stats?.likes != null && (
                    <View style={styles.inlineStat}>
                      {likesSlot ?? <Text style={styles.inlineStatNumber}>{stats.likes}</Text>}
                      <Text style={styles.inlineStatLabel}>{i18n.t('restaurants.profileCard.statLikes')}</Text>
                    </View>
                  )}
                </View>
              )}
            </View>
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
                <View style={styles.dividerBottom} />
              </>
            );
          })()}

        </View>

        {stickyHeader != null && (
          <View
            style={styles.stickyWrap}
            onLayout={(e) => setStickyY(e.nativeEvent.layout.y)}
          >
            {stickyHeader}
          </View>
        )}

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
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 12,
  },
  // Avvicina l'header sticky (filtri/mappa) al divisore che lo precede, annullando
  // gran parte del gap della lista solo in questo punto (non tra le card).
  stickyWrap: {
    marginTop: -8,
  },
  profileSection: {
    paddingVertical: 0,
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
  // Divisore di apertura del profilo alimentare: stretto sopra (lato identità),
  // più respiro sotto (lato profilo alimentare).
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 4,
    marginBottom: 12,
  },
  // Divisore in chiusura del profilo alimentare: respiro sopra (lato contenuto),
  // niente margine sotto — lo spazio verso ciò che segue è già dato dal gap della lista.
  dividerBottom: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginTop: 12,
    marginBottom: 0,
  },
  inlineStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 16,
    marginTop: 8,
  },
  inlineStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inlineStatNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  inlineStatLabel: {
    fontSize: 13,
    color: theme.colors.textSecondary,
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
