import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

type Props = {
  title: string;
  /** Override azione back (default: router.back()) */
  onBack?: () => void;
  /** Componente opzionale a destra (default: spacer 24px) */
  right?: React.ReactNode;
};

export default function HeaderBar({ title, onBack, right }: Props) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={onBack ?? (() => router.back())} hitSlop={8} activeOpacity={0.6}>
        <MaterialCommunityIcons name="arrow-left" size={24} color={theme.colors.onPrimary} />
      </TouchableOpacity>
      <Text style={styles.title}>{title}</Text>
      {right ?? <View style={{ width: 24 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  title: {
    flex: 1,
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginHorizontal: 8,
  },
});
