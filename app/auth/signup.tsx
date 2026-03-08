import { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, TextInput, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';
import { AuthService } from '../../services/auth';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignup = async () => {
    if (!displayName.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Attenzione', 'Compila tutti i campi.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Attenzione', 'La password deve essere di almeno 6 caratteri.');
      return;
    }

    setIsLoading(true);
    try {
      await AuthService.signUp(email.trim(), password, displayName.trim());
      router.back();
    } catch (error: any) {
      const message =
        error.code === 'auth/email-already-in-use'
          ? 'Questa email è già registrata. Prova ad accedere.'
          : error.code === 'auth/invalid-email'
          ? 'Email non valida.'
          : error.code === 'auth/weak-password'
          ? 'Password troppo debole. Usa almeno 6 caratteri.'
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
        <Text style={styles.subtitle}>
          Crea un account per contribuire alla community: aggiungi ristoranti,
          segnala piatti sicuri e salva i tuoi locali preferiti.
        </Text>

        <Surface style={styles.form} elevation={1}>
          <TextInput
            label="Nome visualizzato"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
            mode="outlined"
          />
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
