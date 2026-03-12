import { Language } from '../types';

export type OtherFoodCategory = 'vegetables' | 'fruits' | 'legumes_other';

export type OtherFoodId =
  // Verdure/Ortaggi
  | 'tomato'
  | 'onion'
  | 'garlic'
  | 'bell_pepper'
  | 'eggplant'
  | 'carrot'
  | 'mushrooms'
  | 'pumpkin'
  // Frutta
  | 'peach'
  | 'kiwi'
  | 'strawberries'
  | 'apple'
  | 'banana'
  | 'cherry'
  | 'apricot'
  | 'pear'
  | 'citrus'
  | 'coconut'
  | 'pineapple'
  | 'mango'
  | 'avocado'
  // Legumi/Cereali/Altro
  | 'chickpeas'
  | 'lentils'
  | 'corn'
  | 'buckwheat'
  | 'coriander'
  | 'spicy';

export interface OtherFood {
  id: OtherFoodId;
  icon: string;
  category: OtherFoodCategory;
  translations: Record<Language, string>;
}

export const OTHER_FOOD_CATEGORIES: Record<OtherFoodCategory, Record<Language, string>> = {
  vegetables: {
    it: 'Verdure e ortaggi',
    en: 'Vegetables',
    fr: 'Légumes',
    de: 'Gemüse',
    es: 'Verduras',
    pt: 'Legumes',
    nl: 'Groenten',
    pl: 'Warzywa',
    ru: 'Овощи',
    sv: 'Grönsaker',
    zh: '蔬菜',
    ja: '野菜',
    ko: '채소',
    th: 'ผัก',
    ar: 'خضروات',
  },
  fruits: {
    it: 'Frutta',
    en: 'Fruits',
    fr: 'Fruits',
    de: 'Obst',
    es: 'Frutas',
    pt: 'Frutas',
    nl: 'Fruit',
    pl: 'Owoce',
    ru: 'Фрукты',
    sv: 'Frukt',
    zh: '水果',
    ja: '果物',
    ko: '과일',
    th: 'ผลไม้',
    ar: 'فواكه',
  },
  legumes_other: {
    it: 'Legumi, cereali e altro',
    en: 'Legumes, cereals & other',
    fr: 'Légumineuses, céréales et autres',
    de: 'Hülsenfrüchte, Getreide & Sonstiges',
    es: 'Legumbres, cereales y otros',
    pt: 'Leguminosas, cereais e outros',
    nl: 'Peulvruchten, granen & overig',
    pl: 'Rośliny strączkowe, zboża i inne',
    ru: 'Бобовые, злаки и другое',
    sv: 'Baljväxter, spannmål & övrigt',
    zh: '豆类、谷物和其他',
    ja: '豆類・穀物・その他',
    ko: '콩류, 곡물 및 기타',
    th: 'ถั่ว ธัญพืช และอื่นๆ',
    ar: 'بقوليات وحبوب وأخرى',
  },
};

export const OTHER_FOODS: readonly OtherFood[] = [
  // — Verdure e ortaggi (per frequenza di intolleranza) —
  { id: 'tomato', icon: '🍅', category: 'vegetables', translations: {
    it: 'Pomodoro', en: 'Tomato', fr: 'Tomate', de: 'Tomate', es: 'Tomate', pt: 'Tomate', nl: 'Tomaat', pl: 'Pomidor', ru: 'Помидор', sv: 'Tomat', zh: '番茄', ja: 'トマト', ko: '토마토', th: 'มะเขือเทศ', ar: 'الطماطم',
  }},
  { id: 'onion', icon: '🧅', category: 'vegetables', translations: {
    it: 'Cipolla', en: 'Onion', fr: 'Oignon', de: 'Zwiebel', es: 'Cebolla', pt: 'Cebola', nl: 'Ui', pl: 'Cebula', ru: 'Лук', sv: 'Lök', zh: '洋葱', ja: '玉ねぎ', ko: '양파', th: 'หอมใหญ่', ar: 'البصل',
  }},
  { id: 'garlic', icon: '🧄', category: 'vegetables', translations: {
    it: 'Aglio', en: 'Garlic', fr: 'Ail', de: 'Knoblauch', es: 'Ajo', pt: 'Alho', nl: 'Knoflook', pl: 'Czosnek', ru: 'Чеснок', sv: 'Vitlök', zh: '大蒜', ja: 'ニンニク', ko: '마늘', th: 'กระเทียม', ar: 'الثوم',
  }},
  { id: 'bell_pepper', icon: '🫑', category: 'vegetables', translations: {
    it: 'Peperone', en: 'Bell pepper', fr: 'Poivron', de: 'Paprika', es: 'Pimiento', pt: 'Pimentão', nl: 'Paprika', pl: 'Papryka', ru: 'Сладкий перец', sv: 'Paprika', zh: '甜椒', ja: 'ピーマン', ko: '피망', th: 'พริกหวาน', ar: 'الفلفل الحلو',
  }},
  { id: 'eggplant', icon: '🍆', category: 'vegetables', translations: {
    it: 'Melanzana', en: 'Eggplant', fr: 'Aubergine', de: 'Aubergine', es: 'Berenjena', pt: 'Berinjela', nl: 'Aubergine', pl: 'Bakłażan', ru: 'Баклажан', sv: 'Aubergine', zh: '茄子', ja: 'ナス', ko: '가지', th: 'มะเขือยาว', ar: 'الباذنجان',
  }},
  { id: 'carrot', icon: '🥕', category: 'vegetables', translations: {
    it: 'Carota', en: 'Carrot', fr: 'Carotte', de: 'Karotte', es: 'Zanahoria', pt: 'Cenoura', nl: 'Wortel', pl: 'Marchew', ru: 'Морковь', sv: 'Morot', zh: '胡萝卜', ja: 'ニンジン', ko: '당근', th: 'แครอท', ar: 'جزر',
  }},
  { id: 'mushrooms', icon: '🍄', category: 'vegetables', translations: {
    it: 'Funghi', en: 'Mushrooms', fr: 'Champignons', de: 'Pilze', es: 'Setas', pt: 'Cogumelos', nl: 'Champignons', pl: 'Grzyby', ru: 'Грибы', sv: 'Svamp', zh: '蘑菇', ja: 'キノコ', ko: '버섯', th: 'เห็ด', ar: 'الفطر',
  }},
  { id: 'pumpkin', icon: '🎃', category: 'vegetables', translations: {
    it: 'Zucca', en: 'Pumpkin', fr: 'Citrouille', de: 'Kürbis', es: 'Calabaza', pt: 'Abóbora', nl: 'Pompoen', pl: 'Dynia', ru: 'Тыква', sv: 'Pumpa', zh: '南瓜', ja: 'かぼちゃ', ko: '호박', th: 'ฟักทอง', ar: 'القرع',
  }},
  // — Frutta (per frequenza di allergia orale) —
  { id: 'peach', icon: '🍑', category: 'fruits', translations: {
    it: 'Pesca', en: 'Peach', fr: 'Pêche', de: 'Pfirsich', es: 'Melocotón', pt: 'Pêssego', nl: 'Perzik', pl: 'Brzoskwinia', ru: 'Персик', sv: 'Persika', zh: '桃', ja: '桃', ko: '복숭아', th: 'พีช', ar: 'خوخ',
  }},
  { id: 'kiwi', icon: '🥝', category: 'fruits', translations: {
    it: 'Kiwi', en: 'Kiwi', fr: 'Kiwi', de: 'Kiwi', es: 'Kiwi', pt: 'Kiwi', nl: 'Kiwi', pl: 'Kiwi', ru: 'Киви', sv: 'Kiwi', zh: '猕猴桃', ja: 'キウイ', ko: '키위', th: 'กีวี', ar: 'الكيوي',
  }},
  { id: 'strawberries', icon: '🍓', category: 'fruits', translations: {
    it: 'Fragole', en: 'Strawberries', fr: 'Fraises', de: 'Erdbeeren', es: 'Fresas', pt: 'Morangos', nl: 'Aardbeien', pl: 'Truskawki', ru: 'Клубника', sv: 'Jordgubbar', zh: '草莓', ja: 'イチゴ', ko: '딸기', th: 'สตรอว์เบอร์รี', ar: 'الفراولة',
  }},
  { id: 'apple', icon: '🍎', category: 'fruits', translations: {
    it: 'Mela', en: 'Apple', fr: 'Pomme', de: 'Apfel', es: 'Manzana', pt: 'Maçã', nl: 'Appel', pl: 'Jabłko', ru: 'Яблоко', sv: 'Äpple', zh: '苹果', ja: 'りんご', ko: '사과', th: 'แอปเปิ้ล', ar: 'تفاح',
  }},
  { id: 'banana', icon: '🍌', category: 'fruits', translations: {
    it: 'Banana', en: 'Banana', fr: 'Banane', de: 'Banane', es: 'Plátano', pt: 'Banana', nl: 'Banaan', pl: 'Banan', ru: 'Банан', sv: 'Banan', zh: '香蕉', ja: 'バナナ', ko: '바나나', th: 'กล้วย', ar: 'الموز',
  }},
  { id: 'cherry', icon: '🍒', category: 'fruits', translations: {
    it: 'Ciliegia', en: 'Cherry', fr: 'Cerise', de: 'Kirsche', es: 'Cereza', pt: 'Cereja', nl: 'Kers', pl: 'Wiśnia', ru: 'Вишня', sv: 'Körsbär', zh: '樱桃', ja: 'さくらんぼ', ko: '체리', th: 'เชอร์รี', ar: 'كرز',
  }},
  { id: 'apricot', icon: '🍑', category: 'fruits', translations: {
    it: 'Albicocca', en: 'Apricot', fr: 'Abricot', de: 'Aprikose', es: 'Albaricoque', pt: 'Damasco', nl: 'Abrikoos', pl: 'Morela', ru: 'Абрикос', sv: 'Aprikos', zh: '杏', ja: 'あんず', ko: '살구', th: 'แอพริคอท', ar: 'مشمش',
  }},
  { id: 'pear', icon: '🍐', category: 'fruits', translations: {
    it: 'Pera', en: 'Pear', fr: 'Poire', de: 'Birne', es: 'Pera', pt: 'Pera', nl: 'Peer', pl: 'Gruszka', ru: 'Груша', sv: 'Päron', zh: '梨', ja: '梨', ko: '배', th: 'ลูกแพร์', ar: 'كمثرى',
  }},
  { id: 'citrus', icon: '🍋', category: 'fruits', translations: {
    it: 'Agrumi', en: 'Citrus fruits', fr: 'Agrumes', de: 'Zitrusfrüchte', es: 'Cítricos', pt: 'Citrinos', nl: 'Citrusvruchten', pl: 'Owoce cytrusowe', ru: 'Цитрусовые', sv: 'Citrusfrukter', zh: '柑橘类水果', ja: '柑橘類', ko: '감귤류', th: 'ผลไม้ตระกูลส้ม', ar: 'الحمضيات',
  }},
  { id: 'coconut', icon: '🥥', category: 'fruits', translations: {
    it: 'Cocco', en: 'Coconut', fr: 'Noix de coco', de: 'Kokosnuss', es: 'Coco', pt: 'Coco', nl: 'Kokosnoot', pl: 'Kokos', ru: 'Кокос', sv: 'Kokos', zh: '椰子', ja: 'ココナッツ', ko: '코코넛', th: 'มะพร้าว', ar: 'جوز الهند',
  }},
  { id: 'pineapple', icon: '🍍', category: 'fruits', translations: {
    it: 'Ananas', en: 'Pineapple', fr: 'Ananas', de: 'Ananas', es: 'Piña', pt: 'Ananás', nl: 'Ananas', pl: 'Ananas', ru: 'Ананас', sv: 'Ananas', zh: '菠萝', ja: 'パイナップル', ko: '파인애플', th: 'สับปะรด', ar: 'أناناس',
  }},
  { id: 'mango', icon: '🥭', category: 'fruits', translations: {
    it: 'Mango', en: 'Mango', fr: 'Mangue', de: 'Mango', es: 'Mango', pt: 'Manga', nl: 'Mango', pl: 'Mango', ru: 'Манго', sv: 'Mango', zh: '芒果', ja: 'マンゴー', ko: '망고', th: 'มะม่วง', ar: 'مانجو',
  }},
  { id: 'avocado', icon: '🥑', category: 'fruits', translations: {
    it: 'Avocado', en: 'Avocado', fr: 'Avocat', de: 'Avocado', es: 'Aguacate', pt: 'Abacate', nl: 'Avocado', pl: 'Awokado', ru: 'Авокадо', sv: 'Avokado', zh: '牛油果', ja: 'アボカド', ko: '아보카도', th: 'อะโวคาโด', ar: 'أفوكادو',
  }},
  // — Legumi, cereali e altro —
  { id: 'chickpeas', icon: '🫘', category: 'legumes_other', translations: {
    it: 'Ceci', en: 'Chickpeas', fr: 'Pois chiches', de: 'Kichererbsen', es: 'Garbanzos', pt: 'Grão-de-bico', nl: 'Kikkererwten', pl: 'Ciecierzyca', ru: 'Нут', sv: 'Kikärter', zh: '鹰嘴豆', ja: 'ひよこ豆', ko: '병아리콩', th: 'ถั่วลูกไก่', ar: 'حمص',
  }},
  { id: 'lentils', icon: '🫘', category: 'legumes_other', translations: {
    it: 'Lenticchie', en: 'Lentils', fr: 'Lentilles', de: 'Linsen', es: 'Lentejas', pt: 'Lentilhas', nl: 'Linzen', pl: 'Soczewica', ru: 'Чечевица', sv: 'Linser', zh: '扁豆', ja: 'レンズ豆', ko: '렌틸콩', th: 'ถั่วเลนทิล', ar: 'عدس',
  }},
  { id: 'corn', icon: '🌽', category: 'legumes_other', translations: {
    it: 'Mais', en: 'Corn', fr: 'Maïs', de: 'Mais', es: 'Maíz', pt: 'Milho', nl: 'Maïs', pl: 'Kukurydza', ru: 'Кукуруза', sv: 'Majs', zh: '玉米', ja: 'トウモロコシ', ko: '옥수수', th: 'ข้าวโพด', ar: 'الذرة',
  }},
  { id: 'buckwheat', icon: '🍜', category: 'legumes_other', translations: {
    it: 'Grano saraceno', en: 'Buckwheat', fr: 'Sarrasin', de: 'Buchweizen', es: 'Trigo sarraceno', pt: 'Trigo sarraceno', nl: 'Boekweit', pl: 'Gryka', ru: 'Гречка', sv: 'Bovete', zh: '荞麦', ja: 'そば', ko: '메밀', th: 'บัควีท', ar: 'الحنطة السوداء',
  }},
  { id: 'coriander', icon: '🌿', category: 'legumes_other', translations: {
    it: 'Coriandolo', en: 'Coriander', fr: 'Coriandre', de: 'Koriander', es: 'Cilantro', pt: 'Coentro', nl: 'Koriander', pl: 'Kolendra', ru: 'Кориандр', sv: 'Koriander', zh: '香菜', ja: 'コリアンダー', ko: '고수', th: 'ผักชี', ar: 'كزبرة',
  }},
  { id: 'spicy', icon: '🌶️', category: 'legumes_other', translations: {
    it: 'Spezie piccanti', en: 'Spicy foods', fr: 'Épices piquantes', de: 'Scharfe Gewürze', es: 'Especias picantes', pt: 'Especiarias picantes', nl: 'Pittige kruiden', pl: 'Ostre przyprawy', ru: 'Острые специи', sv: 'Starka kryddor', zh: '辛辣食物', ja: '辛い香辛料', ko: '매운 향신료', th: 'เครื่องเทศรสเผ็ด', ar: 'التوابل الحارة',
  }},
];

export const getOtherFoodById = (id: string): OtherFood | undefined => {
  return OTHER_FOODS.find((f) => f.id === id);
};
