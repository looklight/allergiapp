// Deep link route: arriva qui quando l'utente apre un link
// https://allergiapp.com/r/{slug} (Universal Link / App Link) o
// allergiapp://r/{slug} (custom scheme).
//
// È un puro redirect: deposita lo slug nel focus in attesa e va SUBITO alla
// mappa, senza risolvere nulla e senza spinner. La risoluzione (slug → id +
// coordinate) e l'apertura della scheda avvengono sulla mappa quando è pronta,
// così il deep link si comporta come la selezione da ricerca (nessuna schermata
// intermedia, ci si sposta sul ristorante che resta selezionato).

import { useEffect, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { pendingRestaurantFocus } from '../../utils/pendingRestaurantFocus';

export default function RestaurantBySlugScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  useEffect(() => {
    if (slug && typeof slug === 'string') {
      pendingRestaurantFocus.set({ slug });
    }
    router.replace('/(tabs)/restaurants');
  }, [slug, router]);

  // Frame neutro (colore mappa) per il singolo istante prima del replace: niente
  // spinner né transizione percepita come "nuova pagina".
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface,
  },
});
