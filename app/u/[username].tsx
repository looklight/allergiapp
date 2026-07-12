// Deep link route: arriva qui quando l'utente apre un link
// https://allergiapp.com/u/{username} (Universal Link / App Link) o
// allergiapp://u/{username} (custom scheme).
//
// A differenza di /r/{slug} (che deposita un focus in attesa per la mappa),
// il profilo non ha vincoli di readiness: si risolve username → id via RPC
// (get_profile_id_by_username, mai anonimi) e si va dritti al profilo.
// Username non risolvibile → home, senza errori in faccia.

import { useEffect, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useTheme } from '../../contexts/ThemeContext';
import type { AppTheme } from '../../constants/theme';
import { getProfileIdByUsername } from '../../services/userSearchService';

export default function ProfileByUsernameScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { username } = useLocalSearchParams<{ username: string }>();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let target = '/(tabs)/restaurants';
      if (username && typeof username === 'string') {
        try {
          const id = await getProfileIdByUsername(username);
          if (id) target = `/restaurants/user/${id}`;
        } catch (err) {
          if (__DEV__) console.warn('[deeplink] risoluzione profilo fallita:', err);
        }
      }
      if (!cancelled) router.replace(target as never);
    })();
    return () => {
      cancelled = true;
    };
  }, [username, router]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false, animation: 'none' }} />
      <ActivityIndicator color={theme.colors.primary} />
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
  },
});
