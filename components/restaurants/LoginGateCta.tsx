import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';

interface LoginGateCtaProps {
  title: string;
  subtitle: string;
}

export default function LoginGateCta({ title, subtitle }: LoginGateCtaProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <MaterialCommunityIcons
          name="silverware-fork-knife"
          size={32}
          color={theme.colors.primary}
        />
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.85}
        onPress={() => router.push('/auth/login')}
      >
        <Text style={styles.primaryButtonText}>
          {i18n.t('restaurants.detail.loginGateSignInButton')}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.6}
        onPress={() => router.push('/auth/signup')}
        hitSlop={8}
      >
        <Text style={styles.secondaryLink}>
          {i18n.t('restaurants.detail.loginGateCreateAccount')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 40,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 19,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 14,
    borderRadius: 28,
    minWidth: 220,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: theme.colors.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryLink: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: 4,
  },
});
