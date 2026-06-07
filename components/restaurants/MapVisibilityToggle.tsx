import { useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Switch } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { storage } from '../../utils/storage';
import i18n from '../../utils/i18n';

type Props = { userId: string; collectionId: string };

/**
 * Toggle "Mostra sulla mappa" per una lista (reso solo in modifica). Preferenza
 * LOCALE per-utente: nasconde i pin/badge di questa lista dalla mappa principale
 * per ridurre il clutter, senza toccare la lista né il DB. È per-(utente,lista)
 * by design, così regge anche le future liste condivise. Auto-salvato al cambio.
 * Vedi memory project_list_map_visibility.
 */
export default function MapVisibilityToggle({ userId, collectionId }: Props) {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [show, setShow] = useState(true);

  useEffect(() => {
    let active = true;
    storage.getMapHiddenCollections(userId).then((hidden) => {
      if (active) setShow(!hidden.includes(collectionId));
    });
    return () => { active = false; };
  }, [userId, collectionId]);

  const onChange = (value: boolean) => {
    setShow(value);
    storage.setMapCollectionHidden(userId, collectionId, !value);
  };

  return (
    <View style={styles.row}>
      <View style={styles.textGroup}>
        <View style={styles.labelRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={18} color={theme.colors.textPrimary} />
          <Text style={styles.label}>{i18n.t('restaurants.collections.showOnMap')}</Text>
        </View>
        <Text style={styles.hint}>{i18n.t('restaurants.collections.showOnMapHint')}</Text>
      </View>
      <Switch
        value={show}
        onValueChange={onChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
        thumbColor={theme.colors.onPrimary}
      />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
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
});
