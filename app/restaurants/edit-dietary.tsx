import { useState } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/auth';
import DietaryNeedsPicker from '../../components/DietaryNeedsPicker';
import HeaderBar from '../../components/HeaderBar';
import i18n from '../../utils/i18n';

export default function EditDietaryScreen() {
  const insets = useSafeAreaInsets();
  const { user, dietaryNeeds, refreshProfile } = useAuth();

  const [pendingAllergens, setPendingAllergens] = useState<string[]>([...dietaryNeeds.allergens]);
  const [pendingDiets, setPendingDiets] = useState<string[]>([...dietaryNeeds.diets]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <HeaderBar title="Profilo alimentare" />

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}>
        <DietaryNeedsPicker
          allergens={pendingAllergens}
          diets={pendingDiets}
          onAllergensChange={setPendingAllergens}
          onDietsChange={setPendingDiets}
          profileAllergens={dietaryNeeds.allergens}
          profileDiets={dietaryNeeds.diets}
          onSyncProfile={async (allergens, diets) => {
            if (!user) return;
            await AuthService.updateDietaryNeeds(user.uid, { allergens, diets });
            await refreshProfile();
          }}
          lang={i18n.locale}
          initialExpanded
          subtitle="Allergie e diete salvate nel tuo profilo. Usate per filtrare i ristoranti per le tue esigenze."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
});
