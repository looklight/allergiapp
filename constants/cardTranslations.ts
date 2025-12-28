import { Language } from '../types';

interface CardTranslation {
  header: string;
  subtitle: string;
  message: string;
  thanks: string;
  tapToSee: string;
  showIn: string;
}

export const CARD_TRANSLATIONS: Record<Language, CardTranslation> = {
  it: {
    header: 'ATTENZIONE',
    subtitle: 'ALLERGIE ALIMENTARI',
    message: 'Ho le seguenti allergie alimentari. Per favore, assicuratevi che il mio cibo non contenga questi ingredienti.',
    thanks: 'Grazie per la vostra comprensione.',
    tapToSee: 'Tocca per vedere esempi',
    showIn: 'Mostra in',
  },
  en: {
    header: 'ATTENTION',
    subtitle: 'FOOD ALLERGIES',
    message: 'I have the following food allergies. Please ensure my food does not contain these ingredients.',
    thanks: 'Thank you for your understanding.',
    tapToSee: 'Tap to see examples',
    showIn: 'Show in',
  },
  fr: {
    header: 'ATTENTION',
    subtitle: 'ALLERGIES ALIMENTAIRES',
    message: 'J\'ai les allergies alimentaires suivantes. Veuillez vous assurer que ma nourriture ne contient pas ces ingrédients.',
    thanks: 'Merci pour votre compréhension.',
    tapToSee: 'Appuyez pour voir des exemples',
    showIn: 'Afficher en',
  },
  de: {
    header: 'ACHTUNG',
    subtitle: 'LEBENSMITTELALLERGIEN',
    message: 'Ich habe die folgenden Lebensmittelallergien. Bitte stellen Sie sicher, dass mein Essen diese Zutaten nicht enthält.',
    thanks: 'Vielen Dank für Ihr Verständnis.',
    tapToSee: 'Tippen für Beispiele',
    showIn: 'Anzeigen auf',
  },
  es: {
    header: 'ATENCIÓN',
    subtitle: 'ALERGIAS ALIMENTARIAS',
    message: 'Tengo las siguientes alergias alimentarias. Por favor, asegúrese de que mi comida no contenga estos ingredientes.',
    thanks: 'Gracias por su comprensión.',
    tapToSee: 'Toca para ver ejemplos',
    showIn: 'Mostrar en',
  },
  pt: {
    header: 'ATENÇÃO',
    subtitle: 'ALERGIAS ALIMENTARES',
    message: 'Tenho as seguintes alergias alimentares. Por favor, certifique-se de que a minha comida não contém estes ingredientes.',
    thanks: 'Obrigado pela sua compreensão.',
    tapToSee: 'Toque para ver exemplos',
    showIn: 'Mostrar em',
  },
  nl: {
    header: 'LET OP',
    subtitle: 'VOEDSELALLERGIEËN',
    message: 'Ik heb de volgende voedselallergieën. Zorg ervoor dat mijn eten deze ingrediënten niet bevat.',
    thanks: 'Bedankt voor uw begrip.',
    tapToSee: 'Tik voor voorbeelden',
    showIn: 'Tonen in',
  },
  pl: {
    header: 'UWAGA',
    subtitle: 'ALERGIE POKARMOWE',
    message: 'Mam następujące alergie pokarmowe. Proszę upewnić się, że moje jedzenie nie zawiera tych składników.',
    thanks: 'Dziękuję za zrozumienie.',
    tapToSee: 'Dotknij, aby zobaczyć przykłady',
    showIn: 'Pokaż w',
  },
  ru: {
    header: 'ВНИМАНИЕ',
    subtitle: 'ПИЩЕВАЯ АЛЛЕРГИЯ',
    message: 'У меня следующие пищевые аллергии. Пожалуйста, убедитесь, что моя еда не содержит этих ингредиентов.',
    thanks: 'Спасибо за понимание.',
    tapToSee: 'Нажмите для примеров',
    showIn: 'Показать на',
  },
  sv: {
    header: 'OBSERVERA',
    subtitle: 'MATALLERGIER',
    message: 'Jag har följande matallergier. Vänligen se till att min mat inte innehåller dessa ingredienser.',
    thanks: 'Tack för er förståelse.',
    tapToSee: 'Tryck för exempel',
    showIn: 'Visa på',
  },
  zh: {
    header: '注意',
    subtitle: '食物过敏',
    message: '我有以下食物过敏。请确保我的食物不含这些成分。',
    thanks: '感谢您的理解。',
    tapToSee: '点击查看示例',
    showIn: '显示为',
  },
  ja: {
    header: '注意',
    subtitle: '食物アレルギー',
    message: '私は以下の食物アレルギーがあります。私の食事にこれらの食材が含まれていないことをご確認ください。',
    thanks: 'ご理解いただきありがとうございます。',
    tapToSee: 'タップして例を見る',
    showIn: '表示言語',
  },
  ko: {
    header: '주의',
    subtitle: '식품 알레르기',
    message: '저는 다음과 같은 식품 알레르기가 있습니다. 제 음식에 이러한 재료가 포함되지 않도록 해주세요.',
    thanks: '이해해 주셔서 감사합니다.',
    tapToSee: '예시를 보려면 탭하세요',
    showIn: '표시 언어',
  },
  th: {
    header: 'โปรดทราบ',
    subtitle: 'แพ้อาหาร',
    message: 'ฉันมีอาการแพ้อาหารดังต่อไปนี้ กรุณาตรวจสอบให้แน่ใจว่าอาหารของฉันไม่มีส่วนผสมเหล่านี้',
    thanks: 'ขอบคุณสำหรับความเข้าใจ',
    tapToSee: 'แตะเพื่อดูตัวอย่าง',
    showIn: 'แสดงใน',
  },
  ar: {
    header: 'تنبيه',
    subtitle: 'حساسية الطعام',
    message: 'لدي حساسية من الأطعمة التالية. يرجى التأكد من أن طعامي لا يحتوي على هذه المكونات.',
    thanks: 'شكراً لتفهمكم.',
    tapToSee: 'اضغط لرؤية الأمثلة',
    showIn: 'عرض بـ',
  },
};
