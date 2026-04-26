import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import type { RestaurantMapProps } from './mapConstants';

export default function RestaurantMap(_props: RestaurantMapProps) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="map-outline" size={52} color={theme.colors.textSecondary} />
      <Text style={styles.title}>{i18n.t('restaurants.web.mapNotAvailable')}</Text>
      <Text style={styles.subtitle}>{i18n.t('restaurants.web.notSupported')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: theme.colors.background,
    gap: 12,
  },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.textPrimary },
  subtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center' },
});
