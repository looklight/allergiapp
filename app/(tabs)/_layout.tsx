import { Tabs, Stack } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';

export default function TabLayout() {
  return (
    <>
      {/* Nasconde l'header dello Stack root per tutta la sezione tabs */}
      <Stack.Screen options={{ headerShown: false }} />

      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.divider,
            borderTopWidth: 1,
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
    </>
  );
}
