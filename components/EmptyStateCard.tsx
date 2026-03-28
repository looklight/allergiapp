import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { theme } from '../constants/theme';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
};

export default function EmptyStateCard({ icon, title, subtitle, buttonLabel, onPress }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <Button mode="contained" onPress={onPress} style={styles.button}>
        {buttonLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  icon: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  button: {
    borderRadius: 10,
  },
});
