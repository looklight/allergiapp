import { Tabs, Stack, useRouter } from 'expo-router';
import { TouchableOpacity, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';

export default function TabLayout() {
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const handleAdd = () => {
    if (!isAuthenticated) router.push('/auth/login');
    else router.push('/restaurants/add');
  };

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
            title: 'Le mie Card',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="card-account-details" color={color} size={size} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          options={{
            tabBarButton: () => (
              <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.7}>
                <View style={styles.addButtonInner}>
                  <MaterialCommunityIcons name="plus" size={24} color={theme.colors.textSecondary} />
                  <Text style={styles.addButtonLabel}>Aggiungi</Text>
                </View>
              </TouchableOpacity>
            ),
          }}
        />
        <Tabs.Screen
          name="restaurants"
          options={{
            title: 'Ristoranti',
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="silverware-fork-knife" color={color} size={size} />
            ),
          }}
        />
      </Tabs>
    </>
  );
}

const styles = StyleSheet.create({
  addButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonInner: {
    alignItems: 'center',
    gap: 2,
  },
  addButtonLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: theme.colors.textSecondary,
  },
});
