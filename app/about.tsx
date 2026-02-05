import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert, Pressable, Image, Text as RNText } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../constants/theme';
import i18n from '../utils/i18n';
import { APP_CONFIG } from '../constants/config';

const INSTAGRAM_URL = 'https://www.instagram.com/martadimuro_';
const YOUTUBE_URL = 'https://www.youtube.com/@martadimuro/';
const TIKTOK_URL = 'https://www.tiktok.com/@martadimuro';
const WEBSITE_URL = 'https://www.martadimuro.com';

function AuthorPhoto() {
  return <Image source={require('../assets/profile_pic.jpg')} style={styles.authorImage} />;
}

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [showGradient, setShowGradient] = useState(true);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handleOpenProject = async () => {
    const url = APP_CONFIG.SUPPORT_LINK;
    const canOpen = await Linking.canOpenURL(url);

    if (canOpen) {
      await Linking.openURL(url);
    } else {
      Alert.alert('Error', 'Cannot open link');
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

        {/* Project Page Button */}
        <Pressable
          onPress={handleOpenProject}
          style={({ pressed }) => [
            styles.projectButton,
            pressed && { opacity: 0.8 }
          ]}
        >
          <MaterialCommunityIcons name="heart-outline" size={18} color="#000000" />
          <Text style={styles.projectButtonLabel}>{i18n.t('aboutStory.supportProject')}</Text>
          <MaterialCommunityIcons name="open-in-new" size={14} color="#000000" />
        </Pressable>

        {/* Quote with Author Photo */}
        <View style={styles.quoteContainer}>
          <View style={styles.quoteBar} />
          <View style={styles.quoteContent}>
            <RNText style={styles.quoteText}>{i18n.t('aboutStory.quoteText')}</RNText>
            <Pressable
              onPress={() => Linking.openURL(INSTAGRAM_URL)}
              style={({ pressed }) => [styles.authorRow, pressed && { opacity: 0.6 }]}
            >
              <AuthorPhoto />
              <Text style={styles.quoteAuthor}>{i18n.t('aboutStory.quoteAuthor')}</Text>
              <MaterialCommunityIcons name="open-in-new" size={12} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </View>

        {/* Social Links */}
        <View style={styles.socialSection}>
          <Text style={styles.socialTitle}>{i18n.t('aboutStory.followMe')}</Text>
          <View style={styles.socialRow}>
            <Pressable
              onPress={() => Linking.openURL(INSTAGRAM_URL)}
              style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="instagram" size={22} color="#E1306C" />
              <Text style={styles.socialLabel}>Instagram</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(YOUTUBE_URL)}
              style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="youtube" size={22} color="#FF0000" />
              <Text style={styles.socialLabel}>YouTube</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(TIKTOK_URL)}
              style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.6 }]}
            >
              <Ionicons name="logo-tiktok" size={20} color="#000000" />
              <Text style={styles.socialLabel}>TikTok</Text>
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL(WEBSITE_URL)}
              style={({ pressed }) => [styles.socialButton, pressed && { opacity: 0.6 }]}
            >
              <MaterialCommunityIcons name="web" size={22} color={theme.colors.primary} />
              <Text style={styles.socialLabel}>Sito Web</Text>
            </Pressable>
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
  projectButton: {
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
  projectButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000000',
  },
  socialSection: {
    marginTop: 8,
    marginBottom: 24,
    alignItems: 'center',
  },
  socialTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textSecondary,
    marginBottom: 12,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 16,
  },
  socialButton: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 70,
  },
  socialLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
  },
  scrollGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 100,
  },
});
