import { Language } from '../types';

export type OtherFoodCategory = 'vegetables' | 'fruits' | 'legumes_other' | 'proteins';

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
  | 'zucchini'
  | 'fennel'
  | 'celeriac'
  | 'spinach'
  | 'potato'
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
  | 'grapes'
  | 'melon'
  | 'watermelon'
  | 'fig'
  | 'passion_fruit'
  // Legumi
  | 'chickpeas'
  | 'lentils'
  | 'beans'
  | 'peas'
  // Cereali
  | 'corn'
  | 'buckwheat'
  | 'rice'
  | 'oats'
  // Spezie, semi e altro
  | 'pepper'
  | 'nutmeg'
  | 'turmeric'
  | 'coriander'
  | 'spicy'
  | 'cinnamon'
  | 'ginger'
  | 'poppy_seeds'
  | 'sunflower_seeds'
  | 'flax_seeds'
  | 'cacao_chocolate'
  | 'olive_oil'
  // Proteine
  | 'pork'
  | 'red_meat'
  | 'chicken';

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
  proteins: {
    it: 'Proteine',
    en: 'Proteins',
    fr: 'Protéines',
    de: 'Proteine',
    es: 'Proteínas',
    pt: 'Proteínas',
    nl: 'Eiwitten',
    pl: 'Białka',
    ru: 'Белки',
    sv: 'Proteiner',
    zh: '蛋白质',
    ja: 'タンパク質',
    ko: '단백질',
    th: 'โปรตีน',
    ar: 'البروتينات',
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
  { id: 'zucchini', icon: '🥒', category: 'vegetables', translations: {
    it: 'Zucchina', en: 'Zucchini', fr: 'Courgette', de: 'Zucchini', es: 'Calabacín', pt: 'Abobrinha', nl: 'Courgette', pl: 'Cukinia', ru: 'Кабачок', sv: 'Zucchini', zh: '西葫芦', ja: 'ズッキーニ', ko: '주키니', th: 'ซูกินี', ar: 'كوسا',
  }},
  { id: 'fennel', icon: '🌱', category: 'vegetables', translations: {
    it: 'Finocchio', en: 'Fennel', fr: 'Fenouil', de: 'Fenchel', es: 'Hinojo', pt: 'Funcho', nl: 'Venkel', pl: 'Koper włoski', ru: 'Фенхель', sv: 'Fänkål', zh: '茴香', ja: 'フェンネル', ko: '회향', th: 'เฟนเนล', ar: 'الشمر',
  }},
  { id: 'celeriac', icon: '🥬', category: 'vegetables', translations: {
    it: 'Sedano rapa', en: 'Celeriac', fr: 'Céleri-rave', de: 'Knollensellerie', es: 'Apio nabo', pt: 'Aipo-rábano', nl: 'Knolselderij', pl: 'Seler korzeniowy', ru: 'Сельдерей корневой', sv: 'Rotselleri', zh: '根芹', ja: 'セロリアック', ko: '셀러리악', th: 'เซเลอรีแอค', ar: 'كرفس جذري',
  }},
  { id: 'spinach', icon: '🍃', category: 'vegetables', translations: {
    it: 'Spinaci', en: 'Spinach', fr: 'Épinards', de: 'Spinat', es: 'Espinacas', pt: 'Espinafre', nl: 'Spinazie', pl: 'Szpinak', ru: 'Шпинат', sv: 'Spenat', zh: '菠菜', ja: 'ほうれん草', ko: '시금치', th: 'ผักโขม', ar: 'السبانخ',
  }},
  { id: 'potato', icon: '🥔', category: 'vegetables', translations: {
    it: 'Patata', en: 'Potato', fr: 'Pomme de terre', de: 'Kartoffel', es: 'Patata', pt: 'Batata', nl: 'Aardappel', pl: 'Ziemniak', ru: 'Картофель', sv: 'Potatis', zh: '土豆', ja: 'ジャガイモ', ko: '감자', th: 'มันฝรั่ง', ar: 'بطاطس',
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
  { id: 'grapes', icon: '🍇', category: 'fruits', translations: {
    it: 'Uva', en: 'Grapes', fr: 'Raisin', de: 'Trauben', es: 'Uvas', pt: 'Uvas', nl: 'Druiven', pl: 'Winogrona', ru: 'Виноград', sv: 'Vindruvor', zh: '葡萄', ja: 'ブドウ', ko: '포도', th: 'องุ่น', ar: 'العنب',
  }},
  { id: 'melon', icon: '🍈', category: 'fruits', translations: {
    it: 'Melone', en: 'Melon', fr: 'Melon', de: 'Melone', es: 'Melón', pt: 'Melão', nl: 'Meloen', pl: 'Melon', ru: 'Дыня', sv: 'Melon', zh: '甜瓜', ja: 'メロン', ko: '멜론', th: 'เมลอน', ar: 'شمام',
  }},
  { id: 'watermelon', icon: '🍉', category: 'fruits', translations: {
    it: 'Anguria', en: 'Watermelon', fr: 'Pastèque', de: 'Wassermelone', es: 'Sandía', pt: 'Melancia', nl: 'Watermeloen', pl: 'Arbuz', ru: 'Арбуз', sv: 'Vattenmelon', zh: '西瓜', ja: 'スイカ', ko: '수박', th: 'แตงโม', ar: 'البطيخ',
  }},
  { id: 'fig', icon: '🫐', category: 'fruits', translations: {
    it: 'Fico', en: 'Fig', fr: 'Figue', de: 'Feige', es: 'Higo', pt: 'Figo', nl: 'Vijg', pl: 'Figa', ru: 'Инжир', sv: 'Fikon', zh: '无花果', ja: 'イチジク', ko: '무화과', th: 'มะเดื่อ', ar: 'التين',
  }},
  { id: 'passion_fruit', icon: '🍊', category: 'fruits', translations: {
    it: 'Frutto della passione', en: 'Passion fruit', fr: 'Fruit de la passion', de: 'Passionsfrucht', es: 'Maracuyá', pt: 'Maracujá', nl: 'Passievrucht', pl: 'Marakuja', ru: 'Маракуйя', sv: 'Passionsfrukt', zh: '百香果', ja: 'パッションフルーツ', ko: '패션프루트', th: 'เสาวรส', ar: 'فاكهة العاطفة',
  }},
  // — Legumi, cereali e altro —
  // Legumi
  { id: 'chickpeas', icon: '🫘', category: 'legumes_other', translations: {
    it: 'Ceci', en: 'Chickpeas', fr: 'Pois chiches', de: 'Kichererbsen', es: 'Garbanzos', pt: 'Grão-de-bico', nl: 'Kikkererwten', pl: 'Ciecierzyca', ru: 'Нут', sv: 'Kikärter', zh: '鹰嘴豆', ja: 'ひよこ豆', ko: '병아리콩', th: 'ถั่วลูกไก่', ar: 'حمص',
  }},
  { id: 'lentils', icon: '🫘', category: 'legumes_other', translations: {
    it: 'Lenticchie', en: 'Lentils', fr: 'Lentilles', de: 'Linsen', es: 'Lentejas', pt: 'Lentilhas', nl: 'Linzen', pl: 'Soczewica', ru: 'Чечевица', sv: 'Linser', zh: '扁豆', ja: 'レンズ豆', ko: '렌틸콩', th: 'ถั่วเลนทิล', ar: 'عدس',
  }},
  { id: 'beans', icon: '🫘', category: 'legumes_other', translations: {
    it: 'Fagioli', en: 'Beans', fr: 'Haricots', de: 'Bohnen', es: 'Judías', pt: 'Feijão', nl: 'Bonen', pl: 'Fasola', ru: 'Фасоль', sv: 'Bönor', zh: '豆子', ja: '豆', ko: '콩', th: 'ถั่ว', ar: 'الفاصوليا',
  }},
  { id: 'peas', icon: '🫛', category: 'legumes_other', translations: {
    it: 'Piselli', en: 'Peas', fr: 'Petits pois', de: 'Erbsen', es: 'Guisantes', pt: 'Ervilhas', nl: 'Erwten', pl: 'Groch', ru: 'Горох', sv: 'Ärtor', zh: '豌豆', ja: 'エンドウ豆', ko: '완두콩', th: 'ถั่วลันเตา', ar: 'البازلاء',
  }},
  // Cereali
  { id: 'corn', icon: '🌽', category: 'legumes_other', translations: {
    it: 'Mais', en: 'Corn', fr: 'Maïs', de: 'Mais', es: 'Maíz', pt: 'Milho', nl: 'Maïs', pl: 'Kukurydza', ru: 'Кукуруза', sv: 'Majs', zh: '玉米', ja: 'トウモロコシ', ko: '옥수수', th: 'ข้าวโพด', ar: 'الذرة',
  }},
  { id: 'buckwheat', icon: '🍜', category: 'legumes_other', translations: {
    it: 'Grano saraceno', en: 'Buckwheat', fr: 'Sarrasin', de: 'Buchweizen', es: 'Trigo sarraceno', pt: 'Trigo sarraceno', nl: 'Boekweit', pl: 'Gryka', ru: 'Гречка', sv: 'Bovete', zh: '荞麦', ja: 'そば', ko: '메밀', th: 'บัควีท', ar: 'الحنطة السوداء',
  }},
  { id: 'rice', icon: '🍚', category: 'legumes_other', translations: {
    it: 'Riso', en: 'Rice', fr: 'Riz', de: 'Reis', es: 'Arroz', pt: 'Arroz', nl: 'Rijst', pl: 'Ryż', ru: 'Рис', sv: 'Ris', zh: '大米', ja: '米', ko: '쌀', th: 'ข้าว', ar: 'الأرز',
  }},
  { id: 'oats', icon: '🌾', category: 'legumes_other', translations: {
    it: 'Avena', en: 'Oats', fr: 'Avoine', de: 'Hafer', es: 'Avena', pt: 'Aveia', nl: 'Haver', pl: 'Owies', ru: 'Овёс', sv: 'Havre', zh: '燕麦', ja: 'オーツ麦', ko: '귀리', th: 'ข้าวโอ๊ต', ar: 'الشوفان',
  }},
  // Spezie, semi e altro
  { id: 'pepper', icon: '🫙', category: 'legumes_other', translations: {
    it: 'Pepe', en: 'Pepper', fr: 'Poivre', de: 'Pfeffer', es: 'Pimienta', pt: 'Pimenta', nl: 'Peper', pl: 'Pieprz', ru: 'Перец', sv: 'Peppar', zh: '胡椒', ja: 'コショウ', ko: '후추', th: 'พริกไทย', ar: 'الفلفل',
  }},
  { id: 'nutmeg', icon: '🌰', category: 'legumes_other', translations: {
    it: 'Noce moscata', en: 'Nutmeg', fr: 'Noix de muscade', de: 'Muskatnuss', es: 'Nuez moscada', pt: 'Noz-moscada', nl: 'Nootmuskaat', pl: 'Gałka muszkatołowa', ru: 'Мускатный орех', sv: 'Muskotnöt', zh: '肉豆蔻', ja: 'ナツメグ', ko: '육두구', th: 'ลูกจันทน์เทศ', ar: 'جوزة الطيب',
  }},
  { id: 'turmeric', icon: '🟡', category: 'legumes_other', translations: {
    it: 'Curcuma', en: 'Turmeric', fr: 'Curcuma', de: 'Kurkuma', es: 'Cúrcuma', pt: 'Cúrcuma', nl: 'Kurkuma', pl: 'Kurkuma', ru: 'Куркума', sv: 'Gurkmeja', zh: '姜黄', ja: 'ターメリック', ko: '강황', th: 'ขมิ้น', ar: 'الكركم',
  }},
  { id: 'coriander', icon: '🌿', category: 'legumes_other', translations: {
    it: 'Coriandolo', en: 'Coriander', fr: 'Coriandre', de: 'Koriander', es: 'Cilantro', pt: 'Coentro', nl: 'Koriander', pl: 'Kolendra', ru: 'Кориандр', sv: 'Koriander', zh: '香菜', ja: 'コリアンダー', ko: '고수', th: 'ผักชี', ar: 'كزبرة',
  }},
  { id: 'spicy', icon: '🌶️', category: 'legumes_other', translations: {
    it: 'Spezie piccanti', en: 'Spicy foods', fr: 'Épices piquantes', de: 'Scharfe Gewürze', es: 'Especias picantes', pt: 'Especiarias picantes', nl: 'Pittige kruiden', pl: 'Ostre przyprawy', ru: 'Острые специи', sv: 'Starka kryddor', zh: '辛辣食物', ja: '辛い香辛料', ko: '매운 향신료', th: 'เครื่องเทศรสเผ็ด', ar: 'التوابل الحارة',
  }},
  { id: 'cinnamon', icon: '🍂', category: 'legumes_other', translations: {
    it: 'Cannella', en: 'Cinnamon', fr: 'Cannelle', de: 'Zimt', es: 'Canela', pt: 'Canela', nl: 'Kaneel', pl: 'Cynamon', ru: 'Корица', sv: 'Kanel', zh: '肉桂', ja: 'シナモン', ko: '계피', th: 'อบเชย', ar: 'القرفة',
  }},
  { id: 'ginger', icon: '🫚', category: 'legumes_other', translations: {
    it: 'Zenzero', en: 'Ginger', fr: 'Gingembre', de: 'Ingwer', es: 'Jengibre', pt: 'Gengibre', nl: 'Gember', pl: 'Imbir', ru: 'Имбирь', sv: 'Ingefära', zh: '生姜', ja: 'ショウガ', ko: '생강', th: 'ขิง', ar: 'الزنجبيل',
  }},
  { id: 'poppy_seeds', icon: '🌸', category: 'legumes_other', translations: {
    it: 'Semi di papavero', en: 'Poppy seeds', fr: 'Graines de pavot', de: 'Mohnsamen', es: 'Semillas de amapola', pt: 'Sementes de papoula', nl: 'Maanzaad', pl: 'Nasiona maku', ru: 'Семена мака', sv: 'Vallmofrön', zh: '罂粟籽', ja: 'ケシの実', ko: '양귀비씨', th: 'เมล็ดฝิ่น', ar: 'بذور الخشخاش',
  }},
  { id: 'sunflower_seeds', icon: '🌻', category: 'legumes_other', translations: {
    it: 'Semi di girasole', en: 'Sunflower seeds', fr: 'Graines de tournesol', de: 'Sonnenblumenkerne', es: 'Semillas de girasol', pt: 'Sementes de girassol', nl: 'Zonnebloempitten', pl: 'Nasiona słonecznika', ru: 'Семена подсолнечника', sv: 'Solrosfrön', zh: '葵花籽', ja: 'ヒマワリの種', ko: '해바라기씨', th: 'เมล็ดทานตะวัน', ar: 'بذور دوار الشمس',
  }},
  { id: 'flax_seeds', icon: '🌾', category: 'legumes_other', translations: {
    it: 'Semi di lino', en: 'Flax seeds', fr: 'Graines de lin', de: 'Leinsamen', es: 'Semillas de lino', pt: 'Sementes de linhaça', nl: 'Lijnzaad', pl: 'Siemię lniane', ru: 'Семена льна', sv: 'Linfrön', zh: '亚麻籽', ja: '亜麻仁', ko: '아마씨', th: 'เมล็ดแฟลกซ์', ar: 'بذور الكتان',
  }},
  { id: 'cacao_chocolate', icon: '🍫', category: 'legumes_other', translations: {
    it: 'Cacao/Cioccolato', en: 'Cacao/Chocolate', fr: 'Cacao/Chocolat', de: 'Kakao/Schokolade', es: 'Cacao/Chocolate', pt: 'Cacau/Chocolate', nl: 'Cacao/Chocolade', pl: 'Kakao/Czekolada', ru: 'Какао/Шоколад', sv: 'Kakao/Choklad', zh: '可可/巧克力', ja: 'カカオ/チョコレート', ko: '카카오/초콜릿', th: 'โกโก้/ช็อกโกแลต', ar: 'الكاكاو/الشوكولاتة',
  }},
  { id: 'olive_oil', icon: '🫒', category: 'legumes_other', translations: {
    it: 'Olio d\'oliva', en: 'Olive oil', fr: 'Huile d\'olive', de: 'Olivenöl', es: 'Aceite de oliva', pt: 'Azeite', nl: 'Olijfolie', pl: 'Oliwa z oliwek', ru: 'Оливковое масло', sv: 'Olivolja', zh: '橄榄油', ja: 'オリーブオイル', ko: '올리브유', th: 'น้ำมันมะกอก', ar: 'زيت الزيتون',
  }},
  // — Proteine —
  { id: 'pork', icon: '🥩', category: 'proteins', translations: {
    it: 'Carne di maiale', en: 'Pork', fr: 'Porc', de: 'Schweinefleisch', es: 'Cerdo', pt: 'Carne de porco', nl: 'Varkensvlees', pl: 'Wieprzowina', ru: 'Свинина', sv: 'Fläsk', zh: '猪肉', ja: '豚肉', ko: '돼지고기', th: 'เนื้อหมู', ar: 'لحم الخنزير',
  }},
  { id: 'red_meat', icon: '🍖', category: 'proteins', translations: {
    it: 'Carne rossa', en: 'Red meat', fr: 'Viande rouge', de: 'Rotes Fleisch', es: 'Carne roja', pt: 'Carne vermelha', nl: 'Rood vlees', pl: 'Czerwone mięso', ru: 'Красное мясо', sv: 'Rött kött', zh: '红肉', ja: '赤身肉', ko: '붉은 고기', th: 'เนื้อแดง', ar: 'اللحم الأحمر',
  }},
  { id: 'chicken', icon: '🍗', category: 'proteins', translations: {
    it: 'Pollo', en: 'Chicken', fr: 'Poulet', de: 'Huhn', es: 'Pollo', pt: 'Frango', nl: 'Kip', pl: 'Kurczak', ru: 'Курица', sv: 'Kyckling', zh: '鸡肉', ja: '鶏肉', ko: '닭고기', th: 'เนื้อไก่', ar: 'دجاج',
  }},
];

export const getOtherFoodById = (id: string): OtherFood | undefined => {
  return OTHER_FOODS.find((f) => f.id === id);
};
