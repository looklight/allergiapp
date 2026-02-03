import { Language } from '../types';

interface CardTranslation {
  header: string;
  subtitle: string;
  message: string;
  thanks: string;
  tapToSee: string;
  showIn: string;
  examples: string;
}

export const CARD_TRANSLATIONS: Record<Language, CardTranslation> = {
  it: {
    header: 'ATTENZIONE',
    subtitle: 'ALLERGIE ALIMENTARI',
    message: 'Ho le seguenti allergie alimentari. Per favore, assicuratevi che il mio cibo non contenga questi ingredienti.',
    thanks: 'Vi ringrazio molto per la vostra comprensione e il vostro aiuto.',
    tapToSee: 'Tocca per vedere esempi',
    showIn: 'Mostra in',
    examples: 'Esempi:',
  },
  en: {
    header: 'ATTENTION',
    subtitle: 'FOOD ALLERGIES',
    message: 'I have the following food allergies. Please ensure my food does not contain these ingredients.',
    thanks: 'Thank you so much for your understanding and your help.',
    tapToSee: 'Tap to see examples',
    showIn: 'Show in',
    examples: 'Examples:',
  },
  fr: {
    header: 'ATTENTION',
    subtitle: 'ALLERGIES ALIMENTAIRES',
    message: 'J\'ai les allergies alimentaires suivantes. Veuillez vous assurer que ma nourriture ne contient pas ces ingrédients.',
    thanks: 'Je vous remercie beaucoup pour votre compréhension et votre aide.',
    tapToSee: 'Appuyez pour voir des exemples',
    showIn: 'Afficher en',
    examples: 'Exemples:',
  },
  de: {
    header: 'ACHTUNG',
    subtitle: 'LEBENSMITTELALLERGIEN',
    message: 'Ich habe die folgenden Lebensmittelallergien. Bitte stellen Sie sicher, dass mein Essen diese Zutaten nicht enthält.',
    thanks: 'Ich danke Ihnen sehr für Ihr Verständnis und Ihre Hilfe.',
    tapToSee: 'Tippen für Beispiele',
    showIn: 'Anzeigen auf',
    examples: 'Beispiele:',
  },
  es: {
    header: 'ATENCIÓN',
    subtitle: 'ALERGIAS ALIMENTARIAS',
    message: 'Tengo las siguientes alergias alimentarias. Por favor, asegúrese de que mi comida no contenga estos ingredientes.',
    thanks: 'Les agradezco mucho su comprensión y su ayuda.',
    tapToSee: 'Toca para ver ejemplos',
    showIn: 'Mostrar en',
    examples: 'Ejemplos:',
  },
  pt: {
    header: 'ATENÇÃO',
    subtitle: 'ALERGIAS ALIMENTARES',
    message: 'Tenho as seguintes alergias alimentares. Por favor, certifique-se de que a minha comida não contém estes ingredientes.',
    thanks: 'Agradeço muito a vossa compreensão e a vossa ajuda.',
    tapToSee: 'Toque para ver exemplos',
    showIn: 'Mostrar em',
    examples: 'Exemplos:',
  },
  nl: {
    header: 'LET OP',
    subtitle: 'VOEDSELALLERGIEËN',
    message: 'Ik heb de volgende voedselallergieën. Zorg ervoor dat mijn eten deze ingrediënten niet bevat.',
    thanks: 'Hartelijk dank voor uw begrip en uw hulp.',
    tapToSee: 'Tik voor voorbeelden',
    showIn: 'Tonen in',
    examples: 'Voorbeelden:',
  },
  pl: {
    header: 'UWAGA',
    subtitle: 'ALERGIE POKARMOWE',
    message: 'Mam następujące alergie pokarmowe. Proszę upewnić się, że moje jedzenie nie zawiera tych składników.',
    thanks: 'Bardzo dziękuję za zrozumienie i pomoc.',
    tapToSee: 'Dotknij, aby zobaczyć przykłady',
    showIn: 'Pokaż w',
    examples: 'Przykłady:',
  },
  ru: {
    header: 'ВНИМАНИЕ',
    subtitle: 'ПИЩЕВАЯ АЛЛЕРГИЯ',
    message: 'У меня следующие пищевые аллергии. Пожалуйста, убедитесь, что моя еда не содержит этих ингредиентов.',
    thanks: 'Большое спасибо за ваше понимание и помощь.',
    tapToSee: 'Нажмите для примеров',
    showIn: 'Показать на',
    examples: 'Примеры:',
  },
  sv: {
    header: 'OBSERVERA',
    subtitle: 'MATALLERGIER',
    message: 'Jag har följande matallergier. Vänligen se till att min mat inte innehåller dessa ingredienser.',
    thanks: 'Tack så mycket för er förståelse och er hjälp.',
    tapToSee: 'Tryck för exempel',
    showIn: 'Visa på',
    examples: 'Exempel:',
  },
  zh: {
    header: '注意',
    subtitle: '食物过敏',
    message: '我有以下食物过敏。请确保我的食物不含这些成分。',
    thanks: '非常感谢您的理解和帮助。',
    tapToSee: '点击查看示例',
    showIn: '显示为',
    examples: '例如：',
  },
  ja: {
    header: '注意',
    subtitle: '食物アレルギー',
    message: '私は以下の食物アレルギーがあります。私の食事にこれらの食材が含まれていないことをご確認ください。',
    thanks: 'ご理解とご協力に心から感謝いたします。',
    tapToSee: 'タップして例を見る',
    showIn: '表示言語',
    examples: '例：',
  },
  ko: {
    header: '주의',
    subtitle: '식품 알레르기',
    message: '저는 다음과 같은 식품 알레르기가 있습니다. 제 음식에 이러한 재료가 포함되지 않도록 해주세요.',
    thanks: '이해와 도움에 진심으로 감사드립니다.',
    tapToSee: '예시를 보려면 탭하세요',
    showIn: '표시 언어',
    examples: '예시:',
  },
  th: {
    header: 'โปรดทราบ',
    subtitle: 'แพ้อาหาร',
    message: 'ฉันมีอาการแพ้อาหารดังต่อไปนี้ กรุณาตรวจสอบให้แน่ใจว่าอาหารของฉันไม่มีส่วนผสมเหล่านี้',
    thanks: 'ขอบคุณมากสำหรับความเข้าใจและความช่วยเหลือของคุณ',
    tapToSee: 'แตะเพื่อดูตัวอย่าง',
    showIn: 'แสดงใน',
    examples: 'ตัวอย่าง:',
  },
  ar: {
    header: 'تنبيه',
    subtitle: 'حساسية الطعام',
    message: 'لدي حساسية من الأطعمة التالية. يرجى التأكد من أن طعامي لا يحتوي على هذه المكونات.',
    thanks: 'أشكركم جزيل الشكر على تفهمكم ومساعدتكم.',
    tapToSee: 'اضغط لرؤية الأمثلة',
    showIn: 'عرض بـ',
    examples: 'أمثلة:',
  },
};
