import { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Pressable, useWindowDimensions } from 'react-native';
import { Text, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DownloadableLanguageCode, LanguageRegion } from '../../types';
import { DOWNLOADABLE_LANGUAGES } from '../../constants/downloadableLanguages';
import { languageMatchesQuery } from '../../utils/languageSearch';
import { DownloadProgress } from '../../services/translationService';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';
import { useAppContext } from '../../contexts/AppContext';

// Tipo unificato per lingue nella lista (scaricabili + built-in)
interface UnifiedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  region: LanguageRegion;
  builtIn: boolean;
}

// Lingue con traduzioni card già incluse nell'app
const BUILTIN_CARD_LANGUAGES: UnifiedLanguage[] = [
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', region: 'europe', builtIn: true },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧', region: 'europe', builtIn: true },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', region: 'europe', builtIn: true },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', region: 'europe', builtIn: true },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', region: 'europe', builtIn: true },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', region: 'europe', builtIn: true },
  { code: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', region: 'europe', builtIn: true },
  { code: 'pl', name: 'Polish', nativeName: 'Polski', flag: '🇵🇱', region: 'europe', builtIn: true },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', region: 'europe', builtIn: true },
  { code: 'sv', name: 'Swedish', nativeName: 'Svenska', flag: '🇸🇪', region: 'europe', builtIn: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', region: 'asia', builtIn: true },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', region: 'asia', builtIn: true },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', region: 'asia', builtIn: true },
  { code: 'th', name: 'Thai', nativeName: 'ไทย', flag: '🇹🇭', region: 'asia', builtIn: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', region: 'asia', builtIn: true },
];

const REGION_ICONS: Record<LanguageRegion, string> = {
  europe: '🇪🇺',
  asia: '🌏',
  africa: '🌍',
  other: '🌐',
};

interface DownloadableLanguagesSectionProps {
  downloadedLanguageCodes: DownloadableLanguageCode[];
  downloadingLang: DownloadableLanguageCode | null;
  downloadProgress: DownloadProgress | null;
  onDownload: (langCode: DownloadableLanguageCode) => void;
  onDelete: (langCode: DownloadableLanguageCode) => void;
}

export default function DownloadableLanguagesSection({
  downloadedLanguageCodes,
  downloadingLang,
  downloadProgress,
  onDownload,
  onDelete,
}: DownloadableLanguagesSectionProps) {
  const { settings } = useAppContext();
  const appLanguage = settings.appLanguage;
  const { width: screenWidth } = useWindowDimensions();
  const chipWidth = (screenWidth - 32 - 8) / 2;
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Record<LanguageRegion, boolean>>({
    europe: false,
    asia: false,
    africa: false,
    other: false,
  });

  // Tutte le lingue unificate (downloadable + built-in)
  const allLanguages: UnifiedLanguage[] = useMemo(() => {
    const downloadable: UnifiedLanguage[] = DOWNLOADABLE_LANGUAGES.map((lang) => ({
      ...lang,
      builtIn: false,
    }));
    return [...downloadable, ...BUILTIN_CARD_LANGUAGES];
  }, []);

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return allLanguages;
    const filtered = allLanguages.filter((lang) =>
      languageMatchesQuery(lang.code, searchQuery, {
        nativeName: lang.nativeName,
        englishName: lang.name,
      }, appLanguage, { searchCode: true })
    );
    return filtered.sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }, [searchQuery, appLanguage, allLanguages]);

  // Lingue scaricate dall'utente (solo downloadable, non built-in)
  const downloadedLangs = useMemo(() => {
    const downloaded = DOWNLOADABLE_LANGUAGES.filter((lang) =>
      downloadedLanguageCodes.includes(lang.code)
    );
    return downloaded.sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }, [downloadedLanguageCodes]);

  // Lingue per regione: include built-in (come "scaricate") + non scaricate
  const langsByRegion = useMemo(() => {
    const regions: Record<LanguageRegion, UnifiedLanguage[]> = {
      europe: [],
      asia: [],
      africa: [],
      other: [],
    };

    // Aggiungi le built-in
    BUILTIN_CARD_LANGUAGES.forEach((lang) => {
      regions[lang.region].push(lang);
    });

    // Aggiungi le downloadable (sia scaricate che non)
    DOWNLOADABLE_LANGUAGES.forEach((lang) => {
      regions[lang.region].push({ ...lang, builtIn: false });
    });

    // Ordina ogni regione alfabeticamente per nome nativo
    Object.keys(regions).forEach((region) => {
      regions[region as LanguageRegion].sort((a, b) =>
        a.nativeName.localeCompare(b.nativeName)
      );
    });

    return regions;
  }, []);

  const getRegionName = (region: LanguageRegion): string => {
    return i18n.t(`settings.region_${region}`);
  };

  const getRegionCount = (region: LanguageRegion): number => {
    return langsByRegion[region].length;
  };

  const toggleRegion = (region: LanguageRegion) => {
    setExpandedRegions((prev) => ({
      ...prev,
      [region]: !prev[region],
    }));
  };

  const renderDownloadAction = (langCode: DownloadableLanguageCode) => {
    const isDownloading = downloadingLang === langCode;
    if (isDownloading) {
      return (
        <View style={styles.downloadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      );
    }
    return (
      <MaterialCommunityIcons
        name="download-circle-outline"
        size={24}
        color={theme.colors.primary}
      />
    );
  };

  const renderProgressBar = (langCode: DownloadableLanguageCode) => {
    if (downloadingLang !== langCode || !downloadProgress) return null;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBarRow}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${downloadProgress.percentage}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(downloadProgress.percentage)}%
          </Text>
        </View>
        <Text style={styles.doNotLeaveText}>
          {i18n.t('settings.doNotLeaveScreen')}
        </Text>
      </View>
    );
  };

  // Determina lo stato di una lingua: built-in, scaricata, o da scaricare
  const getLangStatus = (lang: UnifiedLanguage): 'builtIn' | 'downloaded' | 'available' => {
    if (lang.builtIn) return 'builtIn';
    if (downloadedLanguageCodes.includes(lang.code as DownloadableLanguageCode)) return 'downloaded';
    return 'available';
  };

  // Render icona azione in base allo stato
  const renderLangAction = (lang: UnifiedLanguage) => {
    const status = getLangStatus(lang);

    if (status === 'builtIn') {
      return <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />;
    }

    if (status === 'downloaded') {
      return <MaterialCommunityIcons name="check-circle" size={24} color={theme.colors.primary} />;
    }

    return renderDownloadAction(lang.code as DownloadableLanguageCode);
  };

  // Render una riga lingua (usata sia nelle regioni che nella ricerca)
  const renderLanguageRow = (lang: UnifiedLanguage, index: number, total: number) => {
    const status = getLangStatus(lang);
    const isDownloading = !lang.builtIn && downloadingLang === lang.code;

    return (
      <View key={lang.code}>
        <Pressable
          onPress={() => {
            if (status === 'available' && !isDownloading) {
              onDownload(lang.code as DownloadableLanguageCode);
            }
          }}
          style={({ pressed }) => [
            styles.languageItem,
            pressed && status === 'available' && styles.languageItemPressed,
          ]}
          accessibilityRole="button"
          disabled={status !== 'available'}
        >
          <Text style={styles.langFlag}>{lang.flag}</Text>
          <View style={styles.langInfo}>
            <Text style={styles.langNativeName}>{lang.nativeName}</Text>
            <Text style={styles.langName}>
              {lang.name}
              {status === 'builtIn' ? ` · ${i18n.t('settings.includedLanguages')}` : ''}
            </Text>
          </View>
          {renderLangAction(lang)}
        </Pressable>
        {!lang.builtIn && renderProgressBar(lang.code as DownloadableLanguageCode)}
        {index < total - 1 && <Divider style={styles.itemDivider} />}
      </View>
    );
  };

  return (
    <>
      <Divider style={styles.sectionDivider} />

      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <MaterialCommunityIcons name="download-circle-outline" size={22} color={theme.colors.primary} />
          <Text style={styles.sectionHeaderTitle}>{i18n.t('settings.downloadLanguages')}</Text>
        </View>
        <Text style={styles.downloadDesc}>
          {i18n.t('settings.downloadLanguagesDesc')}
        </Text>

        {/* Barra di ricerca */}
        <Surface style={styles.searchSurface} elevation={0}>
          <View style={styles.searchInputContainer}>
            <MaterialCommunityIcons name="magnify" size={20} color={theme.colors.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder={i18n.t('settings.searchLanguage')}
              placeholderTextColor={theme.colors.textDisabled}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={i18n.t('settings.searchLanguage')}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
                hitSlop={8}
              >
                <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>
        </Surface>

        <Text style={styles.languageCount}>
          {filteredLanguages.length} {i18n.t('settings.languagesAvailable')}
        </Text>

        {/* Lingue scaricate dall'utente */}
        {downloadedLangs.length > 0 && (
          <View style={styles.downloadedSection}>
            <Text style={styles.subsectionTitle}>
              ✓ {i18n.t('settings.downloadedLanguages')} ({downloadedLangs.length})
            </Text>
            <View style={styles.downloadedChips}>
              {downloadedLangs.map((lang) => {
                const isDownloading = downloadingLang === lang.code;
                return (
                  <Surface key={lang.code} style={[styles.downloadedChip, { width: chipWidth }]} elevation={1}>
                    <Text style={styles.downloadedChipFlag}>{lang.flag}</Text>
                    <View style={styles.downloadedChipContent}>
                      <Text style={styles.downloadedChipName} numberOfLines={1}>{lang.nativeName}</Text>
                      <Text style={styles.downloadedChipSub} numberOfLines={1}>{lang.name}</Text>
                    </View>
                    {isDownloading ? (
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                      <Pressable
                        onPress={() => onDelete(lang.code)}
                        hitSlop={8}
                        accessibilityRole="button"
                        accessibilityLabel={`${i18n.t('settings.delete')} ${lang.nativeName}`}
                      >
                        <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.textSecondary} />
                      </Pressable>
                    )}
                  </Surface>
                );
              })}
            </View>
          </View>
        )}

        {/* Risultati ricerca */}
        {searchQuery.trim().length > 0 && (
          <View style={styles.searchResults}>
            {filteredLanguages.map((lang, index) =>
              renderLanguageRow(lang, index, filteredLanguages.length)
            )}
            {filteredLanguages.length === 0 && (
              <View style={styles.noResults}>
                <MaterialCommunityIcons name="cloud-search-outline" size={48} color={theme.colors.textDisabled} />
                <Text style={styles.noResultsText}>
                  {i18n.t('settings.noLanguagesFound')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Lingue per regione */}
        {searchQuery.trim().length === 0 && (['europe', 'asia', 'africa', 'other'] as LanguageRegion[]).map((region) => {
          const regionLangs = langsByRegion[region];
          if (regionLangs.length === 0) return null;
          const isExpanded = expandedRegions[region];

          return (
            <Surface key={region} style={styles.regionCard} elevation={1}>
              <View style={styles.regionCardContent}>
              <Pressable
                onPress={() => toggleRegion(region)}
                style={({ pressed }) => [
                  styles.regionHeader,
                  pressed && styles.regionHeaderPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${getRegionName(region)}, ${getRegionCount(region)} languages`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.regionHeaderLeft}>
                  <Text style={styles.regionIcon}>{REGION_ICONS[region]}</Text>
                  <View>
                    <Text style={styles.regionTitle}>{getRegionName(region)}</Text>
                    <Text style={styles.regionCount}>{getRegionCount(region)} {i18n.t('settings.languagesAvailable')}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={24}
                  color={theme.colors.primary}
                />
              </Pressable>

              {isExpanded && (
                <>
                  <Divider style={styles.regionDivider} />
                  {regionLangs.map((lang, index) =>
                    renderLanguageRow(lang, index, regionLangs.length)
                  )}
                </>
              )}
              </View>
            </Surface>
          );
        })}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  sectionDivider: {
    marginVertical: 12,
    marginHorizontal: 16,
    backgroundColor: theme.colors.divider,
    height: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  downloadDesc: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    lineHeight: 18,
  },
  searchSurface: {
    backgroundColor: theme.colors.background,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.textPrimary,
    padding: 0,
  },
  languageCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  downloadedSection: {
    marginBottom: 20,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 12,
  },
  downloadedChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  downloadedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primaryLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
    minHeight: 56,
  },
  downloadedChipFlag: {
    fontSize: 24,
  },
  downloadedChipContent: {
    flex: 1,
  },
  downloadedChipName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  downloadedChipSub: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  searchResults: {
    marginTop: 8,
  },
  regionCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginBottom: 12,
  },
  regionCardContent: {
    overflow: 'hidden',
    borderRadius: 12,
  },
  regionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  regionHeaderPressed: {
    backgroundColor: `${theme.colors.primary}08`,
  },
  regionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  regionIcon: {
    fontSize: 28,
  },
  regionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  regionCount: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  languageItemPressed: {
    backgroundColor: theme.colors.primaryLight,
  },
  langFlag: {
    fontSize: 28,
  },
  langInfo: {
    flex: 1,
  },
  langNativeName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  langName: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  downloadingContainer: {
    width: 24,
    alignItems: 'center',
  },
  itemDivider: {
    marginLeft: 56,
    backgroundColor: theme.colors.divider,
    height: 1,
  },
  regionDivider: {
    backgroundColor: theme.colors.divider,
    height: 1,
  },
  progressContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  progressBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: theme.colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.colors.primary,
  },
  progressText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    minWidth: 35,
    fontWeight: '600',
  },
  doNotLeaveText: {
    fontSize: 11,
    color: theme.colors.primary,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 6,
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  noResultsText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: 'center',
  },
});
