import React, { useState, useEffect, ReactElement } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { theme } from '../constants/theme';
import { LEGAL_CONTENT } from '../constants/legalContent';
import i18n from '../utils/i18n';
import { AppLanguage } from '../types';

const AVAILABLE_LANGUAGES = [
  { code: 'it' as const, name: 'Italiano', flag: '🇮🇹' },
  { code: 'en' as const, name: 'English', flag: '🇬🇧' },
];

export default function LegalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedDoc, setSelectedDoc] = useState<'privacy' | 'terms'>('privacy');
  const [selectedLang, setSelectedLang] = useState<'it' | 'en'>(
    (i18n.locale === 'it' || i18n.locale === 'en') ? i18n.locale as 'it' | 'en' : 'en'
  );

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const content = LEGAL_CONTENT[selectedLang][selectedDoc];

  // Simple markdown-like rendering
  const renderContent = (text: string) => {
    const lines = text.split('\n');
    const elements: ReactElement[] = [];

    lines.forEach((line, index) => {
      if (line.startsWith('# ')) {
        // H1 - Title
        elements.push(
          <Text key={index} style={styles.h1}>
            {line.substring(2)}
          </Text>
        );
      } else if (line.startsWith('## ')) {
        // H2 - Section
        elements.push(
          <Text key={index} style={styles.h2}>
            {line.substring(3)}
          </Text>
        );
      } else if (line.startsWith('### ')) {
        // H3 - Subsection
        elements.push(
          <Text key={index} style={styles.h3}>
            {line.substring(4)}
          </Text>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        // Bold line
        elements.push(
          <Text key={index} style={styles.bold}>
            {line.substring(2, line.length - 2)}
          </Text>
        );
      } else if (line.startsWith('- ')) {
        // List item
        elements.push(
          <View key={index} style={styles.listItem}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.listText}>{line.substring(2)}</Text>
          </View>
        );
      } else if (line.startsWith('---')) {
        // Divider
        elements.push(<View key={index} style={styles.divider} />);
      } else if (line.trim() === '') {
        // Empty line
        elements.push(<View key={index} style={styles.spacer} />);
      } else {
        // Regular text
        elements.push(
          <Text key={index} style={styles.text}>
            {line}
          </Text>
        );
      }
    });

    return elements;
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
        <Text style={styles.headerTitle}>
          {selectedDoc === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Language Selector */}
      <View style={styles.languageSelector}>
        {AVAILABLE_LANGUAGES.map((lang) => (
          <TouchableOpacity
            key={lang.code}
            style={[
              styles.langButton,
              selectedLang === lang.code && styles.langButtonActive,
            ]}
            onPress={() => setSelectedLang(lang.code)}
          >
            <Text style={styles.langFlag}>{lang.flag}</Text>
            <Text
              style={[
                styles.langName,
                selectedLang === lang.code && styles.langNameActive,
              ]}
            >
              {lang.name}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document Selector */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedDoc}
          onValueChange={(value) => setSelectedDoc(value as 'privacy' | 'terms')}
          buttons={[
            {
              value: 'privacy',
              label: 'Privacy Policy',
              icon: 'shield-check',
            },
            {
              value: 'terms',
              label: 'Terms of Service',
              icon: 'file-document',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {renderContent(content)}
      </ScrollView>
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
  languageSelector: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  langButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  langButtonActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  langFlag: {
    fontSize: 20,
  },
  langName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
  langNameActive: {
    color: theme.colors.primary,
  },
  tabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  segmentedButtons: {
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  h1: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.primary,
    marginBottom: 8,
    marginTop: 16,
  },
  h2: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 8,
    marginTop: 16,
  },
  h3: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 6,
    marginTop: 12,
  },
  bold: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 14,
    color: theme.colors.textPrimary,
    marginRight: 8,
    marginTop: 2,
  },
  listText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: theme.colors.textPrimary,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.divider,
    marginVertical: 16,
  },
  spacer: {
    height: 8,
  },
});
