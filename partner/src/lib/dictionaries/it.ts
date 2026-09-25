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
  },
  nav: {
    home: 'Home',
    dishes: 'Piatti',
    menus: 'Menù',
    // Due etichette per la stessa voce: sulla barra in basso del telefono
    // "Scheda AllergiApp" verrebbe tagliata a metà parola
    card: 'Scheda AllergiApp',
    cardShort: 'Scheda',
    reviews: 'Recensioni',
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
    // Cinque pezzi e non una frase sola: due di essi sono link, e chi
    // accetta deve poter leggere quello che accetta senza perdere il modulo.
    terms: {
      pre: 'Accetto le ',
      termsLink: 'condizioni d’uso',
      mid: ' e l’',
      privacyLink: 'informativa privacy',
      end: '.',
    },
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
  // IL DISTINTIVO PRO, una parola sola per tutt'e due le facce: quella che
  // dice "lo fa l'abbonamento" e quella che dice "questo locale ce l'ha".
  // Il titolo esteso serve a chi la pagina la ascolta: "Pro" da sola non
  // direbbe quale delle due.
  pro: {
    label: 'Pro',
    // Il distintivo viola è un bottone che apre il paywall: dice cosa fa,
    // non come si chiama il piano (19/09). L'ambra resta «Pro».
    upgrade: 'Passa a Pro',
    neededTitle: 'Si prova subito; arriva ai clienti con l’abbonamento',
    activeTitle: 'Questo locale ha l’abbonamento attivo',
  },
  home: {
    create: 'Aggiungi locale',
    unnamed: 'Locale senza nome',
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
      'Spariscono i link e i menù di questo locale, con le loro sezioni e i loro prezzi. I piatti restano nel tuo catalogo, e finché il messaggio di annullamento è in piedi puoi rimettere il locale con i suoi link e i suoi menù.',
    deleteEmpty: 'Questo locale è ancora vuoto.',
    // Il collegamento al ristorante lo approva il nostro team: l'annulla
    // dell'eliminazione non può rimetterlo
    deleteLinked:
      'Si scollega anche dal ristorante, e annullando il collegamento non torna: per riaverlo va richiesto di nuovo.',
    // L'abbonamento è del locale (716): eliminandolo si butterebbe quello che
    // resta del periodo pagato. Lo ferma anche il database (727).
    deleteSubscribedTitle: 'Questo locale ha l’abbonamento attivo',
    deleteSubscribedBody:
      'Un locale con l’abbonamento attivo non si può eliminare. Disdici l’abbonamento da Abbonamenti: alla scadenza potrai eliminarlo.',
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
    addVenue: 'Aggiungi locale',
    // Il nome della COSA, non del gesto: la card c'è anche a menù fatto e
    // pubblicato, e "crea" lì sarebbe falso (il gesto sta nel bottone sotto).
    menusTitle: 'Menù digitale',
    menusOpen: 'Apri l’editor',
    menusCreate: 'Crea il menù',
    menusEmptyWithDishes: 'Hai già {count} {dishes} nel catalogo, pronti da inserire.',
    menusEmptyNoDishes: 'Bastano pochi minuti: potrai sempre modificarlo dopo.',
    menusAll: 'Vedi i menù',
    menusAddressHint: 'Vai alla sezione indirizzo',
    moreActions: 'Altre azioni',
    menusHint: 'Crea il menù digitale che i clienti vedono inquadrando il QR.',
    // Solo con più di un menù (v. page.tsx): "pubblicato" lì sopra nel
    // pallino resta per il locale — se il link esiste ed è raggiungibile —
    // "attivo" qui è un'altra cosa, il singolo menù che entra o no nello
    // scatto (richiesta dell'utente, 13/09).
    menusNoneActive: 'Nessun menù attivo al momento.',
    menusAllActive: 'Hai {count} menù attivi.',
    menusSomeActive: '{active} di {total} menù attivi.',
    cardTitle: 'Scheda AllergiApp',
    cardSubsNone: 'La scheda sarà visibile nell’app dopo aver associato il locale al tuo ristorante.',
    // Chi ha pagato deve LEGGERLO qui, dove guarda ogni giorno: un abbonamento
    // che si vede solo nella pagina dei pagamenti si dimentica, e "sto pagando
    // per cosa?" è la domanda che porta a disdire. Dice anche cosa manca
    // ancora, o sembrerebbe che la scheda sia già nell'app.
    cardSubsActive: 'Abbonamento attivo. La scheda comparirà nell’app appena il locale sarà associato al tuo ristorante.',
    cardSubsActiveLinked: 'Abbonamento attivo: la scheda è visibile nell’app.',
    cardInReview: 'Locale associato: la scheda comparirà nell’app dopo un breve controllo del nostro team.',
    cardSubsManage: 'Gestisci abbonamento',
    cardEmpty: 'Nessun link o piatto inserito.',
    cardOpen: 'Apri la scheda',
    dishesChosen: 'piatti scelti',
    dishChosen: 'piatto scelto',
    quickDish: 'Nuovo piatto',
    dishUnnamed: 'Piatto senza nome',
    // Lo stato del menù non è quanti piatti ha dentro: è cosa leggono i
    // clienti al tavolo adesso (v. page.tsx). Dice SOLO se è live o no — le
    // modifiche non ancora pubblicate le dice l'avviso sotto (menuEditor.publish*),
    // mai questa etichetta: le due notizie mescolate insieme si leggevano
    // come "non è chiaro se è online" (feedback utente, 12/09).
    liveOn: 'pubblicato',
    liveNever: 'non pubblicato',
    catalogTitle: 'Catalogo piatti',
    catalogHint: 'I piatti sono tuoi: gli stessi vanno nel menù e sulla scheda.',
    catalogOpen: 'Vedi tutti',
    statusDraft: 'da finire',
    statusTodo: 'da fare',
    deleteVenue: 'Elimina questo locale',
    emptyTitle: 'Non hai ancora nessun locale.',
    emptyHint: 'Creane uno: il nome è quello che i tuoi clienti leggeranno in cima al menù.',
  },
  newVenue: {
    title: 'Nuovo locale',
    nameHint: 'Lo leggono i tuoi clienti in cima al menù. Puoi cambiarlo quando vuoi dalla lista.',
    how: 'Come funziona?',
    // Il primo blocco: il menù al tavolo (19/09)
    menuTitle: 'Il menù al tavolo',
    menuStep1: 'Prepari il menù digitale e metti il QR sul tavolo',
    menuParts: ['Sezioni', 'Piatti', 'Prezzi', 'Allergeni'],
    menuStep2: 'Il cliente lo apre dal suo telefono e sceglie le sue allergie: vede per primi i piatti che può mangiare',
    // Il secondo: la scheda, coi due passi di prima
    appTitle: 'La scheda su AllergiApp',
    step1: 'Aggiungi i tuoi link e scegli i piatti da mostrare',
    step2: 'Lo associ al tuo ristorante già presente su AllergiApp',
    sampleDishes: ['Spaghetti alla carbonara', 'Insalata di mare', 'Tiramisù'],
    yourVenue: 'Il tuo locale',
    venueOnApp: 'Il tuo ristorante su AllergiApp',
  },
  editor: {
    title: 'Scheda AllergiApp',
    intro:
      'La pagina di {venue} dentro AllergiApp: i link e i contatti da una parte, i piatti che scegli dall’altra. L’anteprima mostra come apparirà.',
    // Il richiamo in cima a una scheda nuova: tre passi (19/09)
    // Il rimando in cima alla sezione dell'associazione, in fondo alla pagina
    goToLink: 'Associazione',
    // I tre passi della pagina, numerati come quelli del menù (21/09)
    step1Title: 'Aggiungi link e contatti',
    step2Title: 'Scegli i piatti da mostrare',
    step3Title: 'Associa il ristorante',
    stepsTitle: 'Per mostrare la scheda nell’app',
    stepPrepare: 'Prepara link e piatti qui sotto: puoi farlo già adesso',
    stepSubscribe: 'Attiva l’abbonamento del locale',
    stepLink: 'Associa il locale al tuo ristorante su AllergiApp e pubblica',
    stepsSeeSubscription: 'Vai agli abbonamenti',
    // Il box in fondo alla pagina: l'ultimo passo, dopo link e piatti
    linkBoxTitle: 'Il tuo ristorante su AllergiApp',
    linkBoxText:
      'Link e piatti sono pronti? Associa il locale al tuo ristorante già presente nell’app: da lì la scheda diventa visibile a chi cerca dove mangiare.',
    linkBoxCta: 'Associa il ristorante',
    // La riga in cima, appena la scheda ha qualcosa dentro (19/09)
    linkBar: 'Bozza salvata. Associa il locale al tuo ristorante per mostrarla nell’app.',
    // PUBBLICARE LA SCHEDA (728): la riga in cima quando la bozza è diversa
    // da quello che l'app mostra. «Non ancora pubblicate» e non «non
    // salvate»: il lavoro è al sicuro, manca il passaggio nell'app.
    publishPending: 'Modifiche non pubblicate',
    publishNever: 'Pronta: pubblicala per metterla online',
    publish: 'Pubblica',
    publishing: 'Pubblico…',
    publishRevert: 'Annulla',
    publishFailed: 'Non pubblicata: alcune modifiche non sono salvate. Riprova.',
    // Sotto la scelta dei piatti, quando non ne è acceso nessuno
    noDishesSelected: 'Nessun piatto scelto: nell’app la sezione dei piatti non compare.',
    // Dopo l'associazione, finché il nostro team non ha controllato (724).
    // Cosa succede e cosa viene dopo; nessun tempo promesso, che non
    // dipende da chi legge.
    reviewTitle: 'In attesa di verifica',
    reviewText:
      'Il locale è associato a {restaurant}. Il nostro team controlla l’associazione: la scheda comparirà nell’app subito dopo. Intanto puoi continuare a prepararla.',
    venueNameLabel: 'Nome del locale',
    venueNamePlaceholder: 'Trattoria da Mario',
    dishesTitle: 'Piatti sulla scheda',
    dishesHint: 'Scegli i piatti del catalogo da mostrare sulla scheda. Senza piatti, la scheda mostra solo link e contatti.',
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
    dishNotes: 'Note sul piatto',
    dishNotesHint: 'Quello che al tavolo va detto. Compaiono accanto al nome, tradotte in ogni lingua.',
    dishNotesLegal: 'Da dichiarare',
    dishNotesUseful: 'Utili al tavolo',
    manageCategories: 'Gestisci…',
    manageCategoriesHint: 'Togli quelle che non usi: non te le proporremo quando scegli la categoria. Restano disponibili, e nessun piatto cambia.',
    manageCategoriesDone: 'Fatto',
    missingCategory: 'Manca una categoria? Scrivici a',
    missingCategorySubject: 'Categoria mancante nel portale',
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
    dishesOn: '{on} di {total} piatti scelti',
    dishesSelectAll: 'Seleziona tutti',
    dishesDeselectAll: 'Deseleziona tutti',
    dishesFilterAll: 'Tutti',
    dishesFilterChosen: 'Solo scelti',
    dishesNoneChosen: 'Nessun piatto scelto per ora.',
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
    colDish: 'Piatto',
    colCategory: 'Categoria',
    colTags: 'Allergeni ed esigenze',
    countOne: 'piatto',
    countOther: 'piatti',
    empty: 'Non hai ancora nessun piatto.',
    emptyHint: 'Creane uno: poi potrai usarlo nei menù e sulla scheda AllergiApp.',
    noResults: 'Nessun piatto corrisponde alla ricerca.',
    deleteTitle: 'Eliminare questo piatto?',
    deleteBody: 'Sparisce dal catalogo, dalle schede in cui è acceso e dai menù in cui l’hai messo.',
    deleted: 'Piatto eliminato',
    // La selezione multipla del catalogo (v. /piatti)
    select: 'Seleziona',
    selectDone: 'Fine',
    selectAll: 'Seleziona tutti',
    deselectAll: 'Deseleziona tutti',
    selectedOne: '1 selezionato',
    selectedCount: '{count} selezionati',
    bulkCategory: 'Sposta in:',
    deleteManyTitle: 'Eliminare {count} piatti?',
    deleteManyBody: 'Spariscono dal catalogo, dalle schede in cui sono scelti e dai menù in cui li hai messi.',
    deletedMany: '{count} piatti eliminati',
    undo: 'Annulla',
  },
  menus: {
    title: 'I tuoi menù digitali',
    intro:
      'I menù che i tuoi clienti aprono al tavolo inquadrando il QR, o dal link. Li costruisci coi piatti che hai già in catalogo: crea le sezioni, scegli i piatti, metti i prezzi.',
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
    // L'etichetta resta ferma, è l'interruttore che si muove: prima il testo
    // del bottone cambiava da "In sala" a "Da parte", e un controllo che
    // cambia nome mentre lo tocchi si legge come incoerente (feedback
    // utente, 13/09).
    activeLabel: 'Attivo',
    activeHint: 'Il cliente lo vede fra le linguette. Tocca per metterlo da parte.',
    // "Fra le linguette" e non "in sala", che era rimasto l'ultimo posto in
    // cui il portale usava quella metafora: in un ristorante la sala è la
    // stanza dove si mangia, e qui si parla di dove sta il menù dentro la
    // pagina. La frase gemella qui sopra dice già "fra le linguette".
    parkedHint: 'Esiste solo qui: al tavolo non compare. Tocca per rimetterlo fra le linguette.',
    // Spegnendo anche questo, pubblicare non farebbe più niente: il database
    // rifiuta una carta vuota, e la modifica resterebbe in sospeso per
    // sempre (richiesta dell'utente, 14/09).
    lastActiveHint: 'Deve restare acceso almeno un menù.',
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
    existingNamePlaceholder: 'es. Menù del pranzo',
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
    // Aggiunte davanti a deleteBody quando il locale è online (729)
    deleteOnline: 'Al tavolo resta finché non pubblichi le modifiche.',
    deleteLastOnline: 'È l’ultimo menù attivo: il menù al tavolo va offline.',
    deleted: 'Menù eliminato',
    undo: 'Annulla',
  },
  menuEditor: {
    back: 'Tutti i menù',
    step1Title: 'Crea il tuo menù digitale',
    step2Title: 'Personalizza l’aspetto',
    step3Title: 'Pubblica il menù',
    previewTitle: 'Anteprima',
    previewCaption: 'Come lo vedono i tuoi clienti al tavolo.',
    fullPreview: 'Apri a tutta pagina',
    openLive: 'Apri il menù online',
    // Le stesse due azioni nel riquadro stretto sotto l'anteprima (LiveBox)
    liveOpenShort: 'Apri online',
    liveQrShort: 'Scarica QR',
    // "Indirizzo web" e non "indirizzo": questa riga si legge anche dalla
    // home, lontana dal campo che mostra allergiapp.com/v/…, e lì
    // "indirizzo" da solo si legge come la via del ristorante.
    liveNoAddress: 'Questo menù non ha ancora un indirizzo web: è il link che si apre col QR.',
    liveNotYet: 'Non ancora pubblicato: questo indirizzo non risponde a nessuno.',
    liveChoose: 'Scegli l’indirizzo',
    fullPreviewNotice: 'Anteprima privata — non è ancora l’indirizzo pubblico del menù.',
    fullPreviewBack: 'Torna all’editor',
    // IL MENÙ DI ESEMPIO. Finché il menù è vuoto l'anteprima mostrava una
    // riga di scuse, e l'aspetto si sceglieva alla cieca: colore, carattere,
    // impaginazione e interlinea si giudicano su dei piatti, non su uno
    // schermo bianco. Adesso ci sono tre piatti finti, che spariscono al
    // primo piatto vero.
    //
    // Dev'essere INEQUIVOCABILMENTE finto, o qualcuno crede di avere già
    // qualcosa dentro: lo dice la riga sopra il telefono, e questi nomi sono
    // gli stessi che il portale usa già come esempio altrove.
    // INVITA e dice il guadagno, invece di constatare una mancanza:
    // "aggiungi i piatti per vedere il menù" spiegava perché lo schermo è
    // bianco, non cosa ci si guadagna a riempirlo. "Mentre" è la cosa vera
    // dell'anteprima: si aggiorna sotto le dita.
    previewEmpty: 'Comincia a comporre il menù: lo vedrai qui mentre lo scrivi.',
    previewSampleCaption: 'Esempio: così si vedranno i tuoi piatti.',
    // A COMANDO e non da sé (decisione dell'utente): tre piatti che compaiono
    // senza che nessuno li abbia chiesti si leggono come piatti veri, e chi
    // apre il menù per la prima volta si chiede di chi siano.
    previewSampleShow: 'Vedi un esempio',
    previewSampleHide: 'Nascondi l’esempio',
    previewSampleSection: 'Antipasti',
    previewSampleDishes: [
      {
        name: 'Spaghetti alla carbonara',
        description: 'Guanciale, tuorlo, pecorino romano e pepe nero.',
      },
      {
        name: 'Insalata di mare',
        description: 'Polpo, calamari e gamberi, sedano e limone.',
      },
      { name: 'Tiramisù', description: 'Savoiardi, mascarpone e caffè.' },
    ],
    // "Aspetto" e non più "Colore": la scatola tiene anche i due
    // interruttori (foto, descrizioni). E niente "linguette" nelle
    // spiegazioni finché i menù multipli sono spenti (MULTI_MENU): erano
    // rimaste a parlare di una cosa che a schermo non esiste.
    // LE TRE AREE DELLA PAGINA, una parola ciascuna e la stessa riga: la
    // coerenza sta nell'intestazione, la distinzione in cosa hanno sotto —
    // l'aspetto si apre e si chiude, il contenuto è una pila di schede,
    // l'online è un riquadro che cambia colore quando il menù risponde.
    // "Del menù" non si dice più: siamo dentro l'editor di un menù.
    // La riga chiusa della scatola: un invito, non un riassunto (v. BrandBar)
    brandTitle: 'Aspetto del menù',
    brandTeaser: 'Logo, colori, copertina e caratteri: fai sembrare il menù davvero tuo.',
    brandOpen: 'Personalizza',
    // I link in fondo al menù al tavolo. Il titolo dice DOVE finiscono, che è
    // l'unica cosa che il ristoratore non può indovinare: «Social» da solo
    // farebbe pensare ai suoi profili in generale.
    socialsGroup: 'I tuoi link',
    socialsGroupHint: 'Compaiono in fondo alla pagina che il cliente apre col QR.',
    socialsTitle: 'Indirizzo',
    socialsPlaceholder: 'es. instagram.com/iltuolocale',
    socialsAdd: 'Aggiungi un link',
    socialsHint:
      'Incolla l’indirizzo: riconosciamo noi di che servizio si tratta. Chi è seduto al tavolo li vede in fondo alla pagina.',
    // L'etichetta è una parola sola e sobria: dice il confine senza vendere
    // niente. La frase accanto dice le due cose che contano — che si possono
    // provare subito, e cosa resta gratis comunque.
    brandClose: 'Chiudi',
    venueNameLabel: 'Nome del locale',
    venueNamePlaceholder: 'Nome del locale (lo leggono i tuoi clienti)',
    // Solo da due menù in su: il nome e il logo sono del locale, e chi sta
    // scrivendo nella carta del pranzo crederebbe di rinominare quella.
    venueNameShared: 'Nome e logo valgono per tutti i menù di questo locale.',
    // Dice cosa si FA qui dentro, non solo cosa si guarda: è la riga in cima
    // alla scatola aperta, e chi l'ha appena aperta vuole sapere se è il
    // posto giusto.
    brandHint:
      'Personalizza come si vede il menù al tavolo. Vale per il menù di questo locale.',
    // ⚠️ L'etichetta dice COME SI LEGGONO, non «Allergeni». In una scatola
    // dove ogni voce si può spegnere, una voce chiamata «Allergeni» si legge
    // come «puoi toglierli» — l'unica cosa che il Tema 23 vieta.
    allergenDisplay: 'Come si leggono gli allergeni',
    allergenDisplays: { text: 'A parole', icon: 'A icone' },
    allergenDisplayHint: 'La legenda sta in fondo alla carta. Aprendo un piatto sono sempre scritti.',
    // ⚠️ QUESTA RIGA PORTA LA POLARITÀ di tutta la carta. Senza la parola
    // «Contiene» su ogni piatto (scelta dell'utente, 2026-09-06), è l'unico
    // punto in cui è scritto che le icone dicono cosa il piatto CONTIENE e
    // non di cosa è privo — e la spiga sbarrata, in mezzo mondo, vuol dire
    // l'opposto. Non accorciarla in «Cosa vogliono dire».
    allergenLegendTitle: 'Cosa vogliono dire le icone',
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
    // ⚠️ Le didascalie sotto «A riga» e «A blocco» sono state TOLTE dalla
    // scatola il 2026-09-06 (scelta dell'utente: il campione disegnato le
    // dice già, e l'anteprima accanto mostra il risultato). Restano qui come
    // testo accessibile del bottone — un campione grafico, per chi ascolta
    // la pagina, non dice niente.
    layoutHints: {
      row: 'Foto, nome e prezzo sulla stessa riga.',
      block: 'Nome, descrizione e prezzo incolonnati, senza foto.',
    },
    // Detto QUI e non scoperto dopo: passando a "a blocco" le foto spariscono
    // dal menù al tavolo, e senza una riga che lo dica sembra che il portale
    // se le sia mangiate. La seconda metà è quella che tranquillizza: non si
    // perde niente.
    layoutNoPhotos: 'Senza foto. Restano caricate: tornando “A riga” ricompaiono.',
    // L'altra cosa da sapere prima di sceglierla, non dopo averla scelta.
    layoutWantsDescriptions: 'Dà il meglio con le descrizioni accese.',
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
    // Sta sotto le tre scelte, e non è un dettaglio tecnico: è la ragione per
    // cui Compatta non rimpicciolisce tutto.
    textScaleFloor: 'La riga degli allergeni non rimpicciolisce mai.',
    // LE FOTO: una scelta sola con tre risposte (migration 711). "Nessuna"
    // non è il contrario delle altre due, è la prima delle tre — e messa in
    // fila si sceglie guardando, come i titoli delle sezioni.
    photos: 'Foto dei piatti',
    photoShapes: { none: 'Nessuna', square: 'Quadrate', round: 'Tonde' },
    // Si dice cosa succede spegnendole, non cosa sono le foto: chi legge sta
    // decidendo, e la domanda che ha in testa è "e se le tolgo?"
    photosHint: 'Le foto restano sui piatti e sulla scheda AllergiApp.',
    showDescriptions: 'Mostra le descrizioni sotto ai piatti',
    showDescriptionsHint: 'Spente, si leggono toccando il piatto.',
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
    // Mai pubblicato: il bottone porta alla sezione «Online», non pubblica
    publishFirst: 'Vai alla pubblicazione',
    publishing: 'Pubblico…',
    // Il database rifiuta di pubblicare uno scatto vuoto: qui si dice perché,
    // così ripremere lo stesso bottone non sembra l'unica cosa da fare
    // (bug trovato durante il censimento richiesto dall'utente, 14/09).
    // Manca la sola cosa che una carta deve avere. Dice cosa fare, non cosa
    // è andato storto: non è un errore, è un menù non ancora finito.
    publishNoDishes: 'Aggiungi almeno un piatto per pubblicare il menù.',
    publishNoActive: 'Nessun menù attivo: niente da pubblicare. Riaccendine almeno uno in "Vedi i menù".',
    publishPending: 'Ci sono modifiche non ancora visibili ai clienti.',
    publishAfterSave: 'Salva le modifiche dell’aspetto per poterle pubblicare.',
    // L'avviso che nomina il rischio, invece di essere l'ennesima scritta
    // grigia: è la mitigazione della scelta di avere una bozza (Tema 24).
    //
    // AGGIUNGE, non sostituisce: dice "modifiche non pubblicate" come l'altro
    // e poi che fra quelle ci sono degli allergeni. Prima diceva solo la
    // seconda cosa, e chi aveva appena cambiato una foto leggeva una frase
    // che sembrava parlare d'altro — mentre invece era vera, per una modifica
    // fatta mezz'ora prima. Il neutro puro non va bene: sarebbe tornare a non
    // dire mai che in ballo c'è un allergene.
    publishAllergens: 'Ci sono modifiche non ancora visibili ai clienti, allergeni compresi.',
    // Solo l'aspetto è cambiato. Vale la pena dirlo invece di dire
    // genericamente "modifiche": chi ha scelto un colore mezz'ora fa e legge
    // "modifiche non pubblicate" si mette a cercare cos'altro ha toccato.
    publishAppearance: 'L’aspetto non è ancora visibile ai clienti.',
    publishNever: 'Questo menù non è ancora pubblicato.',
    publishedOn: 'Pubblicato il {date}',
    goToSubscriptions: 'Vai agli abbonamenti',
    // ANNULLARE L'ASPETTO. "L'aspetto pubblicato" e non "annulla tutto":
    // quello che torna indietro è solo questa scatola, e il menù non si
    // tocca. Il bottone sta QUI dentro e non accanto a Pubblica, dove
    // sembrerebbe annullare anche i piatti e i prezzi.
    //
    // Diceva "com'è in sala", e "sala" è ambiguo: in un ristorante è la
    // stanza dove si mangia, non l'ultima versione pubblicata. "Pubblicato"
    // è la parola che il ristoratore ha già davanti sul bottone Pubblica e
    // nell'avviso delle modifiche — una parola sola per una cosa sola.
    // Due vie d'uscita diverse per due situazioni diverse: chi ha una sala a
    // cui tornare (abbonato, ha già pubblicato) e chi no — che prima di
    // questo bottone doveva rimettere a mano ogni scelta provata.
    appearanceReset: 'Rimetti i valori di partenza',
    appearanceResetTitle: 'Rimettere i valori di partenza?',
    appearanceResetBody:
      'Colore, carattere, stile delle sezioni, grandezza dei testi e impaginazione tornano come erano all’inizio. Il logo, la copertina, le foto e le descrizioni dei piatti non si toccano.',
    appearanceResetConfirm: 'Rimetti',
    appearanceRevert: 'Torna all’aspetto pubblicato',
    appearanceRevertTitle: 'Tornare all’aspetto pubblicato?',
    appearanceRevertBody:
      'Colore, copertina, logo e stili tornano come si vedono adesso al tavolo. Il menù, i piatti e i prezzi non si toccano.',
    appearanceRevertConfirm: 'Rimetti com’era',
    // L'INDIRIZZO PUBBLICO. Che non sia ancora attivo va detto in ogni
    // occasione utile: la cosa da non far succedere è che qualcuno lo stampi
    // su una locandina prima che la pagina esista.
    // Una parola sola come le altre due aree. Che il menù risponda o no lo
    // dicono l'interruttore e il colore del riquadro, non più un titolo che
    // cambia — che era l'unica cosa che si perde in questa sistemazione.
    addressTitle: 'Online',
    // Il nome del CAMPO per chi usa un lettore di schermo. Prima era il titolo
    // dell'area, che diceva "Indirizzo web del menù" e funzionava; adesso che
    // il titolo è "Online" servirebbe una parola che non dice cos'è il campo.
    addressField: 'Indirizzo web del menù',
    // L'etichetta è una sola e ferma: lo stato lo dice l'interruttore
    addressActive: 'Pubblicato',
    // Dicono la CONSEGUENZA e non il posto: "sala" in un ristorante è la
    // stanza dove si mangia.
    addressTurnOn: 'Rendi il menù visibile ai clienti',
    addressTurnOff: 'Nascondi il menù ai clienti',
    addressHintOffline:
      'Il link e il QR esistono ma non mostrano il menù: chi li apre legge che non è al momento disponibile. Puoi rimetterlo online quando vuoi.',
    addressHintLive:
      'Questo è l’indirizzo che i tuoi clienti aprono col QR. Se lo cambi, ricordati di ristampare i QR.',
    addressHint:
      'È l’indirizzo che finirà sul QR del tavolo. Puoi sceglierlo adesso o alla prima pubblicazione.',
    addressNeedName: 'Scrivi prima il nome del locale: l’indirizzo si propone da lì.',
    addressNotChosen: 'Non ancora scelto.',
    addressChecking: 'Controllo…',
    addressFree: 'Libero.',
    addressTaken: 'Questo indirizzo è già di un altro locale.',
    addressInvalid: 'Lettere minuscole, numeri e trattini, da 3 a 60 caratteri.',
    addressUnknown: 'Non è stato possibile controllare adesso.',
    addressChoose: 'Scegli indirizzo',
    addressChange: 'Cambia indirizzo',
    // LA CONFERMA prima di cambiare un indirizzo che risponde già (v. il
    // commento in cima a MenuAddress.tsx). Il corpo ripete la conseguenza già
    // scritta in `addressHintLive`: chi è arrivato fin qui l'ha già letta una
    // volta, ma ripeterla proprio nell'istante che conta è il punto.
    addressChangeConfirmTitle: 'Cambiare l’indirizzo?',
    addressChangeConfirmBody:
      'Il menù risponderà al nuovo indirizzo. I QR già stampati portano al vecchio: ristampali dopo il cambio.',
    addressChangeSureTitle: 'Sei sicuro?',
    addressChangeSureBody: 'I QR già stampati smetteranno di funzionare.',
    addressChangeSureConfirm: 'Sì, cambia indirizzo',
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
    // Il chevron che piega la sezione: solo per lavorarci più comodi su un
    // menù lungo, quindi non si ricorda da una visita all'altra — si riparte
    // sempre aperte.
    sectionCollapse: 'Comprimi sezione',
    sectionExpand: 'Espandi sezione',
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
    pickerUncategorized: 'Senza categoria',
    pickerSelectGroup: 'Tutti',
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
    excludedContains: 'Contiene {list}',
    excludedNotFor: 'Non indicato per {list}',
    dishDetailOpen: 'Vedi {dish}',
    dishDetailPrev: 'Piatto precedente',
    dishDetailNext: 'Piatto successivo',
    dishDetailPhotoDisclaimer: 'L’immagine è indicativa: la presentazione può variare.',
    dishDetailAllergensTitle: 'Allergeni dichiarati',
    dishDetailNoAllergens: 'Nessun allergene dichiarato dal ristorante.',
    dishDetailDietsTitle: 'Adatto a',
    dishDetailNotesTitle: 'Da sapere',
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
  // IL PAYWALL (19/09). È una pagina di vendita, e segue le poche regole che
  // valgono davvero: si apre con il BENEFICIO e non col prodotto; dice cosa
  // ottieni in tre righe concrete; mostra il prezzo con l'alternativa annuale
  // accanto (che vale come ancora: due mesi in regalo); toglie il rischio
  // («disdici quando vuoi») e ricorda cosa resta gratis, perché la paura di
  // perdere il menù è l'obiezione vera. Un solo bottone che conta, e la via
  // d'uscita in grigio.
  //
  // ⚠️ Niente conti alla rovescia, niente «offerta che scade», niente numeri
  // inventati sui ristoranti iscritti: di ristoratori veri non ne abbiamo
  // ancora, e una prova sociale finta si paga con la fiducia.
  paywall: {
    lookTitle: 'Personalizza il tuo menù digitale',
    lookLead: 'L’aspetto che scegli qui arriva anche ai tuoi clienti, al tavolo.',
    cardTitle: 'Fatti trovare su AllergiApp',
    cardLead: 'Chi ha esigenze specifiche apre l’app prima di scegliere il ristorante.',
    look: 'Personalizzare l’aspetto del menù in ogni dettaglio',
    card: 'La scheda del tuo locale dentro l’app, con i tuoi piatti e le compatibilità',
    replies: 'Rispondere alle recensioni del tuo locale',
    soon: 'in arrivo',
    // IL PREZZO COME LO FANNO QUELLI BRAVI: due riquadri accostati, e
    // l'annuale vince da solo. Il trucco non è uno sconto gridato ma il
    // PREZZO AL MESE messo a confronto: 5 € contro 7,99 €, e il totale
    // annuale scritto piccolo sotto, perché è l'unica cifra che spaventa.
    // ⚠️ I numeri sono veri e vanno tenuti allineati a Stripe: 12 × 7,99 =
    // 95,88, contro 60 → 35,88 in meno, cioè il 37%.
    monthlyName: 'Mensile',
    monthlyPrice: '7,99 €',
    perMonth: 'al mese',
    yearlyName: 'Annuale',
    yearlyPrice: '5 €',
    yearlyBilled: '60 € una volta l’anno',
    yearlySave: 'Risparmi 35,88 € — il 37%',
    yearlyBest: 'Conviene',
    perVenue: 'per locale',
    noLock: 'Disdici quando vuoi: resti attivo fino alla fine del periodo già pagato.',
    // Il pagamento parte da qui (19/09): meno attrito, ma prima si dice che
    // si rinnova da solo — verso le imprese è anche dovuto (P2B).
    renewal: 'Si rinnova da solo. Disdici quando vuoi: resti attivo fino alla fine del periodo già pagato.',
    seeAll: 'Vedi gli abbonamenti',
    payError: 'Non è stato possibile aprire il pagamento. Riprova.',
    opening: 'Apro…',
    free: 'Creare e pubblicare il tuo menù resta gratis, e lo sarà sempre.',
    cta: 'Attiva il Piano Pro',
    ctaSoon: 'Vai agli abbonamenti',
    later: 'Non ora',
  },
  subs: {
    back: 'Indietro',
    title: 'Abbonamenti',
    intro:
      'Qui attivi l’abbonamento di ogni tuo locale; poi lo associ al suo ristorante su AllergiApp. Insieme rendono visibile la scheda nell’app.',
    empty: 'Nessun locale ancora: creane uno dalla Home.',
    notLinked: 'Non associato',
    noSubscription: 'Nessun abbonamento',
    linkCta: 'Associa al ristorante su AllergiApp',
    // Stato dell'abbonamento del locale
    active: 'Piano Pro attivo',
    renewsOn: 'Si rinnova il {data}',
    endsOn: 'Finisce il {data}',
    noEnd: 'Senza scadenza',
    pastDue: 'Pagamento in ritardo',
    pastDueHint: 'Stiamo riprovando con la tua carta. Il menù resta com’è.',
    granted: 'Piano Pro offerto da AllergiApp',
    // ⚠️ I prezzi sono scritti qui E stanno su Stripe: se cambiano, vanno
    // cambiati in tutt'e due i posti. Il conto vero lo fa sempre Stripe.
    // Il PIANO ha un nome, ed è lo stesso del distintivo: così "Pro" è la
    // cosa e "abbonamento" il gesto di comprarla, invece di due parole per
    // la stessa cosa in due schermate.
    monthly: 'Piano Pro · 7,99 € al mese',
    yearly: 'Piano Pro · 60 € all’anno',
    // 12 × 7,99 = 95,88 contro 60: il risparmio vero è il 37%, non due mesi
    yearlyHint: 'Risparmi il 37%',
    // Va detto PRIMA di pagare, non dopo: il rinnovo automatico scoperto al
    // secondo addebito è il modo più rapido di perdere un ristoratore, e verso
    // le imprese la chiarezza su durata e disdetta è anche dovuta (P2B).
    renewalNote:
      'Si rinnova da solo, mensile o annuale secondo la scelta. Puoi disdire quando vuoi: resti attivo fino alla fine del periodo già pagato.',
    manage: 'Gestisci pagamento e fatture',
    // Il passaggio dal regalo al pagato: dice la cosa che toglie il dubbio —
    // che al tavolo non cambia niente e non si resta scoperti in mezzo.
    switchNote:
      'Puoi attivare l’abbonamento quando vuoi, anche prima della scadenza: il menù e la sua personalizzazione restano come sono, senza interruzioni.',
    billingHint:
      'I dati della tua azienda (P.IVA, sede) si inseriscono al pagamento: servono per la fattura, e li ritrovi già pronti quando associ il locale al suo ristorante.',
    paidWait: 'Pagamento ricevuto. Stiamo registrando l’abbonamento…',
    canceledPayment: 'Pagamento annullato: non ti è stato addebitato niente.',
    openError: 'Non è stato possibile aprire il pagamento.',
    soon: 'L’abbonamento arriverà presto: il menù resta tuo e gratuito, e non devi fare niente per tenerlo.',
    notFoundBridge:
      'Non trovi il tuo ristorante? Aggiungilo dall’app AllergiApp, poi torna qui per associarlo.',
  },
  // L'associazione del locale al ristorante su AllergiApp (/locale/[id]/collega)
  link: {
    back: 'Scheda AllergiApp',
    title: 'Associa il ristorante',
    // {venue} = il nome del locale, in grassetto (si spezza sul segnaposto)
    intro: 'Cerca {venue} fra i ristoranti di AllergiApp, con il nome e la città.',
    nameLabel: 'Nome del ristorante',
    namePlaceholder: 'Es. Trattoria da Mario',
    cityLabel: 'Città o CAP',
    cityPlaceholder: 'Es. Bologna o 40121',
    searchButton: 'Cerca',
    tooMany: 'Ci sono molti risultati: scrivi il nome completo del ristorante.',
    searching: 'Ricerca…',
    noResults: 'Nessun ristorante di AllergiApp corrisponde a queste parole.',
    // Un guasto (rete, server), non «nessun risultato»: si dice cosa è
    // successo e basta, senza promettere che riprovando passa
    searchError: 'La ricerca non ha funzionato.',
    choose: 'Scegli',
    taken: 'Già gestito da un altro account',
    yours: 'Già associato a un tuo locale',
    // Il ristorante che non c'è (deciso il 18/09): l'app, o scriverci
    notFoundTitle: 'Non trovi il tuo ristorante?',
    notFoundText:
      'Aggiungilo dall’app AllergiApp lasciando una recensione, poi torna qui a cercarlo.',
    notFoundContact: 'Se qualcosa non va, scrivici:',
    notFoundSubject: 'Ristorante da aggiungere su AllergiApp',
    // La conferma, con la mappa
    confirmTitle: 'È questo il tuo locale?',
    confirmYes: 'Sì, è questo',
    confirmNo: 'No, cerca ancora',
    mapLabel: 'Mappa della zona di {name}',
    // Chi arriva qui senza abbonamento o già associato
    needsSubscription: 'Per associare il ristorante serve prima l’abbonamento del locale.',
    needsSubscriptionCta: 'Vai agli abbonamenti',
    alreadyLinked: 'Questo locale è già associato al suo ristorante su AllergiApp.',
    // Il ristorante già gestito da un altro account: si può chiederlo
    claimTaken: 'È il mio locale',
    // «Conferma che il locale è tuo»: i dati aziendali (19/09). Si dice
    // PERCHÉ li chiediamo, e cosa ci guadagna il ristoratore.
    companyTitle: 'Conferma che il locale è tuo',
    companyIntro:
      'Per associare il ristorante ci servono i dati dell’azienda che lo gestisce. Così chi legge la scheda nell’app sa che a parlare è davvero il ristorante, e nessun altro può farlo al posto tuo.',
    companyUse: 'Usa i dati di {name}',
    companyOther: 'Un’altra azienda',
    country: 'Paese',
    legalName: 'Ragione sociale',
    legalNamePlaceholder: 'Es. Trattoria da Mario S.r.l.',
    vatNumber: 'Partita IVA',
    vatPlaceholder: 'Es. 01234567890',
    declaration:
      'Dichiaro di essere titolare o di agire per conto dell’azienda che gestisce questo locale.',
    companyBack: 'Indietro',
    submit: 'Conferma e associa',
    submitting: 'Un momento…',
    // Quello che il ristoratore può correggere, e quello che no
    errVat: 'Questa partita IVA non sembra corretta: controlla le cifre.',
    errName: 'Scrivi la ragione sociale dell’azienda.',
    errCountry: 'Scegli il paese dell’azienda.',
    errYours: 'Questo ristorante è già associato a un altro tuo locale.',
    errVenueLinked: 'Questo locale è già associato a un ristorante.',
    errSubscription: 'Per associare il ristorante serve l’abbonamento attivo del locale.',
    errRequestOpen: 'C’è già una richiesta in attesa per questo locale.',
    errTooMany: 'Hai già inserito molte aziende: scrivici a info@allergiapp.com.',
    errGeneric: 'Qualcosa non ha funzionato: non è stato salvato niente.',
    // La richiesta al nostro team: due motivi, una strada (724)
    requestTitle: 'Serve un controllo del nostro team',
    requestTaken:
      'Questo ristorante è già gestito da un altro account. Se è il tuo locale, raccontacelo: la richiesta la valuta il nostro team.',
    requestRevoked:
      'L’associazione a questo ristorante ti era stata tolta. Per riaverla, la richiesta la valuta il nostro team.',
    requestLabel: 'Due righe per il nostro team',
    requestPlaceholder: 'Chi sei, che ruolo hai nel locale, e quello che ci aiuta a verificare.',
    requestSend: 'Invia la richiesta',
    // La fine
    doneTitle: 'Fatto',
    // {restaurant} = il ristorante dell'app, col link alla sua pagina: il
    // nome del locale qui no, spesso è lo stesso e la frase non diceva niente
    doneLinked: 'Il locale è ora associato a {restaurant} su AllergiApp.',
    doneReview: 'Il nostro team controlla l’associazione: la scheda comparirà nell’app subito dopo.',
    doneRequested: 'Richiesta inviata. L’esito lo trovi nella pagina della scheda.',
    doneBack: 'Torna alla scheda',
  },
  // LO STATO DELLA SCHEDA (cardState in lib/association.ts), in tre misure:
  // l'etichetta della pastiglia, la riga sotto in home, il riquadro in cima
  // alla scheda. {restaurant} = il ristorante dell'app. Nessun tempo
  // promesso: dipende da noi, non da chi legge.
  cardState: {
    pill: {
      none: 'non attiva',
      requested: 'richiesta in attesa',
      rejected: 'non attiva',
      closed: 'non attiva',
      suspended: 'sospesa',
      review: 'in verifica',
      paused: 'in pausa',
      expired: 'non visibile',
      live: 'attiva',
    },
    line: {
      requested: 'Il nostro team sta valutando la tua richiesta per {restaurant}.',
      rejected: 'La richiesta non è stata accolta: trovi il motivo nella scheda.',
      closed: 'L’associazione è stata chiusa dal nostro team: trovi il motivo nella scheda.',
      suspended: 'Sospesa dal nostro team: trovi il motivo nella scheda.',
      paused: 'In pausa: nell’app non si vede finché non la riattivi.',
      expired: 'L’abbonamento è finito: la scheda resta associata ma non si vede nell’app.',
    },
    notice: {
      requestedTitle: 'Richiesta in attesa',
      requestedText:
        'Hai chiesto di associare il locale a {restaurant}: la sta valutando il nostro team. L’esito lo trovi qui.',
      rejectedTitle: 'Richiesta non accolta',
      rejectedText: 'La richiesta per {restaurant} non è stata accolta.',
      reason: 'Motivo:',
      // L'associazione chiusa da noi (closedByUs in venues.ts): revocata, o
      // rifiutata la prima volta che la guardavamo. Il motivo è dovuto (DSA
      // art. 17); il ristorante non si riassocia da solo, ma un altro sì.
      closedTitle: 'Associazione revocata dal nostro team',
      closedNeverApprovedTitle: 'Associazione non approvata',
      closedText: 'L’associazione a {restaurant} è stata chiusa e la scheda non si vede nell’app.',
      suspendedTitle: 'Scheda sospesa dal nostro team',
      suspendedText: 'Nell’app non si vede finché la sospensione non viene tolta.',
      contact: 'Per chiarimenti scrivici:',
      pausedTitle: 'Scheda in pausa',
      pausedText: 'Nell’app non si vede finché non la riattivi.',
      expiredTitle: 'Abbonamento finito',
      expiredText:
        'La scheda resta associata a {restaurant}, ma nell’app non si vede. Con l’abbonamento torna com’era.',
    },
    // Il riquadro in fondo, dove si gestisce l'associazione
    linkedTo: 'Associato a {restaurant}.',
    pause: 'Metti in pausa',
    resume: 'Riattiva',
    unlink: 'Scollega',
    // Le due finestre di conferma (19/09): ogni gesto si spiega quando lo si
    // fa, nello stesso modo. La differenza che conta: la pausa si toglie da
    // sola, scollegare vuol dire un nuovo controllo.
    pauseTitle: 'Mettere in pausa la scheda?',
    pauseBody:
      'La scheda sparisce dall’app finché non la riattivi. Il ristorante resta associato a te e, riattivandola, non serve un nuovo controllo. Utile per una chiusura per ferie o mentre sistemi il menù.',
    unlinkTitle: 'Scollegare il locale?',
    unlinkBody:
      'La scheda sparisce subito dall’app. Per associarlo di nuovo servirà un nuovo controllo del nostro team. Piatti, menù e abbonamento restano sul locale.',
    actionError: 'Non è stato possibile: niente è cambiato.',
    // Ritirare una richiesta in attesa (726): la decisione è di chi l'aveva
    // chiesta, e da lì il locale è libero
    withdraw: 'Ritira la richiesta',
    withdrawTitle: 'Ritirare la richiesta?',
    withdrawBody:
      'Il nostro team non la valuterà più. Il locale torna libero: potrai associarlo a un altro ristorante o fare una nuova richiesta.',
  },
  account: {
    title: 'Account',
    email: 'Email',
    language: 'Lingua',
    subsTitle: 'Abbonamenti',
    subsHint:
      'L’abbonamento dei tuoi locali e la loro associazione ai ristoranti su AllergiApp: insieme rendono visibile la scheda.',
    subsOpen: 'Apri',
    // Dati personali
    profileTitle: 'I tuoi dati',
    profileHint: 'Il nome con cui ti salutiamo qui dentro. I clienti non lo vedono.',
    profileSaved: 'Dati aggiornati',
    // Le aziende: si inseriscono associando un locale, qui si vedono (19/09).
    // La modifica arriva dopo, e ripassa dal controllo sul server.
    companiesTitle: 'Dati aziendali',
    companiesHint: 'Le aziende con cui hai associato i tuoi locali ai ristoranti su AllergiApp.',
    companiesEmpty: 'Li inserisci quando associ un locale al suo ristorante.',
    vatConfirmed: 'Verificata',
    vatPending: 'Da verificare',
    // La modifica (19/09): ripassa dal controllo sul server
    companyEdit: 'Modifica',
    companySave: 'Salva',
    companyVatWarning:
      'Cambiando partita IVA o paese, le associazioni di questa azienda tornano in verifica: nell’app non si vedono finché il nostro team non le riguarda.',
    companyErrDuplicate: 'Hai già un’azienda con questa partita IVA.',
    // Consenso marketing: si toglie con lo stesso gesto con cui si è dato
    marketingTitle: 'Comunicazioni',
    marketingLabel: 'Voglio ricevere aggiornamenti su AllergiApp Partner.',
    marketingHint: 'Puoi cambiare idea quando vuoi: vale da subito.',
    // Password
    passwordTitle: 'Password',
    passwordNew: 'Nuova password',
    passwordRepeat: 'Ripeti la password',
    passwordMismatch: 'Le due password non coincidono.',
    passwordChange: 'Cambia password',
    passwordChanged: 'Password aggiornata',
    // Si arriva qui col link della mail di recupero (v. login.forgot)
    passwordFromRecovery: 'Scegli la password nuova: da qui in poi userai questa.',
  },
  // Le recensioni del ristorante collegato e le risposte (733)
  reviews: {
    title: 'Recensioni',
    intro: 'Le recensioni di {restaurant} su AllergiApp. La tua risposta compare sotto la recensione, col logo del locale.',
    filterTodo: 'Da rispondere ({n})',
    filterAll: 'Tutte ({n})',
    empty: 'Ancora nessuna recensione su AllergiApp.',
    emptyTodo: 'Hai risposto a tutte le recensioni.',
    emptyStars: 'Nessuna recensione con queste stelle.',
    loadError: 'Non siamo riusciti a leggere le recensioni. Riprova tra poco.',
    retry: 'Riprova',
    anonymous: 'Utente anonimo',
    needs: 'Le sue esigenze',
    edited: 'Modificata dopo la tua risposta',
    reply: 'Rispondi',
    yourReply: 'La tua risposta',
    placeholder: 'Scrivi una risposta…',
    // Il consiglio accanto al campo: aiuta a rispondere bene, anche alle
    // critiche (testo dell'utente, 25/09). Il divieto delle promesse di
    // sicurezza sta nelle condizioni d'uso, non qui.
    tips: 'Cerca di ringraziare e di rispondere nel merito in modo cordiale. Davanti a una critica mantieni la calma: chi legge guarda soprattutto come rispondi.',
    // Come appare il ristoratore accanto alle risposte: il logo del LOCALE,
    // lo stesso del menù al tavolo (703: un logo per locale)
    identityTitle: 'Come appari nelle risposte',
    starsAll: 'Tutte le stelle',
    starsLabel: 'Filtra per stelle',
    summaryCount: '{n} recensioni',
    summaryRow: '{n} stelle: {count}',
    counter: '{n}/{max}',
    save: 'Pubblica',
    cancel: 'Annulla',
    edit: 'Modifica',
    delete: 'Elimina',
    saveError: 'La risposta non è stata salvata. Riprova.',
    deleteError: 'La risposta non è stata eliminata. Riprova.',
    deleteTitle: 'Eliminare la risposta?',
    deleteBody: 'Sparisce dall’app. Potrai scriverne un’altra quando vuoi.',
    removedTitle: 'Rimossa dal team AllergiApp',
    removedReason: 'Motivo: {note}',
    removedHint: 'Non è più visibile nell’app e non si può modificare. Per chiarimenti scrivi a info@allergiapp.com.',
    unavailableTitle: 'Le risposte alle recensioni sono Pro',
    unavailableBody: 'Si risponde con l’abbonamento attivo e il locale associato al suo ristorante su AllergiApp, dopo il controllo del nostro team.',
    unavailableCta: 'Apri la scheda',
  },
};

export default it;
