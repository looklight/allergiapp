import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';
import i18n from '../../utils/i18n';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        i18n.t('signup.alerts.missingFields.title'),
        i18n.t('signup.alerts.missingFields.message')
      );
      return;
    }
    if (password.length < 6) {
      Alert.alert(
        i18n.t('signup.alerts.shortPassword.title'),
        i18n.t('signup.alerts.shortPassword.message')
      );
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signUp(email.trim(), password);
      router.push('/auth/onboarding-nickname');
    } catch (error: any) {
      console.warn('[Signup] Errore registrazione:', error.message);
      const msg: string = (error?.message ?? '').toLowerCase();
      const message =
        msg.includes('already registered') || msg.includes('already exists')
          ? i18n.t('signup.alerts.errors.alreadyRegistered')
          : msg.includes('invalid email') || msg.includes('valid email')
          ? i18n.t('signup.alerts.errors.invalidEmail')
          : msg.includes('weak') || msg.includes('at least 6')
          ? i18n.t('signup.alerts.errors.weakPassword')
          : msg.includes('network') || msg.includes('fetch') || msg.includes('connection')
          ? i18n.t('signup.alerts.errors.network')
          : i18n.t('signup.alerts.errors.generic');
      Alert.alert(i18n.t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={8} activeOpacity={0.6}>
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('signup.headerTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../assets/happy_plate_passport.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.subtitle}>{i18n.t('signup.subtitle')}</Text>

        <Surface style={styles.form} elevation={1}>
          <TextInput
            label={i18n.t('signup.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label={i18n.t('signup.passwordLabel')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            style={styles.input}
            mode="outlined"
            right={
              <TextInput.Icon
                icon={showPassword ? 'eye-off' : 'eye'}
                onPress={() => setShowPassword(v => !v)}
              />
            }
          />

          <Text style={styles.passwordHint}>{i18n.t('signup.passwordHint')}</Text>

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {i18n.t('signup.submitButton')}
          </Button>
        </Surface>

        <Text style={styles.legalNote}>
          {i18n.t('signup.legalNotePart1')}
          <Text style={styles.legalLink} onPress={() => router.push('/legal?tab=terms')}>
            {i18n.t('signup.legalTerms')}
          </Text>
          {i18n.t('signup.legalAnd')}
          <Text style={styles.legalLink} onPress={() => router.push('/legal?tab=privacy')}>
            {i18n.t('signup.legalPrivacy')}
          </Text>
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowText}>{i18n.t('signup.haveAccount')}</Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.rowLink}>{i18n.t('signup.loginLink')}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.skipRow}>
          <Text style={styles.skipText}>{i18n.t('signup.skipLink')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  customHeader: {
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
    paddingTop: 16,
    alignItems: 'stretch',
  },
  logo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: 16,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  form: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
    marginBottom: 24,
  },
  input: {
    marginBottom: 16,
    backgroundColor: theme.colors.surface,
  },
  passwordHint: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    marginTop: -8,
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  legalNote: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  legalLink: {
    color: theme.colors.primary,
    textDecorationLine: 'underline',
  },
  rowText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  rowLink: {
    color: theme.colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  skipRow: {
    alignItems: 'center',
    padding: 8,
  },
  skipText: {
    color: theme.colors.textSecondary,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
});
