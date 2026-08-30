# Menù digitale — Working Notes

Diario della funzione "il ristoratore si costruisce il suo menù digitale interattivo".
Non è un piano vincolante: si aggiorna quando cambiamo idea. Le decisioni superate si riscrivono.
Serve a non ridiscutere da capo cose già chiuse.

---

## Stato attuale

**SOLO IDEA (2026-08-30).** Non esiste una riga di codice. Esistono però le fondamenta, ed è per
questo che vale la pena scriverne adesso: il portale partner ha già il catalogo piatti con gli
allergeni come **codici strutturati**, e la migration 700 è stata scritta lasciando spazio a
questa direzione (in particolare: nessuna colonna prezzo su `partner_dishes`, v. Tema 3).

Prima di costruire qualsiasi cosa servono due passi che riguardano il portale e non il menù:
lo scambio del livello dati da `localStorage` a Supabase e le foto su Supabase Storage.
Entrambi in `TODO.md`.

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

**Implicazioni**: il filtro non può essere una funzione a pagamento — è la dimostrazione del
prodotto. Chiuderlo è come vendere un'auto senza far salire nessuno.

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

**Implicazioni**: il contrasto resta una cosa che decidiamo noi, non un'opzione.

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
- **Lo slug appartiene alla vetrina, non al locale rivendicato.** Chi resta gratis non farà mai il
  claim e non avrà nessuna riga in `restaurants`: se lo slug dipendesse da quella, il gratuito non
  potrebbe avere un indirizzo.
- **Lo slug finisce stampato.** Un QR viene plastificato sul tavolo e appiccicato alla vetrina:
  cambiarlo rompe oggetti fisici già in giro per il locale. Quindi si sceglie una volta, si cambia
  solo con un avviso esplicito, i vecchi indirizzi reindirizzano per sempre e **non si riciclano
  mai** — o il QR di Mario porta i clienti da Giuseppe. Per `/r/` lo stesso problema era già stato
  affrontato con gli slug ritirati.
- **Un indirizzo per locale, non per menù.** Il QR è incollato al tavolo e non cambia a mezzogiorno:
  carta, pranzo e bevande si scelgono *dentro* la pagina. Tutto ciò che varia sta dentro, perché il
  supporto è fisico e costante.
- Il QR lo genera il portale, in PNG **e in vettoriale**: chi lo porta in tipografia ha bisogno del
  secondo, e se non glielo diamo se lo fa fare male altrove.
- Da decidere come convivono `/menu/<slug>` e `/r/<slug>` per un locale rivendicato: sono due pagine
  pubbliche dello stesso posto e devono almeno rimandarsi a vicenda.

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

---

## Prossimo passo

**Non scrivere codice.** Parlare con tre o quattro ristoratori mostrando la pagina `/piatti` così
com'è e chiedendo: *"se questo diventasse il tuo menù al tavolo, cosa manca?"*. Le risposte saranno
prezzi, sezioni e bevande — ma l'ordine con cui le dicono, e quanto insistono, valgono più di
questa lista.
