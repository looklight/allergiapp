import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Attenzione', 'Inserisci email e password.');
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signIn(email.trim(), password);
      router.back();
    } catch (error: any) {
      console.warn('[Login] Errore login:', error.code, error.message);
      const message =
        error.code === 'auth/invalid-credential'
          ? 'Email o password non corretti.'
          : error.code === 'auth/too-many-requests'
          ? 'Troppi tentativi. Riprova più tardi.'
          : error.code === 'auth/network-request-failed'
          ? 'Errore di rete. Controlla la connessione.'
          : `Si è verificato un errore (${error.code ?? 'unknown'}). Riprova.`;
      Alert.alert('Errore', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Reset password', 'Inserisci prima la tua email nel campo sopra.');
      return;
    }
    try {
      await AuthService.sendPasswordReset(email.trim());
      Alert.alert('Email inviata', 'Controlla la tua casella di posta per reimpostare la password.');
    } catch {
      Alert.alert('Errore', 'Impossibile inviare il reset. Controlla l\'email inserita.');
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
        <Text style={styles.headerTitle}>Accedi</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Accedi per aggiungere ristoranti, salvare preferiti e lasciare recensioni.
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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={isLoading}
            disabled={isLoading}
            style={styles.button}
            contentStyle={styles.buttonContent}
          >
            Accedi
          </Button>

          <TouchableOpacity onPress={handleResetPassword} style={styles.forgotPassword}>
            <Text style={styles.forgotPasswordText}>Password dimenticata?</Text>
          </TouchableOpacity>
        </Surface>

        <View style={styles.row}>
          <Text style={styles.rowText}>Non hai un account? </Text>
          <TouchableOpacity onPress={() => router.replace('/auth/signup')}>
            <Text style={styles.rowLink}>Registrati</Text>
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
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 24,
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
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
