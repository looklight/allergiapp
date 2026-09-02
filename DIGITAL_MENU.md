# Menù digitale — Working Notes

Diario della funzione "il ristoratore si costruisce il suo menù digitale interattivo".
Non è un piano vincolante: si aggiorna quando cambiamo idea. Le decisioni superate si riscrivono.
Serve a non ridiscutere da capo cose già chiuse.

---

## Stato attuale

Nato come **sola idea il 2026-08-30**, quando non esisteva una riga di codice: si scriveva già
allora perché le fondamenta c'erano — il portale partner aveva il catalogo piatti con gli
allergeni come **codici strutturati**, e la migration 700 era stata scritta lasciando spazio a
questa direzione (in particolare: nessuna colonna prezzo su `partner_dishes`, v. Tema 3).

**Aggiornamento 2026-08-31 (notte): il menù digitale esiste e vive sul database.**
Migrations **703 (il locale) e 704 (i menù) APPLICATE**. Nel portale c'è `/menu`: si crea un menù
scegliendo il ristorante, ci si mettono sezioni con nome libero, si accostano i piatti del catalogo
(o se ne crea uno nuovo da lì, con la stessa maschera del gestionale), si mettono i prezzi, si
riordina trascinando. A lato un telefono mostra la pagina che leggerà il cliente, **col filtro
allergeni funzionante**, e un link la apre a tutta pagina in una scheda a parte.

**Aggiornamento 2026-09-01: il fondo del menù è del ristoratore (Tema 18).** Migrations **705 e 706
APPLICATE** (colonne verificate sul database lo stesso giorno). Tre cose: il
disclaimer non compare più in fondo al menù al tavolo — resta una riga minuscola attaccata al
filtro, che è l'unica cosa nostra in quella pagina — e al suo posto ci sono le **condizioni al
tavolo** del locale (coperto, servizio, pagamenti); nell'editor si aggiungono **blocchi di solo
testo** che si trascinano fra le sezioni; le pastiglie del filtro hanno una **graduatoria fissa**
(glutine, vegetariano, vegano, latte, uova…) con un bottone **Filtri** ancorato che apre l'elenco
intero. La ricerca nel menù è stata valutata e **scartata**, per la ragione scritta nel Tema 18.

**Aggiornamento 2026-09-01: un menù per locale (Tema 19).** Più menù per lo stesso locale resta
nel modello dati e nel codice, ma è **spento** da `MULTI_MENU` in `partner/src/lib/features.ts`:
è una voce del futuro premium, e finché non si vende complicava la creazione per tutti. Nessuna
migration, nessun vincolo sul database.

**Aggiornamento 2026-09-02: LA FASE 2 È FATTA E IL MENÙ È ONLINE.** `allergiapp.com/menu/<slug>`
risponde davvero. Vive sul branch `landing` (`api/menu/[slug].js`, `lib/render-menu.js`) e riusa la
ricetta già in piedi per `/r/` e `/u/`: una funzione che rende HTML dal server, niente framework —
**non è servito un progetto Vercel nuovo**, come invece diceva il Tema 13. Migrations **707, 708 e
709 APPLICATE**: slug sul locale; pubblicazione, scatto e manopole d'aspetto; ritiro dalla sala,
copertina, carattere, stile delle sezioni.

Quello che c'è, in breve: **indirizzo e QR** (PNG e vettoriale, con l'avviso "non stamparlo" finché
il menù non è pubblicato), **bozza e pubblicato** coi due presidi (avviso quando le modifiche non
pubblicate toccano gli allergeni; foto protette dalla cancellazione finché uno scatto le
referenzia), **pastiglia Attivo/Inattivo** per ritirare il menù dalla sala, e tutte le manopole
d'aspetto — pacchetti di stile, stile delle sezioni, copertina, foto e descrizioni. Il 2 settembre
un menù vero è stato pubblicato e riletto da fuori con la chiave pubblica: esce quello che deve, e
non esce nient'altro.

`lib/menu-sample.js` resta come contratto e per guardare la pagina senza database.

**Cosa NON c'è ancora**: le traduzioni delle condizioni al tavolo e dei blocchi di testo (Tema 18),
le statistiche degli scan (Tema 10), il rimando reciproco fra `/menu/` e `/r/` (Tema 13), e lo
svuotamento della cache alla pubblicazione. L'elenco in ordine sta in fondo, in "Prossimo passo".

**Due debiti aperti**, entrambi visibili a schermo e scritti in `partner/README.md`: la rinomina
"vetrina" → "Scheda AllergiApp" non è stata fatta (tenuta fuori di proposito dal giro in cui il
codice è stato rimesso in pari col database), e gli interruttori "in vetrina" in `/piatti` non
fanno più niente — i piatti accesi pendono dalla scheda, che senza claim non esiste.

---

## Decisioni prese

### 2026-08-30 — Tema 1: Cos'è, e perché ha senso

**Decisione**: dare al ristoratore un menù digitale interattivo (QR al tavolo, link da mettere
dove vuole), generato dagli stessi piatti che compila già per AllergiApp.

**Perché**: risolve il problema del punto di partenza. Oggi gli chiediamo di riempire un catalogo
in cambio di una promessa — visibilità dentro AllergiApp — che vale poco finché nella sua città
non ci sono utenti. Un menù digitale vale il primo giorno, indipendentemente da quanti utenti
abbiamo: è uno strumento che usa ai suoi tavoli. E il lavoro di inserimento è lo stesso: stesso
piatto, stessi allergeni, due prodotti.

**Implicazioni**: la scheda dentro AllergiApp smette di essere il motivo per iscriversi e diventa
il gradino successivo. Cambia l'ordine della vendita, non il prodotto.

### 2026-08-30 — Tema 2: La differenza non è il menù, è il filtro

**Decisione**: non costruire un editor di menù generico. Costruire **il menù che si filtra per
allergeni ed esigenze** — il cliente tocca "senza glutine, senza lattosio" e la carta si riordina.

**Perché**: i menù col QR sono una merce. Ci sono strumenti gratuiti e i fornitori di casse li
regalano nel pacchetto: entrando come "menù digitale" si perde contro chi lo fa da anni. L'unica
cosa che non ha nessun altro sono gli allergeni come dati strutturati invece che come testo libero
in fondo alla pagina.

**Implicazioni**:
- Il filtro non può essere una funzione a pagamento — è la dimostrazione del prodotto. Chiuderlo è
  come vendere un'auto senza far salire nessuno.
- **Aggiunta 2026-08-31 — il filtro RIORDINA, non nasconde.** I piatti che non vanno bene restano
  leggibili in fondo alla loro sezione, in grigio, col motivo scritto ("Contiene glutine"). Farli
  sparire darebbe due impressioni sbagliate: che il ristorante non abbia altro, e — più grave —
  che quello che resta sia stato *verificato*. Il dato è dichiarato dal ristoratore, e su un dato
  dichiarato una sparizione è una promessa che non possiamo mantenere.
- Per le esigenze (vegetariano, vegano…) il testo dice **"non indicato per"**, mai "non è": un
  piatto non dichiarato vegetariano non è un piatto con la carne, è un piatto su cui il ristoratore
  non si è espresso.
- Si offrono solo le pastiglie che servono: gli allergeni che qualche piatto del menù dichiara e le
  esigenze che qualche piatto soddisfa. Una pastiglia che non toglie niente è un bottone che non fa
  niente; una che svuota il menù è peggio.

### 2026-08-30 — Tema 3: Catalogo e menù sono due cose diverse

**Decisione**: il **catalogo** tiene i fatti del piatto (nome, allergeni, esigenze, foto,
traduzioni). Il **menù** è una composizione: quali piatti, in che sezioni, in che ordine, a che
prezzo, sotto quale marchio. Un ristoratore può avere più menù (carta, pranzo, bevande).

**Perché**: è lo stesso rapporto che esiste già fra catalogo e vetrina — la vetrina è una selezione
del catalogo per un locale. Il menù è una terza vista sulla stessa roba.

**Implicazioni**:
- Serve un oggetto nuovo, non un ripensamento del modello.
- **Il prezzo sta sull'accostamento piatto↔menù, non sul piatto.** Lo stesso piatto costa dieci a
  pranzo e quattordici a cena, e dentro un degustazione non ha prezzo affatto. È la ragione per cui
  la 700 non ha una colonna prezzo su `partner_dishes`: se qualcuno la aggiunge "per comodità",
  questa direzione si blocca al primo ristoratore che fa il menù di mezzogiorno.

### 2026-08-30 — Tema 4: Sezioni ≠ categorie

**Decisione**: le otto categorie restano un set fisso e uguale per tutti (`starters`,
`first_courses`, …). Le **sezioni** del menù sono testo libero del ristoratore: "Le nostre paste
fresche", "Dalla brace". Un piatto può essere `first_courses` per l'app e stare sotto "Le nostre
paste fresche" sulla carta.

**Perché**: le categorie sono dati per AllergiApp e servono a confrontare ristoranti fra loro,
quindi devono restare comparabili. Le sezioni sono presentazione, e sono del ristoratore.
È la differenza fra una classificazione e un indice, e non è duplicazione.

**Implicazioni**: **mai** lasciar rinominare le categorie per "semplificare". Romperebbe il filtro
dell'app senza che nessuno se ne accorga subito.

### 2026-08-30 — Tema 5: Un prodotto con due facce, non due prodotti

**Decisione**: un pannello solo. "Curi il tuo menù una volta, poi scegli dove appare: al tuo tavolo
e dentro AllergiApp."

**Perché**: un ristoratore che deve capire due abbonamenti e due pannelli non ne compra nessuno.

**Implicazioni**: i piani di prezzo possono essere due, il modello mentale dev'essere uno.

### 2026-08-30 — Tema 6: La pagina pubblica è un tavolo, non un pannello

**Decisione**: la pagina che il cliente apre col QR va servita **statica dal bordo**, non come
app che si accende e poi interroga Supabase. Candidata a diventare un deployable a sé — una
cartella nello stesso repo con un progetto Vercel suo, come già fanno landing e admin — **non**
un branch separato.

**Perché**: c'è un cliente in piedi che aspetta, spesso con due tacche di rete in una sala
interrata. È un livello di servizio diverso da quello di un pannello di gestione.

**Implicazioni**: **il lettore è anonimo, non ha nessuna sessione.** Tutte le policy partner
scritte finora presuppongono `auth.uid()`; quelle del menù pubblico vanno pensate al contrario —
leggibili da chiunque quando il menù è pubblicato. Conseguenza: in quelle tabelle non deve finire
niente di privato (contatti, note interne), perché lì la policy è l'unica difesa.

### 2026-08-30 — Tema 7: Il nemico è il menù vecchio

**Decisione**: la stella polare del progetto è che **cambiare un prezzo o togliere un piatto
esaurito costi dieci secondi dal telefono**.

**Perché**: i menù col QR muoiono tutti nello stesso modo, diventano vecchi. Se aggiornare costa
più che rifare il PDF, il ristoratore torna al PDF. Conta più della grafica.

**Implicazioni**: i prezzi cambiano anche il tono della cosa — un prezzo sbagliato sul menù è una
discussione al tavolo, non un dato impreciso in un'app.

### 2026-08-30 — Tema 8: Personalizzazione, poche manopole

**Decisione**: logo, un colore d'accento, due o tre aspetti già pronti. Non un configuratore con
palette, caratteri e disposizioni.

**Perché**: è la parte dove questi prodotti bruciano mesi ed è quella che rende meno — il
ristoratore ci passa venti minuti una volta sola, e la maggior parte delle scelte peggiora il
risultato. E va contro l'argomento di vendita: un menù che si vende come leggibile da chi ha
un'allergia non può lasciar scegliere testo beige su panna.

**Implicazioni**:
- Il contrasto resta una cosa che decidiamo noi, non un'opzione. In pratica: non un selettore di
  colore libero ma una fila di tinte già scelte, tutte scure abbastanza da reggere il testo.
- **Aggiunta 2026-08-31 — logo e colore appartengono alla VETRINA, non al menù.** Discende dal
  Tema 13: al tavolo carta, pranzo e bevande sono linguette della stessa pagina, quindi un logo
  per menù darebbe tre intestazioni diverse allo stesso ristorante nella stessa schermata. Si
  cambiano da dentro l'editor di un menù, perché è lì che se ne vede l'effetto, ma l'interfaccia
  deve dire che valgono per tutto il locale. In schema saranno due colonne su `partner_showcases`.

### 2026-08-30 — Tema 9: Le lingue diventano centrali

**Decisione**: le traduzioni scritte dal ristoratore hanno la precedenza (esistono già nel portale,
per piatto). La traduzione automatica arriverà come **bozza da approvare**, mai come testo
pubblicato di sua iniziativa.

**Perché**: sulla scheda AllergiApp il multilingua è un di più, e la traduzione automatica lato app
copre. Su un menù al tavolo in una città turistica è metà del motivo per comprarlo — ed è la carta
del ristorante, col suo nome sopra.

**Implicazioni**: qui torna utile la schermata a due colonne (originale a sinistra, traduzione a
destra, tutto il catalogo in una passata) che per il solo portale era stata messa da parte.

### 2026-08-30 — Tema 10: I gratuiti saranno la maggioranza, e sono l'inventario

**Premessa (dell'utente, non una previsione mia)**: molti ristoratori useranno solo il menù
digitale gratuito e non pagheranno mai per la scheda dentro AllergiApp.

**Perché cambia le cose**: un ristoratore che compila il catalogo produce esattamente il dato che
all'app serve e che oggi manca — allergeni dichiarati da chi cucina, strutturati come codici.
Anche senza un euro, quel dato è nel database. Quindi il piano gratuito non è un cliente mancato:
è il canale con cui l'app si riempie di contenuto vero.

**Implicazioni**:
- Il costo del prodotto è concentrato su chi non paga, e arriva prima dei ricavi (v. Tema 11).
- Il portale deve essere utile con **zero locali associati**: oggi non lo è, è costruito attorno
  alla vetrina e il claim è il cancello di tutto.
- La vendita si sposta dentro il prodotto gratuito. Il momento naturale non è un banner ma le
  statistiche: *"il 22% di chi ha aperto il tuo menù cercava senza glutine — vuoi che chi cerca
  senza glutine ti trovi anche quando non è già seduto da te?"*. È una proposta che nasce da un
  dato suo, non da un listino.

### 2026-08-30 — Tema 11: Il costo è quasi tutto foto, e la pagina si genera al salvataggio

**Decisione**: la pagina pubblica si **genera quando il ristoratore salva** e da lì in poi viene
servita dalla cache al bordo. Il cliente al tavolo non tocca mai il database.

**Perché**: un menù cambia raramente e viene letto continuamente. Così il costo di un menù non
dipende da quante persone lo aprono ma da quante volte viene modificato — che è l'unico rapporto
sostenibile con un prodotto gratuito. E la banda diventa quella della cache, non quella metrata
di Supabase.

**Implicazioni**:
- **Le foto sono l'ordine di grandezza, tutto il resto è rumore.** Quaranta piatti con le foto
  fatte male sono 3-4 MB a cliente; fatte bene stanno sotto i 200 KB. Servono due misure (miniatura
  per la lista, grande solo al tocco), un formato moderno, e il caricamento delle sole visibili.
  Oggi il portale fa la cosa peggiore: le foto sono data-URL dentro al testo salvato, quindi
  arriverebbero tutte intere a ogni apertura. Il passaggio a Storage non è ordine, è questo.
- Al cliente non va spedita l'applicazione: niente client Supabase, niente autenticazione, niente
  tempo reale. Il filtro allergeni gira sui dati già dentro la pagina, quindi resta istantaneo
  anche in una sala interrata con due tacche.
- **Rovescio da presidiare**: se la rigenerazione fallisce dopo un salvataggio, il cliente legge un
  menù vecchio con un prezzo sbagliato, e nessuno se ne accorge. Il portale deve confermare al
  ristoratore che la pagina pubblica è stata aggiornata (con l'ora), altrimenti la promessa dei
  "dieci secondi" del Tema 7 si rompe in silenzio.
- Se un giorno servisse un limite al piano gratuito, il posto economicamente sensato sono le
  **foto**, non i piatti né il filtro. Con la tensione dichiarata: le foto il cliente le vede, e
  un limite visibile al tavolo mette in imbarazzo il ristoratore.

### 2026-08-30 — Tema 12: Un solo progetto Supabase

**Decisione**: menù e portale stanno nello **stesso progetto Supabase**, stesso schema `public`.
La separazione si fa a livello di *servizio* — un progetto Vercel a sé per la pagina pubblica —
non a livello di dati.

**Perché**: l'identità sta in un progetto solo e il ristoratore fa un login solo; e il menù legge
il catalogo, che è il substrato comune. Separando, o si duplicano i piatti — e allora ci sono
**due verità sugli allergeni**, cioè la cosa che il prodotto esiste per evitare — o si chiama un
database dall'altro a ogni lettura.

**L'argomento contrario, per onestà**: due progetti gratuiti sono due quote gratuite. Ma è un
modello di costi fragile, e soprattutto risolve un problema che il Tema 11 elimina: con la pagina
generata al salvataggio il traffico dei clienti non passa da Supabase.

**Implicazioni**: se la spinta è l'isolamento, lo strumento non è un secondo progetto. La pagina
pubblica non ha **nessuna connessione al database** — viene generata con dentro solo i campi che
il cliente deve vedere. È un isolamento più forte di quello che darebbero due progetti.

### 2026-08-30 — Tema 13: L'indirizzo pubblico e il QR

**Decisione**: indirizzo sull'apice, nella forma `allergiapp.com/menu/<slug>`, copiabile e
trasformabile in QR dal portale.

**Perché l'apice e non un sottodominio**: ogni cliente a ogni tavolo legge il nome AllergiApp
mentre fa una cosa che gli è utile. Sui gratuiti, che saranno i più (Tema 10), è forse il ritorno
principale. Attrito da mettere in conto: l'apice oggi è del progetto landing, che sta su un branch
separato — si tiene l'indirizzo e si fa servire da un progetto suo con una riscrittura.

**Implicazioni**:
- **Lo slug appartiene al locale** (era scritto "alla vetrina"; v. Tema 16). Chi resta gratis non
  farà mai il claim e non avrà nessuna riga in `restaurants`: se lo slug dipendesse da quella, il
  gratuito non potrebbe avere un indirizzo.
- **Lo slug finisce stampato.** Un QR viene plastificato sul tavolo e appiccicato alla vetrina:
  cambiarlo rompe oggetti fisici già in giro per il locale. Quindi si sceglie una volta, si cambia
  solo con un avviso esplicito, i vecchi indirizzi reindirizzano per sempre e **non si riciclano
  mai** — o il QR di Mario porta i clienti da Giuseppe.

  > ⚠️ **CORREZIONE 2026-08-31.** Qui c'era scritto che "per `/r/` lo stesso problema era già stato
  > affrontato con gli slug ritirati". **È falso**, e va detto perché è stato ripetuto come se fosse
  > vero. `SHARE_FEATURE.md`, Tema 2 sub del 2026-05-26, decide l'opposto: *"Rischio accettato.
  > Niente tabella `retired_slugs`"*. Su `/r/` uno slug liberato oggi **si ricicla**, e il vecchio
  > link porta silenziosamente sul ristorante nuovo. Là era accettabile — un link vive in una chat.
  > Qui no: il link vive plastificato su un tavolo, e il ristoratore non può né accorgersene né
  > rimediare, perché l'oggetto è fisico. Quindi il meccanismo per il menù **va costruito da zero**,
  > non riusato.
- **Un indirizzo per locale, non per menù.** Il QR è incollato al tavolo e non cambia a mezzogiorno:
  carta, pranzo e bevande si scelgono *dentro* la pagina. Tutto ciò che varia sta dentro, perché il
  supporto è fisico e costante.
  > **Precisazione 01/09**: le linguette si vedono **da due menù in su**. Il nome di un menù esiste
  > per distinguerlo da un altro: con un menù solo la linguetta mostra al cliente un'etichetta che
  > non dice niente e non si può nemmeno premere. Domanda dell'utente — *"che senso ha la pill con
  > il nome del menù?"* — e non ne aveva.
- Il QR lo genera il portale, in PNG **e in vettoriale**: chi lo porta in tipografia ha bisogno del
  secondo, e se non glielo diamo se lo fa fare male altrove.
- Da decidere come convivono `/menu/<slug>` e `/r/<slug>` per un locale rivendicato: sono due pagine
  pubbliche dello stesso posto e devono almeno rimandarsi a vicenda.
- **Aggiunta 2026-08-31 — nel portale esiste `/menu/<id>/anteprima`, e NON è questo indirizzo.**
  È un'anteprima a tutta pagina dietro l'autenticazione, aperta in una scheda a parte dall'editor,
  e porta in cima una fascia che lo dice. Serve a guardare il risultato adesso, non a distribuirlo:
  la cosa da non far succedere è che qualcuno ci stampi sopra un QR. Quando l'indirizzo pubblico
  esisterà, questa route o resta come "vedi come viene" o sparisce.

---

## Aperto, non deciso

**Il contenuto gratuito entra in AllergiApp?** È il bivio che discende dal Tema 10, e oggi la 700
risponde di no: si vede in app solo ciò che sta in una vetrina `published`, cioè con abbonamento
attivo. Le due strade sono (a) tutto dietro il muro — pulito, coerente col premium, ma si butta via
il contenuto di chi non paga; (b) i piatti e gli allergeni visibili anche dal gratuito, mentre
restano a pagamento le cose che servono al ristoratore (link, prenotazione, delivery, risalto,
statistiche). La (b) sembra più forte proprio se i gratuiti saranno i più, perché altrimenti l'app
resta con pochi ristoranti visibili e una montagna di dati fermi. Ha però implicazioni legali e di
responsabilità che vanno pesate prima, non dopo.

**Il confine del freemium.** Orientamento emerso, da riprendere in `MONETIZATION.md` quando si
arriva ai prezzi: gratis un menù completo, piatti illimitati, filtro allergeni, QR su un nostro
sottodominio con un piccolo marchio; a pagamento logo e colori propri, più menù, dominio proprio,
traduzioni assistite, la scheda AllergiApp e **le statistiche**. La regola che terrei ferma è una
sola: **mai limitare quello che vede il cliente al tavolo** — niente "massimo dieci piatti", niente
filtro chiuso. Qualunque limite che imbarazzi il ristoratore davanti ai suoi clienti non ce lo
perdona.

Nota: le statistiche degli scan ("il 22% di chi ha aperto il tuo menù cercava senza glutine") sono
l'unica voce di quell'elenco che dà un motivo per pagare **ogni mese**. Il logo lo carichi una
volta e non ci pensi più.

**Cosa serve davvero a un menù, oltre al catalogo.** Prezzi, sezioni, bevande, varianti (porzione
piccola e grande), menù del giorno. Il modello oggi non ha niente di tutto questo, e non per
dimenticanza: ad AllergiApp servivano nome e allergeni.

### 2026-08-31 — Tema 14: Il menù pende dalla vetrina ~~e non è un nodo aperto~~ — **SUPERATO dal Tema 16**

**Decisione**: il menù (e quindi lo slug del Tema 13) si appende alla **vetrina**, non a una riga
in `restaurants`.

**Perché non è un problema**: sembrava un nodo perché il gratuito non farà mai il claim e non avrà
nessun locale rivendicato. Ma la vetrina esiste già senza claim — `partner_showcases.restaurant_id`
nasce NULL e la 700 lo dice esplicitamente — quindi anche chi non paga ha dove appendere il suo
menù e il suo indirizzo pubblico. Non serve un oggetto nuovo, e non serve toccare la 700.

**Implicazione**: il vincolo "una sola vetrina per locale" vale solo dopo il claim (è un indice
parziale su `restaurant_id` non nullo), quindi non limita chi resta gratuito.

> **Superato il 2026-08-31 (sera), v. Tema 16.** La conclusione — "il menù ha dove appendersi
> anche senza claim" — resta giusta. Sbagliato era l'oggetto: appendendolo alla *vetrina*, il menù
> dipendeva da una cosa che parla di AllergiApp, mentre chi usa solo il menù di AllergiApp non sa
> nemmeno di doversene occupare. Si appende al **locale**, che è quello che la vetrina stava
> facendo per sbaglio.

### 2026-08-31 — Tema 15: Un piatto un prezzo, e le sezioni sono del menù

Le due decisioni che il Tema 3 e il Tema 4 lasciavano aperte, e che bloccavano lo schema.

**Prezzo**: importo in **centesimi interi**, sulla riga menù↔piatto, facoltativo. Interi perché
sui soldi la virgola mobile sbaglia e un prezzo sbagliato sul menù è una discussione al tavolo
(Tema 7); facoltativo perché dentro un degustazione i piatti non hanno prezzo, ce l'ha il menù.
La **valuta sta sul menù**, non sulla riga: un menù con due valute dentro non esiste, e chiederla
per piatto sarebbe quaranta volte la stessa risposta.

**Varianti (porzione piccola e grande): NO, per ora.** Dentro un menù un piatto compare una volta
sola — è un `UNIQUE (menu_id, dish_id)`. Con una precauzione che costa zero: la riga ha un **id
suo** invece della chiave composta, quindi il giorno che le varianti servono davvero si toglie
quel vincolo e si aggiunge un'etichetta facoltativa, e le varianti sono due righe dello stesso
piatto. Con la chiave composta si sarebbe invece dovuto rifare le chiavi e il client che ci si
appoggia. È l'unica conseguenza spiacevole della scelta semplice, ed è disinnescata.

**Sezioni: appartengono al menù**, non al partner. Riusabili fra menù diversi pagherebbero solo
per chi ha più menù con la stessa struttura, e costerebbero subito tre domande senza risposta
ovvia (il nome è del menù o globale? l'ordine di chi è? cancellarne una tocca menù che il
ristoratore non sta guardando?). Il caso vero — "il pranzo ha la stessa struttura della carta" —
si copre con un **duplica menù** nel portale.

**Implicazioni**:
- La sezione è **facoltativa** sulla riga: chi butta dentro dieci piatti prima di pensare agli
  intertitoli non va fermato da un campo obbligatorio. Le righe senza sezione stanno in cima.
- **Eliminare una sezione non porta via i piatti**: risalgono fuori sezione, col loro prezzo.
  Perdere sei prezzi per aver rinominato male un intertitolo sarebbe un castigo sproporzionato,
  e silenzioso.
- Promuovere le sezioni a riusabili domani si può; tornare indietro no.

### 2026-08-31 — Tema 16: Il locale, e tre cose indipendenti

**Decisione**: al centro del portale c'è il **locale** — nome, logo, colore, e domani l'indirizzo
pubblico. Sotto ci stanno tre cose che si accendono **in qualunque ordine e anche da sole**:

```
Catalogo piatti ──┬── Menù (QR al tavolo)      non tocca l'app
                  │
                  └── piatti sulla scheda ─┐
                                           ├── Scheda AllergiApp
      Link e contatti ─────────────────────┘   (claim + abbonamento)
```

**Perché**: la "vetrina" faceva da contenitore a tutto, ed è una parola che parla di AllergiApp.
Ma chi resta gratuito — la maggioranza, Tema 10 — di AllergiApp non gli importa niente: vuole il
menù sul tavolo. Farlo passare da un oggetto che si chiama vetrina è l'attrito che il Tema 10
denunciava già ("il portale è costruito attorno alla vetrina e il claim è il cancello di tutto").

**Le tre cose sono davvero indipendenti**, e nessuna è il passaggio obbligato dell'altra:
- c'è chi vuole **solo i link** sulla sua scheda in app e non compilerà mai un piatto;
- c'è chi vuole **solo il menù** e non farà mai il claim;
- il catalogo è il substrato *quando serve*, non il primo passo di un percorso a tappe.

**Implicazioni**:
- **La scheda esiste solo dopo il claim.** Sparisce lo stato "vetrina bozza non ancora associata",
  che esisteva solo perché era l'unico posto dove mettere le cose prima del claim. Adesso quel
  posto è il locale.
- **"Vetrina" si chiamerà "Scheda AllergiApp"**: dice dove finisce la roba, e il ristoratore sa
  già cos'è una scheda perché la vede nell'app. "Vetrina" non dice dove. *(Fatta la sera del 31/08 —
  v. il riquadro in fondo alle implicazioni. Il contenitore, cioè l'elenco e la rotta, si chiama
  invece **locale**: la scheda è una delle tre cose che ci si accendono sopra, non il contenitore.)*
- **I link stanno sul locale, non sulla scheda.** Sono fatti del posto — il telefono per prenotare
  è lo stesso ovunque compaia. Così li può mostrare anche il menù al tavolo, dove un "Prenota" ci
  sta benissimo, senza riscriverli.
- **Il nome del locale va CHIESTO**, non dedotto: senza claim non esiste nessun'altra fonte.
  Si chiede quando serve — alla creazione del primo menù — e non all'iscrizione, dove sarebbe un
  ostacolo prima di aver dato qualcosa. Da lì escono l'intestazione del menù e lo slug proposto.
- Il portale vuole una **home** che mostri le tre cose e a che punto sono, invece dell'elenco delle
  vetrine. Non un percorso a tappe: tre interruttori. *(**FATTA il 31/08 sera**, e **rifatta il
  01/09** — v. la nota qui sotto.)*

> **01/09 — Le cose a schermo sono DUE, non tre.** Decisione dell'utente dopo aver visto la prima
> versione: *"quella dovrebbe essere la scheda dedicata quando si vuole andare a definire i link e
> contatti (deve rientrare nella scheda AllergiApp)"*. Quindi la home mostra **menù al tavolo** e
> **scheda AllergiApp**, e i link si definiscono dentro la scheda, che è la pagina `/locale/[id]`.
>
> **Non contraddice il Tema 16, lo precisa**: "i link stanno sul locale" resta vero *sul database*,
> ed è la ragione per cui domani li potrà mostrare anche il menù pubblico senza riscriverli. Quello
> che cambia è il **posto in cui si modificano**, che è uno solo — e il ristoratore non ha nessun
> motivo di sapere a quale riga sono appesi.
>
> Nella stessa passata: la home **saluta per nome**, **non si chiama più "Locali"** (era il nome di
> un archivio, non di una home), ha le **azioni rapide** che aprono la maschera già pronta, e
> **creando un locale ci si resta** invece di finire dritti nella scheda — che per chi vuole solo il
> menù al tavolo è la schermata sbagliata da mostrare per prima.
- **Aggiunta 2026-08-31 — alla creazione di un menù la domanda è "di quale locale?".** Non
  "che nome dai al menù": un menù non è "la Carta", è la carta *di qualcuno*, e il nome che conta —
  quello che il cliente legge in cima e da cui uscirà lo slug — è quello del locale. Il nome del
  menù è solo l'etichetta della linguetta, quindi si chiede dal **secondo** menù dello stesso locale
  in poi: al primo non c'è niente da cui distinguerlo. Da lì si può anche creare un locale
  nuovo, perché uno stesso partner può averne più d'uno.

> ✅ **FATTA il 2026-08-31 (sera): la rinomina.** Il tipo è `Venue`, il modulo `src/lib/venues.ts`,
> la rotta `/locale/[id]`; le schermate dicono **locale** per il contenitore e **scheda AllergiApp**
> per quello che finisce nell'app. Nel dizionario "vetrina" non compare più in nessuna delle due
> lingue.
>
> **Cosa l'ha resa urgente**: la domanda dell'utente — *"non capisco come mai il menù lo devo
> associare a una vetrina, dovrebbero essere cose parallele"*. Ed erano parallele davvero: il menù
> pende dal locale, non dalla scheda, esattamente come dice questo tema. A confonderlo era solo che
> **la stessa riga aveva due nomi in due schermate** — "Nome della vetrina" (con placeholder *"come
> vuoi chiamarla"*, cioè un'etichetta privata) nell'editor, "Nome del locale" nell'editor del menù,
> dove però quel nome lo leggono i clienti in cima alla pagina al tavolo. Chi lo compilava la prima
> volta scriveva un promemoria per sé e se lo ritrovava stampato sul menù.
>
> Morale, per la prossima volta: **un debito di sole parole non è cosmetico** se le parole in
> disaccordo descrivono la stessa riga. Qui è costato un'incomprensione sul modello a chi il modello
> l'aveva disegnato il giorno prima.
>
> **Trovato mentre la si faceva**: eliminare un locale dalla lista **porta via i suoi menù** (cascata
> della 704), e la finestra di conferma parlava ancora solo di link — l'annulla rimetteva in piedi
> locale, link e piatti accesi, e lasciava perso il lavoro vero. Adesso i menù si contano e si
> dicono prima, e l'annulla li ripristina con gli stessi id (prima il locale, poi i menù, o la
> chiave esterna li rifiuta).

**La finestra per farlo è adesso** (verificato il 2026-08-31): fuori dal portale **nessuno** legge
le tabelle `partner_*` — né l'app né l'admin — e dentro c'è solo roba di prova. Si chiude appena
l'app comincia a leggerle.

**Rimandato con cognizione**: modelli di business su visibilità e posizionamento, e la domanda "chi
paga solo per i link contribuisce zero dati sugli allergeni?". Decisione dell'utente il 31/08:
prima si fa funzionare il flusso. Resta scritta qui per non riscoprirla al primo che compra.

### 2026-08-31 — Tema 17: Gli slug non si riassegnano, e non a tempo — **SUPERATO dal Tema 22**

> ⚠️ La decisione qui sotto è stata **rovesciata il 2026-09-01** (Tema 22): un locale ha un
> indirizzo alla volta, e cambiandolo il precedente torna libero. Il ragionamento sulla quarantena
> resta valido e vale la pena rileggerlo — è il motivo per cui non esiste un tempo di attesa — ma
> la valvola dell'admin che libera a mano non c'è mai stata e non ci sarà.

**Decisione**: uno slug usato una volta **non torna mai disponibile da solo**. Niente quarantena a
scadenza. L'unica via per liberarne uno è un **admin che lo fa a mano**, su richiesta.

**La domanda a cui risponde** (posta il 31/08): "e se li bloccassimo solo per un certo periodo?
altrimenti a tendere i nomi diventano difficili da dare". Cioè: lo spazio dei nomi si esaurisce.

**Perché la quarantena non serve**:
- **Lo spazio dei nomi lo occupano i locali VIVI, non i ritirati.** I ritirati sono solo quelli che
  chiudono o cambiano indirizzo: una frazione piccola. Se un giorno `trattoria-da-mario` è difficile
  da ottenere è perché c'è una trattoria da Mario *aperta* che ce l'ha, e riciclare i morti non
  cambia niente. Sarebbe un meccanismo per liberare il 2% mentre il 98% resta occupato lo stesso.
- **I due errori non costano uguale.** Tenere uno slug bloccato per sempre costa una riga di testo:
  un milione di slug ritirati sono qualche decina di MB, mai un problema. Rilasciarlo troppo presto
  manda una persona con un'allergia, seduta a un tavolo, sul menù di un altro ristorante.
- **La durata non è tarabile.** I registrar usano mesi perché il danno è commerciale; qui l'orologio
  è quanto dura un adesivo su una vetrina, e la risposta onesta è che non lo sappiamo. Si sceglierebbe
  un numero a caso, scoprendo se era sbagliato solo dal caso in cui va male.

**La valvola**: un admin può liberare uno slug su richiesta — raro, deliberato, e l'audit per
registrarlo esiste già (`partner_audit_log`). Nel caso più frequente, stesso locale sotto nuova
gestione, mandare i vecchi QR al nuovo ristorante è per giunta quello che si vuole.

**Due implicazioni da non perdere**:
- **Uno slug ritirato non dà 404.** Chi è al tavolo col telefono in mano deve leggere "questo menù
  non è più attivo", non una pagina rotta.
- **Il suffisso numerico dei doppioni non va bene qui.** Su `/r/` la 059 fa `da-mario-pisa-2` e va
  benissimo, perché quell'indirizzo non lo legge nessuno. Questo il ristoratore se lo stampa su una
  locandina: sul doppione gli si propone un'alternativa vera — la via, il quartiere — non un numero.

---

### 2026-09-01 — Tema 18: Il fondo del menù è del ristoratore

Nasce da tre richieste arrivate insieme — una ricerca nel menù, una nota finale al posto del
disclaimer, dei blocchi di solo testo fra le sezioni — e si chiude con **una funzione in meno di
quelle chieste** e una decisione che tocca il tono di tutto il prodotto.

**La ricerca è stata scartata**, e non per costo. Il nodo era semantico: se il cliente cerca
"glutine", una ricerca testuale onesta gli restituisce i piatti che il glutine **ce l'hanno** —
l'esatto contrario di quello che intende un celiaco, con l'aria di essere una risposta. Restava
la versione sicura (cercare solo nei nomi e nelle descrizioni, e sugli allergeni proporre la
pastiglia del filtro invece dei piatti), ma su un menù da trenta righe è un campo che quasi
nessuno tocca. Quel che serviva davvero era **arrivare prima alla propria pastiglia**, e quello
si è fatto (v. sotto).

**Decisione 1 — il disclaimer scende dal menù al tavolo.** "Dichiarato dal ristorante, non
verificato da AllergiApp" **non compare più** in fondo alla pagina che si apre col QR. Al tavolo è
il ristorante che ti porge il **suo** menù: nessuno pensa che una carta stampata sia stata
verificata da un terzo, e il QR non cambia la cosa.

Dove quella frase resta, e dove serve davvero, è la **scheda in app**: lì siamo NOI a presentare
un ristorante a chi lo sta scegliendo da lontano, e la responsabilità è di un'altra natura.

**Ma non sparisce del tutto dal menù, si sposta**: una riga minuscola sotto le pastiglie —
"allergeni e ingredienti dichiarati dal ristorante" — perché il **filtro è l'unica cosa nostra**
in quella pagina, ed è l'unico punto in cui un cliente potrebbe leggere una verifica che non
abbiamo fatto. Non è una copertura legale in fondo alla pagina: è dire da dove viene il dato
accanto allo strumento che ci lavora sopra. Il fondo, liberato, diventa del ristoratore.

**Decisione 2 — due contenitori di testo, non uno.** La nota finale e i blocchi fra le sezioni
sembravano la stessa cosa (senza il disclaimer da scavalcare, una "nota finale" è solo un blocco
messo per ultimo), ma si comportano diversamente rispetto alle **linguette**:

- **Le condizioni al tavolo** — coperto, servizio, pagamenti — stanno sul **LOCALE**
  (`partner_venues.table_conditions`) e compaiono in fondo a **ogni** menù. Come blocco andrebbero
  riscritte in carta, pranzo e bevande, e poi corrette in tutte e tre: il coperto non cambia
  passando da una linguetta all'altra, perché è lo stesso tavolo.
- **I blocchi di testo** stanno sul **menù**, come sezioni di tipo `note`
  (`partner_menu_sections.kind`), e servono a quello che è di quel menù lì: "il pane è fatto in
  casa", "la cucina chiude alle 22:30".

Le due cose non si pestano i piedi, e ognuna fa il mestiere in cui l'altra sarebbe scomoda.

**Perché il blocco è una SEZIONE e non una riga né una tabella nuova**: nel menù occupa lo stesso
posto di una sezione — sta nella stessa fila e si trascina con lo stesso gesto. Un'altra tabella
avrebbe voluto un secondo ordinamento da fondere col primo, per un contenuto che è già "un titolo
più un testo", cioè esattamente le colonne che la sezione ha (`name`, `description`).

**Decisione 3 — le pastiglie hanno una graduatoria, e un pannello.** Erano nell'ordine delle
costanti: prima tutti e quindici gli allergeni, poi le esigenze, su una riga sola che scorre — chi
è vegetariano doveva scorrere oltre nove allergeni per trovarsi, cioè non si trovava. Adesso:

- **Una graduatoria sola e mescolata** (glutine · vegetariano · vegano · latte · uova · frutta a
  guscio · arachidi · il resto): al tavolo nessuno pensa "allergene o esigenza", pensa alla cosa
  sua. **È fissa, non calcolata sul menù**: chi ha un'allergia cerca la sua parola e la trova
  sempre nello stesso punto, in ogni ristorante. Una graduatoria che cambia di locale in locale
  risparmierebbe mezzo dito di scorrimento e costerebbe l'abitudine.
- **Un bottone "Filtri" ancorato a sinistra**, fuori dalla parte che scorre, che apre l'elenco
  intero. È lì, e non nella fila, che ha senso separare esigenze e allergeni: in un elenco due
  titoletti aiutano a scorrere, in una fila da sette sarebbero una barriera in mezzo.
- **Le pastiglie accese risalgono sempre in testa alla fila.** È la regola che tiene insieme le due
  cose: senza, si sceglie dal pannello, si chiude, il menù si riordina sotto gli occhi e il motivo
  è fuori schermo a destra — il cliente vede un effetto senza vederne la causa.

Resta valida la regola del Tema 2: si offrono solo le pastiglie che questo menù usa davvero,
quindi il pannello non è mai un muro di quindici voci.

**Rimandato, ed è la versione forte di "gerarchizzare"**: chi apre il menù **dall'app** invece che
dal QR ha già le sue esigenze nel profilo, e le sue pastiglie potrebbero essere in cima e già
accese. Dal QR non si può — il lettore è anonimo, Tema 6 — quindi è roba della fase 2.

**Da sistemare prima della pagina pubblica**: i piatti hanno le traduzioni per lingua
(`partner_dish_translations`, Tema 9), questi due testi no. Al primo cliente straniero il menù è
tradotto e il "coperto 2 €" è in italiano. Non blocca niente adesso; va deciso **insieme** alla
pagina pubblica, non dopo.

---

### 2026-09-01 — Tema 19: Un menù per locale, con un interruttore

**Decisione**: in questa fase **un locale ha un menù**. Non perché il modello sia sbagliato — più
menù è la cosa giusta al tavolo, ed è già scritta nel confine del freemium come voce **a
pagamento** — ma perché oggi complica il portale per tutti allo scopo di servire una cosa che non
si vende ancora.

**Il tappo è nel PORTALE, non nel database.** `partner_menus` resta com'è: una riga per menù,
nessun vincolo di unicità sul locale. Un `UNIQUE (venue_id)` avrebbe descritto lo stesso stato di
oggi, ma sarebbe stato la cosa difficile da togliere il giorno in cui più menù diventa una voce
del listino — e quel giorno è previsto, non ipotetico.

**Come si accende**: `MULTI_MENU` in `partner/src/lib/features.ts`, `true`, e torna tutto quello
che c'era prima. Sta in un file del codice e non in una variabile d'ambiente perché la sua forma
successiva non è una configurazione del sito: è il **piano del ristoratore letto dal database**, e
una variabile d'ambiente andrebbe buttata via il giorno dopo avendo intanto sparso la stessa
decisione fra il codice e la configurazione di Vercel.

**Cosa sparisce con l'interruttore spento** (tutto ciò che esisteva solo perché i menù potevano
essere tanti):

- la domanda **"come si chiama il menù?"** nella finestra di creazione, e con lei quella che
  battezzava il menù già esistente: nessun locale ne avrà due, quindi non c'è niente da
  distinguere;
- i locali che il menù ce l'hanno già **escono dalla tendina**; se non ne resta nessuno la finestra
  lo dice e chiede il nome di un **locale nuovo**, invece di far trovare "Nome del locale" a chi
  aveva premuto "Nuovo menù";
- l'azione rapida **"Nuovo menù"** in home sparisce quando quel locale il menù ce l'ha, e la
  scorciatoia `/menu?nuovo=<id>` **apre** quel menù invece di proporne un secondo;
- nelle liste un menù senza nome si chiama **"Menù"** e non "Menù senza nome": rimproverare
  un'assenza che è una nostra scelta è una svista che si vede a schermo.

**Le linguette non sono state toccate**: si vedevano già da due menù in su (precisazione del Tema
13), quindi con l'interruttore spento non compaiono da sole.

**Chi ha già più di un menù li tiene**: restano in elenco, si aprono, si eliminano. Spegnere una
funzione non è nascondere il lavoro di chi l'aveva usata — e non c'è nessuna migrazione di dati da
fare, in nessuna delle due direzioni.

**Nella stessa passata**, una cosa vista dall'utente: il campo *"E quello che hai già, come si
chiama?"* aveva come segnaposto **"Carta"**. Dentro un campo vuoto un nome plausibile si legge
come una risposta già data, e chi ha fretta conferma senza scrivere niente. Adesso i segnaposto di
quei campi sono **esempi dichiarati** ("es. Carta", "es. Pranzo"), e il campo del menù nuovo non
ripete più l'etichetta che ha sopra.

---

### 2026-09-01 — Tema 20: La pubblicazione è uno stato in avanti, non un interruttore

**Domanda**: anche con un menù solo, il ristoratore deve poter decidere se è **attivo o
disattivato**?

**Oggi no, e non è pigrizia**: non esiste niente di pubblico. L'unico posto in cui il menù si vede
è l'anteprima, che sta dietro l'accesso del ristoratore. Un interruttore spegnerebbe una cosa che
nessun cliente può già vedere, e sarebbe una manopola da mantenere per zero effetto.

**Con la pagina pubblica (fase 2) la domanda diventa vera, e la risposta è uno stato SOLO, che va
in avanti**: *non ancora pubblicato* → *pubblicato*. Non un acceso/spento.

**Perché**: il QR è plastificato sul tavolo e appiccicato alla vetrina. Prima della pubblicazione
l'indirizzo non esiste e il ristoratore lavora tranquillo — ed è già così oggi, senza bisogno di
un campo. Dopo, "disattivare" non nasconde niente: trasforma un oggetto fisico già in giro per il
locale in un cartello che porta a una pagina morta, e il ristoratore non se ne accorge finché non
glielo dice un cliente seduto al tavolo. È lo stesso ragionamento del Tema 13 sugli slug che non
si riciclano: il supporto è fisico, quindi le decisioni sono a senso unico.

**Serve comunque una via d'uscita**, ma non è la sparizione: se il locale chiude, cambia gestione
o smette di usarci, la pagina **resta e lo dice** ("il menù non è al momento disponibile"), perché
davanti a un cliente al tavolo è meglio di un errore del browser. Chi lo implementa non lo faccia
diventare un 404.

> **Fatta il 2026-09-02** (migration 709, chiesta dall'utente: *"manca la possibilità di
> disattivare il link"*). `unpublish_menu()` rimette `published_at` a NULL e **lascia lo scatto
> dov'è**, per due motivi: le foto dei piatti sono protette dalla cancellazione finché uno scatto
> le referenzia (`photo_in_published_menu`, 708) — buttandolo via, la prima sostituzione di una
> foto porterebbe via il file e riattivando resterebbero immagini rotte — e così si sa sempre cosa
> c'era in sala l'ultima volta. **Riattivare passa da `publish_menu()`**, non dal rimettere la
> data: nel frattempo la bozza è andata avanti, e tornare in sala con lo scatto di sei mesi prima
> vorrebbe dire pubblicare prezzi vecchi senza che nessuno l'abbia chiesto.
>
> Il comando sta **in fondo alla sezione dell'indirizzo e sottovoce**, lontano dal "Pubblica" che
> si preme tutti i giorni, e la conferma non chiede "sei sicuro?" ma dice **cosa succede ai QR già
> in giro** — l'unica cosa che il ristoratore non può vedere da solo.

**Nota su cosa NON è questo**: l'acceso/spento vero serve alla **scheda in app**, dove siamo noi a
mostrare il ristorante a chi lo cerca da lontano — ed è già governato dal claim e
dall'abbonamento. Il menù al tavolo è del ristoratore, e lì la domanda è un'altra.

---

### 2026-09-01 — Tema 21: La lingua non sta nell'indirizzo stampato

**Domanda**: ha senso un `/it` o un `/en` nell'indirizzo del menù?

**Decisione**: sì per gli indirizzi in più, **no per quello che finisce sul QR**.
`allergiapp.com/menu/<slug>` resta senza lingua ed è il canonico; le versioni per lingua esistono
come indirizzi aggiuntivi (`/menu/<slug>/en`), e non si stampano mai.

**Perché**: il QR sul tavolo è **uno** e lo inquadrano un tedesco, un francese e uno del posto. Con
la lingua nell'indirizzo stampato restano due strade, entrambe sbagliate: un QR per lingua (nessun
ristoratore lo fa) oppure la lingua del ristoratore stampata addosso a tutti — cioè la lingua
sbagliata proprio al cliente per cui questo prodotto esiste, lo straniero con un'allergia che non
sa leggere il menù.

**Implicazioni**:
- L'indirizzo canonico **sceglie la lingua alla lettura** (quella del telefono), con un selettore
  ben visibile in cima: l'automatismo sbaglia sempre qualcuno, tipicamente chi ha il telefono in
  inglese e parla italiano.
- Le versioni per lingua servono a due cose vere — mandare il menù a qualcuno nella sua lingua, e
  farsi indicizzare (una pagina per lingua con i rimandi reciproci è l'unico modo perché una
  ricerca tipo "menu senza glutine Pisa" arrivi qui). Il canonico resta quello senza lingua.
- **La lingua non tocca mai lo slug.** Se un giorno diventa un prefisso invece di un suffisso,
  l'indirizzo stampato non cambia: l'unica parte irreversibile è il nome del locale.
- Suffisso e non prefisso (`/menu/mario/en`) per tenere corto il canonico e mettere il nome del
  locale subito dopo il dominio — è quello che il ristoratore legge e riconosce sulla locandina.

**Tira dentro il punto lasciato aperto dal Tema 18**: i piatti hanno le traduzioni
(`partner_dish_translations`), le **condizioni al tavolo** e i **blocchi di testo** no. Al primo
cliente straniero il menù è tradotto e il "coperto 2 €" è in italiano. Non blocca lo slug; si
decide insieme alla pagina pubblica, che è il momento in cui si vede.

---

### 2026-09-01 — Tema 22: Un indirizzo alla volta, e cambiarlo lo libera

**Decisione**: il locale ha **un indirizzo alla volta**. Si può cambiare quando si vuole, e il
precedente **torna libero**. Nessuno storico, nessun reindirizzamento, nessuna coda di slug da
liberare a mano. Una colonna sola (`partner_venues.slug`, migration 707).

**Rovescia il Tema 17**, che teneva ogni slug occupato per sempre con la valvola di un admin che
lo libera su richiesta. L'obiezione dell'utente, ed è quella giusta: *"secondo me un utente non
libererà mai gli slug"*. Una valvola che nessuno aziona non è una valvola: è una coda di richieste
che non evade nessuno, e nel frattempo il ristoratore che torna dopo sei mesi non può riprendersi
il proprio nome.

**Cosa si perde, detto per intero**: un QR già stampato smette di funzionare quando il ristoratore
cambia indirizzo. Ma va guardato **chi lo rompe** — è lui, con un gesto suo, dentro il portale, non
un terzo che gli soffia il nome mentre non guarda. Un gesto si copre con un **avviso al momento
giusto**; il caso del terzo, no, e per quello serviva una tabella. Il pericolo che giustificava la
macchina non è il pericolo che resta.

**Quindi l'avviso è la funzione**, e ha un posto preciso (Tema 20):

- **Prima della pubblicazione** l'indirizzo si cambia in silenzio: non esiste niente di stampato,
  non c'è niente da proteggere. È lo stato di tutti, oggi.
- **Dopo**, lo stesso gesto porta scritto che i QR in giro smetteranno di funzionare e vanno
  ristampati. Il posto dove metterlo è la card dell'indirizzo nell'editor del menù, ed è annotato
  nel componente: è l'ultimo punto in cui il ristoratore può ancora fermarsi.

**Resta valido del Tema 17**, e non va perso nella riscrittura:

- **Un indirizzo che non esiste più non dà 404.** Chi è al tavolo col telefono in mano deve leggere
  "questo menù non è più attivo", non una pagina rotta del browser.
- **Niente suffisso numerico sui doppioni.** Su `/r/` la 059 fa `da-mario-pisa-2` e va benissimo,
  perché quell'indirizzo non lo legge nessuno. Questo finisce su una locandina: sul doppione si
  propone un'alternativa vera — la via, il quartiere — non un numero.
- **Nessuna quarantena a tempo.** Non c'è un orologio da tarare, perché non sappiamo quanto duri un
  adesivo su una vetrina. Qui il punto non si pone nemmeno più: la liberazione è immediata e la
  decide il ristoratore, non un timer.

**È reversibile, e questo è il motivo per cui si può scegliere il semplice adesso**: se un giorno i
reindirizzamenti servissero davvero, si aggiungono senza disfare niente — la colonna resta com'è e
si comincia a tenere lo storico da quel giorno in poi. L'unica cosa che non si recupera sono i
cambi avvenuti prima, e prima della pubblicazione non ce n'è nessuno che conti.

**Cos'è stato fatto** (2026-09-01, migration applicata il 02/09): migration **707 APPLICATA** — colonna `slug`, vincoli di
forma (minuscolo, `a-z0-9-`, 3–60 caratteri), indice unico globale, e la funzione
`partner_slug_taken` che risponde solo sì/no perché le RLS non lasciano vedere i locali altrui. Nel
portale, in fondo all'editor del menù, la card **"Indirizzo del menù"**: proposta ricavata dal nome
del locale, controllo di disponibilità mentre si scrive, e la pastiglia **"Non ancora attivo"** —
la pagina pubblica non esiste, e la cosa da non far succedere è che qualcuno ci stampi sopra un QR.

---

### 2026-09-02 — Tema 23: L'aspetto del menù, e le manopole che non ci saranno

**Decisione**: la scatola "Colore" nell'editor diventa **"Aspetto del menù"**, e accanto al colore
ci stanno due interruttori: **foto dei piatti** e **descrizioni sotto ai piatti**. Vivono sul
LOCALE come il logo e il colore — al tavolo è una pagina sola.

**Da dove nasce**: dall'osservazione dell'utente che *"molti ristoranti non hanno le foto dei
piatti e mettere il box con il placement neutro non sta bene: è meglio non vedere niente"*. Quel
caso — nessuna foto in tutto il menù — è stato risolto **in automatico** lo stesso giorno: la
colonna sparisce da sé, e non serve chiedere niente al ristoratore. L'interruttore risponde al caso
diverso, che resta: **qualche** foto c'è, ma lui una carta di solo testo la preferisce. Il primo lo
decide il contenuto, il secondo è un gusto, e i gusti non si indovinano.

**LA FOTO STA SUL PIATTO, e si carica una volta sola.** Precisazione dell'utente, ed è la parte
importante del modello: *"la sorgente di verità sono i piatti che vengono caricati, che possono
avere la foto o meno"*. Non esistono foto "del menù" e foto "della scheda": esiste la foto del
piatto nel catalogo, e ogni superficie decide se mostrarla.

- **Scheda AllergiApp in app**: le foto ci sono comunque. Là siamo NOI a presentare un ristorante a
  chi lo sta scegliendo da lontano, e la foto è quello che convince a entrare.
- **Menù al tavolo**: lo decide il ristoratore. Chi è già seduto la usa meno.

**Spente vuol dire spente ovunque**, dettaglio del piatto compreso. L'eccezione ("in lista no,
aprendo il piatto sì") era la prima idea ed è stata scartata: è una regola in più da spiegare, e
chi nasconde le foto perché sono disomogenee non le vuole nemmeno lì. Un interruttore, un
significato.

**Le descrizioni** sono lo stesso asse: quanto è densa la carta. Spente (com'è sempre stato) sotto
il nome c'è solo una "i" e il testo si legge aprendo il piatto — giusto per una carta fitta,
stretto per chi ha dieci piatti e li vuole raccontare.

**⚠️ LE MANOPOLE CHE NON CI SARANNO**, ed è la parte da non perdere quando questa scatola verrà
ampliata (e verrà ampliata, l'utente l'ha già detto):

- **Nascondere gli allergeni sotto ai piatti, o il filtro.** Sono la ragione per cui questo menù
  non è come gli altri menù col QR (Tema 2). Il primo ristoratore che li spegnesse ci toglierebbe
  il prodotto dalle mani, e sarebbe anche quello con più motivi per farlo.
- **La scelta libera del carattere e dei colori.** Il Tema 8 vale ancora: le tinte le scegliamo
  noi, tutte scure abbastanza da reggere il testo. Un menù venduto come leggibile da chi ha
  un'allergia non può lasciar scegliere beige su panna.

**Sul database** (migration 708, insieme al resto della pagina pubblica): `show_dish_photos` e
`show_dish_descriptions` su `partner_venues`, coi valori di default uguali al comportamento di
oggi — acceso il primo, spento il secondo. Nessuna colonna nuova per le foto: quelle stanno dove
sono sempre state.

---

### 2026-09-02 — Tema 24: Bozza e pubblicato, e il bottone che dà peso al lavoro

**Domanda dell'utente**: mettere un "Salva" al posto del salvataggio automatico, *"anche per gestire
meglio quello che va live"*.

**Decisione**: il salvataggio automatico **resta**, e si aggiunge **"Pubblica le modifiche"**. Sono
due problemi diversi e vanno risolti separatamente:

- **Salvare** protegge il ristoratore dal perdere il lavoro. Il portale si usa dal telefono, in
  piedi in mezzo alla sala: una scheda chiusa per sbaglio e un pomeriggio se ne va. Tutto il
  portale salva da solo, e togliere quello qui vorrebbe dire due comportamenti dentro lo stesso
  prodotto.
- **Pubblicare** protegge il cliente seduto al tavolo. Ed è il problema vero che nasce con la
  pagina pubblica: senza, chi riorganizza la carta alle sette e mezza la dà in pasto ai clienti a
  metà, con una sezione vuota e tre prezzi da correggere.

**E c'è una ragione in più, che l'ha detta l'utente ed è quella che convince**: il gesto **dà peso
al lavoro**. Prima di premere si guarda meglio quello che si sta per mettere in sala.

**Come funziona**: le tabelle `partner_menu*` diventano la **bozza**; `partner_venues.published_menu`
tiene lo **scatto**, cioè il menù nella forma esatta che legge la pagina pubblica, traduzioni
comprese. `publish_menu()` prende lo scatto, `get_public_menu()` legge solo quello. Effetto
collaterale buono: al tavolo si legge **una riga sola** invece di tre tabelle ricomposte a ogni
scansione — è la versione concreta di quello che il Tema 11 chiamava "generare al salvataggio",
solo che si genera alla pubblicazione, che è meglio.

**⚠️ IL RISCHIO CHE QUESTA SCELTA INTRODUCE, e come è stato mitigato.** Un allergene corretto e mai
pubblicato resta **vecchio sul tavolo**, e nessuno se ne accorge: nel portale la correzione si
vede. È l'unico argomento serio a favore di com'era prima, ed è di sicurezza, non di comodità. Due
cose lo tengono a bada, e chi tocca questa parte non le smonti:

1. `menu_publish_state()` non dice solo "ci sono modifiche": dice se toccano gli **allergeni**,
   confrontandoli con quelli dello scatto. L'avviso può così nominare il rischio — *"hai cambiato
   degli allergeni: al tavolo si legge ancora la versione precedente"* — invece di essere
   l'ennesima scritta grigia.
2. La riga sta **in cima e resta in cima** (sticky) mentre si lavora: un avviso del genere non può
   scorrere via su un menù lungo.

**⚠️ LA TRAPPOLA CHE NON SI VEDE: le foto.** Sostituendo la foto di un piatto, il portale cancella
subito il file vecchio dallo Storage. Con lo scatto pubblicato che lo referenzia ancora, il
risultato è un'**immagine rotta in sala**, invisibile dal portale dove si vede quella nuova. Perciò
`deleteDishPhoto` prima chiede a `photo_in_published_menu()` e, se la foto è in un menù pubblicato,
**non cancella**: il file resta finché quel locale non pubblica di nuovo, e da lì è un orfano di
qualche decina di KB. Un'immagine rotta davanti a un cliente costa incomparabilmente di più.

**Il terzo costo, che resta e non si elimina**: un concetto in più da capire per chi non è tecnico
("ho cambiato il prezzo e sul menù c'è ancora quello vecchio"). Si attenua con lo stato sempre
visibile e con la data dell'ultima pubblicazione scritta in chiaro, non sparisce.

**Valutata e scartata**: la via di mezzo "tutto live, con un bottone *sospendi gli aggiornamenti*
per chi sta rifacendo la carta". Inverte il difetto — di norma il tavolo è sempre aggiornato, il
che è la cosa giusta per gli allergeni — ma quasi nessuno si ricorderebbe di premerlo **prima** di
cominciare, e si ritroverebbe comunque a modificare in sala.

---

### 2026-09-02 — Tema 25: Il carattere si cambia, ma solo dove non si legge un allergene

**Domanda dell'utente**: *"alcuni locali vogliono uno stile più raffinato, altri più bold, altri
più sottile"* — e la scelta del carattere come voce in più nella scatola "Aspetto", destinata a
diventare premium.

**Decisione**: sì, con **due confini** che non sono negoziabili.

**1. Vale solo sulle INTESTAZIONI**: il nome del locale in cima e i titoli delle sezioni. Nome del
piatto, prezzo, descrizione e soprattutto la riga degli **allergeni** restano nel carattere di
sistema, che è il più leggibile che esista su ogni telefono. È lo stesso ragionamento delle tinte
scelte da noi (Tema 8): quella riga la legge una persona con un'allergia, in una sala poco
illuminata, mentre qualcuno le sta chiedendo cosa ordina. Ed è anche dove l'identità si vede
davvero — una trattoria e un sushi bar si distinguono dall'intestazione, non dal corpo del menù.

**2. Pochi e decisi da noi**, non un elenco da cui scegliere: `modern` (quello di oggi), `classic`,
`bold`, `light`. Tre voci della stessa lingua — raffinata, marcata, sottile — provate a quelle
dimensioni, come le sei tinte. Un selettore libero rimetterebbe in gioco proprio la leggibilità che
il Tema 8 protegge.

**⚠️ I FILE SI OSPITANO CON IL SITO, mai da Google Fonts.** Da lì il file arriverebbe dai server di
Google **a ogni scansione**: manderemmo l'indirizzo IP del cliente seduto al tavolo a un terzo
senza che nessuno gliel'abbia chiesto. In Europa è un problema reale, e va nella direzione opposta
a quella già presa con Firebase. Qualche decina di kilobyte per carattere, caricati solo dai locali
che lo usano.

**Sul database** (migration 709): `heading_font` su `partner_venues`, un CODICE e non il nome di un
file — il file lo decide chi rende la pagina, e cambiarlo domani non tocca il database. Esce anche
nello scatto pubblicato (`headingFont`).

**FATTO il 2026-09-02.** I tre caratteri scelti sono **Fraunces 600** (classico), **Archivo 700**
(marcato) e **Jost 300** (sottile), tutti con licenza SIL OFL. Ospitati con noi — `landing/fonts/`
e `partner/public/fonts/` — nei soli sottoinsiemi latino e latino esteso, un peso per famiglia:
Jost 15 KB, Archivo 26 KB, Fraunces 65 KB. Il browser scarica **solo la famiglia che quel locale
usa**, e chi resta su *Moderno* non scarica niente. `font-display: swap`, così il nome del locale
si legge subito col carattere di sistema. La licenza sta accanto ai file in `OFL.txt`, come la OFL
richiede: non si sposta e non si cancella. Nel portale la scelta si fa **leggendola** — ogni
bottone scrive il nome dello stile con quel carattere.

**È un candidato premium**, come la copertina e il logo: cose che un ristoratore vede e riconosce
come "il mio menù". La regola del Tema 23 resta ferma — quello che il cliente al tavolo usa (il
filtro, gli allergeni) non si vende e non si spegne.

**DIVENTATI PACCHETTI il 2026-09-02 (stessa giornata).** Applicare il carattere ai soli titoli
lasciava metà pagina in un carattere e metà in un altro: guardandola non sembrava sobrietà,
sembrava un lavoro a metà. Adesso ogni scelta è un **pacchetto** che decide tutta la tipografia, e
l'etichetta nel portale lo dice — *"Stile dei testi"*, non "Carattere dei titoli".

**Il confine sugli allergeni non è sparito, ha cambiato forma**: prima era "quella riga non la
tocco", adesso è "la tocco e la COMPENSO". Nei pacchetti *Classico* (serif) e *Sottile*
(geometrico leggero) la riga degli allergeni e il motivo dell'esclusione crescono di un punto e si
scuriscono: a 10px grigi, in un serif, in una sala poco illuminata, quella riga si legge peggio del
carattere di sistema. Chi toglie la compensazione si tiene la responsabilità di quella riga.

**Insieme al carattere è arrivato lo STILE DELLE SEZIONI** (stessa migration, stesso ragionamento):
`underline` (maiuscoletto col filetto, quello di oggi), `banner` (fascia piena col colore del
locale, testo bianco) e `plain` (solo testo, più grande). La fascia colorata **si può offrire solo
perché le tinte le scegliamo noi**: sono tutte scure abbastanza da reggere il bianco sopra. Chi un
domani aprisse la scelta libera del colore renderebbe illeggibile questo stile, e se ne
accorgerebbe dai clienti — non dal portale.

> ⚠️ **Tre manopole decise e nessuna costruita** (copertina, carattere, sezioni): la 709 comincia a
> essere una lista della spesa. Sono colonne che nessuno scrive e che nessuno ha ancora visto a
> schermo, quindi ognuna è una decisione presa senza guardare. Prima di aggiungerne una quarta
> conviene costruirne almeno una e vedere se il ragionamento regge davanti agli occhi.

---

### 2026-09-02 — Tema 26: La copertina, e perché la velatura non è facoltativa

**Decisione**: un'immagine dietro l'intestazione al posto del colore pieno, **sempre con una
velatura scura sopra**.

**La velatura è la ragione per cui questa cosa era stata rimandata**, non un dettaglio di
rifinitura: il nome del locale è bianco, e sopra una foto chiara — una sala luminosa, un piatto di
pasta — sparisce. È la stessa cosa che il Tema 8 protegge scegliendo noi le tinte. Non è
un'opzione del ristoratore, e chi la togliesse renderebbe illeggibile l'unica cosa che il cliente
legge per forza.

**Il colore del locale resta SOTTO l'immagine.** Se la foto non arriva — rete lenta, file sparito —
l'intestazione non diventa bianca col nome bianco sopra.

**Il ritaglio è 3:1**, largo e basso: è una fascia in cima allo schermo di un telefono, non una
fotografia da guardare. Più alta mangerebbe il menù, che è la ragione per cui il cliente ha
inquadrato il QR. Per farlo, `PhotoCropDialog` ha imparato le **proporzioni** (`ratio`): 1 per
piatti e logo, 3 per la copertina. Un parametro e non una seconda finestra — il gesto è lo stesso,
e due copie divergerebbero al primo ritocco.

**1000px e qualità bassa (0.7)**: è l'immagine più grande della pagina ed è la **prima** a
caricarsi, cioè la voce che il Tema 11 indica come il costo dell'intera fase gratuita. La velatura
perdona parecchio sulla compressione.

**Nel portale si sceglie guardandola già velata**, col nome sopra: sceglierla pulita e ritrovarla
scurita nel menù sarebbe una sorpresa, e al ristoratore sembrerebbe un difetto nostro.

## Prossimo passo

**Aggiornato il 2026-09-02, fine giornata.** La fase 2 è fatta e in produzione: il menù al tavolo
si apre da `allergiapp.com/menu/<slug>`. Migrations 707, 708 e 709 applicate.

**Fatto oggi**: indirizzo e QR (PNG + vettoriale), pagina pubblica collegata, bozza/pubblicato con
i due presidi (avviso sugli allergeni non pubblicati, foto protette dalla cancellazione), ritiro
dalla sala con la pastiglia Attivo/Inattivo, e tutte le manopole d'aspetto — pacchetti di stile,
stile delle sezioni, foto e descrizioni, copertina.

**Cosa resta, in ordine:**

1. **Le traduzioni di condizioni al tavolo e blocchi di testo** (aperto dal Tema 18). Al primo
   cliente straniero il menù è tradotto e il "coperto 2 €" è in italiano. È l'ultimo buco visibile
   della pagina pubblica.
2. **Le statistiche degli scan** (Tema 10): l'unica voce del listino che dà un motivo per pagare
   **ogni mese**. Non è ancora disegnata — non ha nemmeno una tabella.
3. **Il rimando reciproco `/menu/<slug>` ↔ `/r/<slug>`** per un locale rivendicato (aperto dal
   Tema 13): sono due pagine pubbliche dello stesso posto e non si conoscono.
4. **Svuotare la cache alla pubblicazione**, quando le letture del menù cominceranno a vedersi nel
   traffico di Supabase: l'etichetta `Vercel-Cache-Tag` è già sulle risposte, manca il segreto
   lato server. Fino ad allora la cache è di un minuto.

**E la cosa che questo diario chiede da agosto**: mostrarlo a due o tre ristoratori. Adesso c'è un
menù vero, online, con un QR che funziona — è una conversazione diversa da quella di ieri.

## Prossimo passo (storico)

**Non scrivere codice.** Parlare con tre o quattro ristoratori mostrando la pagina `/piatti` così
com'è e chiedendo: *"se questo diventasse il tuo menù al tavolo, cosa manca?"*. Le risposte saranno
prezzi, sezioni e bevande — ma l'ordine con cui le dicono, e quanto insistono, valgono più di
questa lista.

Aggiornamento 2026-08-31 (sera): le due decisioni sono state prese a tavolino (Tema 15) e lo
schema è scritto, perché entrambe avevano un default a basso rimpianto e tenere fermo tutto per
una conversazione non ancora fissata non serviva a niente.

**Ma la conversazione con i ristoratori non è stata sostituita, è stata solo spostata di un
gradino**: si fa mostrando l'editor dei menù invece di `/piatti`, ed è una domanda migliore —
"questo è il tuo menù al tavolo, cosa manca?" con la cosa in mano vale più della stessa domanda
fatta su un catalogo. Da fare **prima della pagina pubblica**, che è la fase con l'infrastruttura
dentro e quella che costa di più da rifare.

Le fasi concordate:

1. ~~**L'editor, senza niente di pubblico.**~~ **FATTO il 2026-08-31**: migrations 703/704
   applicate, `/menu` nel portale, anteprima col filtro, aspetto del locale, creazione dei piatti
   dal menù. Restano i due debiti in "Stato attuale" (rinomina, interruttori morti) e la home.
2. **La pagina pubblica.** Progetto Vercel a sé, slug sul locale, generazione al salvataggio
   (Tema 11), filtro allergeni. Qui servono i campi di pubblicazione che la 704 non ha e le regole
   dello slug del Tema 17.
3. **QR** (PNG e vettoriale) e le poche manopole del Tema 8 — logo e colore ci sono già.

**E la conversazione con i ristoratori adesso si può fare davvero**: c'era da mostrare l'editor, e
l'editor c'è. Da fare PRIMA della fase 2, che è quella con l'infrastruttura dentro e quella che
costa di più da rifare.
