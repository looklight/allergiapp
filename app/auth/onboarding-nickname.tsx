import { useState } from 'react';
import { View, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Surface } from 'react-native-paper';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';
import { PG_UNIQUE_VIOLATION } from '../../services/restaurant.types';
import { useAuth } from '../../contexts/AuthContext';
import { useUsernameValidation } from '../../hooks/useUsernameValidation';
import UsernameFeedback from '../../components/UsernameFeedback';
import { getAnonymousLabel } from '../../utils/anonymousLabel';
import i18n from '../../utils/i18n';

export default function OnboardingNicknameScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshProfile } = useAuth();

  const [username, setUsername] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);

  const { state: usernameState, canSubmit: usernameOk } = useUsernameValidation(username);

  const canContinue = isAnonymous || usernameOk;

  const handleContinue = async () => {
    if (!user) return;
    if (!canContinue) return;

    setSaving(true);
    try {
      const trimmed = username.trim();
      // Salva l'username solo se l'utente non e' anonimo e ha digitato qualcosa.
      // Se anonimo: il trigger DB ha gia' assegnato user_xxxxxx, lo lasciamo.
      if (!isAnonymous && trimmed) {
        await AuthService.updateUsername(user.uid, trimmed);
      }
      if (isAnonymous) {
        await AuthService.updateAnonymous(user.uid, true);
      }
      await refreshProfile();
      router.replace('/auth/onboarding-dietary');
    } catch (err: any) {
      const isUnique = err?.code === PG_UNIQUE_VIOLATION;
      Alert.alert(
        i18n.t('common.error'),
        isUnique ? i18n.t('username.unavailable') : i18n.t('onboardingNickname.alerts.saveError.message'),
      );
    } finally {
      setSaving(false);
    }
  };

  const anonymousAssignedName = user?.uid ? getAnonymousLabel(user.uid) : '';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <View style={{ width: 24 }} />
        <Text style={styles.headerTitle}>{i18n.t('onboardingNickname.headerTitle')}</Text>
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
          <Text style={styles.introTitle}>{i18n.t('onboardingNickname.introTitle')}</Text>
          <Text style={styles.introText}>{i18n.t('onboardingNickname.introText')}</Text>
        </View>

        {isAnonymous ? (
          <Surface style={styles.assignedBox} elevation={0}>
            <Text style={styles.assignedBoxValue}>{anonymousAssignedName}</Text>
          </Surface>
        ) : (
          <>
            <TextInput
              label={i18n.t('username.label')}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              mode="outlined"
              style={styles.input}
            />
            <UsernameFeedback state={usernameState} />
          </>
        )}

        <View style={styles.anonymousRow}>
          <View style={styles.anonymousTextGroup}>
            <Text style={styles.anonymousLabel}>{i18n.t('onboardingNickname.anonymousLabel')}</Text>
            <Text style={styles.anonymousHint}>{i18n.t('onboardingNickname.anonymousHint')}</Text>
          </View>
          <Switch
            value={isAnonymous}
            onValueChange={(v) => {
              setIsAnonymous(v);
              if (v) setUsername('');
            }}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={theme.colors.onPrimary}
          />
        </View>

        <TouchableOpacity
          style={[styles.continueButton, (saving || !canContinue) && styles.continueButtonDisabled]}
          onPress={handleContinue}
          disabled={saving || !canContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            {saving ? i18n.t('onboardingNickname.saving') : i18n.t('onboardingNickname.continue')}
          </Text>
        </TouchableOpacity>

        <Text style={styles.changeNote}>{i18n.t('onboardingNickname.changeNote')}</Text>
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
    color: theme.colors.onPrimary,
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
    marginBottom: 12,
  },
  // height 56 (= TextInput outlined) + marginBottom 28 pareggia
  // TextInput(56) + marginBottom(12) + UsernameFeedback effettivo(~16) + 8 = 84.
  assignedBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    paddingHorizontal: 16,
    marginBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
  },
  assignedBoxValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
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
    color: theme.colors.onPrimary,
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
