import React, { useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { RestrictionItemId } from '../../../constants/otherRestrictions';
import { theme } from '../../../constants/theme';
import { DietModeSectionData } from './types';

interface DietModeSectionProps {
  data: DietModeSectionData;
  variant: 'portrait' | 'landscape';
  getRestrictionTranslation: (id: RestrictionItemId) => string;
  getRestrictionInfo: (id: RestrictionItemId) => { icon: string } | undefined;
  /** Whether there is other content before this section (allergens, restrictions, etc.) */
  hasOtherContent: boolean;
  fontBoost?: number;
  /** Restriction colors for the pregnancy section on card */
  restrictionColors?: {
    restrictionBg: string;
    restrictionBorder: string;
    restrictionHeaderColor: string;
    restrictionTextColor: string;
  };
}

export default function DietModeSection({
  data,
  variant,
  getRestrictionTranslation,
  getRestrictionInfo,
  hasOtherContent,
  fontBoost = 0,
  restrictionColors,
}: DietModeSectionProps) {
  const isPortrait = variant === 'portrait';
  const { sectionColors, restrictionItems } = data;
  const hasRestrictionItems = restrictionItems && restrictionItems.length > 0;

  // For pregnancy mode with restriction items, use the restriction-style section
  if (hasRestrictionItems) {
    const rColors = restrictionColors || {
      restrictionBg: sectionColors.background,
      restrictionBorder: sectionColors.border,
      restrictionHeaderColor: sectionColors.primary,
      restrictionTextColor: sectionColors.text,
    };

    if (isPortrait) {
      return (
        <View style={[styles.restrictionsSection, {
          backgroundColor: rColors.restrictionBg,
          borderTopColor: rColors.restrictionBorder,
        }]}>
          <View style={styles.restrictionHeader}>
            <Text style={[styles.restrictionHeaderText, { color: rColors.restrictionHeaderColor }]}>
              {data.header}
            </Text>
          </View>
          <Text style={[styles.restrictionMessage, fontBoost > 0 && { fontSize: 14 + fontBoost, lineHeight: 20 + fontBoost }]}>{data.message}</Text>
          {restrictionItems.map((id) => {
            const item = getRestrictionInfo(id);
            if (!item) return null;
            return (
              <View key={id} style={[styles.restrictionRow, { borderBottomColor: rColors.restrictionBorder }]}>
                <Text style={styles.restrictionIcon}>{item.icon}</Text>
                <Text style={[styles.restrictionText, { color: rColors.restrictionTextColor }]}>
                  {getRestrictionTranslation(id)}
                </Text>
              </View>
            );
          })}
        </View>
      );
    }

    // Landscape
    return (
      <View style={[styles.landscapeRestrictionSection, hasOtherContent && { borderTopColor: rColors.restrictionBorder }]}>
        <View style={[styles.landscapeRestrictionHeader, {
          backgroundColor: rColors.restrictionBg,
          borderBottomColor: rColors.restrictionBorder,
        }]}>
          <Text style={[styles.landscapeRestrictionHeaderText, { color: rColors.restrictionHeaderColor }, fontBoost > 0 && { fontSize: 14 + fontBoost }]}>
            {data.header}
          </Text>
        </View>
        <Text style={[styles.landscapeRestrictionMessage, fontBoost > 0 && { fontSize: 13 + fontBoost }]}>{data.message}</Text>
        <View style={styles.landscapeRestrictionList}>
          {restrictionItems.map((id) => {
            const item = getRestrictionInfo(id);
            if (!item) return null;
            return (
              <View key={id} style={[styles.landscapeRestrictionItem, { borderColor: rColors.restrictionBorder }]}>
                <Text style={styles.landscapeRestrictionIcon}>{item.icon}</Text>
                <Text style={[styles.landscapeRestrictionName, { color: rColors.restrictionTextColor }, fontBoost > 0 && { fontSize: 14 + fontBoost }]}>
                  {getRestrictionTranslation(id)}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Label-only mode (vegetarian, vegan)
  const [foodExpanded, setFoodExpanded] = useState(false);
  const hasFoodItems = data.foodItems && (data.foodItems.forbidden.length > 0 || data.foodItems.allowed.length > 0);

  if (isPortrait) {
    return (
      <View style={[styles.vegSection, {
        borderTopColor: sectionColors.border,
        backgroundColor: sectionColors.background,
      }]}>
        <View style={styles.vegHeader}>
          <Text style={styles.vegHeaderIcon}>{data.icon}</Text>
          <Text style={[styles.vegHeaderText, { color: sectionColors.primary }]}>
            {data.header}
          </Text>
        </View>
        <Text style={[styles.vegMessage, { color: sectionColors.text }, fontBoost > 0 && { fontSize: 15 + fontBoost, lineHeight: 22 + fontBoost }]}>
          {data.message}
        </Text>
        {hasFoodItems && (
          <>
            <Pressable
              onPress={() => setFoodExpanded(!foodExpanded)}
              style={[styles.foodToggle, { borderColor: sectionColors.border }]}
            >
              <MaterialCommunityIcons
                name={foodExpanded ? 'chevron-up' : 'chevron-down'}
                size={22}
                color={sectionColors.primary}
              />
            </Pressable>
            {foodExpanded && (
              <View style={styles.foodListContainer}>
                {data.foodItems!.forbidden.map((item, i) => (
                  <View key={`f-${i}`} style={styles.foodRow}>
                    <MaterialCommunityIcons name="close-circle" size={20} color={theme.colors.error} />
                    <Text style={styles.foodEmoji}>{item.emoji}</Text>
                    <Text style={[styles.foodRowText, { color: theme.colors.errorDark }]}>{item.name}</Text>
                  </View>
                ))}
                {data.foodItems!.allowed.length > 0 && (
                  <>
                    <View style={[styles.foodDivider, { borderBottomColor: sectionColors.border }]} />
                    {data.foodItems!.allowed.map((item, i) => (
                      <View key={`a-${i}`} style={styles.foodRow}>
                        <MaterialCommunityIcons name="check-circle" size={20} color={theme.colors.success} />
                        <Text style={styles.foodEmoji}>{item.emoji}</Text>
                        <Text style={[styles.foodRowText, { color: theme.colors.successDark }]}>{item.name}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  // Landscape label-only
  return (
    <View style={[styles.landscapeVegSection, {
      borderTopColor: sectionColors.border,
      backgroundColor: sectionColors.background,
    }]}>
      <View style={[styles.landscapeVegHeader, { borderBottomColor: sectionColors.border }]}>
        <Text style={styles.landscapeVegHeaderIcon}>{data.icon}</Text>
        <Text style={[styles.landscapeVegHeaderText, { color: sectionColors.primary }, fontBoost > 0 && { fontSize: 14 + fontBoost }]}>
          {data.header}
        </Text>
      </View>
      <Text style={[styles.landscapeVegMessage, { color: sectionColors.text }, fontBoost > 0 && { fontSize: 13 + fontBoost, lineHeight: 19 + fontBoost }]}>
        {data.message}
      </Text>
      {hasFoodItems && (
        <>
          <Pressable
            onPress={() => setFoodExpanded(!foodExpanded)}
            style={[styles.foodToggle, { borderColor: sectionColors.border }]}
          >
            <MaterialCommunityIcons
              name={foodExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={sectionColors.primary}
            />
          </Pressable>
          {foodExpanded && (
            <View style={styles.foodListContainer}>
              {data.foodItems!.forbidden.map((item, i) => (
                <View key={`f-${i}`} style={[styles.foodRow, styles.foodRowLandscape]}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.error} />
                  <Text style={[styles.foodEmoji, styles.foodEmojiLandscape]}>{item.emoji}</Text>
                  <Text style={[styles.foodRowText, styles.foodRowTextLandscape, { color: theme.colors.errorDark }, fontBoost > 0 && { fontSize: 13 + fontBoost }]}>{item.name}</Text>
                </View>
              ))}
              {data.foodItems!.allowed.length > 0 && (
                <>
                  <View style={[styles.foodDivider, { borderBottomColor: sectionColors.border }]} />
                  {data.foodItems!.allowed.map((item, i) => (
                    <View key={`a-${i}`} style={[styles.foodRow, styles.foodRowLandscape]}>
                      <MaterialCommunityIcons name="check-circle" size={18} color={theme.colors.success} />
                      <Text style={[styles.foodEmoji, styles.foodEmojiLandscape]}>{item.emoji}</Text>
                      <Text style={[styles.foodRowText, styles.foodRowTextLandscape, { color: theme.colors.successDark }, fontBoost > 0 && { fontSize: 13 + fontBoost }]}>{item.name}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Portrait restriction styles (for pregnancy)
  restrictionsSection: {
    padding: 20,
    borderTopWidth: 2,
  },
  restrictionHeader: {
    marginBottom: 8,
  },
  restrictionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  restrictionMessage: {
    fontSize: 14,
    color: theme.colors.cardDescriptionText,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  restrictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  restrictionIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  restrictionText: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  // Portrait veg/vegan styles
  vegSection: {
    padding: 20,
    borderTopWidth: 2,
  },
  vegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  vegHeaderIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  vegHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  vegMessage: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  // Landscape restriction styles
  landscapeRestrictionSection: {
    borderTopWidth: 2,
  },
  landscapeRestrictionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  landscapeRestrictionHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 1,
  },
  landscapeRestrictionMessage: {
    fontSize: 13,
    color: theme.colors.cardDescriptionText,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  landscapeRestrictionList: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  landscapeRestrictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    borderWidth: 1,
  },
  landscapeRestrictionIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  landscapeRestrictionName: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  // Food items (expandable list)
  foodToggle: {
    alignSelf: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  foodListContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  foodRowLandscape: {
    paddingVertical: 4,
  },
  foodDivider: {
    borderBottomWidth: 1,
    width: '60%',
    marginVertical: 6,
  },
  foodEmoji: {
    fontSize: 26,
    marginLeft: 10,
  },
  foodEmojiLandscape: {
    fontSize: 20,
    marginLeft: 8,
  },
  foodRowText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  foodRowTextLandscape: {
    fontSize: 13,
  },
  // Landscape veg/vegan styles
  landscapeVegSection: {
    borderTopWidth: 2,
    borderRadius: 12,
    marginTop: 10,
    overflow: 'hidden',
  },
  landscapeVegHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  landscapeVegHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  landscapeVegHeaderText: {
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  landscapeVegMessage: {
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    lineHeight: 19,
  },
});
