import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Pressable, Image, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { APP_CONFIG } from '../constants/config';

// Componente per la foto dell'autrice
// Per aggiungere la foto reale:
// 1. Salvare l'immagine come assets/author-photo.png (consigliato: 72x72 px o più, formato quadrato)
// 2. Decommentare la riga con Image e commentare/rimuovere il View placeholder
function AuthorPhoto() {
  // Quando hai la foto, usa questa riga:
  // return <Image source={require('../assets/author-photo.png')} style={styles.authorImage} />;

  // Placeholder temporaneo
  return (
    <View style={[styles.authorImage, styles.authorPlaceholder]}>
      <MaterialCommunityIcons name="account" size={20} color={theme.colors.textDisabled} />
    </View>
  );
}

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showGradient, setShowGradient] = useState(true);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handleDonation = async () => {
    const url = APP_CONFIG.SUPPORT_LINK;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open donation link');
    }
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;
    setShowGradient(!isCloseToBottom);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={[styles.customHeader, { paddingTop: insets.top }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={8}
          activeOpacity={0.6}
        >
          <MaterialCommunityIcons name="arrow-left" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{i18n.t('aboutStory.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {/* Intro */}
        <Text style={styles.intro}>{i18n.t('aboutStory.intro')}</Text>

        {/* Paragraph 1 */}
        <Text style={styles.paragraph}>{i18n.t('aboutStory.paragraph1')}</Text>

        {/* Paragraph 2 */}
        <Text style={styles.paragraph}>{i18n.t('aboutStory.paragraph2')}</Text>

        {/* Paragraph 3 */}
        <Text style={styles.paragraph}>{i18n.t('aboutStory.paragraph3')}</Text>

        {/* Paragraph 4 */}
        <Text style={styles.paragraph}>{i18n.t('aboutStory.paragraph4')}</Text>

        {/* Paragraph 5 */}
        <Text style={styles.paragraph}>{i18n.t('aboutStory.paragraph5')}</Text>

        {/* Donation Button */}
        <Pressable
          onPress={handleDonation}
          style={({ pressed }) => [
            styles.donationButton,
            pressed && { opacity: 0.8 }
          ]}
        >
          <MaterialCommunityIcons name="coffee" size={18} color="#000000" />
          <Text style={styles.donationButtonLabel}>{i18n.t('aboutStory.supportProject')}</Text>
          <MaterialCommunityIcons name="open-in-new" size={14} color="#000000" />
        </Pressable>

        {/* Quote with Author Photo */}
        <View style={styles.quoteContainer}>
          <View style={styles.quoteBar} />
          <View style={styles.quoteContent}>
            <RNText style={styles.quoteText}>{i18n.t('aboutStory.quoteText')}</RNText>
            <View style={styles.authorRow}>
              {/* TODO: Sostituire author-photo.png con la foto reale dell'autrice */}
              <AuthorPhoto />
              <Text style={styles.quoteAuthor}>{i18n.t('aboutStory.quoteAuthor')}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Gradient overlay in basso per indicare scrolling */}
      {showGradient && (
        <LinearGradient
          colors={['rgba(250, 250, 250, 0)', 'rgba(250, 250, 250, 0.7)', 'rgba(250, 250, 250, 1)']}
          style={styles.scrollGradient}
          pointerEvents="none"
        />
      )}
    </View>
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
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  intro: {
    fontSize: 15,
    lineHeight: 24,
    color: theme.colors.textPrimary,
    marginBottom: 20,
    fontWeight: '500',
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginBottom: 16,
  },
  quoteContainer: {
    flexDirection: 'row',
    marginTop: 24,
    marginBottom: 24,
    paddingLeft: 4,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.border,
  },
  authorPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  quoteBar: {
    width: 4,
    backgroundColor: theme.colors.primary,
    borderRadius: 2,
    marginRight: 16,
  },
  quoteContent: {
    flex: 1,
    paddingVertical: 8,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 12,
  },
  quoteAuthor: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    fontWeight: '600',
  },
  donationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFDD00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  donationButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  scrollGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
});
