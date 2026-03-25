import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Attenzione', 'La password deve essere di almeno 6 caratteri.');
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
          ? 'Questa email è già registrata. Prova ad accedere.'
          : msg.includes('invalid email') || msg.includes('valid email')
          ? 'Email non valida.'
          : msg.includes('weak') || msg.includes('at least 6')
          ? 'Password troppo debole. Usa almeno 6 caratteri.'
          : msg.includes('network') || msg.includes('fetch') || msg.includes('connection')
          ? 'Errore di rete. Controlla la connessione.'
          : 'Si è verificato un errore. Riprova.';
      Alert.alert('Errore', message);
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
        <Text style={styles.headerTitle}>Crea account</Text>
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

        <Text style={styles.subtitle}>
          Trova ristoranti, condividi la tua esperienza e aiuta altri utenti con le tue stesse esigenze.
        </Text>

        <Surface style={styles.form} elevation={1}>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            style={styles.input}
            mode="outlined"
          />
          <TextInput
            label="Password"
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

          <Text style={styles.passwordHint}>Minimo 6 caratteri</Text>

          <Button
            mode="contained"
            onPress={handleSignup}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Crea account
          </Button>
        </Surface>

        <Text style={styles.legalNote}>
          Creando un account accetti i nostri{' '}
          <Text style={styles.legalLink}>Termini di servizio</Text>
          {' '}e la{' '}
          <Text style={styles.legalLink}>Privacy Policy</Text>
        </Text>

        <View style={styles.row}>
          <Text style={styles.rowText}>Hai già un account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.rowLink}>Accedi</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.back()} style={styles.skipRow}>
          <Text style={styles.skipText}>Continua senza account</Text>
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
