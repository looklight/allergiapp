import React, { useRef, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { ALLERGENS } from '../../../constants/allergens';
import { ALLERGEN_IMAGES } from '../../../constants/allergenImages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../../../constants/otherRestrictions';
import { OTHER_FOODS, OtherFoodId } from '../../../constants/otherFoods';
import { AllergenId } from '../../../types';
import { theme } from '../../../constants/theme';
import DietModeSection from './DietModeSection';
import { CardLandscapeProps } from '../../../types/card';

const getAllergenInfo = (id: AllergenId) => ALLERGENS.find((a) => a.id === id);
const getRestrictionInfo = (id: RestrictionItemId) => RESTRICTION_ITEMS.find((r) => r.id === id);
const getOtherFoodInfo = (id: OtherFoodId) => OTHER_FOODS.find((f) => f.id === id);

export default function CardLandscape({
  selectedAllergens,
  selectedOtherFoods,
  inlineRestrictions,
  separateRestrictions,
  colors,
  translations,
  restrictionTranslations,
  dietModeSections,
  selectedLandscapeItem,
  setSelectedLandscapeItem,
  pregnancyMode,
  getAllergenTranslation,
  getAllergenDescription,
  getAllergenWarning,
  getRestrictionTranslation,
  getOtherFoodTranslation,
  fontBoost,
  insets,
}: CardLandscapeProps) {
  const hasAllergens = selectedAllergens.length > 0;
  const hasOtherFoods = selectedOtherFoods.length > 0;
  const hasRestrictions = separateRestrictions.length > 0 || inlineRestrictions.length > 0;
  const showWarningIcon = colors.cardStyle === 'allergy' || (colors.cardStyle === 'dietOnly' && dietModeSections[0]?.modeId !== 'vegetarian');
  const hasAllergenContent = hasAllergens || hasOtherFoods || inlineRestrictions.length > 0;
  const hasLeftContent = hasAllergenContent || dietModeSections.length > 0;
  const safeHorizontal = Math.max(insets.left, insets.right, 48);
  const safeVertical = Math.max(insets.top, insets.bottom, 8);

  const leftScrollRef = useRef<ScrollView>(null);
  const rightScrollRef = useRef<ScrollView>(null);
  const leftPositions = useRef<Map<string, number>>(new Map());
  const rightPositions = useRef<Map<string, number>>(new Map());

  const handleItemSelect = useCallback((id: string) => {
    const newSelection = selectedLandscapeItem === id ? null : id;
    setSelectedLandscapeItem(newSelection);
    if (newSelection) {
      const leftY = leftPositions.current.get(newSelection);
      if (leftY !== undefined) {
        leftScrollRef.current?.scrollTo({ y: Math.max(0, leftY - 10), animated: true });
      }
      const rightY = rightPositions.current.get(newSelection);
      if (rightY !== undefined) {
        rightScrollRef.current?.scrollTo({ y: Math.max(0, rightY - 10), animated: true });
      }
    }
  }, [selectedLandscapeItem, setSelectedLandscapeItem]);

  return (
    <View style={[styles.landscapeWrapper, { backgroundColor: colors.landscapeWrapperBg }]}>
      <View style={[styles.landscapeCard, {
        marginTop: safeVertical,
        marginLeft: safeHorizontal,
        marginRight: safeHorizontal,
        marginBottom: safeVertical,
      }]}>
        <View style={styles.landscapeBody}>
          {/* Left column - Allergens + restrictions + diet modes */}
          {hasLeftContent && (
            <View style={[styles.landscapeLeftColumn, { backgroundColor: colors.landscapeLeftBg }]}>
              {hasAllergenContent && (
                <View style={styles.landscapeLeftHeader}>
                  <Text style={styles.landscapeLeftHeaderTitle}>
                    {colors.cardStyle === 'pregnancy' ? '🤰 ' : showWarningIcon ? '⚠️ ' : ''}{translations.header}
                  </Text>
                </View>
              )}

              <ScrollView
                ref={leftScrollRef}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.landscapeAllergensScroll}
              >
                {selectedAllergens.map((id) => {
                  const allergen = getAllergenInfo(id);
                  if (!allergen) return null;
                  const isSelected = selectedLandscapeItem === id;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => handleItemSelect(id)}
                      onLayout={(e) => leftPositions.current.set(id, e.nativeEvent.layout.y)}
                      style={[
                        styles.landscapeAllergenItem,
                        isSelected && styles.landscapeAllergenItemSelected,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={getAllergenTranslation(id)}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[
                        styles.landscapeAllergenIconBg,
                        isSelected && styles.landscapeAllergenIconBgSelected
                      ]}>
                        <Text style={styles.landscapeAllergenIcon} accessibilityElementsHidden>{allergen.icon}</Text>
                      </View>
                      <Text style={[
                        styles.landscapeAllergenName,
                        { color: colors.landscapeAllergenNameColor },
                        isSelected && styles.landscapeAllergenNameSelected
                      ]} numberOfLines={2}>
                        {getAllergenTranslation(id)}
                      </Text>
                    </Pressable>
                  );
                })}

                {selectedOtherFoods.map((id) => {
                  const food = getOtherFoodInfo(id);
                  if (!food) return null;
                  return (
                    <View
                      key={id}
                      style={styles.landscapeAllergenItem}
                      accessibilityLabel={getOtherFoodTranslation(id)}
                    >
                      <View style={styles.landscapeAllergenIconBg}>
                        <Text style={styles.landscapeAllergenIcon} accessibilityElementsHidden>{food.icon}</Text>
                      </View>
                      <Text style={[
                        styles.landscapeAllergenName,
                        { color: colors.landscapeAllergenNameColor },
                      ]} numberOfLines={2}>
                        {getOtherFoodTranslation(id)}
                      </Text>
                    </View>
                  );
                })}

                {inlineRestrictions.map((id) => {
                  const item = getRestrictionInfo(id);
                  if (!item) return null;
                  return (
                    <View
                      key={id}
                      style={styles.landscapeAllergenItem}
                      accessibilityLabel={getRestrictionTranslation(id)}
                    >
                      <View style={styles.landscapeAllergenIconBg}>
                        <Text style={styles.landscapeAllergenIcon} accessibilityElementsHidden>{item.icon}</Text>
                      </View>
                      <Text style={[
                        styles.landscapeAllergenName,
                        { color: colors.landscapeAllergenNameColor },
                      ]} numberOfLines={2}>
                        {getRestrictionTranslation(id)}
                      </Text>
                    </View>
                  );
                })}

                {hasAllergenContent && dietModeSections.length > 0 && (
                  <View style={styles.landscapeDivider} />
                )}

                {dietModeSections.map((section, index) => {
                  const isSelected = selectedLandscapeItem === section.modeId;
                  return (
                    <Pressable
                      key={section.modeId}
                      onPress={() => handleItemSelect(section.modeId)}
                      onLayout={(e) => leftPositions.current.set(section.modeId, e.nativeEvent.layout.y)}
                      style={[
                        styles.landscapeAllergenItem,
                        isSelected && styles.landscapeAllergenItemSelected,
                        index === dietModeSections.length - 1 && { marginBottom: 0 }
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={section.header}
                      accessibilityState={{ selected: isSelected }}
                    >
                      <View style={[
                        styles.landscapeAllergenIconBg,
                        { backgroundColor: section.sectionColors.background },
                        isSelected && styles.landscapeAllergenIconBgSelected
                      ]}>
                        <Text style={styles.landscapeAllergenIcon} accessibilityElementsHidden>{section.icon}</Text>
                      </View>
                      <Text style={[
                        styles.landscapeAllergenName,
                        { color: colors.landscapeAllergenNameColor },
                        isSelected && styles.landscapeAllergenNameSelected
                      ]} numberOfLines={2}>
                        {section.header}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Right column - Details */}
          <View style={styles.landscapeRightColumn}>
            {(hasAllergens || hasOtherFoods) && (
              <View style={styles.landscapeRightHeader}>
                <Text style={styles.landscapeRightHeaderText}>
                  {pregnancyMode ? translations.pregnancyMessage : translations.message}
                </Text>
              </View>
            )}

            {!hasAllergens && !hasOtherFoods && hasRestrictions && (
              <View style={[styles.landscapeRightHeader, { backgroundColor: colors.restrictionBg }]}>
                <Text style={[styles.landscapeRightHeaderText, { fontWeight: 'bold' }]}>
                  {showWarningIcon ? '⚠️ ' : ''}{restrictionTranslations.message}
                </Text>
              </View>
            )}

            <ScrollView
              ref={rightScrollRef}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.landscapeDetailsScroll}
              style={{ flex: 1 }}
            >
              {hasAllergens && selectedAllergens.map((id, index) => {
                const allergen = getAllergenInfo(id);
                const images = ALLERGEN_IMAGES[id];
                if (!allergen || !images) return null;
                const isSelected = selectedLandscapeItem === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => handleItemSelect(id)}
                    onLayout={(e) => rightPositions.current.set(id, e.nativeEvent.layout.y)}
                    style={[
                      styles.landscapeDetailCard,
                      isSelected && styles.landscapeDetailCardSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.landscapeDetailTop}>
                      <View style={[
                        styles.landscapeDetailBadge,
                        { backgroundColor: colors.landscapeDetailBadgeBg },
                        isSelected && styles.landscapeDetailBadgeSelected
                      ]}>
                        <Text style={styles.landscapeDetailBadgeIcon} accessibilityElementsHidden>{allergen.icon}</Text>
                        <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor, fontSize: 14 + fontBoost }]}>
                          {getAllergenTranslation(id)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.landscapeExamplesRow} accessibilityElementsHidden>
                      <Text style={[styles.landscapeExamplesLabel, fontBoost > 0 && { fontSize: 13 + fontBoost }]}>{translations.examples}</Text>
                      {images.examples.slice(0, 5).map((emoji, idx) => (
                        <Text key={idx} style={styles.landscapeExampleEmoji}>{emoji}</Text>
                      ))}
                    </View>
                    <Text style={[styles.landscapeDetailDescription, fontBoost > 0 && { fontSize: 15 + fontBoost, lineHeight: 21 + fontBoost }]}>{getAllergenDescription(id)}</Text>
                    {(() => {
                      const warning = getAllergenWarning(id);
                      return warning ? (
                        <View style={styles.landscapeWarningBox}>
                          <Text style={[styles.landscapeDetailWarning, fontBoost > 0 && { fontSize: 14 + fontBoost, lineHeight: 19 + fontBoost }]}>{warning}</Text>
                        </View>
                      ) : null;
                    })()}
                  </Pressable>
                );
              })}

              {selectedOtherFoods.map((id) => {
                const food = getOtherFoodInfo(id);
                if (!food) return null;
                return (
                  <View key={id} style={styles.landscapeDetailCard} accessibilityLabel={getOtherFoodTranslation(id)}>
                    <View style={styles.landscapeDetailTop}>
                      <View style={[styles.landscapeDetailBadge, { backgroundColor: colors.landscapeDetailBadgeBg }]}>
                        <Text style={styles.landscapeDetailBadgeIcon} accessibilityElementsHidden>{food.icon}</Text>
                        <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor, fontSize: 14 + fontBoost }]}>
                          {getOtherFoodTranslation(id)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {inlineRestrictions.map((id) => {
                const item = getRestrictionInfo(id);
                if (!item) return null;
                return (
                  <View key={id} style={styles.landscapeDetailCard} accessibilityLabel={getRestrictionTranslation(id)}>
                    <View style={styles.landscapeDetailTop}>
                      <View style={[styles.landscapeDetailBadge, { backgroundColor: colors.landscapeDetailBadgeBg }]}>
                        <Text style={styles.landscapeDetailBadgeIcon} accessibilityElementsHidden>{item.icon}</Text>
                        <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor, fontSize: 14 + fontBoost }]}>
                          {getRestrictionTranslation(id)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Diet mode sections */}
              {dietModeSections.map((section) => {
                const isDietSelected = selectedLandscapeItem === section.modeId;
                return (
                  <Pressable
                    key={section.modeId}
                    onPress={() => handleItemSelect(section.modeId)}
                    onLayout={(e) => rightPositions.current.set(section.modeId, e.nativeEvent.layout.y)}
                    style={[
                      styles.landscapeDietDetailWrapper,
                      isDietSelected && styles.landscapeDietDetailWrapperSelected,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={section.header}
                    accessibilityState={{ selected: isDietSelected }}
                  >
                    <DietModeSection
                      data={section}
                      variant="landscape"
                      getRestrictionTranslation={getRestrictionTranslation}
                      getRestrictionInfo={(rid) => getRestrictionInfo(rid) as { icon: string } | undefined}
                      fontBoost={fontBoost}
                      hasOtherContent={hasAllergenContent}
                      restrictionColors={colors.cardStyle === 'pregnancy' && section.modeId === 'pregnancy' ? {
                        restrictionBg: colors.restrictionBg,
                        restrictionBorder: colors.restrictionBorder,
                        restrictionHeaderColor: colors.restrictionHeaderColor,
                        restrictionTextColor: colors.restrictionTextColor,
                      } : undefined}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>

            <View style={[styles.landscapeFooter, { backgroundColor: colors.thanksBg }]}>
              <Text style={[styles.landscapeFooterText, { color: colors.thanksColor }]}>{translations.thanks}</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  landscapeWrapper: {
    flex: 1,
  },
  landscapeCard: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 12,
  },
  landscapeBody: {
    flex: 1,
    flexDirection: 'row',
  },
  landscapeLeftColumn: {
    width: '35%',
  },
  landscapeLeftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.2)',
  },
  landscapeLeftHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: theme.colors.onPrimary,
    letterSpacing: 2,
  },
  landscapeAllergensScroll: {
    padding: 10,
    paddingBottom: 16,
  },
  landscapeAllergenItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeAllergenItemSelected: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  landscapeAllergenIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.colors.orangeLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeAllergenIconBgSelected: {
    backgroundColor: theme.colors.amberLight,
    borderColor: theme.colors.accent,
  },
  landscapeAllergenIcon: {
    fontSize: 30,
    lineHeight: 38,
  },
  landscapeAllergenName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  landscapeAllergenNameSelected: {
    color: theme.colors.warning,
  },
  landscapeRightColumn: {
    flex: 1,
    backgroundColor: theme.colors.backgroundAlt,
  },
  landscapeRightHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.amberLight,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.amberBorder,
  },
  landscapeRightHeaderText: {
    fontSize: 16,
    color: theme.colors.cardDescriptionText,
    textAlign: 'center',
    lineHeight: 22,
  },
  landscapeDetailsScroll: {
    padding: 10,
    paddingBottom: 8,
  },
  landscapeDetailCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeDetailCardSelected: {
    backgroundColor: theme.colors.accentLight,
    borderColor: theme.colors.accent,
    shadowColor: theme.colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  landscapeDetailTop: {
    marginBottom: 6,
  },
  landscapeDetailBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  landscapeDetailBadgeSelected: {
    backgroundColor: theme.colors.accent,
  },
  landscapeDetailBadgeIcon: {
    fontSize: 16,
    lineHeight: 22,
    marginRight: 6,
  },
  landscapeDetailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  landscapeExamplesLabel: {
    fontSize: 13,
    color: theme.colors.textHint,
    fontWeight: '600',
    marginRight: 8,
  },
  landscapeExamplesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  landscapeExampleEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  landscapeDetailDescription: {
    fontSize: 15,
    color: theme.colors.textMuted,
    lineHeight: 21,
  },
  landscapeWarningBox: {
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: theme.colors.errorContainer,
  },
  landscapeDetailWarning: {
    fontSize: 14,
    color: theme.colors.errorDark,
    fontWeight: '600',
    lineHeight: 19,
  },
  landscapeDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
    marginBottom: 10,
  },
  landscapeDietDetailWrapper: {
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    marginBottom: 10,
    overflow: 'hidden',
  },
  landscapeDietDetailWrapperSelected: {
    borderColor: theme.colors.accent,
  },
  landscapeFooter: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  landscapeFooterText: {
    fontSize: 16,
    fontWeight: '500',
    fontStyle: 'italic',
  },
});
