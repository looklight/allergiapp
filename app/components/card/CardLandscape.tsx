import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { ALLERGENS } from '../../../constants/allergens';
import { ALLERGEN_IMAGES } from '../../../constants/allergenImages';
import { RESTRICTION_ITEMS, RestrictionItemId } from '../../../constants/otherRestrictions';
import { AllergenId } from '../../../types';
import DietModeSection from './DietModeSection';
import { CardLandscapeProps } from './types';

const getAllergenInfo = (id: AllergenId) => ALLERGENS.find((a) => a.id === id);
const getRestrictionInfo = (id: RestrictionItemId) => RESTRICTION_ITEMS.find((r) => r.id === id);

export default function CardLandscape({
  selectedAllergens,
  inlineRestrictions,
  separateRestrictions,
  colors,
  translations,
  restrictionTranslations,
  dietModeSections,
  selectedLandscapeAllergen,
  setSelectedLandscapeAllergen,
  pregnancyMode,
  getAllergenTranslation,
  getAllergenDescription,
  getAllergenWarning,
  getRestrictionTranslation,
  insets,
}: CardLandscapeProps) {
  const hasAllergens = selectedAllergens.length > 0;
  const hasRestrictions = separateRestrictions.length > 0 || inlineRestrictions.length > 0;
  const safeLeft = Math.max(insets.left, 12);
  const safeRight = Math.max(insets.right, 12);
  const safeTop = Math.max(insets.top, 8);
  const safeBottom = Math.max(insets.bottom, 6);

  return (
    <View style={[styles.landscapeWrapper, { backgroundColor: colors.landscapeWrapperBg }]}>
      <View style={[styles.landscapeCard, {
        marginTop: safeTop,
        marginLeft: safeLeft,
        marginRight: safeRight,
        marginBottom: safeBottom,
      }]}>
        <View style={styles.landscapeBody}>
          {/* Left column - Allergens + inline restrictions */}
          {(hasAllergens || inlineRestrictions.length > 0) && (
            <View style={[styles.landscapeLeftColumn, { backgroundColor: colors.landscapeLeftBg }]}>
              <View style={styles.landscapeLeftHeader}>
                {colors.cardStyle === 'allergy' && <Text style={styles.landscapeWarningIcon}>⚠️</Text>}
                <Text style={styles.landscapeLeftHeaderTitle}>{colors.cardStyle === 'pregnancy' ? '🤰 ' : ''}{translations.header}</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.landscapeAllergensScroll}
              >
                {selectedAllergens.map((id, index) => {
                  const allergen = getAllergenInfo(id);
                  if (!allergen) return null;
                  const isSelected = selectedLandscapeAllergen === id;
                  const isLast = index === selectedAllergens.length - 1 && inlineRestrictions.length === 0;
                  return (
                    <Pressable
                      key={id}
                      onPress={() => setSelectedLandscapeAllergen(isSelected ? null : id)}
                      style={[
                        styles.landscapeAllergenItem,
                        isSelected && styles.landscapeAllergenItemSelected,
                        isLast && { marginBottom: 0 }
                      ]}
                    >
                      <View style={[
                        styles.landscapeAllergenIconBg,
                        isSelected && styles.landscapeAllergenIconBgSelected
                      ]}>
                        <Text style={styles.landscapeAllergenIcon}>{allergen.icon}</Text>
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

                {inlineRestrictions.map((id, index) => {
                  const item = getRestrictionInfo(id);
                  if (!item) return null;
                  const isLast = index === inlineRestrictions.length - 1;
                  return (
                    <View
                      key={id}
                      style={[
                        styles.landscapeAllergenItem,
                        isLast && { marginBottom: 0 }
                      ]}
                    >
                      <View style={styles.landscapeAllergenIconBg}>
                        <Text style={styles.landscapeAllergenIcon}>{item.icon}</Text>
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
              </ScrollView>
            </View>
          )}

          {/* Right column - Details */}
          <View style={styles.landscapeRightColumn}>
            {hasAllergens && (
              <View style={styles.landscapeRightHeader}>
                <Text style={styles.landscapeRightHeaderText}>
                  {pregnancyMode ? translations.pregnancyMessage : translations.message}
                </Text>
              </View>
            )}

            {!hasAllergens && hasRestrictions && (
              <View style={[styles.landscapeRightHeader, { backgroundColor: colors.restrictionBg }]}>
                {colors.cardStyle === 'allergy' && <Text style={styles.landscapeWarningIcon}>⚠️</Text>}
                <Text style={[styles.landscapeRightHeaderText, { fontWeight: 'bold' }]}>
                  {restrictionTranslations.message}
                </Text>
              </View>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.landscapeDetailsScroll}
              style={{ flex: 1 }}
            >
              {hasAllergens && selectedAllergens.map((id, index) => {
                const allergen = getAllergenInfo(id);
                const images = ALLERGEN_IMAGES[id];
                if (!allergen || !images) return null;
                const isSelected = selectedLandscapeAllergen === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSelectedLandscapeAllergen(isSelected ? null : id)}
                    style={[
                      styles.landscapeDetailCard,
                      isSelected && styles.landscapeDetailCardSelected,
                      index === selectedAllergens.length - 1 && { marginBottom: 0 }
                    ]}
                  >
                    <View style={styles.landscapeDetailTop}>
                      <View style={[
                        styles.landscapeDetailBadge,
                        { backgroundColor: colors.landscapeDetailBadgeBg },
                        isSelected && styles.landscapeDetailBadgeSelected
                      ]}>
                        <Text style={styles.landscapeDetailBadgeIcon}>{allergen.icon}</Text>
                        <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor }]}>
                          {getAllergenTranslation(id)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.landscapeExamplesRow}>
                      <Text style={styles.landscapeExamplesLabel}>{translations.examples || 'Examples:'}</Text>
                      {images.examples.slice(0, 5).map((emoji, idx) => (
                        <Text key={idx} style={styles.landscapeExampleEmoji}>{emoji}</Text>
                      ))}
                    </View>
                    <Text style={styles.landscapeDetailDescription}>{getAllergenDescription(id)}</Text>
                    {(() => {
                      const warning = getAllergenWarning(id);
                      return warning ? (
                        <View style={styles.landscapeWarningBox}>
                          <Text style={styles.landscapeDetailWarning}>{warning}</Text>
                        </View>
                      ) : null;
                    })()}
                  </Pressable>
                );
              })}

              {inlineRestrictions.map((id) => {
                const item = getRestrictionInfo(id);
                if (!item) return null;
                return (
                  <View key={id} style={styles.landscapeDetailCard}>
                    <View style={styles.landscapeDetailTop}>
                      <View style={[styles.landscapeDetailBadge, { backgroundColor: colors.landscapeDetailBadgeBg }]}>
                        <Text style={styles.landscapeDetailBadgeIcon}>{item.icon}</Text>
                        <Text style={[styles.landscapeDetailBadgeText, { color: colors.landscapeDetailBadgeTextColor }]}>
                          {getRestrictionTranslation(id)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              {/* Diet mode sections - rendered dynamically */}
              {dietModeSections.map((section) => (
                <DietModeSection
                  key={section.modeId}
                  data={section}
                  variant="landscape"
                  getRestrictionTranslation={getRestrictionTranslation}
                  getRestrictionInfo={(rid) => getRestrictionInfo(rid) as { icon: string } | undefined}
                  hasOtherContent={hasAllergens || inlineRestrictions.length > 0}
                  restrictionColors={colors.cardStyle === 'pregnancy' ? {
                    restrictionBg: colors.restrictionBg,
                    restrictionBorder: colors.restrictionBorder,
                    restrictionHeaderColor: colors.restrictionHeaderColor,
                    restrictionTextColor: colors.restrictionTextColor,
                  } : undefined}
                />
              ))}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
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
  landscapeWarningIcon: {
    fontSize: 26,
    marginRight: 10,
  },
  landscapeLeftHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#FFD600',
    shadowColor: '#FFD600',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  landscapeAllergenIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeAllergenIconBgSelected: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFD600',
  },
  landscapeAllergenIcon: {
    fontSize: 30,
  },
  landscapeAllergenName: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
    lineHeight: 22,
  },
  landscapeAllergenNameSelected: {
    color: '#E65100',
  },
  landscapeRightColumn: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  landscapeRightHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFF8E1',
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
  },
  landscapeRightHeaderText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 22,
  },
  landscapeDetailsScroll: {
    padding: 10,
    paddingBottom: 8,
  },
  landscapeDetailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  landscapeDetailCardSelected: {
    backgroundColor: '#FFFDE7',
    borderColor: '#FFD600',
    shadowColor: '#FFD600',
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
    backgroundColor: '#FFD600',
  },
  landscapeDetailBadgeIcon: {
    fontSize: 16,
    marginRight: 6,
  },
  landscapeDetailBadgeText: {
    fontSize: 14,
    fontWeight: '700',
  },
  landscapeExamplesLabel: {
    fontSize: 13,
    color: '#888888',
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
  },
  landscapeDetailDescription: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 21,
  },
  landscapeWarningBox: {
    marginTop: 6,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#FFCDD2',
  },
  landscapeDetailWarning: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '600',
    lineHeight: 19,
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
