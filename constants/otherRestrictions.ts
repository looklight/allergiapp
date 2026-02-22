import { Language } from '../types';

export type RestrictionCategoryId = 'pregnancy';

export type RestrictionItemId =
  | 'raw_fish'
  | 'unpasteurized_cheese'
  | 'raw_cured_meats'
  | 'raw_eggs'
  | 'alcohol'
  | 'excessive_caffeine'
  | 'unpasteurized_milk'
  | 'raw_sprouts';

export interface RestrictionCategory {
  id: RestrictionCategoryId;
  icon: string;
  translations: Record<Language, string>;
}

export interface RestrictionItem {
  id: RestrictionItemId;
  icon: string;
  categoryId: RestrictionCategoryId;
  translations: Record<Language, string>;
}

export const RESTRICTION_CATEGORIES: RestrictionCategory[] = [
  {
    id: 'pregnancy',
    icon: '🤰',
    translations: {
      it: 'Gravidanza',
      en: 'Pregnancy',
      fr: 'Grossesse',
      de: 'Schwangerschaft',
      es: 'Embarazo',
      pt: 'Gravidez',
      nl: 'Zwangerschap',
      pl: 'Ciąża',
      ru: 'Беременность',
      sv: 'Graviditet',
      zh: '怀孕',
      ja: '妊娠',
      ko: '임신',
      th: 'ตั้งครรภ์',
      ar: 'الحمل',
    },
  },
];

export const RESTRICTION_ITEMS: RestrictionItem[] = [
  {
    id: 'raw_fish',
    icon: '🐟',
    categoryId: 'pregnancy',
    translations: {
      it: 'Pesce crudo / sushi',
      en: 'Raw fish / sushi',
      fr: 'Poisson cru / sushi',
      de: 'Roher Fisch / Sushi',
      es: 'Pescado crudo / sushi',
      pt: 'Peixe cru / sushi',
      nl: 'Rauwe vis / sushi',
      pl: 'Surowa ryba / sushi',
      ru: 'Сырая рыба / суши',
      sv: 'Rå fisk / sushi',
      zh: '生鱼 / 寿司',
      ja: '生魚 / 寿司',
      ko: '생선회 / 초밥',
      th: 'ปลาดิบ / ซูชิ',
      ar: 'السمك النيء / السوشي',
    },
  },
  {
    id: 'unpasteurized_cheese',
    icon: '🧀',
    categoryId: 'pregnancy',
    translations: {
      it: 'Formaggi non pastorizzati',
      en: 'Unpasteurized cheeses',
      fr: 'Fromages non pasteurisés',
      de: 'Nicht pasteurisierter Käse',
      es: 'Quesos no pasteurizados',
      pt: 'Queijos não pasteurizados',
      nl: 'Ongepasteuriseerde kaas',
      pl: 'Sery niepasteryzowane',
      ru: 'Непастеризованные сыры',
      sv: 'Opastöriserad ost',
      zh: '未经巴氏杀菌的奶酪',
      ja: '未殺菌チーズ',
      ko: '비살균 치즈',
      th: 'ชีสที่ไม่ผ่านการพาสเจอร์ไรซ์',
      ar: 'الأجبان غير المبسترة',
    },
  },
  {
    id: 'raw_cured_meats',
    icon: '🥩',
    categoryId: 'pregnancy',
    translations: {
      it: 'Salumi / affettati crudi',
      en: 'Raw cured meats',
      fr: 'Charcuterie crue',
      de: 'Rohes Pökelfleisch / Aufschnitt',
      es: 'Embutidos / fiambres crudos',
      pt: 'Enchidos / frios crus',
      nl: 'Rauw vleeswaren',
      pl: 'Surowe wędliny',
      ru: 'Сырые мясные деликатесы',
      sv: 'Rått charkuteri',
      zh: '生腌肉 / 冷切肉',
      ja: '生ハム / 生肉加工品',
      ko: '생햄 / 생육가공품',
      th: 'เนื้อหมักดิบ',
      ar: 'اللحوم المقددة النيئة',
    },
  },
  {
    id: 'raw_eggs',
    icon: '🥚',
    categoryId: 'pregnancy',
    translations: {
      it: 'Uova crude',
      en: 'Raw eggs',
      fr: 'Œufs crus',
      de: 'Rohe Eier',
      es: 'Huevos crudos',
      pt: 'Ovos crus',
      nl: 'Rauwe eieren',
      pl: 'Surowe jaja',
      ru: 'Сырые яйца',
      sv: 'Råa ägg',
      zh: '生鸡蛋',
      ja: '生卵',
      ko: '날달걀',
      th: 'ไข่ดิบ',
      ar: 'البيض النيء',
    },
  },
  {
    id: 'alcohol',
    icon: '🍷',
    categoryId: 'pregnancy',
    translations: {
      it: 'Alcol',
      en: 'Alcohol',
      fr: 'Alcool',
      de: 'Alkohol',
      es: 'Alcohol',
      pt: 'Álcool',
      nl: 'Alcohol',
      pl: 'Alkohol',
      ru: 'Алкоголь',
      sv: 'Alkohol',
      zh: '酒精',
      ja: 'アルコール',
      ko: '알코올',
      th: 'แอลกอฮอล์',
      ar: 'الكحول',
    },
  },
  {
    id: 'excessive_caffeine',
    icon: '☕',
    categoryId: 'pregnancy',
    translations: {
      it: 'Caffeina eccessiva',
      en: 'Excessive caffeine',
      fr: 'Caféine excessive',
      de: 'Übermäßiges Koffein',
      es: 'Cafeína excesiva',
      pt: 'Cafeína excessiva',
      nl: 'Overmatig cafeïne',
      pl: 'Nadmierna kofeina',
      ru: 'Избыток кофеина',
      sv: 'Överdrivet koffein',
      zh: '过量咖啡因',
      ja: '過剰なカフェイン',
      ko: '과도한 카페인',
      th: 'คาเฟอีนมากเกินไป',
      ar: 'الكافيين المفرط',
    },
  },
  {
    id: 'unpasteurized_milk',
    icon: '🥛',
    categoryId: 'pregnancy',
    translations: {
      it: 'Latte non pastorizzato',
      en: 'Unpasteurized milk',
      fr: 'Lait non pasteurisé',
      de: 'Nicht pasteurisierte Milch',
      es: 'Leche no pasteurizada',
      pt: 'Leite não pasteurizado',
      nl: 'Ongepasteuriseerde melk',
      pl: 'Mleko niepasteryzowane',
      ru: 'Непастеризованное молоко',
      sv: 'Opastöriserad mjölk',
      zh: '未经巴氏杀菌的牛奶',
      ja: '未殺菌牛乳',
      ko: '비살균 우유',
      th: 'นมที่ไม่ผ่านการพาสเจอร์ไรซ์',
      ar: 'الحليب غير المبستر',
    },
  },
  {
    id: 'raw_sprouts',
    icon: '🌱',
    categoryId: 'pregnancy',
    translations: {
      it: 'Germogli crudi',
      en: 'Raw sprouts',
      fr: 'Germes crus',
      de: 'Rohe Sprossen',
      es: 'Brotes crudos',
      pt: 'Brotos crus',
      nl: 'Rauwe kiemgroenten',
      pl: 'Surowe kiełki',
      ru: 'Сырые ростки',
      sv: 'Råa groddar',
      zh: '生豆芽',
      ja: '生もやし',
      ko: '생 새싹',
      th: 'ถั่วงอกดิบ',
      ar: 'البراعم النيئة',
    },
  },
];

export const getRestrictionItemById = (id: string): RestrictionItem | undefined => {
  return RESTRICTION_ITEMS.find((r) => r.id === id);
};

export const getRestrictionCategoryById = (id: string): RestrictionCategory | undefined => {
  return RESTRICTION_CATEGORIES.find((c) => c.id === id);
};

export const getRestrictionItemsByCategory = (categoryId: RestrictionCategoryId): RestrictionItem[] => {
  return RESTRICTION_ITEMS.filter((r) => r.categoryId === categoryId);
};
