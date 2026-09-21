// Le categorie dei piatti della scheda del ristoratore: SET FISSO tradotto.
//
// COPIA GEMELLA di partner/src/lib/categories.ts, da cui e' presa parola per
// parola. Vive due volte perche' sono due progetti che si rilasciano
// separatamente — il portale sta su Vercel, l'app negli store — e un pacchetto
// condiviso vorrebbe dire legare i due treni di rilascio per una manciata di
// parole che non cambiano mai. Stessa scelta gia' fatta per il menu' al tavolo
// (portale/landing, `npm run gemelle` nel portale).
//
// ⚠️ I CODICI devono combaciare col CHECK di partner_dishes.category (700,
// esteso dalla 713): sono quelli che arrivano da get_restaurant_card (731).
// Se una categoria si aggiunge di la', qui arriva un codice sconosciuto e
// `categoryName` restituisce il codice grezzo: brutto, non rotto.
//
// Quindici lingue anche se l'app ne parla sei: sono gia' scritte, e il giorno
// che una lingua si aggiunge all'interfaccia le categorie ci sono gia'.
// Stessa forma di constants/allergens.ts e constants/diets.ts.

export const CATEGORY_LANGUAGES = [
  'it', 'en', 'fr', 'de', 'es', 'pt', 'nl', 'pl', 'ru', 'sv', 'zh', 'ja', 'ko', 'th', 'ar',
] as const;

export type CategoryLanguage = (typeof CATEGORY_LANGUAGES)[number];

export interface DishCategory {
  code: string;
  names: Record<CategoryLanguage, string>;
}

// L'ordine è quello delle tendine, e segue il pasto invece dell'alfabeto:
// si apre la mattina e si chiude con l'ammazzacaffè.
export const DISH_CATEGORIES: DishCategory[] = [
  { code: 'breakfast', names: {
    it: 'Colazione', en: 'Breakfast', fr: 'Petit-déjeuner', de: 'Frühstück', es: 'Desayuno',
    pt: 'Pequeno-almoço', nl: 'Ontbijt', pl: 'Śniadanie', ru: 'Завтрак', sv: 'Frukost',
    zh: '早餐', ja: '朝食', ko: '아침 식사', th: 'อาหารเช้า', ar: 'الإفطار' } },
  { code: 'starters', names: {
    it: 'Antipasti', en: 'Starters', fr: 'Entrées', de: 'Vorspeisen', es: 'Entrantes',
    pt: 'Entradas', nl: 'Voorgerechten', pl: 'Przystawki', ru: 'Закуски', sv: 'Förrätter',
    zh: '前菜', ja: '前菜', ko: '전채', th: 'อาหารเรียกน้ำย่อย', ar: 'المقبلات' } },
  { code: 'platters', names: {
    it: 'Taglieri', en: 'Platters', fr: 'Planches', de: 'Platten', es: 'Tablas',
    pt: 'Tábuas', nl: 'Plankjes', pl: 'Deski', ru: 'Ассорти', sv: 'Brickor',
    zh: '拼盘', ja: '盛り合わせ', ko: '모둠 플래터', th: 'จานรวม', ar: 'أطباق مشكّلة' } },
  { code: 'fried', names: {
    it: 'Fritti', en: 'Fried', fr: 'Fritures', de: 'Frittiertes', es: 'Fritos',
    pt: 'Fritos', nl: 'Gefrituurd', pl: 'Smażone', ru: 'Жареное', sv: 'Friterat',
    zh: '炸物', ja: '揚げ物', ko: '튀김', th: 'ของทอด', ar: 'المقليات' } },
  { code: 'first_courses', names: {
    it: 'Primi', en: 'First courses', fr: 'Premiers plats', de: 'Erste Gänge', es: 'Primeros platos',
    pt: 'Primeiros pratos', nl: 'Eerste gangen', pl: 'Pierwsze dania', ru: 'Первые блюда', sv: 'Förstarätter',
    zh: '第一道菜', ja: 'パスタ・リゾット', ko: '파스타·리조또', th: 'อาหารจานแรก', ar: 'الأطباق الأولى' } },
  { code: 'second_courses', names: {
    it: 'Secondi', en: 'Main courses', fr: 'Plats principaux', de: 'Hauptgerichte', es: 'Segundos platos',
    pt: 'Pratos principais', nl: 'Hoofdgerechten', pl: 'Dania główne', ru: 'Основные блюда', sv: 'Huvudrätter',
    zh: '主菜', ja: 'メイン料理', ko: '메인 요리', th: 'อาหารจานหลัก', ar: 'الأطباق الرئيسية' } },
  { code: 'sides', names: {
    it: 'Contorni', en: 'Sides', fr: 'Accompagnements', de: 'Beilagen', es: 'Guarniciones',
    pt: 'Acompanhamentos', nl: 'Bijgerechten', pl: 'Dodatki', ru: 'Гарниры', sv: 'Tillbehör',
    zh: '配菜', ja: '付け合わせ', ko: '사이드', th: 'เครื่องเคียง', ar: 'الأطباق الجانبية' } },
  { code: 'pizza', names: {
    it: 'Pizza', en: 'Pizza', fr: 'Pizza', de: 'Pizza', es: 'Pizza',
    pt: 'Pizza', nl: 'Pizza', pl: 'Pizza', ru: 'Пицца', sv: 'Pizza',
    zh: '披萨', ja: 'ピザ', ko: '피자', th: 'พิซซ่า', ar: 'بيتزا' } },
  { code: 'sandwiches', names: {
    it: 'Panini', en: 'Sandwiches', fr: 'Sandwichs', de: 'Sandwiches', es: 'Bocadillos',
    pt: 'Sanduíches', nl: 'Broodjes', pl: 'Kanapki', ru: 'Сэндвичи', sv: 'Smörgåsar',
    zh: '三明治', ja: 'サンドイッチ', ko: '샌드위치', th: 'แซนด์วิช', ar: 'ساندويتشات' } },
  { code: 'burgers', names: {
    it: 'Hamburger', en: 'Burgers', fr: 'Burgers', de: 'Burger', es: 'Hamburguesas',
    pt: 'Hambúrgueres', nl: 'Burgers', pl: 'Burgery', ru: 'Бургеры', sv: 'Burgare',
    zh: '汉堡', ja: 'ハンバーガー', ko: '버거', th: 'เบอร์เกอร์', ar: 'برجر' } },
  { code: 'salads', names: {
    it: 'Insalate', en: 'Salads', fr: 'Salades', de: 'Salate', es: 'Ensaladas',
    pt: 'Saladas', nl: 'Salades', pl: 'Sałatki', ru: 'Салаты', sv: 'Sallader',
    zh: '沙拉', ja: 'サラダ', ko: '샐러드', th: 'สลัด', ar: 'سلطات' } },
  { code: 'sushi', names: {
    it: 'Sushi', en: 'Sushi', fr: 'Sushi', de: 'Sushi', es: 'Sushi',
    pt: 'Sushi', nl: 'Sushi', pl: 'Sushi', ru: 'Суши', sv: 'Sushi',
    zh: '寿司', ja: '寿司', ko: '스시', th: 'ซูชิ', ar: 'سوشي' } },
  { code: 'desserts', names: {
    it: 'Dolci', en: 'Desserts', fr: 'Desserts', de: 'Desserts', es: 'Postres',
    pt: 'Sobremesas', nl: 'Desserts', pl: 'Desery', ru: 'Десерты', sv: 'Efterrätter',
    zh: '甜点', ja: 'デザート', ko: '디저트', th: 'ของหวาน', ar: 'الحلويات' } },
  { code: 'drinks', names: {
    it: 'Bevande', en: 'Drinks', fr: 'Boissons', de: 'Getränke', es: 'Bebidas',
    pt: 'Bebidas', nl: 'Dranken', pl: 'Napoje', ru: 'Напитки', sv: 'Dryck',
    zh: '饮料', ja: 'ドリンク', ko: '음료', th: 'เครื่องดื่ม', ar: 'المشروبات' } },
  { code: 'wines', names: {
    it: 'Vini', en: 'Wines', fr: 'Vins', de: 'Weine', es: 'Vinos',
    pt: 'Vinhos', nl: 'Wijnen', pl: 'Wina', ru: 'Вина', sv: 'Viner',
    zh: '葡萄酒', ja: 'ワイン', ko: '와인', th: 'ไวน์', ar: 'النبيذ' } },
  { code: 'beers', names: {
    it: 'Birre', en: 'Beers', fr: 'Bières', de: 'Biere', es: 'Cervezas',
    pt: 'Cervejas', nl: 'Bieren', pl: 'Piwa', ru: 'Пиво', sv: 'Öl',
    zh: '啤酒', ja: 'ビール', ko: '맥주', th: 'เบียร์', ar: 'البيرة' } },
  { code: 'cocktails', names: {
    it: 'Cocktail', en: 'Cocktails', fr: 'Cocktails', de: 'Cocktails', es: 'Cócteles',
    pt: 'Cocktails', nl: 'Cocktails', pl: 'Koktajle', ru: 'Коктейли', sv: 'Cocktails',
    zh: '鸡尾酒', ja: 'カクテル', ko: '칵테일', th: 'ค็อกเทล', ar: 'الكوكتيلات' } },
  { code: 'other', names: {
    it: 'Altro', en: 'Other', fr: 'Autres', de: 'Sonstiges', es: 'Otros',
    pt: 'Outros', nl: 'Overig', pl: 'Inne', ru: 'Другое', sv: 'Övrigt',
    zh: '其他', ja: 'その他', ko: '기타', th: 'อื่นๆ', ar: 'أخرى' } },
];

// Una lingua che non conosciamo ripiega sull'inglese, mai sul codice grezzo.
export function categoryName(code: string, locale: string): string {
  const found = DISH_CATEGORIES.find((c) => c.code === code);
  if (!found) return code;
  const lang = (CATEGORY_LANGUAGES as readonly string[]).includes(locale)
    ? (locale as CategoryLanguage)
    : 'en';
  return found.names[lang];
}
