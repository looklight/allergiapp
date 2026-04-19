import { ReactNode } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { theme } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  title: string;
  description: ReactNode;
  /** Contenuto visuale nella metà superiore (immagine, animazione, mock, ecc.) */
  visual: ReactNode;
}

export default function OnboardingSlide({ title, description, visual }: Props) {
  return (
    <View style={styles.slide}>
      <View style={styles.visualContainer}>{visual}</View>
      <View style={styles.textContainer}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  visualContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 32,
  },
  textContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 23,
  },
});
