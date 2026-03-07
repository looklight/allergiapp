import { RestrictionItemId } from './otherRestrictions';

export type DietModeId = 'pregnancy' | 'vegetarian' | 'nickel' | 'histamine' | 'diabetes';

export type VegetarianLevel = 'no_meat' | 'no_meat_fish' | 'no_animal_products';

export const DEFAULT_VEGETARIAN_LEVEL: VegetarianLevel = 'no_meat_fish';

export type DietFoodItem = 'meat' | 'fish' | 'seafood' | 'eggs' | 'dairy' | 'honey';

export const DIET_FOOD_EMOJI: Record<DietFoodItem, string> = {
  meat: '\u{1F969}',
  fish: '\u{1F41F}',
  seafood: '\u{1F990}',
  eggs: '\u{1F95A}',
  dairy: '\u{1F9C0}',
  honey: '\u{1F36F}',
};

export const DIET_LEVEL_FOOD_ITEMS: Record<VegetarianLevel, { forbidden: DietFoodItem[]; allowed: DietFoodItem[] }> = {
  no_meat: { forbidden: ['meat'], allowed: ['fish', 'seafood', 'eggs', 'dairy'] },
  no_meat_fish: { forbidden: ['meat', 'fish', 'seafood'], allowed: ['eggs', 'dairy'] },
  no_animal_products: { forbidden: ['meat', 'fish', 'seafood', 'eggs', 'dairy', 'honey'], allowed: [] },
};

/** Key used to look up card translations for diet modes */
export type DietCardKey = 'pregnancy' | 'nickel' | 'histamine' | 'diabetes' | VegetarianLevel;

export interface DietModeColors {
  primary: string;
  background: string;
  border: string;
  text: string;
  headerBg: string;
}

export interface DietModeFullCardColors {
  containerBg: string;
  headerBg: string;
  messageBg: string;
  messageBorder: string;
  allergenTextColor: string;
  breakdownBg: string;
  breakdownBorder: string;
  breakdownDescColor: string;
  warningTextColor: string;
  thanksBg: string;
  thanksColor: string;
  restrictionBg: string;
  restrictionBorder: string;
  restrictionHeaderColor: string;
  restrictionTextColor: string;
  landscapeLeftBg: string;
  landscapeWrapperBg: string;
  landscapeAllergenNameColor: string;
  landscapeDetailBadgeBg: string;
  landscapeDetailBadgeTextColor: string;
}

export interface DietModeToggleColors {
  active: string;
  activeBg: string;
  activeBorder: string;
}

export interface DietMode {
  id: DietModeId;
  icon: string;
  /** Display order in the settings toggle list */
  toggleOrder: number;
  /** Display order of sections on the generated card */
  cardOrder: number;
  /** If true, changes the palette of the ENTIRE card (like pregnancy) */
  affectsFullCard: boolean;
  /** Restrictions to auto-select when this mode is activated */
  autoSelectRestrictions?: RestrictionItemId[];
  /** Colors for the section on the card (when affectsFullCard=false) */
  sectionColors: DietModeColors;
  /** Colors for the full card (when affectsFullCard=true) */
  fullCardColors?: DietModeFullCardColors;
  /** Toggle UI colors (for other-restrictions.tsx) */
  toggleColors: DietModeToggleColors;
}

export const DIET_MODES: readonly DietMode[] = [
  {
    id: 'vegetarian',
    icon: '\u{1F33F}',
    toggleOrder: 1,
    cardOrder: 5,
    affectsFullCard: false,
    sectionColors: {
      primary: '#2E7D32',
      background: '#E8F5E9',
      border: '#A5D6A7',
      text: '#2E7D32',
      headerBg: '#4CAF50',
    },
    toggleColors: {
      active: '#4CAF50',
      activeBg: '#E8F5E9',
      activeBorder: '#A5D6A7',
    },
  },
  {
    id: 'pregnancy',
    icon: '\u{1F930}',
    toggleOrder: 2,
    cardOrder: 1,
    affectsFullCard: true,
    autoSelectRestrictions: [
      'raw_fish',
      'raw_cured_meats',
      'raw_eggs',
      'raw_sprouts',
      'unpasteurized_cheese',
      'unpasteurized_milk',
      'alcohol',
      'excessive_caffeine',
    ],
    sectionColors: {
      primary: '#C2185B',
      background: '#FFF0F5',
      border: '#F8BBD0',
      text: '#C2185B',
      headerBg: '#F48FB1',
    },
    fullCardColors: {
      containerBg: '#F48FB1',
      headerBg: '#F48FB1',
      messageBg: '#FFF0F5',
      messageBorder: '#FCE4EC',
      allergenTextColor: '#C2185B',
      breakdownBg: '#FFF0F5',
      breakdownBorder: '#F8BBD0',
      breakdownDescColor: '#AD1457',
      warningTextColor: '#C2185B',
      thanksBg: '#F3E5F5',
      thanksColor: '#9C27B0',
      restrictionBg: '#FFF0F5',
      restrictionBorder: '#F8BBD0',
      restrictionHeaderColor: '#C2185B',
      restrictionTextColor: '#C2185B',
      landscapeLeftBg: '#F48FB1',
      landscapeWrapperBg: '#F06292',
      landscapeAllergenNameColor: '#AD1457',
      landscapeDetailBadgeBg: '#FFF0F5',
      landscapeDetailBadgeTextColor: '#C2185B',
    },
    toggleColors: {
      active: '#E91E63',
      activeBg: '#FFF0F5',
      activeBorder: '#F8BBD0',
    },
  },
  {
    id: 'nickel',
    icon: '\u{26A0}\u{FE0F}',
    toggleOrder: 3,
    cardOrder: 2,
    affectsFullCard: false,
    autoSelectRestrictions: [
      'nickel_chocolate',
      'nickel_tomato',
      'nickel_legumes',
      'nickel_nuts',
      'nickel_whole_grains',
      'nickel_spinach',
      'nickel_canned_food',
      'nickel_tea_coffee',
    ],
    sectionColors: {
      primary: '#546E7A',
      background: '#ECEFF1',
      border: '#B0BEC5',
      text: '#546E7A',
      headerBg: '#78909C',
    },
    toggleColors: {
      active: '#78909C',
      activeBg: '#ECEFF1',
      activeBorder: '#B0BEC5',
    },
  },
  {
    id: 'histamine',
    icon: '\u{26A0}\u{FE0F}',
    toggleOrder: 4,
    cardOrder: 3,
    affectsFullCard: false,
    autoSelectRestrictions: [
      'histamine_aged_cheese',
      'histamine_cured_meats',
      'histamine_fish',
      'histamine_fermented',
      'histamine_wine_beer',
      'histamine_vinegar',
      'histamine_chocolate',
      'histamine_tomato',
      'histamine_strawberries',
      'histamine_eggplant',
      'histamine_avocado',
      'histamine_spinach',
    ],
    sectionColors: {
      primary: '#E65100',
      background: '#FFF3E0',
      border: '#FFCC80',
      text: '#E65100',
      headerBg: '#FF9800',
    },
    toggleColors: {
      active: '#FF9800',
      activeBg: '#FFF3E0',
      activeBorder: '#FFCC80',
    },
  },
  {
    id: 'diabetes',
    icon: '\u{26A0}\u{FE0F}',
    toggleOrder: 5,
    cardOrder: 4,
    affectsFullCard: false,
    autoSelectRestrictions: [
      'diabetes_added_sugar',
      'diabetes_honey_sweeteners',
      'diabetes_sweet_sauces',
      'diabetes_sweet_glazes',
      'diabetes_fruit_juice',
      'diabetes_candied_fruit',
    ],
    sectionColors: {
      primary: '#1565C0',
      background: '#E3F2FD',
      border: '#90CAF9',
      text: '#1565C0',
      headerBg: '#42A5F5',
    },
    toggleColors: {
      active: '#42A5F5',
      activeBg: '#E3F2FD',
      activeBorder: '#90CAF9',
    },
  },
];

export const getDietModeById = (id: DietModeId): DietMode | undefined => {
  return DIET_MODES.find((m) => m.id === id);
};

/**
 * Returns active diet modes sorted by card display order.
 */
export const getVisibleModes = (activeIds: DietModeId[]): DietMode[] => {
  const activeSet = new Set(activeIds);
  return DIET_MODES
    .filter((m) => activeSet.has(m.id))
    .sort((a, b) => a.cardOrder - b.cardOrder);
};

/**
 * Returns the full-card-affecting mode if any is active, or undefined.
 */
export const getFullCardMode = (activeIds: DietModeId[]): DietMode | undefined => {
  return DIET_MODES.find((m) => m.affectsFullCard && activeIds.includes(m.id));
};

/**
 * Returns the DietCardKey to use for card translation lookup.
 * For vegetarian mode, maps the level to the corresponding key.
 */
export const getDietCardKey = (modeId: DietModeId, vegetarianLevel: VegetarianLevel): DietCardKey => {
  if (modeId === 'vegetarian') return vegetarianLevel;
  return modeId as DietCardKey;
};
