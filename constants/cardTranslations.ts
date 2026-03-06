import { Language } from '../types';
import { DietCardKey, DietFoodItem } from './dietModes';

interface CardTranslation {
  header: string;
  subtitle: string;
  pregnancySubtitle: string;
  message: string;
  pregnancyMessage: string;
  thanks: string;
  tapToSee: string;
  examples: string;
}

export interface DietModeCardTranslation {
  header: string;
  message: string;
  sectionMessage: string;
}

interface RestrictionCardTranslation {
  header: string;
  message: string;
  dietModes: Record<DietCardKey, DietModeCardTranslation>;
}

export const RESTRICTION_CARD_TRANSLATIONS: Record<Language, RestrictionCardTranslation> = {
  it: {
    header: 'ALIMENTI DA EVITARE',
    message: 'Per motivi di salute, devo evitare i seguenti alimenti:',
    dietModes: {
      pregnancy: {
        header: 'GRAVIDANZA',
        message: 'Sono in gravidanza. Per favore, assicuratevi che il mio cibo non contenga i seguenti alimenti:',
        sectionMessage: 'Inoltre, a causa della gravidanza, devo evitare anche:',
      },
      no_meat: {
        header: 'DIETA VEGETARIANA',
        message: 'Non mangio carne.\nPesce e altri prodotti animali vanno bene.',
        sectionMessage: 'Inoltre, non mangio carne.\nPesce e altri prodotti animali vanno bene.',
      },
      no_meat_fish: {
        header: 'DIETA VEGETARIANA',
        message: 'Seguo una dieta vegetariana.\nNon mangio carne e pesce.',
        sectionMessage: 'Inoltre, seguo una dieta vegetariana e non mangio carne e pesce.',
      },
      no_animal_products: {
        header: 'DIETA VEGANA',
        message: 'Seguo una dieta vegana.\nNon mangio carne, pesce, frutti di mare, uova, latticini, miele e derivati animali.',
        sectionMessage: 'Inoltre, seguo una dieta vegana e non mangio carne, pesce, frutti di mare, uova, latticini, miele e derivati animali.',
      },
      nickel: {
        header: 'ALLERGIA AL NICHEL',
        message: 'Ho un\'allergia sistemica al nichel. Per favore, evitare cibi ad alto contenuto di nichel:',
        sectionMessage: 'Inoltre, ho un\'allergia al nichel. Per favore evitare anche cibi ad alto contenuto di nichel:',
      },
    },
  },
  en: {
    header: 'FOODS TO AVOID',
    message: 'For health reasons, I need to avoid the following foods:',
    dietModes: {
      pregnancy: {
        header: 'PREGNANCY',
        message: 'I am pregnant. Please ensure my food does not contain the following:',
        sectionMessage: 'Additionally, due to my pregnancy, I must also avoid:',
      },
      no_meat: {
        header: 'VEGETARIAN DIET',
        message: 'I do not eat meat.\nFish and other animal products are fine.',
        sectionMessage: 'Additionally, I do not eat meat.\nFish and other animal products are fine.',
      },
      no_meat_fish: {
        header: 'VEGETARIAN DIET',
        message: 'I follow a vegetarian diet.\nI do not eat meat or fish.',
        sectionMessage: 'Additionally, I follow a vegetarian diet and do not eat meat or fish.',
      },
      no_animal_products: {
        header: 'VEGAN DIET',
        message: 'I follow a vegan diet.\nI do not eat meat, fish, seafood, eggs, dairy, honey or any animal products.',
        sectionMessage: 'Additionally, I follow a vegan diet and do not eat meat, fish, seafood, eggs, dairy, honey or any animal products.',
      },
      nickel: {
        header: 'NICKEL ALLERGY',
        message: 'I have a systemic nickel allergy. Please avoid foods high in nickel:',
        sectionMessage: 'Additionally, I have a nickel allergy. Please also avoid foods high in nickel:',
      },
    },
  },
  fr: {
    header: 'ALIMENTS \u00C0 \u00C9VITER',
    message: 'Pour des raisons de sant\u00E9, je dois \u00E9viter les aliments suivants :',
    dietModes: {
      pregnancy: {
        header: 'GROSSESSE',
        message: 'Je suis enceinte. Veuillez vous assurer que ma nourriture ne contient pas les aliments suivants :',
        sectionMessage: 'De plus, en raison de ma grossesse, je dois aussi \u00E9viter :',
      },
      no_meat: {
        header: 'R\u00C9GIME V\u00C9G\u00C9TARIEN',
        message: 'Je ne mange pas de viande.\nLe poisson et les autres produits animaux conviennent.',
        sectionMessage: 'De plus, je ne mange pas de viande.\nLe poisson et les autres produits animaux conviennent.',
      },
      no_meat_fish: {
        header: 'R\u00C9GIME V\u00C9G\u00C9TARIEN',
        message: 'Je suis un r\u00E9gime v\u00E9g\u00E9tarien.\nJe ne mange pas de viande ni de poisson.',
        sectionMessage: 'De plus, je suis un r\u00E9gime v\u00E9g\u00E9tarien et ne mange pas de viande ni de poisson.',
      },
      no_animal_products: {
        header: 'R\u00C9GIME V\u00C9GANE',
        message: 'Je suis un r\u00E9gime v\u00E9gane.\nJe ne mange pas de viande, de poisson, de fruits de mer, d\'oeufs, de produits laitiers, de miel ni de produits d\'origine animale.',
        sectionMessage: 'De plus, je suis un r\u00E9gime v\u00E9gane et ne mange pas de viande, de poisson, de fruits de mer, d\'oeufs, de produits laitiers, de miel ni de produits d\'origine animale.',
      },
      nickel: {
        header: 'ALLERGIE AU NICKEL',
        message: 'J\'ai une allergie syst\u00E9mique au nickel. Veuillez \u00E9viter les aliments riches en nickel :',
        sectionMessage: 'De plus, j\'ai une allergie au nickel. Veuillez aussi \u00E9viter les aliments riches en nickel :',
      },
    },
  },
  de: {
    header: 'ZU VERMEIDENDE LEBENSMITTEL',
    message: 'Aus gesundheitlichen Gr\u00FCnden muss ich folgende Lebensmittel meiden:',
    dietModes: {
      pregnancy: {
        header: 'SCHWANGERSCHAFT',
        message: 'Ich bin schwanger. Bitte stellen Sie sicher, dass mein Essen folgende Lebensmittel nicht enth\u00E4lt:',
        sectionMessage: 'Zus\u00E4tzlich muss ich wegen meiner Schwangerschaft auch Folgendes meiden:',
      },
      no_meat: {
        header: 'VEGETARISCHE ERN\u00C4HRUNG',
        message: 'Ich esse kein Fleisch.\nFisch und andere tierische Produkte sind in Ordnung.',
        sectionMessage: 'Au\u00DFerdem esse ich kein Fleisch.\nFisch und andere tierische Produkte sind in Ordnung.',
      },
      no_meat_fish: {
        header: 'VEGETARISCHE ERN\u00C4HRUNG',
        message: 'Ich folge einer vegetarischen Ern\u00E4hrung.\nIch esse kein Fleisch und keinen Fisch.',
        sectionMessage: 'Au\u00DFerdem folge ich einer vegetarischen Ern\u00E4hrung und esse kein Fleisch und keinen Fisch.',
      },
      no_animal_products: {
        header: 'VEGANE ERN\u00C4HRUNG',
        message: 'Ich folge einer veganen Ern\u00E4hrung.\nIch esse kein Fleisch, keinen Fisch, keine Meeresfr\u00FCchte, keine Eier, keine Milchprodukte, keinen Honig und keine tierischen Produkte.',
        sectionMessage: 'Au\u00DFerdem folge ich einer veganen Ern\u00E4hrung und esse kein Fleisch, keinen Fisch, keine Meeresfr\u00FCchte, keine Eier, keine Milchprodukte, keinen Honig und keine tierischen Produkte.',
      },
      nickel: {
        header: 'NICKELALLERGIE',
        message: 'Ich habe eine systemische Nickelallergie. Bitte vermeiden Sie nickelreiche Lebensmittel:',
        sectionMessage: 'Zus\u00E4tzlich habe ich eine Nickelallergie. Bitte vermeiden Sie auch nickelreiche Lebensmittel:',
      },
    },
  },
  es: {
    header: 'ALIMENTOS A EVITAR',
    message: 'Por razones de salud, debo evitar los siguientes alimentos:',
    dietModes: {
      pregnancy: {
        header: 'EMBARAZO',
        message: 'Estoy embarazada. Por favor, aseg\u00FArese de que mi comida no contenga los siguientes alimentos:',
        sectionMessage: 'Adem\u00E1s, debido a mi embarazo, tambi\u00E9n debo evitar:',
      },
      no_meat: {
        header: 'DIETA VEGETARIANA',
        message: 'No como carne.\nEl pescado y otros productos animales est\u00E1n bien.',
        sectionMessage: 'Adem\u00E1s, no como carne.\nEl pescado y otros productos animales est\u00E1n bien.',
      },
      no_meat_fish: {
        header: 'DIETA VEGETARIANA',
        message: 'Sigo una dieta vegetariana.\nNo como carne ni pescado.',
        sectionMessage: 'Adem\u00E1s, sigo una dieta vegetariana y no como carne ni pescado.',
      },
      no_animal_products: {
        header: 'DIETA VEGANA',
        message: 'Sigo una dieta vegana.\nNo como carne, pescado, mariscos, huevos, l\u00E1cteos, miel ni productos de origen animal.',
        sectionMessage: 'Adem\u00E1s, sigo una dieta vegana y no como carne, pescado, mariscos, huevos, l\u00E1cteos, miel ni productos de origen animal.',
      },
      nickel: {
        header: 'ALERGIA AL N\u00CDQUEL',
        message: 'Tengo alergia sist\u00E9mica al n\u00EDquel. Por favor, evite alimentos ricos en n\u00EDquel:',
        sectionMessage: 'Adem\u00E1s, tengo alergia al n\u00EDquel. Por favor, evite tambi\u00E9n alimentos ricos en n\u00EDquel:',
      },
    },
  },
  pt: {
    header: 'ALIMENTOS A EVITAR',
    message: 'Por raz\u00F5es de sa\u00FAde, preciso evitar os seguintes alimentos:',
    dietModes: {
      pregnancy: {
        header: 'GRAVIDEZ',
        message: 'Estou gr\u00E1vida. Por favor, certifique-se de que a minha comida n\u00E3o cont\u00E9m os seguintes alimentos:',
        sectionMessage: 'Al\u00E9m disso, devido \u00E0 minha gravidez, tamb\u00E9m devo evitar:',
      },
      no_meat: {
        header: 'DIETA VEGETARIANA',
        message: 'N\u00E3o como carne.\nPeixe e outros produtos animais s\u00E3o aceit\u00E1veis.',
        sectionMessage: 'Al\u00E9m disso, n\u00E3o como carne.\nPeixe e outros produtos animais s\u00E3o aceit\u00E1veis.',
      },
      no_meat_fish: {
        header: 'DIETA VEGETARIANA',
        message: 'Sigo uma dieta vegetariana.\nN\u00E3o como carne nem peixe.',
        sectionMessage: 'Al\u00E9m disso, sigo uma dieta vegetariana e n\u00E3o como carne nem peixe.',
      },
      no_animal_products: {
        header: 'DIETA VEGANA',
        message: 'Sigo uma dieta vegana.\nN\u00E3o como carne, peixe, frutos do mar, ovos, latic\u00EDnios, mel nem produtos de origem animal.',
        sectionMessage: 'Al\u00E9m disso, sigo uma dieta vegana e n\u00E3o como carne, peixe, frutos do mar, ovos, latic\u00EDnios, mel nem produtos de origem animal.',
      },
      nickel: {
        header: 'ALERGIA AO N\u00CDQUEL',
        message: 'Tenho alergia sist\u00E9mica ao n\u00EDquel. Por favor, evite alimentos ricos em n\u00EDquel:',
        sectionMessage: 'Al\u00E9m disso, tenho alergia ao n\u00EDquel. Por favor, evite tamb\u00E9m alimentos ricos em n\u00EDquel:',
      },
    },
  },
  nl: {
    header: 'TE VERMIJDEN VOEDSEL',
    message: 'Om gezondheidsredenen moet ik de volgende voedingsmiddelen vermijden:',
    dietModes: {
      pregnancy: {
        header: 'ZWANGERSCHAP',
        message: 'Ik ben zwanger. Zorg ervoor dat mijn eten de volgende voedingsmiddelen niet bevat:',
        sectionMessage: 'Daarnaast moet ik vanwege mijn zwangerschap ook het volgende vermijden:',
      },
      no_meat: {
        header: 'VEGETARISCH DIEET',
        message: 'Ik eet geen vlees.\nVis en andere dierlijke producten zijn prima.',
        sectionMessage: 'Daarnaast eet ik geen vlees.\nVis en andere dierlijke producten zijn prima.',
      },
      no_meat_fish: {
        header: 'VEGETARISCH DIEET',
        message: 'Ik volg een vegetarisch dieet.\nIk eet geen vlees en vis.',
        sectionMessage: 'Daarnaast volg ik een vegetarisch dieet en eet ik geen vlees en vis.',
      },
      no_animal_products: {
        header: 'VEGANISTISCH DIEET',
        message: 'Ik volg een veganistisch dieet.\nIk eet geen vlees, vis, zeevruchten, eieren, zuivel, honing of dierlijke producten.',
        sectionMessage: 'Daarnaast volg ik een veganistisch dieet en eet ik geen vlees, vis, zeevruchten, eieren, zuivel, honing of dierlijke producten.',
      },
      nickel: {
        header: 'NIKKELALLERGIE',
        message: 'Ik heb een systemische nikkelallergie. Vermijd alstublieft nikkelrijke voedingsmiddelen:',
        sectionMessage: 'Daarnaast heb ik een nikkelallergie. Vermijd alstublieft ook nikkelrijke voedingsmiddelen:',
      },
    },
  },
  pl: {
    header: 'PRODUKTY DO UNIKANIA',
    message: 'Ze wzgl\u0119d\u00F3w zdrowotnych musz\u0119 unika\u0107 nast\u0119puj\u0105cych produkt\u00F3w:',
    dietModes: {
      pregnancy: {
        header: 'CI\u0104\u017BA',
        message: 'Jestem w ci\u0105\u017Cy. Prosz\u0119 upewni\u0107 si\u0119, \u017Ce moje jedzenie nie zawiera nast\u0119puj\u0105cych produkt\u00F3w:',
        sectionMessage: 'Ponadto, z powodu ci\u0105\u017Cy, musz\u0119 r\u00F3wnie\u017C unika\u0107:',
      },
      no_meat: {
        header: 'DIETA WEGETARIA\u0143SKA',
        message: 'Nie jem mi\u0119sa.\nRyby i inne produkty pochodzenia zwierz\u0119cego s\u0105 w porz\u0105dku.',
        sectionMessage: 'Ponadto nie jem mi\u0119sa.\nRyby i inne produkty pochodzenia zwierz\u0119cego s\u0105 w porz\u0105dku.',
      },
      no_meat_fish: {
        header: 'DIETA WEGETARIA\u0143SKA',
        message: 'Stosuj\u0119 diet\u0119 wegetaria\u0144sk\u0105.\nNie jem mi\u0119sa ani ryb.',
        sectionMessage: 'Ponadto stosuj\u0119 diet\u0119 wegetaria\u0144sk\u0105 i nie jem mi\u0119sa ani ryb.',
      },
      no_animal_products: {
        header: 'DIETA WEGA\u0143SKA',
        message: 'Stosuj\u0119 diet\u0119 wega\u0144sk\u0105.\nNie jem mi\u0119sa, ryb, owoc\u00F3w morza, jaj, nabia\u0142u, miodu ani produkt\u00F3w pochodzenia zwierz\u0119cego.',
        sectionMessage: 'Ponadto stosuj\u0119 diet\u0119 wega\u0144sk\u0105 i nie jem mi\u0119sa, ryb, owoc\u00F3w morza, jaj, nabia\u0142u, miodu ani produkt\u00F3w pochodzenia zwierz\u0119cego.',
      },
      nickel: {
        header: 'ALERGIA NA NIKIEL',
        message: 'Mam alergi\u0119 systemow\u0105 na nikiel. Prosz\u0119 unika\u0107 \u017Cywno\u015Bci bogatej w nikiel:',
        sectionMessage: 'Ponadto mam alergi\u0119 na nikiel. Prosz\u0119 r\u00F3wnie\u017C unika\u0107 \u017Cywno\u015Bci bogatej w nikiel:',
      },
    },
  },
  ru: {
    header: '\u041F\u0420\u041E\u0414\u0423\u041A\u0422\u042B, \u041A\u041E\u0422\u041E\u0420\u042B\u0425 \u0421\u041B\u0415\u0414\u0423\u0415\u0422 \u0418\u0417\u0411\u0415\u0413\u0410\u0422\u042C',
    message: '\u041F\u043E \u0441\u043E\u0441\u0442\u043E\u044F\u043D\u0438\u044E \u0437\u0434\u043E\u0440\u043E\u0432\u044C\u044F \u043C\u043D\u0435 \u043D\u0435\u043E\u0431\u0445\u043E\u0434\u0438\u043C\u043E \u0438\u0437\u0431\u0435\u0433\u0430\u0442\u044C \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432:',
    dietModes: {
      pregnancy: {
        header: '\u0411\u0415\u0420\u0415\u041C\u0415\u041D\u041D\u041E\u0421\u0422\u042C',
        message: '\u042F \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u043C\u043E\u044F \u0435\u0434\u0430 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0445 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432:',
        sectionMessage: '\u041A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E, \u0438\u0437-\u0437\u0430 \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u043E\u0441\u0442\u0438 \u043C\u043D\u0435 \u0442\u0430\u043A\u0436\u0435 \u0441\u043B\u0435\u0434\u0443\u0435\u0442 \u0438\u0437\u0431\u0435\u0433\u0430\u0442\u044C:',
      },
      no_meat: {
        header: '\u0412\u0415\u0413\u0415\u0422\u0410\u0420\u0418\u0410\u041D\u0421\u041A\u0410\u042F \u0414\u0418\u0415\u0422\u0410',
        message: '\u042F \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E.\n\u0420\u044B\u0431\u0430 \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0436\u0438\u0432\u043E\u0442\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442.',
        sectionMessage: '\u041A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E, \u044F \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E.\n\u0420\u044B\u0431\u0430 \u0438 \u0434\u0440\u0443\u0433\u0438\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0436\u0438\u0432\u043E\u0442\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F \u043F\u043E\u0434\u0445\u043E\u0434\u044F\u0442.',
      },
      no_meat_fish: {
        header: '\u0412\u0415\u0413\u0415\u0422\u0410\u0420\u0418\u0410\u041D\u0421\u041A\u0410\u042F \u0414\u0418\u0415\u0422\u0410',
        message: '\u042F \u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0441\u044C \u0432\u0435\u0433\u0435\u0442\u0430\u0440\u0438\u0430\u043D\u0441\u043A\u043E\u0439 \u0434\u0438\u0435\u0442\u044B.\n\u042F \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E \u0438 \u0440\u044B\u0431\u0443.',
        sectionMessage: '\u041A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E, \u044F \u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0441\u044C \u0432\u0435\u0433\u0435\u0442\u0430\u0440\u0438\u0430\u043D\u0441\u043A\u043E\u0439 \u0434\u0438\u0435\u0442\u044B \u0438 \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E \u0438 \u0440\u044B\u0431\u0443.',
      },
      no_animal_products: {
        header: '\u0412\u0415\u0413\u0410\u041D\u0421\u041A\u0410\u042F \u0414\u0418\u0415\u0422\u0410',
        message: '\u042F \u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0441\u044C \u0432\u0435\u0433\u0430\u043D\u0441\u043A\u043E\u0439 \u0434\u0438\u0435\u0442\u044B.\n\u042F \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E, \u0440\u044B\u0431\u0443, \u043C\u043E\u0440\u0435\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B, \u044F\u0439\u0446\u0430, \u043C\u043E\u043B\u043E\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B, \u043C\u0451\u0434 \u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0436\u0438\u0432\u043E\u0442\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F.',
        sectionMessage: '\u041A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E, \u044F \u043F\u0440\u0438\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044E\u0441\u044C \u0432\u0435\u0433\u0430\u043D\u0441\u043A\u043E\u0439 \u0434\u0438\u0435\u0442\u044B \u0438 \u043D\u0435 \u0435\u043C \u043C\u044F\u0441\u043E, \u0440\u044B\u0431\u0443, \u043C\u043E\u0440\u0435\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B, \u044F\u0439\u0446\u0430, \u043C\u043E\u043B\u043E\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B, \u043C\u0451\u0434 \u0438 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B \u0436\u0438\u0432\u043E\u0442\u043D\u043E\u0433\u043E \u043F\u0440\u043E\u0438\u0441\u0445\u043E\u0436\u0434\u0435\u043D\u0438\u044F.',
      },
      nickel: {
        header: '\u0410\u041B\u041B\u0415\u0420\u0413\u0418\u042F \u041D\u0410 \u041D\u0418\u041A\u0415\u041B\u042C',
        message: '\u0423 \u043C\u0435\u043D\u044F \u0441\u0438\u0441\u0442\u0435\u043C\u043D\u0430\u044F \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u044F \u043D\u0430 \u043D\u0438\u043A\u0435\u043B\u044C. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0438\u0437\u0431\u0435\u0433\u0430\u0439\u0442\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0441 \u0432\u044B\u0441\u043E\u043A\u0438\u043C \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435\u043C \u043D\u0438\u043A\u0435\u043B\u044F:',
        sectionMessage: '\u041A\u0440\u043E\u043C\u0435 \u0442\u043E\u0433\u043E, \u0443 \u043C\u0435\u043D\u044F \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u044F \u043D\u0430 \u043D\u0438\u043A\u0435\u043B\u044C. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0438\u0437\u0431\u0435\u0433\u0430\u0439\u0442\u0435 \u0442\u0430\u043A\u0436\u0435 \u043F\u0440\u043E\u0434\u0443\u043A\u0442\u043E\u0432 \u0441 \u0432\u044B\u0441\u043E\u043A\u0438\u043C \u0441\u043E\u0434\u0435\u0440\u0436\u0430\u043D\u0438\u0435\u043C \u043D\u0438\u043A\u0435\u043B\u044F:',
      },
    },
  },
  sv: {
    header: 'LIVSMEDEL ATT UNDVIKA',
    message: 'Av h\u00E4lsosk\u00E4l m\u00E5ste jag undvika f\u00F6ljande livsmedel:',
    dietModes: {
      pregnancy: {
        header: 'GRAVIDITET',
        message: 'Jag \u00E4r gravid. V\u00E4nligen se till att min mat inte inneh\u00E5ller f\u00F6ljande:',
        sectionMessage: 'Dessutom, p\u00E5 grund av min graviditet, m\u00E5ste jag ocks\u00E5 undvika:',
      },
      no_meat: {
        header: 'VEGETARISK KOST',
        message: 'Jag \u00E4ter inte k\u00F6tt.\nFisk och andra animaliska produkter \u00E4r okej.',
        sectionMessage: 'Dessutom \u00E4ter jag inte k\u00F6tt.\nFisk och andra animaliska produkter \u00E4r okej.',
      },
      no_meat_fish: {
        header: 'VEGETARISK KOST',
        message: 'Jag f\u00F6ljer en vegetarisk kost.\nJag \u00E4ter inte k\u00F6tt eller fisk.',
        sectionMessage: 'Dessutom f\u00F6ljer jag en vegetarisk kost och \u00E4ter inte k\u00F6tt eller fisk.',
      },
      no_animal_products: {
        header: 'VEGANSK KOST',
        message: 'Jag f\u00F6ljer en vegansk kost.\nJag \u00E4ter inte k\u00F6tt, fisk, skaldjur, \u00E4gg, mejeriprodukter, honung eller animaliska produkter.',
        sectionMessage: 'Dessutom f\u00F6ljer jag en vegansk kost och \u00E4ter inte k\u00F6tt, fisk, skaldjur, \u00E4gg, mejeriprodukter, honung eller animaliska produkter.',
      },
      nickel: {
        header: 'NICKELALLERGI',
        message: 'Jag har en systemisk nickelallergi. Undvik nickelrika livsmedel:',
        sectionMessage: 'Dessutom har jag en nickelallergi. Undvik \u00E4ven nickelrika livsmedel:',
      },
    },
  },
  zh: {
    header: '\u9700\u8981\u907F\u514D\u7684\u98DF\u7269',
    message: '\u51FA\u4E8E\u5065\u5EB7\u539F\u56E0\uFF0C\u6211\u9700\u8981\u907F\u514D\u4EE5\u4E0B\u98DF\u7269\uFF1A',
    dietModes: {
      pregnancy: {
        header: '\u6000\u5B55',
        message: '\u6211\u6000\u5B55\u4E86\u3002\u8BF7\u786E\u4FDD\u6211\u7684\u98DF\u7269\u4E0D\u542B\u4EE5\u4E0B\u6210\u5206\uFF1A',
        sectionMessage: '\u6B64\u5916\uFF0C\u7531\u4E8E\u6000\u5B55\uFF0C\u6211\u8FD8\u9700\u8981\u907F\u514D\uFF1A',
      },
      no_meat: {
        header: '\u7D20\u98DF\u996E\u98DF',
        message: '\u6211\u4E0D\u5403\u8089\u7C7B\u3002\n\u9C7C\u7C7B\u548C\u5176\u4ED6\u52A8\u7269\u4EA7\u54C1\u53EF\u4EE5\u3002',
        sectionMessage: '\u6B64\u5916\uFF0C\u6211\u4E0D\u5403\u8089\u7C7B\u3002\n\u9C7C\u7C7B\u548C\u5176\u4ED6\u52A8\u7269\u4EA7\u54C1\u53EF\u4EE5\u3002',
      },
      no_meat_fish: {
        header: '\u7D20\u98DF\u996E\u98DF',
        message: '\u6211\u9075\u5FAA\u7D20\u98DF\u996E\u98DF\u3002\n\u6211\u4E0D\u5403\u8089\u7C7B\u548C\u9C7C\u7C7B\u3002',
        sectionMessage: '\u6B64\u5916\uFF0C\u6211\u9075\u5FAA\u7D20\u98DF\u996E\u98DF\uFF0C\u4E0D\u5403\u8089\u7C7B\u548C\u9C7C\u7C7B\u3002',
      },
      no_animal_products: {
        header: '\u7EAF\u7D20\u996E\u98DF',
        message: '\u6211\u9075\u5FAA\u7EAF\u7D20\u996E\u98DF\u3002\n\u6211\u4E0D\u5403\u8089\u7C7B\u3001\u9C7C\u7C7B\u3001\u6D77\u9C9C\u3001\u86CB\u7C7B\u3001\u4E73\u5236\u54C1\u3001\u8702\u871C\u548C\u4EFB\u4F55\u52A8\u7269\u5236\u54C1\u3002',
        sectionMessage: '\u6B64\u5916\uFF0C\u6211\u9075\u5FAA\u7EAF\u7D20\u996E\u98DF\uFF0C\u4E0D\u5403\u8089\u7C7B\u3001\u9C7C\u7C7B\u3001\u6D77\u9C9C\u3001\u86CB\u7C7B\u3001\u4E73\u5236\u54C1\u3001\u8702\u871C\u548C\u4EFB\u4F55\u52A8\u7269\u5236\u54C1\u3002',
      },
      nickel: {
        header: '\u954D\u8FC7\u654F',
        message: '\u6211\u6709\u5168\u8EAB\u6027\u954D\u8FC7\u654F\u3002\u8BF7\u907F\u514D\u542B\u954D\u91CF\u9AD8\u7684\u98DF\u7269\uFF1A',
        sectionMessage: '\u6B64\u5916\uFF0C\u6211\u6709\u954D\u8FC7\u654F\u3002\u8BF7\u4E5F\u907F\u514D\u542B\u954D\u91CF\u9AD8\u7684\u98DF\u7269\uFF1A',
      },
    },
  },
  ja: {
    header: '\u907F\u3051\u308B\u3079\u304D\u98DF\u54C1',
    message: '\u5065\u5EB7\u4E0A\u306E\u7406\u7531\u304B\u3089\u3001\u4EE5\u4E0B\u306E\u98DF\u54C1\u3092\u907F\u3051\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\uFF1A',
    dietModes: {
      pregnancy: {
        header: '\u598A\u5A20\u4E2D',
        message: '\u598A\u5A20\u4E2D\u3067\u3059\u3002\u4EE5\u4E0B\u306E\u98DF\u54C1\u304C\u542B\u307E\u308C\u3066\u3044\u306A\u3044\u3053\u3068\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\uFF1A',
        sectionMessage: '\u3055\u3089\u306B\u3001\u598A\u5A20\u4E2D\u306E\u305F\u3081\u3001\u4EE5\u4E0B\u3082\u907F\u3051\u308B\u5FC5\u8981\u304C\u3042\u308A\u307E\u3059\uFF1A',
      },
      no_meat: {
        header: '\u30D9\u30B8\u30BF\u30EA\u30A2\u30F3\u98DF',
        message: '\u8089\u306F\u98DF\u3079\u307E\u305B\u3093\u3002\n\u9B5A\u3084\u305D\u306E\u4ED6\u306E\u52D5\u7269\u6027\u98DF\u54C1\u306F\u5927\u4E08\u592B\u3067\u3059\u3002',
        sectionMessage: '\u307E\u305F\u3001\u8089\u306F\u98DF\u3079\u307E\u305B\u3093\u3002\n\u9B5A\u3084\u305D\u306E\u4ED6\u306E\u52D5\u7269\u6027\u98DF\u54C1\u306F\u5927\u4E08\u592B\u3067\u3059\u3002',
      },
      no_meat_fish: {
        header: '\u30D9\u30B8\u30BF\u30EA\u30A2\u30F3\u98DF',
        message: '\u30D9\u30B8\u30BF\u30EA\u30A2\u30F3\u306E\u98DF\u4E8B\u3092\u3057\u3066\u3044\u307E\u3059\u3002\n\u8089\u3068\u9B5A\u306F\u98DF\u3079\u307E\u305B\u3093\u3002',
        sectionMessage: '\u307E\u305F\u3001\u30D9\u30B8\u30BF\u30EA\u30A2\u30F3\u306E\u98DF\u4E8B\u3092\u3057\u3066\u304A\u308A\u3001\u8089\u3068\u9B5A\u306F\u98DF\u3079\u307E\u305B\u3093\u3002',
      },
      no_animal_products: {
        header: '\u30F4\u30A3\u30FC\u30AC\u30F3\u98DF',
        message: '\u30F4\u30A3\u30FC\u30AC\u30F3\u306E\u98DF\u4E8B\u3092\u3057\u3066\u3044\u307E\u3059\u3002\n\u8089\u3001\u9B5A\u3001\u6D77\u9BAE\u3001\u5375\u3001\u4E73\u88FD\u54C1\u3001\u8702\u871C\u3001\u52D5\u7269\u7531\u6765\u306E\u98DF\u54C1\u306F\u98DF\u3079\u307E\u305B\u3093\u3002',
        sectionMessage: '\u307E\u305F\u3001\u30F4\u30A3\u30FC\u30AC\u30F3\u306E\u98DF\u4E8B\u3092\u3057\u3066\u304A\u308A\u3001\u8089\u3001\u9B5A\u3001\u6D77\u9BAE\u3001\u5375\u3001\u4E73\u88FD\u54C1\u3001\u8702\u871C\u3001\u52D5\u7269\u7531\u6765\u306E\u98DF\u54C1\u306F\u98DF\u3079\u307E\u305B\u3093\u3002',
      },
      nickel: {
        header: '\u30CB\u30C3\u30B1\u30EB\u30A2\u30EC\u30EB\u30AE\u30FC',
        message: '\u5168\u8EAB\u6027\u30CB\u30C3\u30B1\u30EB\u30A2\u30EC\u30EB\u30AE\u30FC\u304C\u3042\u308A\u307E\u3059\u3002\u30CB\u30C3\u30B1\u30EB\u542B\u6709\u91CF\u306E\u9AD8\u3044\u98DF\u54C1\u3092\u907F\u3051\u3066\u304F\u3060\u3055\u3044\uFF1A',
        sectionMessage: '\u307E\u305F\u3001\u30CB\u30C3\u30B1\u30EB\u30A2\u30EC\u30EB\u30AE\u30FC\u304C\u3042\u308A\u307E\u3059\u3002\u30CB\u30C3\u30B1\u30EB\u542B\u6709\u91CF\u306E\u9AD8\u3044\u98DF\u54C1\u3082\u907F\u3051\u3066\u304F\u3060\u3055\u3044\uFF1A',
      },
    },
  },
  ko: {
    header: '\uD53C\uD574\uC57C \uD560 \uC74C\uC2DD',
    message: '\uAC74\uAC15\uC0C1\uC758 \uC774\uC720\uB85C \uB2E4\uC74C \uC74C\uC2DD\uC744 \uD53C\uD574\uC57C \uD569\uB2C8\uB2E4:',
    dietModes: {
      pregnancy: {
        header: '\uC784\uC2E0',
        message: '\uC784\uC2E0 \uC911\uC785\uB2C8\uB2E4. \uC81C \uC74C\uC2DD\uC5D0 \uB2E4\uC74C\uC774 \uD3EC\uD568\uB418\uC9C0 \uC54A\uB3C4\uB85D \uD574\uC8FC\uC138\uC694:',
        sectionMessage: '\uB610\uD55C, \uC784\uC2E0\uC73C\uB85C \uC778\uD574 \uB2E4\uC74C\uB3C4 \uD53C\uD574\uC57C \uD569\uB2C8\uB2E4:',
      },
      no_meat: {
        header: '\uCC44\uC2DD \uC2DD\uB2E8',
        message: '\uACE0\uAE30\uB97C \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\uC0DD\uC120\uACFC \uAE30\uD0C0 \uB3D9\uBB3C\uC131 \uC2DD\uD488\uC740 \uAD1C\uCC2E\uC2B5\uB2C8\uB2E4.',
        sectionMessage: '\uB610\uD55C, \uACE0\uAE30\uB97C \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.\n\uC0DD\uC120\uACFC \uAE30\uD0C0 \uB3D9\uBB3C\uC131 \uC2DD\uD488\uC740 \uAD1C\uCC2E\uC2B5\uB2C8\uB2E4.',
      },
      no_meat_fish: {
        header: '\uCC44\uC2DD \uC2DD\uB2E8',
        message: '\uCC44\uC2DD \uC2DD\uB2E8\uC744 \uB530\uB974\uACE0 \uC788\uC2B5\uB2C8\uB2E4.\n\uACE0\uAE30\uC640 \uC0DD\uC120\uC744 \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
        sectionMessage: '\uB610\uD55C, \uCC44\uC2DD \uC2DD\uB2E8\uC744 \uB530\uB974\uACE0 \uC788\uC73C\uBA70 \uACE0\uAE30\uC640 \uC0DD\uC120\uC744 \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
      },
      no_animal_products: {
        header: '\uBE44\uAC74 \uC2DD\uB2E8',
        message: '\uBE44\uAC74 \uC2DD\uB2E8\uC744 \uB530\uB974\uACE0 \uC788\uC2B5\uB2C8\uB2E4.\n\uACE0\uAE30, \uC0DD\uC120, \uD574\uC0B0\uBB3C, \uB2EC\uAC78, \uC720\uC81C\uD488, \uAF40 \uBC0F \uB3D9\uBB3C\uC131 \uC81C\uD488\uC744 \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
        sectionMessage: '\uB610\uD55C, \uBE44\uAC74 \uC2DD\uB2E8\uC744 \uB530\uB974\uACE0 \uC788\uC73C\uBA70 \uACE0\uAE30, \uC0DD\uC120, \uD574\uC0B0\uBB3C, \uB2EC\uAC78, \uC720\uC81C\uD488, \uAF40 \uBC0F \uB3D9\uBB3C\uC131 \uC81C\uD488\uC744 \uBA39\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.',
      },
      nickel: {
        header: '\uB2C8\uCF08 \uC54C\uB808\uB974\uAE30',
        message: '\uC804\uC2E0\uC131 \uB2C8\uCF08 \uC54C\uB808\uB974\uAE30\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uB2C8\uCF08 \uD568\uB7C9\uC774 \uB192\uC740 \uC74C\uC2DD\uC744 \uD53C\uD574\uC8FC\uC138\uC694:',
        sectionMessage: '\uB610\uD55C, \uB2C8\uCF08 \uC54C\uB808\uB974\uAE30\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uB2C8\uCF08 \uD568\uB7C9\uC774 \uB192\uC740 \uC74C\uC2DD\uB3C4 \uD53C\uD574\uC8FC\uC138\uC694:',
      },
    },
  },
  th: {
    header: '\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07',
    message: '\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E2A\u0E38\u0E02\u0E20\u0E32\u0E1E \u0E09\u0E31\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49:',
    dietModes: {
      pregnancy: {
        header: '\u0E15\u0E31\u0E49\u0E07\u0E04\u0E23\u0E23\u0E20\u0E4C',
        message: '\u0E09\u0E31\u0E19\u0E15\u0E31\u0E49\u0E07\u0E04\u0E23\u0E23\u0E20\u0E4C \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E19\u0E48\u0E43\u0E08\u0E27\u0E48\u0E32\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E34\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49:',
        sectionMessage: '\u0E19\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E19\u0E35\u0E49 \u0E40\u0E19\u0E37\u0E48\u0E2D\u0E07\u0E08\u0E32\u0E01\u0E15\u0E31\u0E49\u0E07\u0E04\u0E23\u0E23\u0E20\u0E4C \u0E09\u0E31\u0E19\u0E15\u0E49\u0E2D\u0E07\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E2A\u0E34\u0E48\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49\u0E14\u0E49\u0E27\u0E22:',
      },
      no_meat: {
        header: '\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E21\u0E31\u0E07\u0E2A\u0E27\u0E34\u0E23\u0E31\u0E15\u0E34',
        message: '\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C\n\u0E1B\u0E25\u0E32\u0E41\u0E25\u0E30\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E32\u0E01\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E2D\u0E37\u0E48\u0E19\u0E46 \u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E23',
        sectionMessage: '\u0E19\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E19\u0E35\u0E49 \u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C\n\u0E1B\u0E25\u0E32\u0E41\u0E25\u0E30\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E32\u0E01\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E2D\u0E37\u0E48\u0E19\u0E46 \u0E44\u0E21\u0E48\u0E40\u0E1B\u0E47\u0E19\u0E44\u0E23',
      },
      no_meat_fish: {
        header: '\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E21\u0E31\u0E07\u0E2A\u0E27\u0E34\u0E23\u0E31\u0E15\u0E34',
        message: '\u0E09\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E21\u0E31\u0E07\u0E2A\u0E27\u0E34\u0E23\u0E31\u0E15\u0E34\n\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E41\u0E25\u0E30\u0E1B\u0E25\u0E32',
        sectionMessage: '\u0E19\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E19\u0E35\u0E49 \u0E09\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E21\u0E31\u0E07\u0E2A\u0E27\u0E34\u0E23\u0E31\u0E15\u0E34\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C\u0E41\u0E25\u0E30\u0E1B\u0E25\u0E32',
      },
      no_animal_products: {
        header: '\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E27\u0E35\u0E41\u0E01\u0E19',
        message: '\u0E09\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E27\u0E35\u0E41\u0E01\u0E19\n\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C \u0E1B\u0E25\u0E32 \u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E30\u0E40\u0E25 \u0E44\u0E02\u0E48 \u0E19\u0E21 \u0E19\u0E49\u0E33\u0E1C\u0E36\u0E49\u0E07 \u0E41\u0E25\u0E30\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E32\u0E01\u0E2A\u0E31\u0E15\u0E27\u0E4C',
        sectionMessage: '\u0E19\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E19\u0E35\u0E49 \u0E09\u0E31\u0E19\u0E23\u0E31\u0E1A\u0E1B\u0E23\u0E30\u0E17\u0E32\u0E19\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E27\u0E35\u0E41\u0E01\u0E19\u0E41\u0E25\u0E30\u0E44\u0E21\u0E48\u0E01\u0E34\u0E19\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C \u0E1B\u0E25\u0E32 \u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E30\u0E40\u0E25 \u0E44\u0E02\u0E48 \u0E19\u0E21 \u0E19\u0E49\u0E33\u0E1C\u0E36\u0E49\u0E07 \u0E41\u0E25\u0E30\u0E1C\u0E25\u0E34\u0E15\u0E20\u0E31\u0E13\u0E11\u0E4C\u0E08\u0E32\u0E01\u0E2A\u0E31\u0E15\u0E27\u0E4C',
      },
      nickel: {
        header: '\u0E41\u0E1E\u0E49\u0E19\u0E34\u0E01\u0E40\u0E01\u0E34\u0E25',
        message: '\u0E09\u0E31\u0E19\u0E41\u0E1E\u0E49\u0E19\u0E34\u0E01\u0E40\u0E01\u0E34\u0E25\u0E17\u0E31\u0E48\u0E27\u0E23\u0E48\u0E32\u0E07\u0E01\u0E32\u0E22 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E21\u0E35\u0E19\u0E34\u0E01\u0E40\u0E01\u0E34\u0E25\u0E2A\u0E39\u0E07:',
        sectionMessage: '\u0E19\u0E2D\u0E01\u0E08\u0E32\u0E01\u0E19\u0E35\u0E49 \u0E09\u0E31\u0E19\u0E41\u0E1E\u0E49\u0E19\u0E34\u0E01\u0E40\u0E01\u0E34\u0E25 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E2B\u0E25\u0E35\u0E01\u0E40\u0E25\u0E35\u0E48\u0E22\u0E07\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E35\u0E48\u0E21\u0E35\u0E19\u0E34\u0E01\u0E40\u0E01\u0E34\u0E25\u0E2A\u0E39\u0E07\u0E14\u0E49\u0E27\u0E22:',
      },
    },
  },
  ar: {
    header: '\u0623\u0637\u0639\u0645\u0629 \u064A\u062C\u0628 \u062A\u062C\u0646\u0628\u0647\u0627',
    message: '\u0644\u0623\u0633\u0628\u0627\u0628 \u0635\u062D\u064A\u0629\u060C \u0623\u062D\u062A\u0627\u062C \u0625\u0644\u0649 \u062A\u062C\u0646\u0628 \u0627\u0644\u0623\u0637\u0639\u0645\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629:',
    dietModes: {
      pregnancy: {
        header: '\u0627\u0644\u062D\u0645\u0644',
        message: '\u0623\u0646\u0627 \u062D\u0627\u0645\u0644. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0637\u0639\u0627\u0645\u064A \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0645\u0627 \u064A\u0644\u064A:',
        sectionMessage: '\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0630\u0644\u0643\u060C \u0628\u0633\u0628\u0628 \u062D\u0645\u0644\u064A\u060C \u064A\u062C\u0628 \u0623\u064A\u0636\u064B\u0627 \u062A\u062C\u0646\u0628:',
      },
      no_meat: {
        header: '\u0646\u0638\u0627\u0645 \u063A\u0630\u0627\u0626\u064A \u0646\u0628\u0627\u062A\u064A',
        message: '\u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645.\n\u0627\u0644\u0623\u0633\u0645\u0627\u0643 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u0627\u0646\u064A\u0629 \u0627\u0644\u0623\u062E\u0631\u0649 \u0645\u0642\u0628\u0648\u0644\u0629.',
        sectionMessage: '\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0630\u0644\u0643\u060C \u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645.\n\u0627\u0644\u0623\u0633\u0645\u0627\u0643 \u0648\u0627\u0644\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u062D\u064A\u0648\u0627\u0646\u064A\u0629 \u0627\u0644\u0623\u062E\u0631\u0649 \u0645\u0642\u0628\u0648\u0644\u0629.',
      },
      no_meat_fish: {
        header: '\u0646\u0638\u0627\u0645 \u063A\u0630\u0627\u0626\u064A \u0646\u0628\u0627\u062A\u064A',
        message: '\u0623\u062A\u0628\u0639 \u0646\u0638\u0627\u0645\u064B\u0627 \u063A\u0630\u0627\u0626\u064A\u064B\u0627 \u0646\u0628\u0627\u062A\u064A\u064B\u0627.\n\u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0643.',
        sectionMessage: '\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0630\u0644\u0643\u060C \u0623\u062A\u0628\u0639 \u0646\u0638\u0627\u0645\u064B\u0627 \u063A\u0630\u0627\u0626\u064A\u064B\u0627 \u0646\u0628\u0627\u062A\u064A\u064B\u0627 \u0648\u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0643.',
      },
      no_animal_products: {
        header: '\u0646\u0638\u0627\u0645 \u063A\u0630\u0627\u0626\u064A \u0646\u0628\u0627\u062A\u064A \u0635\u0631\u0641',
        message: '\u0623\u062A\u0628\u0639 \u0646\u0638\u0627\u0645\u064B\u0627 \u063A\u0630\u0627\u0626\u064A\u064B\u0627 \u0646\u0628\u0627\u062A\u064A\u064B\u0627 \u0635\u0631\u0641\u064B\u0627.\n\u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0643 \u0648\u0627\u0644\u0645\u0623\u0643\u0648\u0644\u0627\u062A \u0627\u0644\u0628\u062D\u0631\u064A\u0629 \u0648\u0627\u0644\u0628\u064A\u0636 \u0648\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646 \u0648\u0627\u0644\u0639\u0633\u0644 \u0648\u0623\u064A \u0645\u0646\u062A\u062C\u0627\u062A \u062D\u064A\u0648\u0627\u0646\u064A\u0629.',
        sectionMessage: '\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0630\u0644\u0643\u060C \u0623\u062A\u0628\u0639 \u0646\u0638\u0627\u0645\u064B\u0627 \u063A\u0630\u0627\u0626\u064A\u064B\u0627 \u0646\u0628\u0627\u062A\u064A\u064B\u0627 \u0635\u0631\u0641\u064B\u0627 \u0648\u0644\u0627 \u0622\u0643\u0644 \u0627\u0644\u0644\u062D\u0648\u0645 \u0648\u0627\u0644\u0623\u0633\u0645\u0627\u0643 \u0648\u0627\u0644\u0645\u0623\u0643\u0648\u0644\u0627\u062A \u0627\u0644\u0628\u062D\u0631\u064A\u0629 \u0648\u0627\u0644\u0628\u064A\u0636 \u0648\u0645\u0646\u062A\u062C\u0627\u062A \u0627\u0644\u0623\u0644\u0628\u0627\u0646 \u0648\u0627\u0644\u0639\u0633\u0644 \u0648\u0623\u064A \u0645\u0646\u062A\u062C\u0627\u062A \u062D\u064A\u0648\u0627\u0646\u064A\u0629.',
      },
      nickel: {
        header: '\u062D\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0646\u064A\u0643\u0644',
        message: '\u0644\u062F\u064A \u062D\u0633\u0627\u0633\u064A\u0629 \u062C\u0647\u0627\u0632\u064A\u0629 \u0644\u0644\u0646\u064A\u0643\u0644. \u064A\u0631\u062C\u0649 \u062A\u062C\u0646\u0628 \u0627\u0644\u0623\u0637\u0639\u0645\u0629 \u0627\u0644\u063A\u0646\u064A\u0629 \u0628\u0627\u0644\u0646\u064A\u0643\u0644:',
        sectionMessage: '\u0628\u0627\u0644\u0625\u0636\u0627\u0641\u0629 \u0625\u0644\u0649 \u0630\u0644\u0643\u060C \u0644\u062F\u064A \u062D\u0633\u0627\u0633\u064A\u0629 \u0644\u0644\u0646\u064A\u0643\u0644. \u064A\u0631\u062C\u0649 \u0623\u064A\u0636\u064B\u0627 \u062A\u062C\u0646\u0628 \u0627\u0644\u0623\u0637\u0639\u0645\u0629 \u0627\u0644\u063A\u0646\u064A\u0629 \u0628\u0627\u0644\u0646\u064A\u0643\u0644:',
      },
    },
  },
};

export const CARD_TRANSLATIONS: Record<Language, CardTranslation> = {
  it: {
    header: 'ATTENZIONE',
    subtitle: 'ALLERGIE ALIMENTARI',
    pregnancySubtitle: 'GRAVIDANZA E ALLERGIE ALIMENTARI',
    message: 'Ho le seguenti allergie alimentari. Per favore, assicuratevi che il mio cibo non contenga questi ingredienti, anche per contaminazione crociata.',
    pregnancyMessage: 'Sono in gravidanza e ho le seguenti allergie alimentari. Per favore, assicuratevi che il mio cibo non contenga questi ingredienti, anche per contaminazione crociata.',
    thanks: 'Vi ringrazio molto per la vostra comprensione e il vostro aiuto.',
    tapToSee: 'Tocca per vedere esempi',
    examples: 'Esempi:',
  },
  en: {
    header: 'ATTENTION',
    subtitle: 'FOOD ALLERGIES',
    pregnancySubtitle: 'PREGNANCY & FOOD ALLERGIES',
    message: 'I have the following food allergies. Please ensure my food does not contain these ingredients, including through cross-contamination.',
    pregnancyMessage: 'I am pregnant and I have the following food allergies. Please ensure my food does not contain these ingredients, including through cross-contamination.',
    thanks: 'Thank you so much for your understanding and your help.',
    tapToSee: 'Tap to see examples',
    examples: 'Examples:',
  },
  fr: {
    header: 'ATTENTION',
    subtitle: 'ALLERGIES ALIMENTAIRES',
    pregnancySubtitle: 'GROSSESSE ET ALLERGIES ALIMENTAIRES',
    message: 'J\'ai les allergies alimentaires suivantes. Veuillez vous assurer que ma nourriture ne contient pas ces ingr\u00E9dients, y compris par contamination crois\u00E9e.',
    pregnancyMessage: 'Je suis enceinte et j\'ai les allergies alimentaires suivantes. Veuillez vous assurer que ma nourriture ne contient pas ces ingr\u00E9dients, y compris par contamination crois\u00E9e.',
    thanks: 'Je vous remercie beaucoup pour votre compr\u00E9hension et votre aide.',
    tapToSee: 'Appuyez pour voir des exemples',
    examples: 'Exemples:',
  },
  de: {
    header: 'ACHTUNG',
    subtitle: 'LEBENSMITTELALLERGIEN',
    pregnancySubtitle: 'SCHWANGERSCHAFT & LEBENSMITTELALLERGIEN',
    message: 'Ich habe die folgenden Lebensmittelallergien. Bitte stellen Sie sicher, dass mein Essen diese Zutaten nicht enth\u00E4lt, auch nicht durch Kreuzkontamination.',
    pregnancyMessage: 'Ich bin schwanger und habe die folgenden Lebensmittelallergien. Bitte stellen Sie sicher, dass mein Essen diese Zutaten nicht enth\u00E4lt, auch nicht durch Kreuzkontamination.',
    thanks: 'Ich danke Ihnen sehr f\u00FCr Ihr Verst\u00E4ndnis und Ihre Hilfe.',
    tapToSee: 'Tippen f\u00FCr Beispiele',
    examples: 'Beispiele:',
  },
  es: {
    header: 'ATENCI\u00D3N',
    subtitle: 'ALERGIAS ALIMENTARIAS',
    pregnancySubtitle: 'EMBARAZO Y ALERGIAS ALIMENTARIAS',
    message: 'Tengo las siguientes alergias alimentarias. Por favor, aseg\u00FArese de que mi comida no contenga estos ingredientes, incluso por contaminaci\u00F3n cruzada.',
    pregnancyMessage: 'Estoy embarazada y tengo las siguientes alergias alimentarias. Por favor, aseg\u00FArese de que mi comida no contenga estos ingredientes, incluso por contaminaci\u00F3n cruzada.',
    thanks: 'Les agradezco mucho su comprensi\u00F3n y su ayuda.',
    tapToSee: 'Toca para ver ejemplos',
    examples: 'Ejemplos:',
  },
  pt: {
    header: 'ATEN\u00C7\u00C3O',
    subtitle: 'ALERGIAS ALIMENTARES',
    pregnancySubtitle: 'GRAVIDEZ E ALERGIAS ALIMENTARES',
    message: 'Tenho as seguintes alergias alimentares. Por favor, certifique-se de que a minha comida n\u00E3o cont\u00E9m estes ingredientes, incluindo por contamina\u00E7\u00E3o cruzada.',
    pregnancyMessage: 'Estou gr\u00E1vida e tenho as seguintes alergias alimentares. Por favor, certifique-se de que a minha comida n\u00E3o cont\u00E9m estes ingredientes, incluindo por contamina\u00E7\u00E3o cruzada.',
    thanks: 'Agrade\u00E7o muito a vossa compreens\u00E3o e a vossa ajuda.',
    tapToSee: 'Toque para ver exemplos',
    examples: 'Exemplos:',
  },
  nl: {
    header: 'LET OP',
    subtitle: 'VOEDSELALLERGIEN',
    pregnancySubtitle: 'ZWANGERSCHAP & VOEDSELALLERGIEN',
    message: 'Ik heb de volgende voedselallergieën. Zorg ervoor dat mijn eten deze ingrediënten niet bevat, ook niet door kruisbesmetting.',
    pregnancyMessage: 'Ik ben zwanger en ik heb de volgende voedselallergieën. Zorg ervoor dat mijn eten deze ingrediënten niet bevat, ook niet door kruisbesmetting.',
    thanks: 'Hartelijk dank voor uw begrip en uw hulp.',
    tapToSee: 'Tik voor voorbeelden',
    examples: 'Voorbeelden:',
  },
  pl: {
    header: 'UWAGA',
    subtitle: 'ALERGIE POKARMOWE',
    pregnancySubtitle: 'CI\u0104\u017BA I ALERGIE POKARMOWE',
    message: 'Mam nast\u0119puj\u0105ce alergie pokarmowe. Prosz\u0119 upewni\u0107 si\u0119, \u017Ce moje jedzenie nie zawiera tych sk\u0142adnik\u00F3w, r\u00F3wnie\u017C w wyniku zanieczyszczenia krzy\u017Cowego.',
    pregnancyMessage: 'Jestem w ci\u0105\u017Cy i mam nast\u0119puj\u0105ce alergie pokarmowe. Prosz\u0119 upewni\u0107 si\u0119, \u017Ce moje jedzenie nie zawiera tych sk\u0142adnik\u00F3w, r\u00F3wnie\u017C w wyniku zanieczyszczenia krzy\u017Cowego.',
    thanks: 'Bardzo dzi\u0119kuj\u0119 za zrozumienie i pomoc.',
    tapToSee: 'Dotknij, aby zobaczy\u0107 przyk\u0142ady',
    examples: 'Przyk\u0142ady:',
  },
  ru: {
    header: '\u0412\u041D\u0418\u041C\u0410\u041D\u0418\u0415',
    subtitle: '\u041F\u0418\u0429\u0415\u0412\u0410\u042F \u0410\u041B\u041B\u0415\u0420\u0413\u0418\u042F',
    pregnancySubtitle: '\u0411\u0415\u0420\u0415\u041C\u0415\u041D\u041D\u041E\u0421\u0422\u042C \u0418 \u041F\u0418\u0429\u0415\u0412\u0410\u042F \u0410\u041B\u041B\u0415\u0420\u0413\u0418\u042F',
    message: '\u0423 \u043C\u0435\u043D\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u043C\u043E\u044F \u0435\u0434\u0430 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u044D\u0442\u0438\u0445 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432, \u0432 \u0442\u043E\u043C \u0447\u0438\u0441\u043B\u0435 \u0438\u0437-\u0437\u0430 \u043F\u0435\u0440\u0435\u043A\u0440\u0451\u0441\u0442\u043D\u043E\u0433\u043E \u0437\u0430\u0433\u0440\u044F\u0437\u043D\u0435\u043D\u0438\u044F.',
    pregnancyMessage: '\u042F \u0431\u0435\u0440\u0435\u043C\u0435\u043D\u043D\u0430 \u0438 \u0443 \u043C\u0435\u043D\u044F \u0441\u043B\u0435\u0434\u0443\u044E\u0449\u0438\u0435 \u043F\u0438\u0449\u0435\u0432\u044B\u0435 \u0430\u043B\u043B\u0435\u0440\u0433\u0438\u0438. \u041F\u043E\u0436\u0430\u043B\u0443\u0439\u0441\u0442\u0430, \u0443\u0431\u0435\u0434\u0438\u0442\u0435\u0441\u044C, \u0447\u0442\u043E \u043C\u043E\u044F \u0435\u0434\u0430 \u043D\u0435 \u0441\u043E\u0434\u0435\u0440\u0436\u0438\u0442 \u044D\u0442\u0438\u0445 \u0438\u043D\u0433\u0440\u0435\u0434\u0438\u0435\u043D\u0442\u043E\u0432, \u0432 \u0442\u043E\u043C \u0447\u0438\u0441\u043B\u0435 \u0438\u0437-\u0437\u0430 \u043F\u0435\u0440\u0435\u043A\u0440\u0451\u0441\u0442\u043D\u043E\u0433\u043E \u0437\u0430\u0433\u0440\u044F\u0437\u043D\u0435\u043D\u0438\u044F.',
    thanks: '\u0411\u043E\u043B\u044C\u0448\u043E\u0435 \u0441\u043F\u0430\u0441\u0438\u0431\u043E \u0437\u0430 \u0432\u0430\u0448\u0435 \u043F\u043E\u043D\u0438\u043C\u0430\u043D\u0438\u0435 \u0438 \u043F\u043E\u043C\u043E\u0449\u044C.',
    tapToSee: '\u041D\u0430\u0436\u043C\u0438\u0442\u0435 \u0434\u043B\u044F \u043F\u0440\u0438\u043C\u0435\u0440\u043E\u0432',
    examples: '\u041F\u0440\u0438\u043C\u0435\u0440\u044B:',
  },
  sv: {
    header: 'OBSERVERA',
    subtitle: 'MATALLERGIER',
    pregnancySubtitle: 'GRAVIDITET & MATALLERGIER',
    message: 'Jag har f\u00F6ljande matallergier. V\u00E4nligen se till att min mat inte inneh\u00E5ller dessa ingredienser, inte heller genom korskontaminering.',
    pregnancyMessage: 'Jag \u00E4r gravid och har f\u00F6ljande matallergier. V\u00E4nligen se till att min mat inte inneh\u00E5ller dessa ingredienser, inte heller genom korskontaminering.',
    thanks: 'Tack s\u00E5 mycket f\u00F6r er f\u00F6rst\u00E5else och er hj\u00E4lp.',
    tapToSee: 'Tryck f\u00F6r exempel',
    examples: 'Exempel:',
  },
  zh: {
    header: '\u6CE8\u610F',
    subtitle: '\u98DF\u7269\u8FC7\u654F',
    pregnancySubtitle: '\u6000\u5B55\u4E0E\u98DF\u7269\u8FC7\u654F',
    message: '\u6211\u6709\u4EE5\u4E0B\u98DF\u7269\u8FC7\u654F\u3002\u8BF7\u786E\u4FDD\u6211\u7684\u98DF\u7269\u4E0D\u542B\u8FD9\u4E9B\u6210\u5206\uFF0C\u5305\u62EC\u907F\u514D\u4EA4\u53C9\u6C61\u67D3\u3002',
    pregnancyMessage: '\u6211\u6000\u5B55\u4E86\uFF0C\u5E76\u4E14\u6709\u4EE5\u4E0B\u98DF\u7269\u8FC7\u654F\u3002\u8BF7\u786E\u4FDD\u6211\u7684\u98DF\u7269\u4E0D\u542B\u8FD9\u4E9B\u6210\u5206\uFF0C\u5305\u62EC\u907F\u514D\u4EA4\u53C9\u6C61\u67D3\u3002',
    thanks: '\u975E\u5E38\u611F\u8C22\u60A8\u7684\u7406\u89E3\u548C\u5E2E\u52A9\u3002',
    tapToSee: '\u70B9\u51FB\u67E5\u770B\u793A\u4F8B',
    examples: '\u4F8B\u5982\uFF1A',
  },
  ja: {
    header: '\u6CE8\u610F',
    subtitle: '\u98DF\u7269\u30A2\u30EC\u30EB\u30AE\u30FC',
    pregnancySubtitle: '\u598A\u5A20\u4E2D\u30FB\u98DF\u7269\u30A2\u30EC\u30EB\u30AE\u30FC',
    message: '\u79C1\u306F\u4EE5\u4E0B\u306E\u98DF\u7269\u30A2\u30EC\u30EB\u30AE\u30FC\u304C\u3042\u308A\u307E\u3059\u3002\u4EA4\u5DEE\u6C5A\u67D3\u3092\u542B\u3081\u3001\u79C1\u306E\u98DF\u4E8B\u306B\u3053\u308C\u3089\u306E\u98DF\u6750\u304C\u542B\u307E\u308C\u3066\u3044\u306A\u3044\u3053\u3068\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002',
    pregnancyMessage: '\u598A\u5A20\u4E2D\u3067\u3042\u308A\u3001\u4EE5\u4E0B\u306E\u98DF\u7269\u30A2\u30EC\u30EB\u30AE\u30FC\u304C\u3042\u308A\u307E\u3059\u3002\u4EA4\u5DEE\u6C5A\u67D3\u3092\u542B\u3081\u3001\u79C1\u306E\u98DF\u4E8B\u306B\u3053\u308C\u3089\u306E\u98DF\u6750\u304C\u542B\u307E\u308C\u3066\u3044\u306A\u3044\u3053\u3068\u3092\u3054\u78BA\u8A8D\u304F\u3060\u3055\u3044\u3002',
    thanks: '\u3054\u7406\u89E3\u3068\u3054\u5354\u529B\u306B\u5FC3\u304B\u3089\u611F\u8B1D\u3044\u305F\u3057\u307E\u3059\u3002',
    tapToSee: '\u30BF\u30C3\u30D7\u3057\u3066\u4F8B\u3092\u898B\u308B',
    examples: '\u4F8B\uFF1A',
  },
  ko: {
    header: '\uC8FC\uC758',
    subtitle: '\uC2DD\uD488 \uC54C\uB808\uB974\uAE30',
    pregnancySubtitle: '\uC784\uC2E0 \uBC0F \uC2DD\uD488 \uC54C\uB808\uB974\uAE30',
    message: '\uC800\uB294 \uB2E4\uC74C\uACFC \uAC19\uC740 \uC2DD\uD488 \uC54C\uB808\uB974\uAE30\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uAD50\uCC28 \uC624\uC5FC\uC744 \uD3EC\uD568\uD558\uC5EC \uC81C \uC74C\uC2DD\uC5D0 \uC774\uB7EC\uD55C \uC7AC\uB8CC\uAC00 \uD3EC\uD568\uB418\uC9C0 \uC54A\uB3C4\uB85D \uD574\uC8FC\uC138\uC694.',
    pregnancyMessage: '\uC784\uC2E0 \uC911\uC774\uBA70 \uB2E4\uC74C\uACFC \uAC19\uC740 \uC2DD\uD488 \uC54C\uB808\uB974\uAE30\uAC00 \uC788\uC2B5\uB2C8\uB2E4. \uAD50\uCC28 \uC624\uC5FC\uC744 \uD3EC\uD568\uD558\uC5EC \uC81C \uC74C\uC2DD\uC5D0 \uC774\uB7EC\uD55C \uC7AC\uB8CC\uAC00 \uD3EC\uD568\uB418\uC9C0 \uC54A\uB3C4\uB85D \uD574\uC8FC\uC138\uC694.',
    thanks: '\uC774\uD574\uC640 \uB3C4\uC6C0\uC5D0 \uC9C4\uC2EC\uC73C\uB85C \uAC10\uC0AC\uB4DC\uB9BD\uB2C8\uB2E4.',
    tapToSee: '\uC608\uC2DC\uB97C \uBCF4\uB824\uBA74 \uD0ED\uD558\uC138\uC694',
    examples: '\uC608\uC2DC:',
  },
  th: {
    header: '\u0E42\u0E1B\u0E23\u0E14\u0E17\u0E23\u0E32\u0E1A',
    subtitle: '\u0E41\u0E1E\u0E49\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    pregnancySubtitle: '\u0E15\u0E31\u0E49\u0E07\u0E04\u0E23\u0E23\u0E20\u0E4C\u0E41\u0E25\u0E30\u0E41\u0E1E\u0E49\u0E2D\u0E32\u0E2B\u0E32\u0E23',
    message: '\u0E09\u0E31\u0E19\u0E21\u0E35\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E41\u0E1E\u0E49\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E14\u0E31\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E19\u0E48\u0E43\u0E08\u0E27\u0E48\u0E32\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E48\u0E27\u0E19\u0E1C\u0E2A\u0E21\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E35\u0E49 \u0E23\u0E27\u0E21\u0E16\u0E36\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E19\u0E40\u0E1B\u0E37\u0E49\u0E2D\u0E19\u0E02\u0E49\u0E32\u0E21',
    pregnancyMessage: '\u0E09\u0E31\u0E19\u0E15\u0E31\u0E49\u0E07\u0E04\u0E23\u0E23\u0E20\u0E4C\u0E41\u0E25\u0E30\u0E21\u0E35\u0E2D\u0E32\u0E01\u0E32\u0E23\u0E41\u0E1E\u0E49\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E14\u0E31\u0E07\u0E15\u0E48\u0E2D\u0E44\u0E1B\u0E19\u0E35\u0E49 \u0E01\u0E23\u0E38\u0E13\u0E32\u0E15\u0E23\u0E27\u0E08\u0E2A\u0E2D\u0E1A\u0E43\u0E2B\u0E49\u0E41\u0E19\u0E48\u0E43\u0E08\u0E27\u0E48\u0E32\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E02\u0E2D\u0E07\u0E09\u0E31\u0E19\u0E44\u0E21\u0E48\u0E21\u0E35\u0E2A\u0E48\u0E27\u0E19\u0E1C\u0E2A\u0E21\u0E40\u0E2B\u0E25\u0E48\u0E32\u0E19\u0E35\u0E49 \u0E23\u0E27\u0E21\u0E16\u0E36\u0E07\u0E01\u0E32\u0E23\u0E1B\u0E19\u0E40\u0E1B\u0E37\u0E49\u0E2D\u0E19\u0E02\u0E49\u0E32\u0E21',
    thanks: '\u0E02\u0E2D\u0E1A\u0E04\u0E38\u0E13\u0E21\u0E32\u0E01\u0E2A\u0E33\u0E2B\u0E23\u0E31\u0E1A\u0E04\u0E27\u0E32\u0E21\u0E40\u0E02\u0E49\u0E32\u0E43\u0E08\u0E41\u0E25\u0E30\u0E04\u0E27\u0E32\u0E21\u0E0A\u0E48\u0E27\u0E22\u0E40\u0E2B\u0E25\u0E37\u0E2D\u0E02\u0E2D\u0E07\u0E04\u0E38\u0E13',
    tapToSee: '\u0E41\u0E15\u0E30\u0E40\u0E1E\u0E37\u0E48\u0E2D\u0E14\u0E39\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07',
    examples: '\u0E15\u0E31\u0E27\u0E2D\u0E22\u0E48\u0E32\u0E07:',
  },
  ar: {
    header: '\u062A\u0646\u0628\u064A\u0647',
    subtitle: '\u062D\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0637\u0639\u0627\u0645',
    pregnancySubtitle: '\u0627\u0644\u062D\u0645\u0644 \u0648\u062D\u0633\u0627\u0633\u064A\u0629 \u0627\u0644\u0637\u0639\u0627\u0645',
    message: '\u0644\u062F\u064A \u062D\u0633\u0627\u0633\u064A\u0629 \u0645\u0646 \u0627\u0644\u0623\u0637\u0639\u0645\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0637\u0639\u0627\u0645\u064A \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A\u060C \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u0627\u0644\u062A\u0644\u0648\u062B \u0627\u0644\u0645\u062A\u0628\u0627\u062F\u0644.',
    pregnancyMessage: '\u0623\u0646\u0627 \u062D\u0627\u0645\u0644 \u0648\u0644\u062F\u064A \u062D\u0633\u0627\u0633\u064A\u0629 \u0645\u0646 \u0627\u0644\u0623\u0637\u0639\u0645\u0629 \u0627\u0644\u062A\u0627\u0644\u064A\u0629. \u064A\u0631\u062C\u0649 \u0627\u0644\u062A\u0623\u0643\u062F \u0645\u0646 \u0623\u0646 \u0637\u0639\u0627\u0645\u064A \u0644\u0627 \u064A\u062D\u062A\u0648\u064A \u0639\u0644\u0649 \u0647\u0630\u0647 \u0627\u0644\u0645\u0643\u0648\u0646\u0627\u062A\u060C \u0628\u0645\u0627 \u0641\u064A \u0630\u0644\u0643 \u0627\u0644\u062A\u0644\u0648\u062B \u0627\u0644\u0645\u062A\u0628\u0627\u062F\u0644.',
    thanks: '\u0623\u0634\u0643\u0631\u0643\u0645 \u062C\u0632\u064A\u0644 \u0627\u0644\u0634\u0643\u0631 \u0639\u0644\u0649 \u062A\u0641\u0647\u0645\u0643\u0645 \u0648\u0645\u0633\u0627\u0639\u062F\u062A\u0643\u0645.',
    tapToSee: '\u0627\u0636\u063A\u0637 \u0644\u0631\u0624\u064A\u0629 \u0627\u0644\u0623\u0645\u062B\u0644\u0629',
    examples: '\u0623\u0645\u062B\u0644\u0629:',
  },
};

export const DIET_FOOD_TRANSLATIONS: Record<Language, Record<DietFoodItem, string>> = {
  it: { meat: 'Carne', fish: 'Pesce', seafood: 'Frutti di mare', eggs: 'Uova', dairy: 'Latticini', honey: 'Miele' },
  en: { meat: 'Meat', fish: 'Fish', seafood: 'Seafood', eggs: 'Eggs', dairy: 'Dairy', honey: 'Honey' },
  fr: { meat: 'Viande', fish: 'Poisson', seafood: 'Fruits de mer', eggs: '\u0152ufs', dairy: 'Produits laitiers', honey: 'Miel' },
  de: { meat: 'Fleisch', fish: 'Fisch', seafood: 'Meeresfr\u00FCchte', eggs: 'Eier', dairy: 'Milchprodukte', honey: 'Honig' },
  es: { meat: 'Carne', fish: 'Pescado', seafood: 'Mariscos', eggs: 'Huevos', dairy: 'L\u00E1cteos', honey: 'Miel' },
  pt: { meat: 'Carne', fish: 'Peixe', seafood: 'Frutos do mar', eggs: 'Ovos', dairy: 'Latic\u00EDnios', honey: 'Mel' },
  nl: { meat: 'Vlees', fish: 'Vis', seafood: 'Zeevruchten', eggs: 'Eieren', dairy: 'Zuivel', honey: 'Honing' },
  pl: { meat: 'Mi\u0119so', fish: 'Ryby', seafood: 'Owoce morza', eggs: 'Jaja', dairy: 'Nabia\u0142', honey: 'Mi\u00F3d' },
  ru: { meat: '\u041C\u044F\u0441\u043E', fish: '\u0420\u044B\u0431\u0430', seafood: '\u041C\u043E\u0440\u0435\u043F\u0440\u043E\u0434\u0443\u043A\u0442\u044B', eggs: '\u042F\u0439\u0446\u0430', dairy: '\u041C\u043E\u043B\u043E\u0447\u043D\u044B\u0435 \u043F\u0440\u043E\u0434.', honey: '\u041C\u0451\u0434' },
  sv: { meat: 'K\u00F6tt', fish: 'Fisk', seafood: 'Skaldjur', eggs: '\u00C4gg', dairy: 'Mejeriprodukter', honey: 'Honung' },
  zh: { meat: '\u8089\u7C7B', fish: '\u9C7C\u7C7B', seafood: '\u6D77\u9C9C', eggs: '\u86CB\u7C7B', dairy: '\u4E73\u5236\u54C1', honey: '\u8702\u871C' },
  ja: { meat: '\u8089', fish: '\u9B5A', seafood: '\u6D77\u9BAE', eggs: '\u5375', dairy: '\u4E73\u88FD\u54C1', honey: '\u8702\u871C' },
  ko: { meat: '\uACE0\uAE30', fish: '\uC0DD\uC120', seafood: '\uD574\uC0B0\uBB3C', eggs: '\uB2EC\uAC78', dairy: '\uC720\uC81C\uD488', honey: '\uAF40' },
  th: { meat: '\u0E40\u0E19\u0E37\u0E49\u0E2D\u0E2A\u0E31\u0E15\u0E27\u0E4C', fish: '\u0E1B\u0E25\u0E32', seafood: '\u0E2D\u0E32\u0E2B\u0E32\u0E23\u0E17\u0E30\u0E40\u0E25', eggs: '\u0E44\u0E02\u0E48', dairy: '\u0E19\u0E21', honey: '\u0E19\u0E49\u0E33\u0E1C\u0E36\u0E49\u0E07' },
  ar: { meat: '\u0627\u0644\u0644\u062D\u0648\u0645', fish: '\u0627\u0644\u0623\u0633\u0645\u0627\u0643', seafood: '\u0627\u0644\u0645\u0623\u0643\u0648\u0644\u0627\u062A \u0627\u0644\u0628\u062D\u0631\u064A\u0629', eggs: '\u0627\u0644\u0628\u064A\u0636', dairy: '\u0627\u0644\u0623\u0644\u0628\u0627\u0646', honey: '\u0627\u0644\u0639\u0633\u0644' },
};
