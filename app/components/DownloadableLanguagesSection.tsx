import { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Pressable, Dimensions } from 'react-native';
import { Text, ActivityIndicator, Divider, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DownloadableLanguageCode, LanguageRegion, DownloadableLanguageInfo } from '../../types';
import { DOWNLOADABLE_LANGUAGES } from '../../constants/downloadableLanguages';
import { DownloadProgress } from '../../utils/translationService';
import { theme } from '../../constants/theme';
import i18n from '../../utils/i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRegions, setExpandedRegions] = useState<Record<LanguageRegion, boolean>>({
    europe: false,
    asia: false,
    africa: false,
    other: false,
  });

  const filteredLanguages = useMemo(() => {
    if (!searchQuery.trim()) return DOWNLOADABLE_LANGUAGES;
    const q = searchQuery.toLowerCase();
    const filtered = DOWNLOADABLE_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) ||
        lang.nativeName.toLowerCase().includes(q) ||
        lang.code.toLowerCase().includes(q)
    );
    // Ordina alfabeticamente per nome nativo
    return filtered.sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }, [searchQuery]);

  const downloadedLangs = useMemo(() => {
    const downloaded = DOWNLOADABLE_LANGUAGES.filter((lang) =>
      downloadedLanguageCodes.includes(lang.code)
    );
    // Ordina alfabeticamente per nome nativo
    return downloaded.sort((a, b) => a.nativeName.localeCompare(b.nativeName));
  }, [downloadedLanguageCodes]);

  const availableLangsByRegion = useMemo(() => {
    const regions: Record<LanguageRegion, DownloadableLanguageInfo[]> = {
      europe: [],
      asia: [],
      africa: [],
      other: [],
    };

    DOWNLOADABLE_LANGUAGES.forEach((lang) => {
      if (!downloadedLanguageCodes.includes(lang.code)) {
        regions[lang.region].push(lang);
      }
    });

    // Ordina alfabeticamente per nome nativo
    Object.keys(regions).forEach((region) => {
      regions[region as LanguageRegion].sort((a, b) =>
        a.nativeName.localeCompare(b.nativeName)
      );
    });

    return regions;
  }, [downloadedLanguageCodes]);

  const getRegionName = (region: LanguageRegion): string => {
    return i18n.t(`settings.region_${region}`);
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

        {/* Lingue scaricate */}
        {downloadedLangs.length > 0 && (
          <View style={styles.downloadedSection}>
            <Text style={styles.subsectionTitle}>
              ✓ {i18n.t('settings.downloadedLanguages')} ({downloadedLangs.length})
            </Text>
            <View style={styles.downloadedChips}>
              {downloadedLangs.map((lang) => {
                const isDownloading = downloadingLang === lang.code;
                return (
                  <Surface key={lang.code} style={styles.downloadedChip} elevation={1}>
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
        {searchQuery.trim().length > 0 && filteredLanguages.filter(l => !downloadedLanguageCodes.includes(l.code)).length > 0 && (
          <View style={styles.searchResults}>
            {filteredLanguages
              .filter((lang) => !downloadedLanguageCodes.includes(lang.code))
              .map((lang, index, array) => {
                const isDownloading = downloadingLang === lang.code;
                return (
                  <View key={lang.code}>
                    <Pressable
                      onPress={() => !isDownloading && onDownload(lang.code)}
                      style={({ pressed }) => [
                        styles.languageItem,
                        pressed && styles.languageItemPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${i18n.t('settings.download')} ${lang.nativeName}`}
                    >
                      <Text style={styles.langFlag}>{lang.flag}</Text>
                      <View style={styles.langInfo}>
                        <Text style={styles.langNativeName}>{lang.nativeName}</Text>
                        <Text style={styles.langName}>{lang.name}</Text>
                      </View>
                      {renderDownloadAction(lang.code)}
                    </Pressable>
                    {renderProgressBar(lang.code)}
                    {index < array.length - 1 && <Divider style={styles.itemDivider} />}
                  </View>
                );
              })}
          </View>
        )}

        {/* Lingue per regione */}
        {searchQuery.trim().length === 0 && (['europe', 'asia', 'africa', 'other'] as LanguageRegion[]).map((region) => {
          const regionLangs = availableLangsByRegion[region];
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
                accessibilityLabel={`${getRegionName(region)}, ${regionLangs.length} languages`}
                accessibilityState={{ expanded: isExpanded }}
              >
                <View style={styles.regionHeaderLeft}>
                  <Text style={styles.regionIcon}>{REGION_ICONS[region]}</Text>
                  <View>
                    <Text style={styles.regionTitle}>{getRegionName(region)}</Text>
                    <Text style={styles.regionCount}>{regionLangs.length} lingue</Text>
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
                  {regionLangs.map((lang, index) => {
                    const isDownloading = downloadingLang === lang.code;
                    return (
                      <View key={lang.code}>
                        <Pressable
                          onPress={() => !isDownloading && onDownload(lang.code)}
                          style={({ pressed }) => [
                            styles.languageItem,
                            pressed && styles.languageItemPressed,
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`${i18n.t('settings.download')} ${lang.nativeName}`}
                        >
                          <Text style={styles.langFlag}>{lang.flag}</Text>
                          <View style={styles.langInfo}>
                            <Text style={styles.langNativeName}>{lang.nativeName}</Text>
                            <Text style={styles.langName}>{lang.name}</Text>
                          </View>
                          {renderDownloadAction(lang.code)}
                        </Pressable>
                        {renderProgressBar(lang.code)}
                        {index < regionLangs.length - 1 && <Divider style={styles.itemDivider} />}
                      </View>
                    );
                  })}
                </>
              )}
              </View>
            </Surface>
          );
        })}

        {/* Nessun risultato */}
        {searchQuery.trim().length > 0 && filteredLanguages.length === 0 && (
          <View style={styles.noResults}>
            <MaterialCommunityIcons name="cloud-search-outline" size={48} color={theme.colors.textDisabled} />
            <Text style={styles.noResultsText}>
              {i18n.t('settings.noLanguagesFound')}
            </Text>
          </View>
        )}
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
    width: (SCREEN_WIDTH - 32 - 8) / 2, // Metà schermo - padding laterale (16*2) - gap (8) / 2
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
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
