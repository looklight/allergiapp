// Un menù finto, per disegnare la pagina prima che esista il modo di leggerla
// dal database (DIGITAL_MENU.md, fase 2).
//
// ⚠️ SERVE ANCHE DA CONTRATTO. Questa è, campo per campo, la forma che la
// funzione `get_public_menu(slug)` dovrà restituire: quello che c'è qui è
// tutto ciò che il cliente al tavolo può vedere, e niente di più. Il portale
// tiene molte altre colonne (chi è il proprietario, quando è stato scritto,
// le categorie che servono all'app): fuori di qui non escono.
//
// Il piatto arriva GIÀ FUSO con la riga di menù — nome, allergeni, prezzo,
// evidenza tutto insieme — perché al cliente non interessa che esista un
// catalogo: quella è una faccenda del ristoratore.
module.exports = {
  slug: 'trattoria-da-mario',
  venueName: 'Trattoria da Mario',
  // vuoto = compare quello di AllergiApp
  logoUrl: '',
  // uno dei sei colori scelti da noi (MENU_ACCENTS nel portale)
  accent: '#3f3f46',
  // Le due manopole dell'aspetto, scelte dal ristoratore (migration 708).
  // Stanno sul LOCALE come il logo e il colore: al tavolo è una pagina sola.
  showPhotos: true,
  showDescriptions: false,
  tableConditions: 'Coperto 2,00 € a persona · Servizio non incluso\nAccettiamo carte e contanti',
  menu: {
    name: '',
    description: 'Cucina aperta 12:00–14:30 e 19:30–22:30',
    currency: 'EUR',
    groups: [
      {
        kind: 'section',
        name: 'Antipasti',
        description: '',
        items: [
          {
            id: 'a1',
            name: 'Crostini toscani',
            description: 'Pane casereccio, paté di fegatini, burro e capperi.',
            priceCents: 800,
            highlighted: false,
            highlightNote: '',
            allergens: ['gluten', 'milk'],
            diets: [],
            thumbUrl: '',
            photoUrl: '',
          },
          {
            id: 'a2',
            name: 'Panzanella',
            description: 'Pane raffermo, pomodoro, cipolla rossa, basilico.',
            priceCents: 700,
            highlighted: true,
            highlightNote: 'Il piatto dell’estate',
            allergens: ['gluten'],
            diets: ['vegetarian', 'vegan'],
            thumbUrl: '',
            photoUrl: '',
          },
          {
            id: 'a3',
            name: 'Carpaccio di polpo',
            description: '',
            priceCents: 1400,
            highlighted: false,
            highlightNote: '',
            allergens: ['mollusks', 'celery'],
            diets: [],
            thumbUrl: '',
            photoUrl: '',
          },
        ],
      },
      {
        kind: 'note',
        name: 'Il pane è fatto in casa',
        description: 'Lo cuociamo la mattina presto. Se ti serve senza glutine, dillo a chi ti serve: ne teniamo sempre una scorta a parte.',
        items: [],
      },
      {
        kind: 'section',
        name: 'Primi',
        description: 'Pasta fresca tirata a mano ogni mattina',
        items: [
          {
            id: 'p1',
            name: 'Pici cacio e pepe',
            // finte, giusto per vedere l'impaginazione con e senza foto
            description: 'Pici tirati a mano, pecorino toscano, pepe nero.',
            priceCents: 1200,
            highlighted: false,
            highlightNote: '',
            allergens: ['gluten', 'milk'],
            diets: ['vegetarian'],
            thumbUrl: '/images/img_cheese.webp',
            photoUrl: '/images/img_cheese.webp',
          },
          {
            id: 'p2',
            name: 'Ribollita',
            description: 'Cavolo nero, fagioli, pane. Come la faceva mia nonna.',
            priceCents: 1000,
            highlighted: false,
            highlightNote: '',
            allergens: ['gluten', 'celery'],
            diets: ['vegetarian', 'vegan'],
            thumbUrl: '',
            photoUrl: '',
          },
          {
            id: 'p3',
            name: 'Risotto ai funghi porcini',
            description: '',
            priceCents: 1600,
            highlighted: false,
            highlightNote: '',
            allergens: ['milk'],
            diets: ['vegetarian', 'gluten_free'],
            thumbUrl: '',
            photoUrl: '',
          },
        ],
      },
      {
        kind: 'section',
        name: 'Secondi',
        description: '',
        items: [
          {
            id: 's1',
            name: 'Peposo alla fornacina',
            description: 'Manzo, pepe nero, Chianti. Cotto sei ore.',
            priceCents: 1800,
            highlighted: true,
            highlightNote: 'Consigliato dallo chef',
            allergens: ['sulfites'],
            diets: ['gluten_free'],
            thumbUrl: '/images/img_prawn.webp',
            photoUrl: '/images/img_prawn.webp',
          },
          {
            id: 's2',
            name: 'Baccalà con i ceci',
            description: '',
            priceCents: 1700,
            highlighted: false,
            highlightNote: '',
            allergens: ['fish'],
            diets: [],
            thumbUrl: '',
            photoUrl: '',
          },
          {
            id: 's3',
            name: 'Verdure dell’orto alla griglia',
            description: 'Quello che c’è di stagione, con olio nuovo.',
            priceCents: 900,
            highlighted: false,
            highlightNote: '',
            allergens: [],
            diets: ['vegetarian', 'vegan', 'gluten_free'],
            thumbUrl: '',
            photoUrl: '',
          },
        ],
      },
      {
        kind: 'section',
        name: 'Dolci',
        description: '',
        items: [
          {
            id: 'd1',
            name: 'Cantucci e Vin Santo',
            description: '',
            priceCents: 600,
            highlighted: false,
            highlightNote: '',
            allergens: ['gluten', 'eggs', 'nuts', 'sulfites'],
            diets: ['vegetarian'],
            thumbUrl: '',
            photoUrl: '',
          },
          {
            id: 'd2',
            name: 'Sorbetto al limone',
            description: '',
            priceCents: 500,
            highlighted: false,
            highlightNote: '',
            allergens: [],
            diets: ['vegetarian', 'vegan', 'gluten_free'],
            thumbUrl: '',
            photoUrl: '',
          },
        ],
      },
    ],
  },
};
