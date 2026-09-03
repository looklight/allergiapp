const it = {
  common: {
    appName: 'AllergiApp Partner',
    loading: 'Caricamento…',
    comingSoon: 'In arrivo',
    signOut: 'Esci',
    save: 'Salva',
    cancel: 'Annulla',
    edit: 'Modifica',
    delete: 'Elimina',
    close: 'Chiudi',
  },
  // Stato delle scritture, visibile su ogni schermata
  saving: {
    inProgress: 'Salvataggio…',
    done: 'Salvato',
    failed: 'Alcune modifiche non sono state salvate.',
    retry: 'Riprova',
    leaveWarning: 'Ci sono modifiche non salvate.',
  },
  nav: {
    home: 'Home',
    dishes: 'Piatti',
    menus: 'Menù',
    // Due etichette per la stessa voce: sulla barra in basso del telefono
    // "Scheda AllergiApp" verrebbe tagliata a metà parola
    card: 'Scheda AllergiApp',
    cardShort: 'Scheda',
    subscriptions: 'Abbonamenti',
    account: 'Account',
  },
  login: {
    subtitle: 'Il portale per i ristoratori',
    // Il titolo sopra il modulo: dice cosa si sta per fare. Il nome del
    // portale lo porta già il marchio in cima alla pagina.
    signInTitle: 'Entra nel portale',
    signUpSubtitle: 'Crea il tuo profilo partner',
    signUpIntro:
      'Il profilo partner è separato dall’account dell’app AllergiApp: puoi usare la stessa email.',
    firstName: 'Nome',
    lastName: 'Cognome',
    email: 'Email',
    password: 'Password',
    passwordHint: 'Almeno 8 caratteri.',
    // La stessa regola dentro l'etichetta del campo: minuscola e senza punto
    // perché segue "Password ·", non apre una frase. /account usa l'altra.
    passwordRule: 'almeno 8 caratteri',
    passwordTooShort: 'La password deve avere almeno 8 caratteri.',
    terms: 'Accetto le condizioni d’uso e l’informativa privacy.',
    marketing: 'Voglio ricevere aggiornamenti su AllergiApp Partner.',
    termsRequired: 'Per creare il profilo partner devi accettare le condizioni.',
    existingPassword: 'Password del tuo account AllergiApp',
    continueExisting: 'Prosegui e crea il profilo partner',
    signIn: 'Accedi',
    signUp: 'Crea profilo partner',
    noAccount: 'Non hai un profilo partner?',
    haveAccount: 'Hai già un profilo partner?',
    signUpCta: 'Crea profilo partner',
    signInCta: 'Accedi',
    checkEmail: 'Controlla la tua casella email per confermare la registrazione.',
    // Chi al portale entra una volta al mese la password se la dimentica: è
    // il caso normale, non l'eccezione, e senza questa via l'unica uscita
    // era scriverci.
    forgot: 'Password dimenticata?',
    forgotNeedsEmail: 'Scrivi la tua email qui sopra, poi premi di nuovo.',
    forgotSent:
      'Se questa email ha un account, ti è arrivato un messaggio col link per rientrare. Da lì potrai scegliere la password nuova.',
  },
  // La presentazione del prodotto sulla pagina di accesso (LoginPitch): il
  // portale non ha una pagina pubblica che la faccia, e chi arriva senza
  // sessione altrimenti legge solo "Email" e "Password".
  //
  // Ogni riga dev'essere vera oggi: il filtro RIORDINA e non nasconde, e non
  // si promette nessuna traduzione dei piatti (i nomi restano quelli scritti
  // dal ristoratore).
  pitch: {
    // Il titolo è spezzato dove lo spezzerebbe chi lo legge ad alta voce:
    // una riga per la cosa, una riga per chi ne ha bisogno. Lasciato a una
    // stringa sola, il ritorno a capo cadeva in mezzo a "che si / adatta".
    titleLead: 'Il menù digitale per il tuo locale,',
    titleTail: 'che si adatta a {chi ha un’allergia}.',
    subtitle:
      'Questo è il portale dei ristoratori: qui prepari il menù digitale del tuo locale e lo pubblichi con un indirizzo e un QR tuoi.',
    createTitle: 'Lo crei tu, gratis',
    createText: 'Sezioni, piatti, prezzi e allergeni. Lo cambi quando vuoi.',
    qrTitle: 'Il QR sul tavolo',
    qrText: 'Il cliente inquadra e legge dal suo telefono. Nessuna app da scaricare.',
    filterTitle: 'Il filtro allergeni',
    filterText:
      'Chi ha un’allergia sceglie la sua: il menù mette per primi i piatti che può mangiare.',
    // L'associazione al ristorante NON è ancora attiva (/abbonamenti è un
    // tappo): qui si dice al futuro, o sarebbe una promessa che il portale
    // oggi non mantiene. E si ripete che il menù non dipende da questo —
    // sono due cose indipendenti (DIGITAL_MENU.md, Temi 10 e 16).
    appTitle: 'E si associa ad AllergiApp',
    appText:
      'La scheda del tuo locale dentro l’app, dove si cerca dove mangiare. In arrivo.',
  },
  authErrors: {
    alreadyRegistered:
      'Questa email ha già una credenziale AllergiApp. Inserisci la password del tuo account per proseguire e creare il profilo partner.',
    invalidCredentials: 'Email o password non corretti.',
    emailNotConfirmed: 'Devi confermare la tua email prima di accedere.',
    weakPassword: 'La password non rispetta i requisiti minimi.',
    invalidEmail: 'Controlla l’indirizzo email: non sembra valido.',
    tooManyAttempts: 'Troppi tentativi. Riprova tra qualche minuto.',
    network: 'Connessione assente o instabile. Riprova.',
    generic: 'Qualcosa è andato storto. Riprova.',
  },
  onboarding: {
    title: 'Crea il tuo profilo partner',
    intro:
      'Questo account non ha ancora un profilo partner. Il profilo partner è distinto da quello con cui usi l’app AllergiApp: stessa email, due percorsi separati.',
    signedInAs: 'Stai usando l’email',
    submit: 'Crea profilo partner',
    submitting: 'Creazione…',
    wrongAccount: 'Non è l’account giusto?',
  },
  home: {
    title: 'I tuoi locali',
    intro:
      'Un locale per ogni ristorante che gestisci. Dentro ci sono i link, i piatti da mostrare sulla scheda AllergiApp e i menù che i clienti aprono al tavolo.',
    create: 'Aggiungi locale',
    unnamed: 'Locale senza nome',
    open: 'Apri',
    dishOne: 'piatto',
    dishOther: 'piatti',
    linkOne: 'link',
    linkOther: 'link',
    menuOne: 'menù',
    menuOther: 'menù',
    deleteTitle: 'Eliminare questo locale?',
    deleteBody: 'I link di questo locale andranno persi. I piatti restano nel tuo catalogo.',
    // Con i menù dentro si perde molto di più, e va detto PRIMA: sezioni,
    // ordine e prezzi sono il lavoro di un pomeriggio.
    deleteBodyMenus:
      'Spariscono i link e i menù di questo locale, con le loro sezioni e i loro prezzi. I piatti restano nel tuo catalogo, e finché il messaggio di annullamento è in piedi puoi rimettere tutto com’era.',
    deleteEmpty: 'Questo locale è ancora vuoto.',
    deleted: 'Locale eliminato',
    undo: 'Annulla',
    notFound: 'Locale non trovato: forse è stato eliminato.',
    rename: 'Rinomina',
    backToList: 'Home',
  },
  // La home: la panoramica di UN locale. Non un percorso a tappe — le tre
  // cose si accendono in qualunque ordine e anche da sole (Tema 16).
  dashboard: {
    greeting: 'Ciao {name}',
    greetingPlain: 'Ciao',
    // Una riga sola, e dice cosa si FA qui: è il pannello del ristoratore, non
    // l'indice di cosa esiste nel portale. Prima elencava le due cose ("il
    // menù e la scheda") — e per giunta come gemelle, che non lo sono più
    // (v. page.tsx): il menù si fa stasera, la scheda aspetta l'associazione.
    // Comincia col dire DOVE si è: il portale è una cosa a parte dall'app, e
    // chi entra la prima volta si è appena registrato da un link — la prima
    // riga che legge deve dirgli che è nel posto giusto. Poi cosa ci si fa.
    intro:
      'Benvenuto nel portale dedicato ai partner di AllergiApp. Da qui prepari il menù digitale del tuo locale, lo pubblichi e lo cambi quando vuoi.',
    switchLabel: 'Locale',
    addVenue: 'Aggiungi un altro locale',
    // Il nome della COSA, non del gesto: la card c'è anche a menù fatto e
    // pubblicato, e "crea" lì sarebbe falso (il gesto sta nel bottone sotto).
    // Il dove — al tavolo — lo dice la riga qui sotto.
    menusTitle: 'Menù digitale',
    menusHint: 'I clienti lo aprono al tavolo col QR, senza scaricare niente.',
    menusEmpty: 'Non ancora creato',
    menusOpen: 'Apri l’editor',
    menusCreate: 'Crea il menù',
    menusAll: 'Tutti i menù',
    cardTitle: 'Scheda AllergiApp',
    cardHint: 'La tua pagina dentro l’app: compare quando associ il locale a un ristorante.',
    cardEmpty: 'Ancora niente dentro',
    cardLink: 'Associa il locale',
    cardOpen: 'Apri la scheda',
    dishesChosen: 'piatti scelti',
    dishChosen: 'piatto scelto',
    quickDish: 'Nuovo piatto',
    dishUnnamed: 'Piatto senza nome',
    quickLinks: 'Link e contatti',
    // Lo stato del menù non è quanti piatti ha dentro: è cosa leggono i
    // clienti al tavolo adesso (v. page.tsx).
    liveOn: 'in sala, aggiornato',
    livePending: 'da pubblicare',
    liveNever: 'non pubblicato',
    sectionOne: 'sezione',
    sectionOther: 'sezioni',
    catalogTitle: 'Catalogo piatti',
    catalogHint: 'I piatti sono tuoi: gli stessi vanno nel menù e sulla scheda.',
    catalogOpen: 'Vedi tutti',
    statusReady: 'pronto',
    statusDraft: 'da finire',
    statusTodo: 'da fare',
    statusOn: 'attiva',
    statusOff: 'non attiva',
    deleteVenue: 'Elimina questo locale',
    emptyTitle: 'Non hai ancora nessun locale.',
    emptyHint: 'Creane uno: il nome è quello che i tuoi clienti leggeranno in cima al menù.',
  },
  newVenue: {
    title: 'Nuovo locale',
    nameHint: 'Lo leggono i tuoi clienti in cima al menù. Puoi cambiarlo quando vuoi dalla lista.',
    how: 'Come funziona?',
    step1: 'Aggiungi i tuoi link e scegli i piatti da mostrare',
    step2: 'Lo associ al tuo ristorante già presente su AllergiApp',
    sampleDishes: ['Spaghetti alla carbonara', 'Insalata di mare', 'Tiramisù'],
    yourVenue: 'Il tuo locale',
    venueOnApp: 'Il tuo ristorante su AllergiApp',
  },
  editor: {
    title: 'Scheda AllergiApp',
    draftBadge: 'Bozza privata',
    intro:
      'La pagina di questo locale dentro l’app: i link e i contatti da una parte, i piatti che scegli dall’altra. L’anteprima mostra come apparirà.',
    subsLink: 'Come si associa a un ristorante già su AllergiApp',
    venueNameLabel: 'Nome del locale',
    venueNamePlaceholder: 'Trattoria da Mario',
    dishesTitle: 'Piatti sulla scheda',
    dishesHint: 'Scegli quali piatti del tuo catalogo mostrare sulla scheda. Senza piatti la scheda mostra solo i tuoi link.',
    dishNamePlaceholder: 'Es. Spaghetti alla carbonara',
    dishDescriptionPlaceholder: 'Descrizione (facoltativa): ingredienti principali, preparazione…',
    dishAllergens: 'Allergeni presenti nel piatto',
    // {…} = parte sottolineata nell'interfaccia
    dishAllergensHint:
      'Seleziona gli {allergeni contenuti nel piatto}, come già previsto dal Reg. UE 1169/2011.',
    addLanguage: 'Aggiungi una lingua',
    languagePlaceholder: 'Lingua…',
    removeLanguage: 'Rimuovi questa lingua',
    translationsHint: 'Lasciando un campo vuoto, il cliente legge l’originale.',
    dishTags: 'Compatibilità dichiarate',
    dishTagsHint: 'Indica le compatibilità che puoi garantire sul piatto.',
    declarationNotice:
      'Allergeni e compatibilità che indichi sono una tua dichiarazione: nell’app appaiono come informazione del ristoratore, mai come garanzia di AllergiApp.',
    photoTooBig: 'La foto supera i 10 MB: scegline una più leggera.',
    addPhoto: 'Aggiungi foto',
    changePhoto: 'Cambia foto',
    removePhoto: 'Rimuovi foto',
    photoError: 'Impossibile leggere la foto. Prova con un altro file.',
    photoUploadError: 'La foto non è stata caricata. Controlla la connessione e riprova.',
    cropTitle: 'Scegli il ritaglio',
    cropZoom: 'Ingrandisci',
    cropHint: 'Trascina per scegliere la parte da tenere e ingrandisci per avvicinarti: quello in ombra non viene salvato. Il cerchio è come si vedrà negli elenchi.',
    cropHintSquare: 'Si salva tutta: ingrandisci se vuoi tenerne solo un pezzo.',
    cropConfirm: 'Usa questa',
    simulatorTitle: 'Occhi del visitatore',
    simulatorHint:
      'Seleziona le esigenze di un utente di prova: i piatti nell’anteprima si colorano come li vedrebbe lui.',
    simulatorAllergies: 'Allergie',
    simulatorDiets: 'Esigenze e diete',
    linksTitle: 'Link utili',
    linksHint: 'I link che aggiungi appaiono come pulsanti sulla scheda.',
    linksActive: 'Attivi',
    linksAdd: 'Aggiungi',
    removeLink: 'Rimuovi questo link',
    linkBooking: 'Prenota',
    linkDelivery: 'Delivery',
    linkMenu: 'Menù',
    linkWebsite: 'Sito web',
    linkPlaceholder: 'https://…',
    phonePlaceholder: '+39 06 1234567',
    addPhone: 'Aggiungi telefono',
    addLink: 'Aggiungi link',
    linkFieldLabel: 'Link',
    phoneFieldLabel: 'Telefono',
    deliveryProviderPlaceholder: 'Servizio…',
    providerOther: 'Altro',
    providerOtherName: 'Nome del servizio',
    addDeliveryProvider: 'Aggiungi servizio di delivery',
    deliveryHint: 'Con più servizi, l’utente sceglierà da quale ordinare.',
    menuLanguageDefault: 'Lingua…',
    addMenuLanguage: 'Aggiungi menù in un’altra lingua',
    menuLangHint: 'Ognuno vede il menù nella sua lingua, altrimenti il primo della lista.',
    bookingHint: 'Link, numero di telefono o entrambi.',
    websiteHint: 'Porta al sito del locale.',
    dishesOn: '{on} di {total} accesi su questa scheda',
    manageDishes: 'Gestisci piatti',
    previewButton: 'Anteprima',
    previewCaption: 'Solo piatti e link sono i tuoi: il resto è di esempio.',
  },
  dishes: {
    title: 'I tuoi piatti',
    intro:
      'Il catalogo del tuo ristorante: qui crei e correggi i piatti, poi li scegli per la scheda AllergiApp e li componi nei menù.',
    create: 'Nuovo piatto',
    newTitle: 'Nuovo piatto',
    editTitle: 'Modifica piatto',
    searchPlaceholder: 'Cerca un piatto',
    allCategories: 'Tutte',
    noCategory: 'Senza categoria',
    filters: 'Filtri',
    filtersClear: 'Azzera filtri',
    filterAllergens: 'Contengono',
    filterDiets: 'Indicati per',
    colOn: 'Sulla scheda',
    toggleIn: 'Accendi su',
    colDish: 'Piatto',
    colCategory: 'Categoria',
    colTags: 'Allergeni ed esigenze',
    countOne: 'piatto',
    countOther: 'piatti',
    listingCount: 'schede',
    onNoListing: 'Su nessuna scheda',
    empty: 'Non hai ancora nessun piatto.',
    emptyHint: 'Creane uno: potrai sceglierlo per le tue schede quando vuoi.',
    noResults: 'Nessun piatto corrisponde alla ricerca.',
    listingsLabel: 'Sulle schede',
    // Senza claim non esiste nessuna scheda su cui mostrarli: i comandi
    // spariscono e questa riga dice perché (v. Tema 16)
    needsCard:
      'Per mostrare i piatti serve la scheda AllergiApp: si ottiene associando il locale a un ristorante già presente nell’app.',
    listingsHint: 'Su quali schede AllergiApp appare questo piatto. Puoi cambiarlo anche dal locale.',
    noVenues: 'Non hai ancora locali: creane uno per mostrare i tuoi piatti.',
    deleteTitle: 'Eliminare questo piatto?',
    deleteBody: 'Sparisce dal catalogo, dalle schede in cui è acceso e dai menù in cui l’hai messo.',
    deleted: 'Piatto eliminato',
    undo: 'Annulla',
  },
  menus: {
    title: 'I tuoi menù',
    intro:
      'Il menù che i tuoi clienti aprono al tavolo, costruito con i piatti che hai già in catalogo. Crea le sezioni, scegli i piatti, metti i prezzi.',
    create: 'Nuovo menù',
    // Un menù può non avere nome, e per il primo è la norma: il nome serve
    // a distinguerlo dagli altri, e finché è solo non c'è nessuno da cui.
    // Questo NON viene mai scritto sul menù: è come lo si chiama nelle liste
    // del portale finché il ristoratore non gli dà un nome suo.
    unnamed: 'Menù senza nome',
    // Il ripiego che vede il CLIENTE, che è un'altra cosa: "Menù senza nome"
    // è un'etichetta del portale, e sul tavolo suonerebbe come un difetto.
    // Serve solo se resta un menù senza nome accanto a uno che ce l'ha.
    genericTab: 'Menù',
    forVenue: 'Di quale locale?',
    newVenue: '+ Un altro locale',
    venueNameLabel: 'Nome del locale',
    venuePlaceholder: 'Trattoria da Mario',
    venueHint: 'Compare in cima al menù: lo leggono i tuoi clienti.',
    menuNameLabel: 'Nome del menù',
    menuNameHint: 'Serve a distinguerlo: è la linguetta in alto nella pagina.',
    // "es." davanti: dentro un campo vuoto un nome plausibile si legge come
    // una risposta già data, e chi ha fretta conferma senza scrivere niente.
    menuNamePlaceholder: 'es. Pranzo',
    // Compare SOLO creando il secondo menù di un locale il cui primo non ha
    // nome: è l'istante esatto in cui il nome comincia a servire, e chiederlo
    // prima sarebbe stata una domanda senza motivo.
    existingNameLabel: 'E quello che hai già, come si chiama?',
    existingNameHint:
      'Adesso i menù sono due: al tavolo il cliente li sceglie dalle linguette, quindi servono due nomi.',
    existingNamePlaceholder: 'es. Carta',
    // Tutti i locali hanno già il loro menù: si spiega perché la finestra
    // chiede il nome di un locale invece di quello di un menù
    oneEach: 'Ogni locale ha il suo menù, e i tuoi ce l’hanno già: questo sarà il menù di un nuovo locale.',
    empty: 'Non hai ancora nessun menù.',
    emptyHint: 'Creane uno: i piatti li prendi dal tuo catalogo, senza riscriverli.',
    counts: '{dishes} piatti · {sections} sezioni',
    countsNoSections: '{dishes} piatti',
    deleteTitle: 'Eliminare questo menù?',
    // Stessa promessa che fa già l'eliminazione del locale: quello che si
    // perde, e che per qualche secondo si può ancora rimettere
    deleteBody:
      'Spariscono le sezioni, l’ordine e i prezzi. I piatti restano nel tuo catalogo, e finché il messaggio di annullamento è in piedi puoi rimettere tutto com’era.',
    deleted: 'Menù eliminato',
    undo: 'Annulla',
  },
  menuEditor: {
    back: 'Tutti i menù',
    previewTitle: 'Anteprima',
    previewCaption: 'Come lo vedono i tuoi clienti al tavolo.',
    fullPreview: 'Apri a tutta pagina',
    openLive: 'Apri il menù online',
    // "Indirizzo web" e non "indirizzo": questa riga si legge anche dalla
    // home, lontana dal campo che mostra allergiapp.com/menu/…, e lì
    // "indirizzo" da solo si legge come la via del ristorante.
    liveNoAddress: 'Questo menù non ha ancora un indirizzo web: è il link che si apre col QR.',
    liveNotYet: 'Non ancora pubblicato: questo indirizzo non risponde a nessuno.',
    liveChoose: 'Scegli l’indirizzo',
    fullPreviewNotice: 'Anteprima privata — non è ancora l’indirizzo pubblico del menù.',
    fullPreviewBack: 'Torna all’editor',
    previewEmpty: 'Aggiungi i piatti per vedere il menù.',
    // "Aspetto" e non più "Colore": la scatola tiene anche i due
    // interruttori (foto, descrizioni). E niente "linguette" nelle
    // spiegazioni finché i menù multipli sono spenti (MULTI_MENU): erano
    // rimaste a parlare di una cosa che a schermo non esiste.
    brandTitle: 'Aspetto del menù',
    venueNameLabel: 'Nome del locale',
    venueNamePlaceholder: 'Nome del locale (lo leggono i tuoi clienti)',
    brandHint:
      'Come lo vedono i tuoi clienti al tavolo. Vale per il menù di questo locale.',
    summaryPhotosOff: 'senza foto',
    summaryPhotosSquare: 'foto quadrate',
    summaryPhotosRound: 'foto tonde',
    summaryDescOn: 'con descrizioni',
    cover: 'Copertina',
    coverAdd: 'Aggiungi una copertina',
    coverSample: 'Il nome del locale',
    coverFailed: 'La copertina non è stata caricata. Riprova.',
    headingFont: 'Stile dei testi',
    headingFonts: { modern: 'Moderno', classic: 'Classico', bold: 'Marcato', light: 'Sottile' },
    // L'IMPAGINAZIONE, prima voce della scatola: è la struttura, e tutto
    // quello che c'è sotto la decora. Non riscrive niente (v. MENU_LAYOUTS).
    layout: 'Impaginazione',
    layouts: { row: 'A riga', block: 'A blocco' },
    layoutHints: {
      row: 'Foto, nome e prezzo sulla stessa riga.',
      block: 'Nome, descrizione e prezzo incolonnati, senza foto.',
    },
    // Detto QUI e non scoperto dopo: passando a "a blocco" le foto spariscono
    // dal menù al tavolo, e senza una riga che lo dica sembra che il portale
    // se le sia mangiate. La seconda metà è quella che tranquillizza: non si
    // perde niente.
    layoutNoPhotos:
      'Questa impaginazione non mostra le foto. Restano caricate: tornando “A riga” ricompaiono come le avevi lasciate.',
    // L'altra cosa da sapere prima di sceglierla, non dopo averla scelta.
    layoutWantsDescriptions:
      'Dà il meglio con le descrizioni dei piatti: senza, resta il nome col prezzo sotto.',
    separator: 'Fra i piatti',
    separators: { none: 'Niente', rule: 'Filetto', ornament: 'Ornamento' },
    sectionStyle: 'Titoli delle sezioni',
    sectionStyles: { underline: 'Filetto', banner: 'Fascia', plain: 'Solo testo' },
    // Pacchetti e non un cursore: v. TEXT_SCALES in venues.ts. I nomi dicono
    // com'è la CARTA, non di quanto cambia il testo — un ristoratore sceglie
    // "più fitta" o "più ariosa", non "92%".
    textScale: 'Grandezza dei testi',
    textScales: { compact: 'Compatta', normal: 'Normale', roomy: 'Ampia' },
    // L'altra metà della stessa domanda: quanto è fitta la carta. I nomi
    // dicono com'è il RISULTATO, non di quanto cambia il numero.
    lineHeight: 'Interlinea',
    lineHeights: { tight: 'Stretta', normal: 'Normale', airy: 'Ariosa' },
    // La seconda riga del campioncino: l'interlinea si vede solo fra DUE
    // righe, e una parola sola non mostrerebbe niente.
    lineHeightSample: 'due righe',
    // Sta sotto le tre scelte, e non è un dettaglio tecnico: è la ragione per
    // cui Compatta non rimpicciolisce tutto.
    textScaleFloor: 'La riga degli allergeni non rimpicciolisce: resta leggibile anche con la carta più fitta.',
    // LE FOTO: una scelta sola con tre risposte (migration 711). "Nessuna"
    // non è il contrario delle altre due, è la prima delle tre — e messa in
    // fila si sceglie guardando, come i titoli delle sezioni.
    photos: 'Foto dei piatti',
    photoShapes: { none: 'Nessuna', square: 'Quadrate', round: 'Tonde' },
    // Si dice cosa succede spegnendole, non cosa sono le foto: chi legge sta
    // decidendo, e la domanda che ha in testa è "e se le tolgo?"
    photosHint: 'Senza foto il menù al tavolo è di solo testo. Le foto restano sui piatti e sulla scheda AllergiApp.',
    showDescriptions: 'Mostra le descrizioni sotto ai piatti',
    showDescriptionsHint: 'Spente, si leggono toccando il piatto. Accese, la carta è più alta ma racconta di più.',
    logoAdd: 'Carica il logo',
    logoReplace: 'Sostituisci',
    logoRemove: 'Togli',
    logoAlt: 'Il tuo logo',
    logoLoading: 'Carico…',
    logoTooBig: 'Immagine troppo grande: scegline una più leggera.',
    logoUnreadable: 'Non riesco ad aprire questa immagine: prova con un altro file.',
    logoFailed: 'Il logo non è stato caricato. Riprova.',
    accent: 'Colore',
    notFound: 'Questo menù non esiste.',
    // PUBBLICAZIONE. "Modifiche non pubblicate" e non "non salvate": il
    // lavoro è già al sicuro, quello che manca è il passaggio in sala.
    publish: 'Pubblica le modifiche',
    publishFirst: 'Pubblica il menù',
    publishing: 'Pubblico…',
    publishPending: 'Modifiche non pubblicate: al tavolo c’è ancora la versione precedente.',
    // L'avviso che nomina il rischio, invece di essere l'ennesima scritta
    // grigia: è la mitigazione della scelta di avere una bozza (Tema 24).
    //
    // AGGIUNGE, non sostituisce: dice "modifiche non pubblicate" come l'altro
    // e poi che fra quelle ci sono degli allergeni. Prima diceva solo la
    // seconda cosa, e chi aveva appena cambiato una foto leggeva una frase
    // che sembrava parlare d'altro — mentre invece era vera, per una modifica
    // fatta mezz'ora prima. Il neutro puro non va bene: sarebbe tornare a non
    // dire mai che in ballo c'è un allergene.
    publishAllergens: 'Modifiche non pubblicate, allergeni compresi: al tavolo c’è ancora la versione precedente.',
    // Solo l'aspetto è cambiato. Vale la pena dirlo invece di dire
    // genericamente "modifiche": chi ha scelto un colore mezz'ora fa e legge
    // "modifiche non pubblicate" si mette a cercare cos'altro ha toccato.
    publishAppearance:
      'Modifiche all’aspetto non pubblicate: al tavolo si vede ancora quello di prima.',
    publishNever: 'Questo menù non è ancora pubblicato.',
    publishedOn: 'Pubblicato il {date}',
    // ANNULLARE L'ASPETTO. "Com'è in sala" e non "annulla tutto": quello che
    // torna indietro è solo questa scatola, e il menù non si tocca. Il
    // bottone sta QUI dentro e non accanto a Pubblica, dove sembrerebbe
    // annullare anche i piatti e i prezzi.
    appearanceRevert: 'Rimetti com’è in sala',
    appearanceRevertTitle: 'Rimettere l’aspetto com’è in sala?',
    appearanceRevertBody:
      'Colore, copertina, logo e stili tornano come si vedono adesso al tavolo. Il menù, i piatti e i prezzi non si toccano.',
    appearanceRevertConfirm: 'Rimetti com’era',
    // L'INDIRIZZO PUBBLICO. Che non sia ancora attivo va detto in ogni
    // occasione utile: la cosa da non far succedere è che qualcuno lo stampi
    // su una locandina prima che la pagina esista.
    addressTitle: 'Indirizzo web del menù',
    addressTitleLive: 'Il menù è online',
    // UN'ETICHETTA SOLA, e lo stato lo dice l'interruttore accanto. Prima la
    // pastiglia scriveva "Attivo" o "Inattivo" a seconda dei casi: leggeva
    // come un'etichetta di stato, non come una cosa da premere — e infatti
    // nessuno la premeva.
    addressActive: 'Attivo',
    addressTurnOn: 'Rimetti il menù in sala',
    addressTurnOff: 'Togli il menù dalla sala',
    addressHintOffline:
      'Il link e il QR esistono ma non mostrano il menù: chi li apre legge che non è al momento disponibile. Puoi rimetterlo in sala quando vuoi.',
    addressHintLive:
      'Questo è l’indirizzo che i tuoi clienti aprono col QR. Cambiandolo, i QR già stampati smettono di funzionare.',
    addressHint:
      'È l’indirizzo che finirà sul QR del tavolo. Scegliendolo adesso lo metti al sicuro: la pagina pubblica arriva più avanti.',
    addressNeedName: 'Scrivi prima il nome del locale: l’indirizzo si propone da lì.',
    addressNotChosen: 'Non ancora scelto.',
    addressChecking: 'Controllo…',
    addressFree: 'Libero.',
    addressTaken: 'Questo indirizzo è già di un altro locale.',
    addressInvalid: 'Lettere minuscole, numeri e trattini, da 3 a 60 caratteri.',
    addressUnknown: 'Non è stato possibile controllare adesso.',
    addressChoose: 'Scegli indirizzo',
    addressChange: 'Cambia indirizzo',
    addressSaved: 'Indirizzo salvato.',
    addressFailed: 'Non è stato salvato: qualcuno potrebbe averlo preso in questo momento.',
    // IL QR. Prima versione: l'indirizzo non è ancora attivo, e l'avviso sta
    // attaccato ai bottoni di scarico perché è lì che si sbaglia — un QR
    // stampato non si corregge da remoto.
    qrAlt: 'Il QR del tuo menù',
    qrCopy: 'Copia il link',
    qrCopied: 'Copiato',
    qrPng: 'Scarica il QR',
    qrSvg: 'Versione per la stampa',
    qrWarning:
      'Non stamparlo ancora: l’indirizzo non è attivo e il QR porterebbe a una pagina che non esiste.',
    descriptionPlaceholder: 'Aggiungi una descrizione (facoltativa): orari, un avviso…',
    currency: 'Valuta',
    loose: 'Fuori sezione',
    looseHint: 'Questi piatti compaiono in cima al menù, senza intertitolo.',
    addSection: 'Nuova sezione',
    newSectionName: 'Nuova sezione',
    sectionNamePlaceholder: 'Nome della sezione',
    sectionDescriptionPlaceholder: 'Descrizione della sezione (facoltativa)',
    addNote: 'Blocco di testo',
    noteLabel: 'Blocco di testo',
    noteHint: 'Testo libero fra una sezione e l’altra: lo leggono i tuoi clienti.',
    noteTitlePlaceholder: 'Titolo (facoltativo)',
    noteTextPlaceholder: 'Il pane è fatto in casa. La cucina chiude alle 22:30…',
    deleteNoteTitle: 'Eliminare questo blocco?',
    deleteNoteBody: 'Il testo che contiene viene eliminato.',
    untitledNote: 'Blocco senza titolo',
    addDishes: 'Aggiungi piatti',
    dropHere: 'Trascina qui',
    emptySection: 'Nessun piatto in questa sezione.',
    emptyMenu: 'Questo menù è vuoto.',
    emptyMenuHint: 'Aggiungi i piatti direttamente, oppure crea prima una sezione.',
    pricePlaceholder: 'Prezzo',
    priceLabel: 'Prezzo di {dish}',
    noPrice: 'Senza prezzo',
    highlightOn: 'Metti in evidenza',
    highlightOff: 'Togli evidenza',
    highlightNotePlaceholder: 'Nota (facoltativa): «In offerta», «Consigliato»…',
    highlightNoteLabel: 'Nota per {dish}',
    editDish: 'Modifica {dish}',
    removeItem: 'Togli dal menù',
    moveUp: 'Sposta su',
    moveDown: 'Sposta giù',
    moveToLabel: 'Sposta in',
    deleteSectionTitle: 'Eliminare questa sezione?',
    deleteSectionBody:
      'I {count} piatti che contiene non vengono persi: risalgono fuori sezione, con i loro prezzi.',
    deleteSectionEmptyBody: 'La sezione è vuota, non si perde nessun piatto.',
    pickerTitle: 'Aggiungi piatti',
    pickerCreateNew: 'Nuovo piatto',
    pickerInto: 'in “{section}”',
    pickerIntoLoose: 'fuori sezione',
    pickerSearch: 'Cerca un piatto',
    pickerAlreadyIn: 'Già nel menù',
    pickerConfirm: 'Aggiungi {count}',
    pickerConfirmEmpty: 'Aggiungi',
    pickerNoResults: 'Nessun piatto corrisponde alla ricerca.',
    pickerCatalogEmpty: 'Il tuo catalogo è vuoto.',
    pickerCatalogEmptyHint: 'Crea i piatti dalla pagina Piatti, poi torna qui a comporre il menù.',
    pickerAllIn: 'Tutti i piatti del catalogo sono già in questo menù.',
    conditionsTitle: 'Condizioni al tavolo',
    conditionsHint:
      'In fondo al menù: coperto, servizio, pagamenti. Si scrivono una volta sola e valgono per tutto il menù.',
    conditionsPlaceholder: 'Coperto 2,00 €. Servizio non incluso…',
  },
  // Le stringhe che legge il CLIENTE al tavolo, non il ristoratore. Stanno
  // in una sezione a sé perché la pagina pubblica diventerà un deployable
  // suo (Tema 6) e si porterà via queste, non il resto del portale.
  menuPublic: {
    filterHint: 'Filtra per le tue esigenze',
    filterButton: 'Filtri',
    filterTitle: 'Filtra il menù',
    filterSheetHint: 'I piatti che non vanno bene restano leggibili, in fondo alla loro sezione.',
    filterDiets: 'Esigenze',
    filterAllergens: 'Senza…',
    filterDone: 'Vedi il menù',
    filterDeclared: 'Allergeni e ingredienti dichiarati dal ristorante.',
    filterReset: 'Azzera',
    filterSummary: '{matching} piatti su {total}',
    filterSummaryOne: '{matching} piatto su {total}',
    filterNone: 'Nessun piatto adatto in questa sezione.',
    excludedContains: 'Contiene {list}',
    excludedNotFor: 'Non indicato per {list}',
    dishDetailOpen: 'Vedi {dish}',
    dishDetailPrev: 'Piatto precedente',
    dishDetailNext: 'Piatto successivo',
    dishDetailPhotoDisclaimer: 'L’immagine è indicativa: la presentazione può variare.',
    dishDetailAllergensTitle: 'Allergeni dichiarati',
    dishDetailNoAllergens: 'Nessun allergene dichiarato dal ristorante.',
    dishDetailDietsTitle: 'Adatto a',
  },
  preview: {
    venueName: 'Il tuo ristorante',
    directions: 'Indicazioni',
    reviewsCount: '(8)',
    address: 'Indirizzo del locale',
    cuisine: 'Italiano',
    compat: 'Compatibilità dalle recensioni',
    menuTitle: 'Menù',
    contains: 'Contiene:',
    noAllergensDeclared: 'Nessuno dei 15 allergeni indicato dal ristoratore',
    seeAll: 'Vedi tutto',
    withoutPrefix: 'Senza',
    containsPrefix: 'Contiene',
    notDeclared: 'non indicato',
    orderWith: 'Ordina con',
    bookWith: 'Prenota con',
    bookOnline: 'Prenota online',
    disclaimer:
      'Dichiarato dal ristorante, non verificato da AllergiApp. Verifica sempre con il personale prima di ordinare.',
    reviewsTitle: 'Recensioni',
    sampleReviewerName: 'Giulia',
    sampleReviewDate: '2 settimane fa',
    sampleReviewText:
      'Personale attentissimo alle allergie: hanno controllato ogni ingrediente e mi hanno proposto alternative. Esperienza fantastica!',
    samplePillGreen: 'Senza glutine',
    samplePillAmber: 'Senza lattosio',
  },
  subs: {
    back: 'Account',
    title: 'Abbonamenti',
    intro:
      'Qui assocerai ogni tuo locale al ristorante corrispondente su AllergiApp, cercandolo per nome e città, e terrai d’occhio l’abbonamento che rende visibile la sua scheda nell’app.',
    empty: 'Nessun locale ancora: creane uno dalla sezione Locali.',
    notLinked: 'Non associato',
    noSubscription: 'Nessun abbonamento',
    linkCta: 'Associa al ristorante su AllergiApp',
    notFoundBridge:
      'Non trovi il tuo ristorante? Aggiungilo dall’app AllergiApp, poi torna qui per associarlo.',
  },
  account: {
    title: 'Account',
    email: 'Email',
    language: 'Lingua',
    subsTitle: 'Abbonamenti',
    subsHint:
      'L’associazione dei tuoi locali ai ristoranti su AllergiApp e l’abbonamento che rende visibile la scheda.',
    subsOpen: 'Apri',
    // Dati personali
    profileTitle: 'I tuoi dati',
    profileHint: 'Il nome con cui ti salutiamo qui dentro. I clienti non lo vedono.',
    phone: 'Telefono',
    phoneHint: 'Facoltativo: serve solo a noi, se dobbiamo scriverti per il tuo account.',
    profileSaved: 'Dati aggiornati',
    // Consenso marketing: si toglie con lo stesso gesto con cui si è dato
    marketingTitle: 'Comunicazioni',
    marketingLabel: 'Voglio ricevere aggiornamenti su AllergiApp Partner.',
    marketingHint: 'Puoi cambiare idea quando vuoi: vale da subito.',
    // Password
    passwordTitle: 'Password',
    passwordHint: 'Cambiala quando vuoi. Ti servirà al prossimo accesso.',
    passwordNew: 'Nuova password',
    passwordRepeat: 'Ripeti la password',
    passwordMismatch: 'Le due password non coincidono.',
    passwordChange: 'Cambia password',
    passwordChanged: 'Password aggiornata',
    // Si arriva qui col link della mail di recupero (v. login.forgot)
    passwordFromRecovery: 'Scegli la password nuova: da qui in poi userai questa.',
  },
};

export default it;
