import { AllergenId, Language, DownloadableLanguageCode, DownloadedLanguageData } from '../../../types';
import { RestrictionItemId } from '../../../constants/otherRestrictions';
import { OtherFoodId } from '../../../constants/otherFoods';
import { DietModeId } from '../../../constants/dietModes';

export type CardStyle = 'allergy' | 'pregnancy' | 'dietOnly';

export interface CardColors {
  cardStyle: CardStyle;
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

export interface CardTranslationsData {
  header: string;
  subtitle: string;
  pregnancySubtitle: string;
  message: string;
  pregnancyMessage: string;
  thanks: string;
  tapToSee: string;
  examples: string;
}

export interface RestrictionTranslationsData {
  header: string;
  message: string;
  sectionMessage: string;
}

export interface DietModeSectionData {
  modeId: DietModeId;
  icon: string;
  header: string;
  message: string;
  sectionColors: {
    primary: string;
    background: string;
    border: string;
    text: string;
    headerBg: string;
  };
  /** For pregnancy mode: the restriction items to display */
  restrictionItems?: RestrictionItemId[];
  /** For vegetarian/vegan: visual food item indicators */
  foodItems?: { forbidden: { name: string; emoji: string }[]; allowed: { name: string; emoji: string }[] };
}

export interface CardPortraitProps {
  selectedAllergens: AllergenId[];
  selectedOtherFoods: OtherFoodId[];
  inlineRestrictions: RestrictionItemId[];
  separateRestrictions: RestrictionItemId[];
  colors: CardColors;
  translations: CardTranslationsData;
  restrictionTranslations: RestrictionTranslationsData;
  dietModeSections: DietModeSectionData[];
  expandedAllergen: AllergenId | null;
  showInAppLanguage: boolean;
  pregnancyMode: boolean;
  fontBoost: number;
  getAllergenTranslation: (id: AllergenId) => string;
  getAllergenDescription: (id: AllergenId) => string;
  getAllergenWarning: (id: AllergenId) => string | undefined;
  getRestrictionTranslation: (id: RestrictionItemId) => string;
  getOtherFoodTranslation: (id: OtherFoodId) => string;
  toggleExpand: (id: AllergenId) => void;
  handleLanguageToggle: () => void;
}

export interface CardLandscapeProps {
  selectedAllergens: AllergenId[];
  selectedOtherFoods: OtherFoodId[];
  inlineRestrictions: RestrictionItemId[];
  separateRestrictions: RestrictionItemId[];
  colors: CardColors;
  translations: CardTranslationsData;
  restrictionTranslations: RestrictionTranslationsData;
  dietModeSections: DietModeSectionData[];
  selectedLandscapeItem: string | null;
  setSelectedLandscapeItem: (id: string | null) => void;
  pregnancyMode: boolean;
  getAllergenTranslation: (id: AllergenId) => string;
  getAllergenDescription: (id: AllergenId) => string;
  getAllergenWarning: (id: AllergenId) => string | undefined;
  getRestrictionTranslation: (id: RestrictionItemId) => string;
  getOtherFoodTranslation: (id: OtherFoodId) => string;
  fontBoost: number;
  insets: { top: number; bottom: number; left: number; right: number };
}
