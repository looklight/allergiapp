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

**Cosa NON c'è ancora, ed è tutta la fase 2**: nessuno slug, nessun QR, nessuna pagina pubblica.
L'anteprima a tutta pagina sta dentro il portale, dietro l'autenticazione, e lo dichiara con una
fascia in cima — la cosa da non far succedere è che qualcuno ci stampi sopra un QR.

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

### 2026-08-31 — Tema 17: Gli slug non si riassegnano, e non a tempo

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

## Prossimo passo

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
