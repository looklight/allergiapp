import { Platform } from 'react-native';
import { Tabs, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import { AnimatedTabBar, TabBarVisibilityProvider } from '../../components/TabBarVisibility';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  // Su Android con edge-to-edge la gesture nav riporta insets.bottom molto
  // piccolo (~8dp), e React Navigation lo usa direttamente come paddingBottom
  // del tab bar → label troppo vicine al bordo. Garantiamo un minimo.
  const androidExtraBottom =
    Platform.OS === 'android' ? Math.max(insets.bottom, 16) : undefined;

  return (
    <>
      {/* Nasconde l'header dello Stack root per tutta la sezione tabs */}
      <Stack.Screen options={{ headerShown: false }} />

      <TabBarVisibilityProvider>
        <Tabs
          tabBar={(props) => <AnimatedTabBar {...props} />}
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: theme.colors.primary,
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarStyle: {
              backgroundColor: theme.colors.surface,
              borderTopColor: theme.colors.divider,
              borderTopWidth: 1,
              ...(androidExtraBottom !== undefined && {
                paddingBottom: androidExtraBottom,
                height: 56 + androidExtraBottom,
              }),
            },
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '500',
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: i18n.t('restaurants.tabs.tabCards'),
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="card-account-details" color={color} size={size} />
              ),
            }}
          />
          <Tabs.Screen
            name="add"
            options={{ href: null }}
          />
          <Tabs.Screen
            name="restaurants"
            options={{
              title: i18n.t('restaurants.tabs.tabRestaurants'),
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="silverware-fork-knife" color={color} size={size} />
              ),
            }}
          />
        </Tabs>
      </TabBarVisibilityProvider>
    </>
  );
}
