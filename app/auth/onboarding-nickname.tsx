import { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';
import { useAuth } from '../../contexts/AuthContext';

export default function OnboardingNicknameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();
  const [nickname, setNickname] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleContinue = async () => {
    if (!user) return;
    if (!isAnonymous && !nickname.trim()) {
      Alert.alert('Nickname mancante', 'Inserisci un nickname oppure scegli di restare anonimo.');
      return;
    }
    setSaving(true);
    try {
      if (nickname.trim()) {
        await AuthService.updateDisplayName(user.uid, nickname.trim());
      }
      if (isAnonymous) {
        await AuthService.updateAnonymous(user.uid, true);
      }
      await refreshProfile();
      router.replace('/auth/onboarding-dietary');
    } catch {
      Alert.alert('Errore', 'Impossibile salvare. Riprova.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>Il tuo profilo</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.introSection}>
          <Image
            source={isAnonymous
              ? require('../../assets/avatars/plate_incognito.png')
              : require('../../assets/avatars/plate_main_logo.png')}
            style={styles.profileIcon}
            resizeMode="contain"
          />
          <Text style={styles.introTitle}>Come vuoi apparire nella community?</Text>
          <Text style={styles.introText}>
            Scegli un nickname con cui gli altri utenti ti vedranno nelle recensioni.
            Se preferisci, puoi restare anonimo: il tuo nome non sarà mai visibile ad altri.
          </Text>
        </View>

        <TextInput
          label="Nickname"
          value={nickname}
          onChangeText={setNickname}
          autoCapitalize="words"
          autoCorrect={false}
          mode="outlined"
          style={[styles.input, isAnonymous && styles.inputDisabled]}
          disabled={isAnonymous}
          placeholder="Come vuoi essere chiamato?"
          placeholderTextColor={theme.colors.textDisabled}
        />

        <View style={styles.anonymousRow}>
          <View style={styles.anonymousTextGroup}>
            <Text style={styles.anonymousLabel}>Resta anonimo</Text>
            <Text style={styles.anonymousHint}>
              Il tuo nome non sarà visibile ad altri utenti
            </Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={(v) => {
              setIsAnonymous(v);
              if (v) setNickname('');
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor="#FFFFFF"
          />
        </View>

        {isAnonymous && (
          <View style={styles.anonymousNote}>
            <MaterialCommunityIcons name="shield-check-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.anonymousNoteText}>
              Le tue recensioni mostreranno un identificativo generico. Il tuo nome non sarà mai visibile ad altri utenti.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.continueButton, saving && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {saving ? 'Salvataggio...' : 'Continua'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.changeNote}>
          Potrai modificare queste impostazioni in qualsiasi momento dal tuo profilo.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  content: {
    padding: 24,
  },
  introSection: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  profileIcon: {
    width: 120,
    height: 120,
    borderRadius: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginTop: 4,
  },
  introText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  input: {
    backgroundColor: theme.colors.surface,
    marginBottom: 20,
  },
  inputDisabled: {
    opacity: 0.4,
  },
  anonymousRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  anonymousTextGroup: {
    flex: 1,
    marginRight: 12,
    gap: 2,
  },
  anonymousLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  anonymousHint: {
    fontSize: 13,
    color: theme.colors.textSecondary,
  },
  anonymousNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 10,
    padding: 12,
    marginBottom: 24,
  },
  anonymousNoteText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.primary,
    lineHeight: 18,
  },
  continueButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  changeNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});
