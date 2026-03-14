import React, { useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ALLERGENS } from '../../../constants/allergens';
import { ALLERGEN_IMAGES } from '../../../constants/allergenImages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../../../constants/otherRestrictions';
import { OTHER_FOODS, OtherFoodId } from '../../../constants/otherFoods';
import { theme } from '../../../constants/theme';
import i18n from '../../../utils/i18n';
import DietModeSection from './DietModeSection';
import { CardPortraitProps } from './types';

const getRestrictionInfo = (id: RestrictionItemId) => {
  return RESTRICTION_ITEMS.find((r) => r.id === id);
};

const getOtherFoodInfo = (id: OtherFoodId) => {
  return OTHER_FOODS.find((f) => f.id === id);
};

export default function CardPortrait({
  selectedAllergens,
  selectedOtherFoods,
  inlineRestrictions,
  separateRestrictions,
  colors,
  translations,
  restrictionTranslations,
  dietModeSections,
  expandedAllergen,
  displayMode,
  showAppToggle,
  showEnglishToggle,
  cardLanguageLabel,
  appLanguageLabel,
  englishLabel,
  pregnancyMode,
  fontBoost,
  getAllergenTranslation,
  getAllergenDescription,
  getAllergenWarning,
  getRestrictionTranslation,
  getOtherFoodTranslation,
  toggleExpand,
  onDisplayModeChange,
}: CardPortraitProps) {
  const insets = useSafeAreaInsets();
  const hasAllergens = selectedAllergens.length > 0;
  const hasOtherFoods = selectedOtherFoods.length > 0;
  const showWarningIcon = colors.cardStyle === 'allergy' || (colors.cardStyle === 'dietOnly' && dietModeSections[0]?.modeId !== 'vegetarian');

  const dynamicStyles = useMemo(() => StyleSheet.create({
    headerSection: {
      backgroundColor: colors.headerBg,
      padding: 24,
      alignItems: 'center',
    },
    header: {
      fontSize: 28,
      fontWeight: 'bold' as const,
      color: theme.colors.onPrimary,
      letterSpacing: 2,
    },
    subtitle: {
      fontSize: 18,
      color: theme.colors.onPrimary,
      marginTop: 4,
      letterSpacing: 1,
      textAlign: 'center' as const,
    },
    messageSection: {
      padding: 20,
      backgroundColor: colors.messageBg,
      borderBottomWidth: 1,
      borderBottomColor: colors.messageBorder,
    },
    message: {
      fontSize: 16,
      lineHeight: 24,
      color: theme.colors.textPrimary,
      textAlign: 'center' as const,
    },
    allergenRow: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.divider,
    },
    allergenIcon: {
      fontSize: 28,
      marginRight: 16,
    },
    allergenText: {
      fontSize: 18,
      fontWeight: '600' as const,
      color: colors.allergenTextColor,
    },
    tapHint: {
      fontSize: 12 + fontBoost,
      color: theme.colors.textHint,
      marginTop: 2,
    },
    breakdownContainer: {
      backgroundColor: colors.breakdownBg,
      padding: 16,
      marginBottom: 8,
      borderRadius: 8,
      borderLeftWidth: 4,
      borderLeftColor: colors.breakdownBorder,
    },
    breakdownDescription: {
      fontSize: 14 + fontBoost,
      color: colors.breakdownDescColor,
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
    warningText: {
      fontSize: 13 + fontBoost,
      color: colors.warningTextColor,
      textAlign: 'center' as const,
      fontWeight: '600' as const,
      marginTop: 8,
      paddingHorizontal: 8,
    },
    thanksSection: {
      padding: 20,
      backgroundColor: colors.thanksBg,
    },
    thanks: {
      fontSize: 16,
      color: colors.thanksColor,
      textAlign: 'center' as const,
      fontStyle: 'italic' as const,
    },
  }), [colors, fontBoost]);

  const getAllergenInfo = (id: string) => ALLERGENS.find((a) => a.id === id);

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
      <Surface style={styles.card} elevation={4}>
        <View style={styles.cardContent}>
          <View style={dynamicStyles.headerSection}>
            {colors.cardStyle === 'pregnancy' && <Text style={dynamicStyles.header}>{'🤰 '}{translations.header}</Text>}
            {colors.cardStyle !== 'pregnancy' && (
              <Text style={dynamicStyles.header}>
                {showWarningIcon ? '⚠️ ' : ''}{translations.header}
              </Text>
            )}
            {(hasAllergens || hasOtherFoods) && (
              <Text style={dynamicStyles.subtitle}>{pregnancyMode ? translations.pregnancySubtitle : translations.subtitle}</Text>
            )}
            {!hasAllergens && !hasOtherFoods && inlineRestrictions.length > 0 && (
              <Text style={dynamicStyles.subtitle}>{restrictionTranslations.header}</Text>
            )}
          </View>

          {(hasAllergens || hasOtherFoods) && (
            <View style={dynamicStyles.messageSection}>
              <Text style={dynamicStyles.message}>{pregnancyMode ? translations.pregnancyMessage : translations.message}</Text>
            </View>
          )}

          {!hasAllergens && !hasOtherFoods && inlineRestrictions.length > 0 && (
            <View style={dynamicStyles.messageSection}>
              <Text style={dynamicStyles.message}>{restrictionTranslations.message}</Text>
            </View>
          )}

          {(hasAllergens || hasOtherFoods || inlineRestrictions.length > 0) && (
            <View style={styles.allergensSection}>
              {selectedAllergens.map((id) => {
                const allergen = getAllergenInfo(id);
                const images = ALLERGEN_IMAGES[id];
                if (!allergen || !images) return null;
                const isExpanded = expandedAllergen === id;

                return (
                  <View key={id}>
                    <Pressable
                      onPress={() => toggleExpand(id)}
                      style={({ pressed }) => [
                        dynamicStyles.allergenRow,
                        pressed && styles.allergenRowPressed,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${getAllergenTranslation(id)}, ${translations.tapToSee}`}
                      accessibilityState={{ expanded: isExpanded }}
                    >
                      <Text style={dynamicStyles.allergenIcon}>{allergen.icon}</Text>
                      <View style={styles.allergenTextContainer}>
                        <Text style={dynamicStyles.allergenText}>{getAllergenTranslation(id)}</Text>
                        <Text style={dynamicStyles.tapHint}>{translations.tapToSee} {isExpanded ? '▲' : '▼'}</Text>
                      </View>
                    </Pressable>

                    {isExpanded && (() => {
                      const warning = getAllergenWarning(id);
                      return (
                        <View style={dynamicStyles.breakdownContainer}>
                          <View style={styles.examplesRow}>
                            {images.examples.map((emoji, index) => (
                              <Text key={index} style={styles.exampleEmoji}>{emoji}</Text>
                            ))}
                          </View>
                          <Text style={dynamicStyles.breakdownDescription}>{getAllergenDescription(id)}</Text>
                          {warning && (
                            <Text style={dynamicStyles.warningText}>{warning}</Text>
                          )}
                        </View>
                      );
                    })()}
                  </View>
                );
              })}

              {selectedOtherFoods.map((id) => {
                const food = getOtherFoodInfo(id);
                if (!food) return null;
                return (
                  <View key={id} style={dynamicStyles.allergenRow}>
                    <Text style={dynamicStyles.allergenIcon}>{food.icon}</Text>
                    <View style={styles.allergenTextContainer}>
                      <Text style={dynamicStyles.allergenText}>{getOtherFoodTranslation(id)}</Text>
                    </View>
                  </View>
                );
              })}

              {inlineRestrictions.map((id) => {
                const item = getRestrictionInfo(id);
                if (!item) return null;
                return (
                  <View key={id} style={dynamicStyles.allergenRow}>
                    <Text style={dynamicStyles.allergenIcon}>{item.icon}</Text>
                    <View style={styles.allergenTextContainer}>
                      <Text style={dynamicStyles.allergenText}>{getRestrictionTranslation(id)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Diet mode sections - rendered dynamically */}
          {dietModeSections.map((section) => (
            <DietModeSection
              key={section.modeId}
              data={section}
              variant="portrait"
              getRestrictionTranslation={getRestrictionTranslation}
              getRestrictionInfo={(id) => getRestrictionInfo(id) as { icon: string } | undefined}
              fontBoost={fontBoost}
              hasOtherContent={hasAllergens || hasOtherFoods || inlineRestrictions.length > 0}
              restrictionColors={colors.cardStyle === 'pregnancy' && section.modeId === 'pregnancy' ? {
                restrictionBg: colors.restrictionBg,
                restrictionBorder: colors.restrictionBorder,
                restrictionHeaderColor: colors.restrictionHeaderColor,
                restrictionTextColor: colors.restrictionTextColor,
              } : undefined}
            />
          ))}

          <View style={dynamicStyles.thanksSection}>
            <Text style={dynamicStyles.thanks}>{translations.thanks}</Text>
          </View>
        </View>
      </Surface>

      {(showAppToggle || showEnglishToggle) && (
        <View style={styles.languageToggleRow}>
          {displayMode !== 'card' && (
            <Pressable onPress={() => onDisplayModeChange('card')} style={styles.languageToggleButton}>
              <Text style={styles.languageToggleText}>{i18n.t('card.viewInLanguage', { lang: cardLanguageLabel })}</Text>
            </Pressable>
          )}
          {displayMode !== 'app' && showAppToggle && (
            <>
              {displayMode !== 'card' && <Text style={styles.languageToggleSep}>·</Text>}
              <Pressable onPress={() => onDisplayModeChange('app')} style={styles.languageToggleButton}>
                <Text style={styles.languageToggleText}>{i18n.t('card.viewInLanguage', { lang: appLanguageLabel })}</Text>
              </Pressable>
            </>
          )}
          {displayMode !== 'english' && showEnglishToggle && (
            <>
              {(displayMode !== 'card' || showAppToggle) && <Text style={styles.languageToggleSep}>·</Text>}
              <Pressable onPress={() => onDisplayModeChange('english')} style={styles.languageToggleButton}>
                <Text style={styles.languageToggleText}>{i18n.t('card.viewInLanguage', { lang: englishLabel })}</Text>
              </Pressable>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
  },
  card: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  cardContent: {
    overflow: 'hidden',
    borderRadius: 16,
  },
  allergensSection: {
    padding: 20,
  },
  allergenRowPressed: {
    backgroundColor: theme.colors.orangeLight,
  },
  allergenTextContainer: {
    flex: 1,
  },
  examplesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    justifyContent: 'center',
    gap: 8,
  },
  exampleEmoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  languageToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    flexWrap: 'wrap',
    gap: 4,
  },
  languageToggleButton: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  languageToggleText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  languageToggleSep: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 14,
    marginHorizontal: 4,
  },
});
