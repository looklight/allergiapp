// Deep link route: arriva qui quando l'utente apre un link
// https://allergiapp.com/r/{slug} (Universal Link / App Link) o
// allergiapp://r/{slug} (custom scheme).
// Risolve lo slug all'id reale via RPC, poi redirige alla scheda dettaglio esistente.

import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { theme } from '../../constants/theme';
import { supabase } from '../../services/supabase';
import i18n from '../../utils/i18n';

export default function RestaurantBySlugScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [didFail, setDidFail] = useState(false);

  useEffect(() => {
    if (!slug || typeof slug !== 'string') {
      router.replace('/');
      return;
    }

    let cancelled = false;

    (async () => {
      const { data, error } = await supabase.rpc('get_restaurant_by_slug', {
        p_slug: slug,
      });

      if (cancelled) return;

      if (error || !data) {
        setDidFail(true);
        Alert.alert(
          i18n.t('common.error'),
          i18n.t('restaurants.detail.notFound'),
          [{ text: 'OK', onPress: () => router.replace('/') }],
          { cancelable: false },
        );
        return;
      }

      router.replace(`/restaurants/${data}`);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      {!didFail && <ActivityIndicator size="large" color={theme.colors.primary} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
});
