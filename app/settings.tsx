import { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppLanguage, DownloadableLanguageCode } from '../types';
import i18n from '../utils/i18n';
import { DownloadProgress } from '../services/translationService';
import { useTheme, useThemePreference } from '../contexts/ThemeContext';
import type { AppTheme } from '../constants/theme';
import { useAppContext } from '../contexts/AppContext';
import { Analytics } from '../services/analytics';
import { useLanguageDownload } from '../hooks/useLanguageDownload';
import DownloadableLanguagesSection from './components/DownloadableLanguagesSection';
import AppHeader from './components/AppHeader';

const APP_LANGUAGES = [
  { code: 'it' as const, name: 'Italiano', flag: '🇮🇹' },
  { code: 'en' as const, name: 'English', flag: '🇬🇧' },
  { code: 'es' as const, name: 'Español', flag: '🇪🇸' },
  { code: 'de' as const, name: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr' as const, name: 'Français', flag: '🇫🇷' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { mode: themeMode, setMode: setThemeMode } = useThemePreference();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    settings,
    downloadedLanguageCodes,
    setAppLang: contextSetAppLang,
    saveDownloadedLanguage,
    deleteDownloadedLanguage: contextDeleteLanguage,
    clearAll,
  } = useAppContext();
  const appLang = settings.appLanguage;
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const themeChoices = [
    { mode: 'system' as const, label: i18n.t('settings.themeSystem'), icon: 'cellphone' as const },
    { mode: 'light' as const, label: i18n.t('settings.themeLight'), icon: 'white-balance-sunny' as const },
    { mode: 'dark' as const, label: i18n.t('settings.themeDark'), icon: 'weather-night' as const },
  ];
  const currentThemeChoice = themeChoices.find((o) => o.mode === themeMode) ?? themeChoices[0];
  const { downloadingLang, downloadProgress, handleDownloadLanguage: downloadLanguage } = useLanguageDownload();

  // Blocca orientamento in portrait
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
  }, []);

  const handleDownloadLanguage = async (langCode: DownloadableLanguageCode) => {
    await downloadLanguage(langCode, async (code, data) => {
      await saveDownloadedLanguage(code, data);
      Alert.alert('', i18n.t('settings.downloaded'));
    });
  };


  const handleDeleteLanguage = (langCode: DownloadableLanguageCode) => {
    Alert.alert(
      '',
      i18n.t('settings.deleteConfirm'),
      [
        { text: i18n.t('settings.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.delete'),
          style: 'destructive',
          onPress: async () => {
            await contextDeleteLanguage(langCode);
            await Analytics.logLanguageDeleted(langCode);
          },
        },
      ]
    );
  };

  const handleResetApp = () => {
    Alert.alert(
      i18n.t('settings.clearData'),
      i18n.t('settings.clearDataConfirm'),
      [
        { text: i18n.t('settings.cancel'), style: 'cancel' },
        {
          text: i18n.t('settings.confirm'),
          style: 'destructive',
          onPress: async () => {
            await Analytics.logDataCleared();
            await clearAll();
            Alert.alert('', i18n.t('settings.clearDataSuccess'));
          },
        },
      ]
    );
  };

  const getProgressText = (progress: DownloadProgress): string => {
    switch (progress.phase) {
      case 'allergens':
        return i18n.t('settings.translatingAllergens');
      case 'descriptions':
        return i18n.t('settings.translatingDescriptions');
      case 'cardTexts':
        return i18n.t('settings.translatingCard');
      default:
        return '';
    }
  };

  const handleAppLanguageChange = async (lang: string) => {
    const language = lang as AppLanguage;
    const previousLanguage = appLang;
    await contextSetAppLang(language);
    await Analytics.logAppLanguageChanged(previousLanguage, language);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <AppHeader title={i18n.t('settings.title')} leadingAccessibilityLabel={i18n.t('settings.back')} />

      <ScrollView>
        <View style={styles.appLanguageWrapper}>
          <Pressable
            onPress={() => setShowLangMenu(!showLangMenu)}
            style={styles.langPickerRow}
            accessibilityRole="button"
            accessibilityLabel={`${i18n.t('settings.appLanguage')}: ${APP_LANGUAGES.find((l) => l.code === appLang)?.name}`}
            accessibilityState={{ expanded: showLangMenu }}
          >
            <MaterialCommunityIcons name="translate" size={22} color={theme.colors.primary} />
            <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.appLanguage')}</Text>
            <View style={styles.langPickerAnchor}>
              <Text style={styles.langPickerFlag}>
                {APP_LANGUAGES.find((l) => l.code === appLang)?.flag}
              </Text>
              <Text style={styles.langPickerLabel}>
                {APP_LANGUAGES.find((l) => l.code === appLang)?.name}
              </Text>
              <MaterialCommunityIcons
                name={showLangMenu ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
          </Pressable>
          {showLangMenu && (
            <View style={styles.langPickerOptions}>
              {APP_LANGUAGES.map((lang) => (
                <Pressable
                  key={lang.code}
                  onPress={() => {
                    handleAppLanguageChange(lang.code);
                    setShowLangMenu(false);
                  }}
                  style={({ pressed }) => [
                    styles.langPickerOption,
                    lang.code === appLang && styles.langPickerOptionSelected,
                    pressed && styles.langPickerOptionPressed,
                  ]}
                  accessibilityRole="radio"
                  accessibilityLabel={lang.name}
                  accessibilityState={{ checked: lang.code === appLang }}
                >
                  <Text style={styles.langPickerOptionFlag}>{lang.flag}</Text>
                  <Text style={[
                    styles.langPickerOptionName,
                    lang.code === appLang && styles.langPickerOptionNameSelected,
                  ]}>
                    {lang.name}
                  </Text>
                  {lang.code === appLang && (
                    <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Aspetto - tema (stesso pattern del selettore lingua) */}
        <View style={styles.appearanceWrapper}>
          <Pressable
            onPress={() => setShowThemeMenu(!showThemeMenu)}
            style={styles.langPickerRow}
            accessibilityRole="button"
            accessibilityLabel={`${i18n.t('settings.appearance')}: ${currentThemeChoice.label}`}
            accessibilityState={{ expanded: showThemeMenu }}
          >
            <MaterialCommunityIcons name="theme-light-dark" size={22} color={theme.colors.primary} />
            <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.appearance')}</Text>
            <View style={styles.langPickerAnchor}>
              <MaterialCommunityIcons name={currentThemeChoice.icon} size={18} color={theme.colors.textSecondary} />
              <Text style={styles.langPickerLabel}>{currentThemeChoice.label}</Text>
              <MaterialCommunityIcons
                name={showThemeMenu ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </View>
          </Pressable>
          {showThemeMenu && (
            <View style={styles.langPickerOptions}>
              {themeChoices.map((opt) => {
                const selected = themeMode === opt.mode;
                return (
                  <Pressable
                    key={opt.mode}
                    onPress={() => {
                      setThemeMode(opt.mode);
                      setShowThemeMenu(false);
                    }}
                    style={({ pressed }) => [
                      styles.langPickerOption,
                      selected && styles.langPickerOptionSelected,
                      pressed && styles.langPickerOptionPressed,
                    ]}
                    accessibilityRole="radio"
                    accessibilityLabel={opt.label}
                    accessibilityState={{ checked: selected }}
                  >
                    <MaterialCommunityIcons
                      name={opt.icon}
                      size={22}
                      color={selected ? theme.colors.primary : theme.colors.textSecondary}
                      style={styles.themeOptionIcon}
                    />
                    <Text style={[
                      styles.langPickerOptionName,
                      selected && styles.langPickerOptionNameSelected,
                    ]}>
                      {opt.label}
                    </Text>
                    {selected && (
                      <MaterialCommunityIcons name="check" size={20} color={theme.colors.primary} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <DownloadableLanguagesSection
          downloadedLanguageCodes={downloadedLanguageCodes}
          downloadingLang={downloadingLang}
          downloadProgress={downloadProgress}
          onDownload={handleDownloadLanguage}
          onDelete={handleDeleteLanguage}
        />

        {/* Why Free - Perché è gratuita come header */}
        <Divider style={styles.sectionDivider} />
        <Pressable
          onPress={() => router.push('/about')}
          style={({ pressed }) => [styles.sectionHeaderRow, pressed && styles.settingsRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('settings.whyFree')}
        >
          <MaterialCommunityIcons name="heart-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.whyFree')}</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={20}
            color={theme.colors.textSecondary}
            style={{ marginLeft: 'auto' }}
          />
        </Pressable>

        {/* Reset preferenze */}
        <Divider style={styles.sectionDivider} />
        <Pressable
          onPress={handleResetApp}
          style={({ pressed }) => [styles.settingsRow, pressed && styles.settingsRowPressed]}
          accessibilityRole="button"
          accessibilityLabel={i18n.t('settings.clearData')}
        >
          <MaterialCommunityIcons name="restart" size={22} color={theme.colors.error} />
          <View style={styles.settingsRowText}>
            <Text style={[styles.settingsRowTitle, { color: theme.colors.error }]}>{i18n.t('settings.clearData')}</Text>
          </View>
        </Pressable>

        {/* Footer Legal Links - Privacy e Disclaimer in basso */}
        <View style={styles.legalFooter}>
          <View style={styles.legalRow}>
            <Pressable
              onPress={() => router.push('/legal?tab=privacy')}
              style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('settings.privacyPolicy')}
            >
              <Text style={styles.legalLinkText}>{i18n.t('settings.privacyPolicy')}</Text>
            </Pressable>

            <Text style={styles.legalSeparator} accessibilityElementsHidden>•</Text>

            <Pressable
              onPress={() => router.push('/legal?tab=terms')}
              style={({ pressed }) => [styles.legalLink, pressed && { opacity: 0.6 }]}
              accessibilityRole="button"
              accessibilityLabel={i18n.t('settings.disclaimer')}
            >
              <Text style={styles.legalLinkText}>{i18n.t('settings.disclaimer')}</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ height: Math.max(insets.bottom, 16) + 16 }} />
      </ScrollView>
    </View>
  );
}

const makeStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  appLanguageWrapper: {
    paddingTop: 12,
  },
  langPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
    minHeight: 56,
  },
  langPickerAnchor: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    gap: 6,
    marginLeft: 'auto',
  },
  langPickerFlag: {
    fontSize: 18,
    lineHeight: 24,
  },
  langPickerLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  langPickerOptions: {
    marginHorizontal: 16,
    marginTop: 4,
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    overflow: 'hidden',
  },
  langPickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  langPickerOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
  },
  langPickerOptionPressed: {
    backgroundColor: theme.colors.background,
    opacity: 0.7,
  },
  langPickerOptionFlag: {
    fontSize: 24,
    lineHeight: 32,
    marginRight: 12,
  },
  langPickerOptionName: {
    flex: 1,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  langPickerOptionNameSelected: {
    fontWeight: '600',
    color: theme.colors.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  appearanceWrapper: {
    paddingTop: 4,
  },
  themeOptionIcon: {
    marginRight: 12,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  sectionDivider: {
    marginVertical: 12,
    marginHorizontal: 16,
    backgroundColor: theme.colors.divider,
    height: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  settingsRowPressed: {
    opacity: 0.6,
  },
  settingsRowText: {
    flex: 1,
  },
  settingsRowTitle: {
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  legalFooter: {
    marginTop: 16,
    paddingTop: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  legalRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  legalLink: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  legalLinkText: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
  legalSeparator: {
    fontSize: 13,
    color: theme.colors.textDisabled,
  },
});
