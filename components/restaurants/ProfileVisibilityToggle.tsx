import { useState, useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { CollectionService } from '../../services/collectionService';
import { SupabaseAnalytics } from '../../services/supabaseAnalytics';
import i18n from '../../utils/i18n';

type Props = {
  /** Assente in creazione (la lista non ha ancora un id) → toggle bloccato. */
  collectionId?: string;
  /** In creazione bloccato su "privata": le liste nascono private, pubblicare
   *  e' un gesto deliberato che si fa dopo averle create. */
  locked?: boolean;
  /** Visibilita' corrente della lista (in modifica). */
  initialVisibility?: 'private' | 'public';
  /** Notifica il padre del cambio riuscito (per ricaricare le pill). */
  onChanged?: (visibility: 'private' | 'public') => void;
};

/**
 * Toggle "Visibile sul profilo" per una lista custom: scrive `visibility` in DB
 * (la RLS pubblica di collections/collection_items fa il resto — mig 069).
 * Gemello del toggle "Mostra sulla mappa" ma persistente e senza anteprima.
 * Ottimistico con rollback se la scrittura fallisce. Nascosto agli utenti
 * anonimi: le loro liste non compaiono comunque sui profili mascherati.
 */
export default function ProfileVisibilityToggle({ collectionId, locked, initialVisibility, onChanged }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { userProfile } = useAuth();
  const [isPublic, setIsPublic] = useState(initialVisibility === 'public');

  // Riallinea quando cambia la lista in modifica: nel SaveToCollectionSheet il
  // pannello editor resta montato tra una lista e l'altra (slide, non remount),
  // come per il load di MapVisibilityToggle.
  useEffect(() => {
    setIsPublic(initialVisibility === 'public');
  }, [collectionId, initialVisibility]);

  // Anonimi fuori dal layer social (come share profilo e follow): niente toggle.
  if (userProfile?.is_anonymous) return null;

  // Una scrittura per volta: i tap durante l'attesa vengono ignorati, così due
  // update concorrenti non possono lasciare il DB in disaccordo con lo switch.
  const pendingRef = useRef(false);

  const onChange = async (value: boolean) => {
    if (locked || !collectionId || pendingRef.current) return;
    pendingRef.current = true;
    setIsPublic(value);
    const visibility = value ? 'public' : 'private';
    try {
      const ok = await CollectionService.updateCollection(collectionId, { visibility });
      if (!ok) {
        setIsPublic(!value);
        return;
      }
      SupabaseAnalytics.track(value ? 'list_published' : 'list_unpublished', { collection_id: collectionId });
      onChanged?.(visibility);
    } finally {
      pendingRef.current = false;
    }
  };

  return (
    <TouchableOpacity
      style={[styles.row, locked && styles.dimmed]}
      onPress={() => onChange(!isPublic)}
      activeOpacity={locked ? 1 : 0.7}
      disabled={locked}
    >
      <View style={styles.textGroup}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons name="earth" size={18} color={theme.colors.textPrimary} />
          <Text style={styles.label}>{i18n.t('restaurants.collections.visibleOnProfile')}</Text>
        </View>
        <Text style={styles.hint}>
          {locked
            ? i18n.t('restaurants.collections.visibleOnProfileLockedHint')
            : i18n.t('restaurants.collections.visibleOnProfileHint')}
        </Text>
      </View>
      {/* Switch custom identico a MapVisibilityToggle (track+thumb in View). */}
      <View style={[styles.switchTrack, isPublic && styles.switchTrackActive]}>
        <View style={[styles.switchThumb, isPublic && styles.switchThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  dimmed: { opacity: 0.55 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
  },
  textGroup: { flex: 1, gap: 2 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 15, fontWeight: '600', color: theme.colors.textPrimary },
  hint: { fontSize: 12, color: theme.colors.textSecondary, lineHeight: 16 },
  switchTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchTrackActive: {
    backgroundColor: theme.colors.primary,
  },
  switchThumb: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: theme.colors.surface,
  },
  switchThumbActive: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.surface,
  },
});
