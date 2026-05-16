import { ReactNode } from 'react';
import { View, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../../constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type HeaderAction = {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
};

type Props = {
  title?: string;
  titleNode?: ReactNode;
  leading?: 'back' | 'close' | 'none';
  onLeadingPress?: () => void;
  leadingAccessibilityLabel?: string;
  actions?: HeaderAction[];
  titleAlign?: 'left' | 'center';
  style?: ViewStyle;
};

export default function AppHeader({
  title,
  titleNode,
  leading = 'back',
  onLeadingPress,
  leadingAccessibilityLabel,
  actions,
  titleAlign = 'center',
  style,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleLeading = onLeadingPress ?? (() => router.back());

  const leadingIcon: IconName | null =
    leading === 'back' ? 'arrow-left' : leading === 'close' ? 'close' : null;

  const hasActions = actions && actions.length > 0;

  return (
    <View style={[styles.header, { paddingTop: insets.top }, style]}>
      {leadingIcon ? (
        <TouchableOpacity
          onPress={handleLeading}
          hitSlop={8}
          activeOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={leadingAccessibilityLabel}
        >
          <MaterialCommunityIcons name={leadingIcon} size={24} color={theme.colors.onPrimary} />
        </TouchableOpacity>
      ) : titleAlign === 'center' && hasActions ? (
        <View style={styles.spacer} />
      ) : null}

      <View
        style={[
          styles.titleContainer,
          titleAlign === 'center' && styles.titleCenter,
          leadingIcon && titleAlign === 'left' ? styles.titleLeftWithLeading : null,
        ]}
      >
        {titleNode
          ? titleNode
          : <Text style={[styles.title, titleAlign === 'center' && styles.titleCentered]}>{title}</Text>}
      </View>

      {hasActions ? (
        <View style={styles.actions}>
          {actions!.map((a, i) => (
            <TouchableOpacity
              key={i}
              onPress={a.onPress}
              hitSlop={8}
              activeOpacity={0.6}
              accessibilityRole="button"
              accessibilityLabel={a.accessibilityLabel}
              style={i > 0 ? styles.actionSpacing : undefined}
            >
              <MaterialCommunityIcons name={a.icon} size={24} color={theme.colors.onPrimary} />
            </TouchableOpacity>
          ))}
        </View>
      ) : titleAlign === 'center' && leadingIcon ? (
        <View style={styles.spacer} />
      ) : null}
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
  titleContainer: {
    flex: 1,
  },
  titleLeftWithLeading: {
    marginLeft: 12,
  },
  titleCenter: {
    alignItems: 'center',
  },
  title: {
    color: theme.colors.onPrimary,
    fontSize: 22,
    fontWeight: 'bold',
  },
  titleCentered: {
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionSpacing: {
    marginLeft: 16,
  },
  spacer: {
    width: 24,
  },
});
