import { RestrictionItemId } from './otherRestrictions';

export type DietModeId = 'pregnancy' | 'vegetarian';

export type VegetarianLevel = 'no_meat' | 'no_meat_fish' | 'no_animal_products';

export const DEFAULT_VEGETARIAN_LEVEL: VegetarianLevel = 'no_meat_fish';

/** Key used to look up card translations for diet modes */
export type DietCardKey = 'pregnancy' | VegetarianLevel;

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
  order: number;
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

export const DIET_MODES: DietMode[] = [
  {
    id: 'vegetarian',
    icon: '\u{1F33F}',
    order: 1,
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
    order: 2,
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
];

export const getDietModeById = (id: DietModeId): DietMode | undefined => {
  return DIET_MODES.find((m) => m.id === id);
};

/**
 * Returns active diet modes sorted by order.
 */
export const getVisibleModes = (activeIds: DietModeId[]): DietMode[] => {
  const activeSet = new Set(activeIds);
  return DIET_MODES
    .filter((m) => activeSet.has(m.id))
    .sort((a, b) => a.order - b.order);
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
  return modeId;
};
