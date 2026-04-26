import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';
import i18n from '../../utils/i18n';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(
        i18n.t('login.alerts.missingFields.title'),
        i18n.t('login.alerts.missingFields.message')
      );
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signIn(email.trim(), password);
      router.back();
    } catch (error: any) {
      console.warn('[Login] Errore login:', error.message);
      const msg: string = (error?.message ?? '').toLowerCase();
      const message =
        msg.includes('invalid') || msg.includes('credentials') || msg.includes('wrong password') || msg.includes('user not found')
          ? i18n.t('login.alerts.errors.invalidCredentials')
          : msg.includes('too many') || msg.includes('rate limit') || msg.includes('blocked')
          ? i18n.t('login.alerts.errors.tooManyAttempts')
          : msg.includes('network') || msg.includes('fetch') || msg.includes('connection')
          ? i18n.t('login.alerts.errors.network')
          : i18n.t('login.alerts.errors.generic');
      Alert.alert(i18n.t('common.error'), message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert(
        i18n.t('login.alerts.resetMissingEmail.title'),
        i18n.t('login.alerts.resetMissingEmail.message')
      );
      return;
    }
    try {
      await AuthService.sendPasswordReset(email.trim());
      Alert.alert(
        i18n.t('login.alerts.resetSent.title'),
        i18n.t('login.alerts.resetSent.message')
      );
    } catch {
      Alert.alert(i18n.t('common.error'), i18n.t('login.alerts.resetError.message'));
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
        <Text style={styles.headerTitle}>{i18n.t('login.headerTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Image
          source={require('../../assets/happy_plate_forks.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <Text style={styles.subtitle}>{i18n.t('login.subtitle')}</Text>

        <Surface style={styles.form} elevation={1}>
          <TextInput
            label={i18n.t('login.emailLabel')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label={i18n.t('login.passwordLabel')}
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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            {i18n.t('login.submitButton')}
          </Button>

          <TouchableOpacity onPress={handleResetPassword} style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>{i18n.t('login.forgotPassword')}</Text>
          </TouchableOpacity>
        </Surface>

        <View style={styles.registerSection}>
          <Text style={styles.rowText}>{i18n.t('login.noAccount')}</Text>
          <Button
            mode="outlined"
            onPress={() => router.replace('/auth/signup')}
            style={styles.registerButton}
            contentStyle={styles.buttonContent}
          >
            {i18n.t('login.registerButton')}
          </Button>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.skipRow}>
          <Text style={styles.skipText}>{i18n.t('login.skipLink')}</Text>
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
  button: {
    marginTop: 4,
    borderRadius: 10,
  },
  buttonContent: {
    paddingVertical: 6,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 4,
  },
  forgotPasswordText: {
    color: theme.colors.primary,
    fontSize: 14,
  },
  registerSection: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  rowText: {
    color: theme.colors.textSecondary,
    fontSize: 15,
  },
  registerButton: {
    borderRadius: 10,
    alignSelf: 'stretch',
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
