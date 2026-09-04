# AllergiApp Partner

Portale web per i ristoratori (`partner.allergiapp.com`) — catalogo piatti,
**menù digitale** (QR al tavolo), scheda dentro AllergiApp, abbonamento.
Design e decisioni in `../MONETIZATION.md` e `../DIGITAL_MENU.md`.

**I dati stanno su Supabase dal 2026-08-30** (tabelle `partner_*`, migration
700/701), le foto sullo Storage dal 31/08 (bucket `partner`, migration 702).
Il localStorage non tiene più niente se non la lingua scelta.

## Il modello, dal 2026-08-31 (migration 703/704)

Al centro c'è il **locale** (`partner_venues`: nome, logo, colore). Sopra al
catalogo dei piatti ci stanno **tre cose indipendenti**, che si accendono in
qualunque ordine e anche da sole:

```
Catalogo piatti ──┬── Menù (QR al tavolo)      non tocca l'app
                  │
                  └── piatti sulla scheda ─┐
      Link e contatti ───────────────────  ├── Scheda AllergiApp
                                           ┘   (claim + abbonamento)
```

La "vetrina" faceva da contenitore a tutto ed è stata spaccata in due: il
locale (che hanno tutti, dal primo giorno) e `partner_cards`, la presenza
dentro l'app, che esiste **solo dopo il claim**. I link stanno sul locale —
il numero per prenotare è lo stesso ovunque compaia. Il ragionamento per
esteso è il Tema 16 di `../DIGITAL_MENU.md`.

**La parola "vetrina" non esiste più** (rinomina fatta il 2026-08-31, dopo
lo schema): il tipo è `Venue`, il modulo è `src/lib/venues.ts`, la rotta è
`/locale/[id]` e le schermate dicono **locale** per il contenitore e
**scheda AllergiApp** per quello che finisce nell'app. Non era un vezzo: la
stessa riga si chiamava "Nome della vetrina" nell'editor e "Nome del locale"
nel menù, e il ristoratore scriveva un'etichetta privata dove poi i clienti
leggevano l'intestazione del menù al tavolo.

**Il debito che questo cambio aveva aperto è chiuso** (verificato il
2026-09-02): un piatto si accende sulla **scheda**, che senza claim non
esiste, e prima si spuntavano caselle senza che succedesse niente. Adesso il
comando non c'è dove non funziona, e al suo posto c'è il motivo
(`d.dishes.needsCard`) con la strada per averla. Il filtro `cardId !== null`
sta in tre punti, uno per schermata — `venuesConScheda` in `/piatti` (fa
sparire insieme colonna, selettore e caselle), `venue.cardId === null`
nell'editor del locale, `conScheda` in `DishPanel` — e `setDishOn` tiene
comunque la sua guardia: esce senza scrivere e senza fingere. Se qualcuno
aggiunge una quarta schermata con quegli interruttori, quella guardia è
l'ultima rete, non la prima.

## La home è una home (2026-09-01)

`/` non è più l'elenco delle vetrine, e la voce di menù non si chiama più
"Locali" — che è il nome di un archivio, non di una home. Adesso:

- **saluta per nome** (`Ciao Luca`) col profilo che l'`AuthGuard` legge già e
  che prima buttava via: nessuna interrogazione in più, il profilo passa da un
  contesto (`PartnerProfileProvider`);
- dice **di quale locale** si sta parlando, col nome correggibile lì per lì —
  è il nome che i clienti leggono in cima al menù, non un'etichetta interna —
  e una tendina per cambiarlo **solo da due locali in su**, con la scelta
  ricordata in `localStorage` (`partner-venue`);
- mostra **le due cose** che il ristoratore può accendere, affiancate perché
  sono pari: **menù al tavolo** e **scheda AllergiApp**, ognuna con stato,
  contenuto e un bottone;
- offre le **azioni rapide** (`/piatti?nuovo`, `/menu?nuovo`, i link della
  scheda), che portano dove la cosa succede — la maschera già aperta — non
  alla pagina che la contiene;
- tiene il **catalogo piatti** fuori dalle due, in una riga più leggera: è il
  substrato del partner, non una terza cosa da accendere.

**Le cose sono DUE, non tre.** I link e i contatti non sono una cosa a sé:
si definiscono dentro la **scheda AllergiApp**, che è la pagina `/locale/[id]`
(decisione dell'utente, 01/09 — v. `../DIGITAL_MENU.md`, nota al Tema 16). Sul
**database** restano appesi al locale, perché domani serviranno anche al menù
pubblico: è il posto in cui si modificano che è uno solo.

**Creando un locale si RESTA sulla home.** Prima si finiva dritti nella scheda
AllergiApp, cioè in una schermata che parla dell'app: per la maggioranza dei
ristoratori — quelli che vogliono il menù al tavolo — è la cosa sbagliata da
mostrare per prima.

Dettagli che sembrano arbitrari e non lo sono:
- **Il menù è "da finire" se esiste ma è vuoto**: un menù senza piatti non è
  pronto, è la carta bianca che si troverebbe davanti il cliente.
- **Il pallino di stato non è mai da solo**: accanto c'è sempre la parola, o
  chi non distingue i colori non legge niente.
- **Il "+" sulle azioni rapide c'è solo dove si crea qualcosa**: su "Link e
  contatti" prometterebbe una cosa nuova mentre si va a correggere le esistenti.
- **`?nuovo` apre la maschera solo quando i dati sono arrivati.** Aprendola al
  montaggio, la finestra del menù nasceva con le liste vuote e proponeva di
  creare un locale nuovo a chi ce l'aveva già — visto nel browser e corretto.
- **Dalla home il menù si crea SENZA finestra.** Il link è `/menu?nuovo=<id>`:
  il locale lo sa già chi ci manda, e se non resta niente da chiedere — il
  locale ha un nome e non ha ancora menù — il menù nasce e si apre l'editor.
  La finestra torna solo quando c'è davvero una domanda: il nome del **secondo**
  menù dello stesso locale (e lì il campo parte vuoto, non con "Carta" già
  scritto, che è il nome del primo), o il nome del locale se è vuoto. In quel
  caso non c'è la tendina: il locale è fissato (`fixed` su `NewMenuDialog`).
- **Il parametro si consuma subito** (`history.replaceState`): senza, tornando
  indietro dall'editor si ricadeva su `/menu?nuovo=…` e partiva un secondo
  menù per sbaglio.
- **Le linguette del menù si vedono da due menù in su** (`MenuPreview`): il
  nome di un menù serve a distinguerlo da un altro, e con un menù solo è
  un'etichetta che al cliente non dice niente.
- **Il nome del menù si chiede solo quando serve — e non serve quasi mai.**
  Un menù nuovo **nasce senza nome**, e nell'editor il campo **non compare**
  finché il locale ha un menù solo (al suo posto c'è il titolo "Il tuo menù");
  compare da due in su, o se un nome c'è già — altrimenti non ci sarebbe più
  modo di correggerlo. La visibilità si decide **all'apertura della pagina** e
  non segue il valore mentre si scrive, o cancellando l'ultima lettera il
  campo sparirebbe sotto le dita. Il nome diventa obbligatorio nel **momento
  esatto in cui inizia a distinguere qualcosa**: creando il secondo menù, e
  lì la finestra chiede anche il nome di quello che c'era già, se non ce
  l'ha (`useMenus().rename`, scritto **prima** di creare il secondo).
- **Le tre etichette del nome vuoto sono tre cose diverse, di proposito**:
  "Menù senza nome" nelle liste del portale (serve al ristoratore per
  riconoscerlo), **"Menù"** nella linguetta al tavolo (la vede il cliente, e
  "senza nome" sembrerebbe un difetto), "Il tuo menù" come titolo dell'editor
  quando il menù è l'unico.
- **Il nome non serve a niente sotto**: la colonna è `NOT NULL` ma la stringa
  vuota è legittima, la chiave è l'`id`, sezioni e righe pendono da `menu_id`,
  e lo slug dell'indirizzo pubblico verrà dal **locale** (Tema 13). È
  un'etichetta, e basta.
- **Storia**: c'era un `defaultName` ("Carta") che
  faceva due mestieri: veniva **scritto** nel menù alla creazione e faceva da
  ripiego dove il nome andava mostrato. Risultato: il ristoratore cancellava
  un nome che non aveva scelto e al menù dopo se lo ritrovava uguale. Adesso
  la creazione non scrive niente, e dove il nome serve per identificare il
  menù (la riga in `/menu`, la finestra di eliminazione, la home) si legge
  **"Menù senza nome"** — come "Locale senza nome", e senza fingere una scelta
  che nessuno ha fatto. Il nome torna obbligatorio dal **secondo** menù dello
  stesso locale, che è l'unico momento in cui serve davvero.
- **È sparito il sottomenu dei locali nella barra laterale**: apriva la scheda
  mentre la tendina della home cambia locale, e due comandi uguali che portano
  in due posti diversi sono un modo di sbagliare.

**La barra laterale (01/09)**: Home · Piatti · Menù · **Scheda AllergiApp** ·
Account.
- La voce **Scheda AllergiApp** punta al locale che si sta guardando, ed è lo
  stesso che sceglie la tendina della home: la scelta vive in **uno stato
  condiviso** (`useVenueChoice` in `lib/venues.ts`, stesso meccanismo delle
  liste in `storage.ts`). Con due stati separati, cambiando locale dalla home
  la barra avrebbe continuato a puntare al precedente. Senza locali la voce
  non c'è, invece di esserci e non portare da nessuna parte.
- Due etichette per quella voce (`nav.card` e `nav.cardShort`): sulla barra in
  basso del telefono "Scheda AllergiApp" verrebbe tagliata a metà parola.
- **Abbonamenti è finito dentro Account**, con il ritorno ad Account in cima
  alla pagina e la voce Account che resta accesa quando ci si è dentro. Finché
  è un tappo, una voce di primo livello prometteva una sezione che non c'è. I
  richiami dalla home e dalla scheda ("Associa il locale") continuano a
  portarci.

**Statistiche: non esistono, ed è deliberato.** Non c'è niente da contare
finché la pagina pubblica del menù non esiste e l'app non legge le tabelle
`partner_*`: sarebbe una schermata di zeri. Quando ci sarà, la cosa da
mostrare non sono le visite ma **quali esigenze filtrano i clienti al tavolo**
— viene gratis dal filtro che il menù pubblico ha già, è aggregata, e nessun
altro può darla a un ristoratore.

**Eliminare un locale porta via i suoi menù**, per cascata della 704 — e non
è un dettaglio del database: sezioni, ordine e prezzi sono il lavoro di un
pomeriggio. La finestra di conferma li conta e lo dice **prima**, e l'annulla
li rimette insieme al locale (`useMenus().restore`, che riscrive gli stessi
id: tornano i menù di prima, non delle copie). L'ordine conta — prima il
locale, poi i menù — o la chiave esterna della 704 li rifiuta.

**Anche eliminare un singolo menù ha l'annulla**, dalla stessa `restore`.
Era l'unica eliminazione del portale protetta dalla sola finestra di conferma,
ed era quella che pesava di più: un piatto — che gli otto secondi ce li ha da
sempre — si riscrive in un minuto, un menù no. Regola generale: se
un'eliminazione porta via del lavoro, l'annulla non è un lusso.

## Sviluppo

```bash
cd partner
npm install
npm run dev     # http://localhost:3001 (porta diversa dall'admin)
npm run check   # tipi + regole — si può lanciare col dev acceso
npm run gemelle # confronta l'anteprima del menù con la pagina vera sul sito
```

Env in `.env.local` (stesso progetto Supabase di app e admin):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

⚠️ **Mentre il `dev` gira, si verifica con `npm run check`** (`tsc --noEmit`
+ `eslint`), che non scrive niente. **`npm run build` va lanciato solo col
server fermo**: build e dev usano la stessa cartella `.next`, e la build la
svuota sotto i piedi al server — il portale risponde 500 con
`Cannot find module ./vendor-chunks/@supabase.js`, oppure resta piantato su
`Caricamento…` coi chunk a 404, e sembra un errore del codice. Si rimedia
fermando il server, `rm -rf .next` e riavviando.

Questo avviso c'era già scritto, e il 2026-09-03 ci siamo cascati lo stesso:
il rimedio è avere sotto mano un comando che *non può* fare danno.
`check` prende quasi tutto (tipi, regole, import); quello che gli sfugge è
solo ciò che si rompe in fase di build vera, quindi prima di un rilascio si
ferma il `dev` e si lancia `build`.

Una via che sembrava migliore ed è stata **provata e scartata** lo stesso
giorno: dare a `check` una `distDir` sua (`NEXT_DIST_DIR`). Funzionava, ma
Next a ogni build riscrive `next-env.d.ts` e `tsconfig.json` puntandoli a
quella cartella — cioè lasciava due file modificati in git a ogni verifica,
e in `next-env.d.ts` un percorso che su Vercel non esiste.

## Convenzioni

- Stack speculare all'admin: Next.js 15 (App Router), Tailwind v4,
  `@supabase/supabase-js` client-side (AuthContext, niente SSR auth).
- **i18n IT/EN dal giorno 1**: tutte le stringhe passano dai dizionari in
  `src/lib/dictionaries/` (`useI18n()` → `d.sezione.chiave`). Mai stringhe
  hardcoded nei componenti.
- **Mobile-first**: il portale dev'essere usabile da telefono quanto da
  desktop. Shell: sidebar ≥ md, bottom bar su mobile.
- Migrations DB del portale: serie **7xx** in `../supabase/migrations/`
  (applicate a mano via SQL editor, mai `supabase db push`).
- Deploy: progetto Vercel `allergiapp-partner`, **da `main`** con root
  directory `partner/` (niente branch di deploy stile admin-prod).
  Dominio `partner.allergiapp.com`. Nessun muro davanti: a proteggere i dati
  sono l'autenticazione Supabase e le RLS, non una password condivisa. Resta
  il `noindex` + `robots.txt` finché il portale non è davvero aperto.

## Dove sta cosa

- `src/lib/storage.ts` — il livello che legge dal database, e l'unico posto
  che sa come. Le liste (catalogo e locali) stanno **in un posto solo e
  condiviso**: chi le guarda ci si affaccia, e chi le cambia le cambia per
  tutti. Prima ogni componente faceva la sua interrogazione — `/piatti` ne
  faceva tre, due identiche, più una quarta aprendo un piatto. Qui dentro
  c'è anche `forgetServerState()`: **chi tiene da parte una convinzione su
  cosa c'è sul server la registra con `onForget`**, così "dimentica tutto"
  al cambio di persona resta un gesto solo e non tre da ricordarsi.
- `src/lib/saveState.ts` — lo stato delle scritture, fuori da React perché
  le scritture partono dal livello dati e l'avviso deve sopravvivere al
  cambio di schermata. **Ogni scrittura passa da `write()`**, che prende la
  *funzione* e non la richiesta già partita (o "Riprova" non potrebbe
  rilanciarla) e **non lancia mai** (un'eccezione dentro un gestore di
  evento salterebbe le istruzioni successive). Il terzo argomento, la
  chiave, identifica il *bersaglio* e serve solo a chi riscrive per intero
  qualcosa di preciso: senza chiave non si sostituisce niente, che è la
  scelta prudente.
- `src/lib/photos.ts` — le foto dei piatti: ridimensionamento nel browser e
  caricamento sul bucket `partner` (v. sezione più sotto).
- `src/components/SaveStatus.tsx` — "Salvataggio…/Salvato" in un angolo,
  fascia rossa con Riprova quando qualcosa è stato rifiutato. Sta nella
  Shell perché il guasto può arrivare mentre si guarda un'altra pagina.
- `src/lib/venues.ts` — il **locale** (`partner_venues`): nome, logo,
  colore, link, e gli id dei piatti accesi sulla sua scheda. Il nome e
  l'aspetto stanno qui e non in un modulo a parte perché è la **stessa riga**
  che questo file legge già: una seconda interrogazione sulla stessa tabella
  è esattamente quello che il livello dati condiviso serve a togliere.
  `cardId` è null quando non c'è nessuna scheda — chi mostra comandi che
  scrivono lì deve spegnerli.
- `src/lib/menus.ts` — i menù, con sezioni e righe. Una sezione ha un
  **tipo**: `section` (con dentro i piatti) o `note`, il blocco di solo testo
  che si trascina fra le sezioni. Sono lo stesso oggetto perché occupano lo
  stesso posto nell'ordine del menù — una tabella a parte avrebbe voluto un
  secondo ordinamento da fondere col primo. Il blocco riusa le colonne che ci
  sono: `name` è il titolo (facoltativo) e `description` è il testo. **Non cancella e
  reinserisce: sovrascrive per id**, perché gli id li generiamo noi e
  l'interfaccia li usa come chiavi — con id nuovi a ogni salvataggio, una
  riga che si sta trascinando cambierebbe identità sotto le dita. Le righe si
  ripuliscono PRIMA delle sezioni: il vincolo della 704 fa risalire fuori
  sezione le righe di una sezione cancellata, e nell'ordine sbagliato i
  piatti riapparirebbero in cima invece di sparire.
- `src/lib/menuFilters.ts` — l'**ordine delle pastiglie** del filtro, ed è
  solo quello: una graduatoria unica e mescolata (glutine, vegetariano,
  vegano, latte, uova…) invece di "prima tutti gli allergeni, poi tutte le
  esigenze". ⚠️ È **fissa e non calcolata sul menù**: chi ha un'allergia cerca
  la sua parola e la trova sempre nello stesso punto, in ogni ristorante.
  ⚠️ Qui c'era anche la regola che le pastiglie accese risalissero in testa
  alla fila: **tolta il 04/09**, perché la fila cambiava sotto il dito.
  Restano dove sono e si accendono soltanto; che qualcosa sia acceso lo
  dicono il numero sul bottone dei filtri e la riga «x di y adatti».
- `src/lib/menuBrand.ts` — solo costanti: i sei colori (scelti da noi, tutti
  scuri abbastanza da reggere il testo). La riduzione del logo se n'è andata
  il 02/09: adesso il logo è un file su Storage e passa da `photos.ts`
  (`uploadLogo`), com'era scritto che sarebbe successo.
- `src/components/menus/` — selettore dei piatti dal catalogo (con "Nuovo
  piatto", che apre la stessa maschera del gestionale), riga con prezzo e
  maniglia di trascinamento, aspetto del locale, anteprima pubblica col
  filtro allergeni, finestra di creazione.
- `src/lib/dishes.ts` — il catalogo piatti, che è **del partner** e non del
  locale: lo stesso piatto si accende su più schede senza duplicarsi.
  Acceso/spento è uno stato della coppia piatto-scheda, non del piatto.
- `src/components/dishes/` — maschera, riga della tabella, pannello laterale,
  finestra di eliminazione e **finestra del ritaglio** dei piatti.
- `src/lib/useModal.ts` — comportamento comune di tutte le finestre: Esc,
  fuoco che entra e non esce col Tab, scorrimento della pagina bloccato.
  ⚠️ **Le finestre si annidano** — il ritaglio della foto dentro la maschera
  del piatto, il foglio di dettaglio dentro l'anteprima — quindi qui c'è la
  **pila** di quelle aperte e a Esc risponde solo l'ultima. Con un
  ascoltatore a testa su `window` un Esc ne chiudeva due, e la seconda era la
  maschera con dentro quello che si era appena scritto. Vale anche per il
  Tab, perché una finestra annidata è figlia nel DOM di quella che la
  contiene. `useEscape` è la parte minima, per chi non vuole anche il blocco
  dello scorrimento (il foglio di dettaglio copre lo schermo simulato del
  cliente, non la pagina del portale). **Chi aggiunge una finestra passi da
  qui**: un ascoltatore suo su `window` rimette il problema.
- `src/lib/partnerProfile.ts` — la riga `partner_accounts`: il **cancello**
  del portale (senza, il database rifiuta locali e piatti, per vincolo e non
  per controllo applicativo) e insieme i dati della persona. La legge
  l'AuthGuard e la passa alle schermate col contesto, che porta anche **come
  aggiornarla**: `/account` la corregge, e senza quello la home continuerebbe
  a salutarti col nome vecchio fino al ricaricamento.
- Le pagine: `/` la **home**, `/locale/[id]` la **scheda AllergiApp** (link, piatti, anteprima; ci si arriva anche dalla barra laterale),
  `/piatti` il gestionale del catalogo, `/menu` l'elenco dei menù,
  `/menu/[id]` l'editor col telefono a lato, `/menu/[id]/anteprima` la stessa
  anteprima a tutta pagina — che si apre in una scheda a parte e porta una
  fascia che dice che **non è l'indirizzo pubblico**: sta dentro il portale,
  quindi è dietro l'autenticazione. La cosa da non far succedere è che
  qualcuno ci stampi sopra un QR.

## Il menù digitale

Il ristoratore compone un menù coi piatti che ha già in catalogo: sezioni con
nome libero, prezzi, riordino trascinando (con le frecce accanto, che restano
perché il trascinamento HTML5 col dito non funziona e questo portale si usa
dal telefono). L'anteprima a lato mostra la pagina che legge il cliente.

### L'editor ha TRE AREE (2026-09-03)

```
← Tutti i menù                              [Pubblica]
●  ASPETTO         EUR · Moderno · Filetto · foto quadrate  ⌄
   CONTENUTO       nome del locale, descrizione, sezioni,
                   piatti, blocchi di testo, condizioni al tavolo
   ONLINE                                        Attivo ●
```

L'ordine era già questo; quello che mancava è che **niente diceva che i
quattro blocchi in mezzo sono una cosa sola**. Tre scelte, tutte per non
appesantire:

- **"Contenuto" non è una parola nuova**: è la metà di una coppia che il
  ristoratore incontra già negli avvisi in cima ("Modifiche all'**aspetto**
  non pubblicate") e che il database distingue dalla migration 710
  (`contentChanged` / `appearanceChanged`). Le due aree si chiamano come la
  distinzione che gli spieghiamo già altrove.
- **Un'etichetta e non una scatola** sul contenuto: le sezioni sono già schede
  bianche su grigio, e una scheda attorno a delle schede è annidare. E **non
  comprimibile**: l'aspetto si sceglie una volta e si chiude, il contenuto è
  il lavoro.
- **Le tre intestazioni sono la stessa riga** (stessa classe identica nei tre
  punti: `BrandBar`, `menu/[id]/page.tsx`, `MenuAddress`) e a destra ognuna
  mette quello che ha da dire — riassunto e freccia, niente, interruttore. La
  coerenza sta nell'intestazione, **la distinzione nei corpi**: uno si apre e
  si chiude, uno è una pila di schede, uno è un riquadro che resta **verde
  quando il menù risponde** e tratteggiato finché è una bozza.

⚠️ **Il nome del ristorante non è più il titolo della pagina** ma la prima
riga del contenuto: è quello che il cliente legge in cima al menù, quindi è
contenuto. ⚠️ **Il titolo dell'indirizzo non cambia più** in "Il menù è
online": lo dicono l'interruttore e il verde del riquadro — ed è per questo
che il campo dell'indirizzo ha un nome accessibile suo (`addressField`).

⚠️ **L'utente NON è soddisfatto di come si vedono queste tre intestazioni** e
le rifaremo: la struttura è concordata, la resa no. Non c'è logica in mezzo —
tre stringhe e la tipografia della riga. V. `../TODO.md`.

### Il menù di esempio (2026-09-03)

Finché il menù è vuoto l'anteprima può mostrare **tre piatti finti** con
prezzi, allergeni, descrizioni — **e il filtro allergeni funzionante**.
L'aspetto si giudica su dei piatti, non su uno schermo bianco: prima, per
vedere l'effetto di una scelta, bisognava scrivere mezza carta.

- **Si accende a mano**, con un bottoncino accanto alla riga in cima alla
  scatola Aspetto (decisione dell'utente: tre piatti che compaiono da soli si
  leggono come piatti veri). Il comando sta **dove si sceglie**, non dove si
  guarda. C'è anche nella fascia dell'anteprima a tutta pagina, che è una
  scheda a sé con uno stato suo.
- **Compare solo a menù vuoto**: con dei piatti dentro valgono i suoi.
- **Passa per la stessa resa** dei piatti veri — stessa `<Riga>`, stessa
  sezione, stesso separatore — o mostrerebbe un aspetto diverso da quello che
  si sta scegliendo, cioè l'unica cosa che non deve fare.
- **C'è anche il filtro**, e non è un di più: le pastiglie nascono dai piatti
  *mostrati* (`mostrati` in `MenuPreview`), quindi si tocca "senza glutine" e
  si vede la carta riordinarsi prima ancora di aver scritto un piatto. Il
  filtro è gratis e non sarà mai premium (Tema 2): mostrarlo lì è il suo
  mestiere.
- **Effetto collaterale voluto**: le **condizioni al tavolo** si vedono sopra
  l'esempio. Sono vere — le ha scritte lui — e prima non c'era modo di
  guardarle finché il menù non aveva almeno un piatto.

**Sotto `sm` l'editor cambia forma** (rivisto il 2026-09-02 facendo i conti a
375px, dove il portale si usa davvero):

- la riga del piatto sta su **due livelli** — nome sopra, comandi sotto — o al
  nome restano ~54px, sei caratteri per l'unica cosa che si legge scorrendo;
- la riga sticky in cima **va a capo** e l'avviso si prende tutta la
  larghezza: fra il link e il bottone Pubblica si troncava a "Modifiche…",
  cioè proprio la frase che nomina gli allergeni non pubblicati;
- le **maniglie di trascinamento spariscono** (righe e sezioni): sul touch il
  gesto non parte, e prometterlo è peggio che non offrirlo;
- ⚠️ la tendina **"Sposta in" non si nasconde più**: era `hidden sm:block`, e
  siccome le frecce muovono solo dentro la sezione, da telefono un piatto si
  spostava solo togliendolo e rimettendolo;
- i comandi hanno un'area da 28-32px, con margine negativo **solo verticale**:
  riprendendosi anche l'orizzontale, l'area della stella finirebbe sotto il
  campo del prezzo.

Tre cose da non disfare per sbaglio:

- **Il filtro allergeni riordina, non nasconde.** I piatti esclusi restano
  leggibili in fondo alla loro sezione, col motivo scritto. Farli sparire
  direbbe che quel che resta è stato *verificato*, e il dato lo dichiara il
  ristoratore. Per le esigenze il testo dice "non indicato per", mai "non è".
- **Il prezzo è in centesimi interi**, e il campo tiene il testo mentre si
  scrive: altrimenti chi scrive "12," se lo vede riscrivere sotto le dita.
  `parsePrice` decide **dalla forma e non dalla lingua** quale separatore
  sono i decimali — è l'ultimo, e solo con una o due cifre dietro — così
  "12,50" e "12.50" valgono entrambi e i separatori delle migliaia si
  tolgono invece di rompere la lettura. Non è teoria: è `formatPrice` stesso
  a scriverli, quindi un prezzo sopra il migliaio tornava nel campo come
  "1.500,00" (o "1,500.00" col portale in inglese) e si cancellava da solo
  al primo tasto premuto per correggerlo. Chi tocca queste due funzioni le
  provi **andata e ritorno**, in tutte e due le lingue.
- **Logo e colore appartengono al LOCALE, non al menù.** Al tavolo carta,
  pranzo e bevande sono linguette della stessa pagina: un logo per menù
  darebbe tre intestazioni diverse allo stesso ristorante.
- **In fondo al menù al tavolo NON c'è il disclaimer** ("dichiarato dal
  ristorante, non verificato da AllergiApp"), e non è una dimenticanza
  (2026-09-01, Tema 18): al tavolo è il ristorante che ti porge il **suo**
  menù col QR, e quella frase resta dove serve davvero — sulla **scheda in
  app**, dove siamo noi a presentare un ristorante a chi lo sceglie da
  lontano. Ne resta una riga minuscola **attaccata al filtro**, perché il
  filtro è l'unica cosa nostra in quella pagina. Chi la sposta in fondo
  rimette in piedi quello che è stato tolto apposta.
- **Le condizioni al tavolo sono del LOCALE, i blocchi di testo del MENÙ.**
  Coperto e servizio non cambiano passando da una linguetta all'altra (è lo
  stesso tavolo), quindi stanno su `partner_venues` e compaiono in fondo a
  ogni menù; quel che riguarda un menù solo si scrive in un blocco di testo.
  Scambiarli vuol dire far riscrivere il coperto in carta, pranzo e bevande —
  e poi correggerlo in tutte e tre.

**La scatola "Aspetto"** (`BrandBar`) è **comprimibile** e chiusa di
partenza — l'aspetto si sceglie una volta, il menù si tocca ogni giorno — con
un riassunto sulla riga ("A blocco · EUR · Moderno · Filetto") per non
doverla aprire. Dentro, nell'ordine: **impaginazione**, **valuta**, colore, **pacchetto di stile** dei testi,
**grandezza dei testi**, **stile dei titoli di sezione**, **copertina**, le
**foto dei piatti** (tre scelte: nessuna / quadrate / tonde), il **segno fra
un piatto e l'altro** e l'interruttore delle **descrizioni in lista**.

**L'impaginazione è la prima voce perché è la STRUTTURA** (`menu_layout`:
`row` / `block`, migration 711): decide come è disposto un piatto — foto,
nome e prezzo affiancati, oppure nome, descrizione e prezzo incolonnati e
centrati — e tutto il resto della scatola la decora.

⚠️ **È uno stile, non un preset**, ed è la distinzione che regge il Tema 29:
uno stile decide una struttura, un preset imposta dei valori. Scegliendo
l'impaginazione **non si riscrive nessuna** delle altre voci — colore,
carattere, grandezza, interlinea restano come il ristoratore li ha messi. La
prima idea erano pacchetti ("Trattoria", "Bistrot") che li impostavano tutti:
scartata perché avrebbe cancellato scelte già fatte.

L'unica conseguenza è che **"a blocco" non mostra le foto**: la manopola della
loro forma sparisce (una manopola che non decide niente è peggio di una che
non c'è) ma **il valore resta scritto**, e tornando "a riga" le foto
ricompaiono com'erano. Sotto la scelta due righe lo dicono, insieme all'altra
cosa da sapere prima: a blocco un piatto **senza descrizione** è nome e prezzo
incolonnati, cioè spoglio.

**Il segno fra i piatti** (`dish_separator`: `none` / `rule` / `ornament`) è
nato lì ma **non dipende dall'impaginazione**: vale in tutt'e due, perché il
filetto sta bene anche nella carta a riga. Legarlo al blocco avrebbe aggiunto
una seconda voce che compare e sparisce, e il pregio di questa strada è che ne
dipende **una sola**.

⚠️ **UNA MARCATURA SOLA PER LE DUE IMPAGINAZIONI, e il CSS che la piega vive
in `globals.css` come copia fedele di `landing/menu-page.css`.** `MenuPreview`
non ha un ramo per impaginazione: rende sempre lo stesso markup, con i nomi di
classe del sito (`menu-item`, `menu-item-row`, `menu-item-line`,
`menu-item-title`, `menu-item-name`, `menu-price`, `menu-item-desc`,
`menu-item-note`, `menu-item-allergens`, `menu-item-reason`), e il blocco lo
ottiene `display: contents` sulla riga più `order` sui figli — che è
esattamente come è scritto sul sito.

Prima c'erano **due meccanismi per la stessa immagine** (un `if` in React di
qua, il CSS di là): il modo più affidabile di far divergere due copie senza
accorgersene, perché bastava correggere una spaziatura da una parte sola. Per
la stessa ragione il segno fra i piatti lo fa il **selettore fratello**
(`.menu-item + .menu-item`), che sa da sé qual è la prima riga, e non un prop
calcolato da chi rende la lista.

⚠️ Queste regole stanno **fuori dai layer di Tailwind**, quindi vincono sulle
utility scritte in linea: è voluto, ed è quello che permette a
`.layout-block .menu-price` di spostare il prezzo che il markup mette accanto
al nome. Chi aggiunge un nome di classe condiviso lo aggiunga anche a `RUOLI`
in `scripts/gemelle.mjs`.

⚠️ **La valuta non è aspetto**, sta lì solo perché è lì che si va a sistemare
come si legge il menù: vive sul MENÙ e non sul locale, quindi conta come
modifica di **contenuto** — "Torna all'aspetto pubblicato" non la tocca, e cambiarla
accende l'avviso di pubblicazione come cambiare un prezzo. Era in cima
all'editor accanto al nome del locale, dove sembrava una proprietà del
ristorante invece che del suo listino.

Tre regole di quella scatola, tutte per lo stesso motivo:

- **I pacchetti di stile decidono TUTTA la tipografia**, non solo i titoli:
  metà pagina in un carattere e metà in un altro sembra un errore. Dove il
  carattere costa leggibilità — la riga degli allergeni nei pacchetti serif e
  leggero — il pacchetto **compensa** (un punto in più, grigio più scuro)
  invece di fare eccezioni. I caratteri sono ospitati con noi
  (`public/fonts`), **mai** presi da Google Fonts.
- **La velatura scura sulla copertina non è facoltativa**: il nome del locale
  è bianco e su una foto chiara sparisce. Il colore del locale resta sotto
  l'immagine, così se la foto non arriva l'intestazione non diventa bianca.
- **Il ritaglio prende una proporzione** (`PhotoCropDialog`, `ratio`): 1 per
  piatti e logo, 3:1 per la copertina. Una finestra sola, non due. Stanno sul
locale (migration 708, applicata il 02/09) perché al tavolo è una pagina
sola, e l'anteprima
accanto li rispetta — se non lo facesse, il ristoratore sceglierebbe alla
cieca. Foto spente = niente foto in tutto il menù, dettaglio compreso; e
resta vero che se nessun piatto ha una foto la colonna sparisce da sé.
⚠️ Chi amplia questa scatola non ci metta la possibilità di **nascondere gli
allergeni o il filtro**: sono la ragione per cui il menù esiste (DIGITAL_MENU
Tema 23).

Dall'editor di un menù si cambiano anche cose del **locale** — nome, logo,
colore, condizioni al tavolo — perché è lì che se ne vede l'effetto. Passano
per `venues.ts` e valgono per tutti i menù di quel locale: quello che si
digita (nome, condizioni) va con la stessa pausa dei link, i gesti singoli
(logo, colore) si scrivono subito.

Alla creazione la domanda è **"di quale ristorante?"**, non "che nome dai al
menù": il nome del menù è solo l'etichetta della linguetta e si chiede dal
secondo menù dello stesso locale in poi. Il nome del ristorante invece non ha
nessun'altra fonte — chi non fa il claim non ce l'ha da nessuna parte.

**Dal 2026-09-01 un locale ha UN menù** (Tema 19). Il modello dati non è
cambiato — `partner_menus` non ha nessun vincolo di unicità, e più menù resta
una voce del futuro premium — il tappo è l'interruttore `MULTI_MENU` in
`src/lib/features.ts`: `true` e torna tutto com'era. Spento, sparisce solo
quello che esisteva perché i menù potevano essere tanti (la domanda del nome
del menù, i locali già serviti nella tendina, l'azione rapida "Nuovo menù" in
home, e `/menu?nuovo=<id>` apre il menù invece di crearne un altro). Chi ne ha
già più d'uno li tiene e può aprirli. **Chi tocca questa parte non aggiunga un
`UNIQUE (venue_id)`**: descriverebbe lo stesso stato di oggi e sarebbe la cosa
difficile da togliere quando più menù si venderà.

**Dal 2026-09-02 la bozza e il pubblicato sono due cose** (Tema 24,
migration 708 applicata il 02/09): le
tabelle del menù sono la bozza e continuano a salvarsi da sole, mentre
quello che il cliente legge al tavolo cambia solo premendo **"Pubblica le
modifiche"** (`PublishBar`, in cima all'editor e **sticky**). Sotto,
`publish_menu()` prende uno scatto in `partner_venues.published_menu` e la
pagina pubblica legge solo quello.

**Ritirare il menù dalla sala** si fa dalla sezione dell'indirizzo, in fondo
e sottovoce (migration 709): `published_at` torna NULL, lo **scatto resta**.
Chi inquadra un QR già stampato legge che il menù non è al momento
disponibile — ⚠️ mai un errore del browser: chi tocca la pagina pubblica non
la trasformi in un 404 secco. Riattivare si fa **ripubblicando**, così torna
in sala la bozza di adesso e non lo scatto di sei mesi fa.

⚠️ Due presidi che non vanno smontati: l'avviso dice se le modifiche non
pubblicate toccano gli **allergeni** (`menu_publish_state`), perché un
allergene corretto e mai pubblicato resta vecchio sul tavolo e dal portale
non si vede; e le foto **non si cancellano** finché sono dentro un menù già
pubblicato (`photo_in_published_menu`, chiamata da `deleteDishPhoto` e — dal
2026-09-02, dove mancava — da `deleteLogo`), o in sala resterebbe
un'immagine rotta mentre nel portale si vede quella nuova.

**Contenuto e aspetto sono due generi di modifica** (Tema 27,
migration 710): `menu_publish_state()` risponde `contentChanged` (piatti,
prezzi, sezioni, nome del locale, condizioni al tavolo) e
`appearanceChanged` (colore, logo, copertina, carattere, stile delle sezioni,
le due manopole), oltre a `hasChanges` che è la somma. L'aspetto si confronta
**campo per campo contro lo scatto**, non sulle date: `updated_at` del locale
si muove per qualunque cosa, e con le date "ho scelto un colore" e "ho
corretto le condizioni" sarebbero la stessa notizia.

L'elenco dei campi d'aspetto sta in **un posto solo**, `venue_appearance()`:
lo leggono lo scatto (`build_public_menu`), il confronto e l'annullamento.
Aggiungere una manopola d'aspetto = una colonna, una riga lì, una riga in
`venue_appearance_defaults()`, una nell'UPDATE di `revert_appearance()`, una
in `VenueAppearance` (`src/lib/venues.ts`) — e lo scatto e il confronto si
adeguano da sé.

**La grandezza dei testi** (`partner_venues.text_scale`: `compact` / `normal`
/ `roomy`, migration 710) è **fatta dal 2026-09-02**, senza nessuna migration
nuova — la colonna era entrata in anticipo, come `cover_url` nella 709.

**E l'interlinea accanto a lei** (`line_height`: `tight` / `normal` / `airy`,
migration 711). Nel portale stanno **sulla stessa riga**, e non è
impaginazione: sono la stessa domanda vista da due parti — quanto è fitta la
carta. La grandezza cambia quanto sono grandi le lettere, l'interlinea quanta
aria c'è fra una riga e l'altra, e su un menù di una pagina sola la seconda si
nota più della prima. Ogni scelta si scrive **su due righe** con la propria
interlinea, perché fra due righe è l'unico posto in cui si vede. Stessa
ricetta della grandezza (`--lh`, `LINE_HEIGHT_FACTORS`, copia gemella sul
sito) e **stesso pavimento sulle stesse righe**: "Stretta" avvicina la carta,
non impasta la riga degli allergeni.

Non è una classe per grandezza ma **un numero solo**: `--ms` sulla radice
(`TEXT_SCALE_FACTORS` in `venues.ts` → `style` in `MenuPreview`, e lo `style`
di `<body>` sul sito), e ogni misura del contenuto è
`calc(Npx * var(--ms, 1))`. Così una manopola muove tutta la carta e non c'è
un secondo elenco di misure da tenere allineato quando ne nasce una. Scala il
**contenuto** — nome del locale, sezioni, piatti, prezzi, descrizioni,
condizioni; **non** i comandi (lingue, filtro, pastiglie): sono bersagli da
toccare, e un dito non rimpicciolisce con la carta.

⚠️ **La riga degli allergeni ha un pavimento** e `compact` non lo sfonda: sta
nel CSS, `font-size: max(11px, calc(11px * var(--ms, 1)))` sulla classe
`riga-minuta` (e `max(12px, …)` nei pacchetti serif e leggero, dove il
pavimento è il punto in più della compensazione). Il pavimento è salito da 10
a 11 il 2026-09-03 insieme a tutte le altre misure di base (Tema 28): era la
riga più piccola della pagina proprio dove serviva leggerla meglio. Sotto le tre scelte, nel
portale, c'è scritto anche al ristoratore — o "Compatta" sembra rimpicciolire
anche gli allergeni e chi ci tiene non la toccherebbe mai. I fattori
(0.92 / 1 / 1.12) hanno una **copia gemella** sul sito in
`landing/lib/render-menu.js`: se divergono, il ristoratore sceglie guardando
una cosa e il suo cliente al tavolo ne vede un'altra.

**`npm run gemelle` mette le due copie una accanto all'altra** e dice dove
divergono: i fattori di grandezza e interlinea, la tavolozza dei colori, le
regole CSS che condividono alla lettera e le misure dei ruoli della riga del
piatto. Vuole i due checkout affiancati (`allergiapp/` e `landing/`); se
`landing` non c'è — su Vercel, o su una macchina che ha solo questo repo —
esce senza fallire: è uno strumento per chi sviluppa, non un cancello. Le
differenze **volute** si scrivono in `ATTESE` dentro lo script, con la loro
ragione, così restano visibili invece di diventare rumore.

⚠️ Quello che **non** guarda, e va tenuto a mente: le intestazioni, il
dettaglio del piatto e ogni comportamento (il popup, le freccine, il filtro).
Il confronto ruolo per ruolo funziona sui nomi di classe che le due copie
condividono; chi ne aggiunge uno, lo aggiunga a `RUOLI` nello script.

⚠️ **Anche le misure di BASE sono una copia gemella** — i `calc(Npx*var(--ms))`
di `MenuPreview`/`DishDetailSheet` contro quelli di `landing/menu-page.css` —
e dal 2026-09-03 sono **identiche numero per numero**. Prima l'anteprima
stava "un punto sotto" per via della cornice del telefono (360px contro i 390
di un iPhone recente), ma lo sconto non era uguale per tutti i ruoli: nel
portale il nome del piatto stava a un punto dal titolo di sezione, al tavolo a
due. Con i numeri uguali l'anteprima è semplicemente un telefono stretto —
360 sta fra un SE e un 15 — che è una bugia molto più piccola. L'unica
differenza voluta che resta è la compensazione di mezzo punto sulle
descrizioni nei pacchetti serif e leggero, che vive solo sul sito.

**La forma delle foto** (`partner_venues.dish_photo_shape`: `square` /
`round`, **migration 711 — DA APPLICARE**) è la terza voce passata per quella
strada.

> ⚠️ **La 711 va applicata PRIMA di pushare.** `loadVenues()` chiede
> `dish_photo_shape` nella select: senza la colonna, PostgREST rifiuta tutta
> l'interrogazione e il portale resta senza locali — in locale e, appena il
> push arriva su `main`, anche su `partner.allergiapp.com`. Vale per lo
> sviluppo di ogni giorno allo stesso modo: il portale locale parla col
> database di produzione. Nel portale è **una scelta sola con tre risposte** (nessuna, quadrate,
tonde), ma sotto restano **due campi**: `show_dish_photos` esiste dalla 705 e
gli scatti pubblicati lo contengono da mesi, quindi trasformarlo in un codice
a tre valori avrebbe voluto dire rileggere scatti già in sala — e con due
campi, spegnere le foto per poi riaccenderle riporta la forma che si era
scelta. La forma vale per le **miniature in lista** (`.menu-thumb.is-round`
sul sito, `rounded-full` nell'anteprima): la foto grande del popup del piatto
resta rettangolare.

**"Torna all'aspetto pubblicato"** (`revert_appearance`) sta in fondo alla scatola
Aspetto in `BrandBar`, e compare solo se c'è qualcosa da annullare. ⚠️ Vale
**solo per l'aspetto** e non va "completato" con l'annullamento del
contenuto: i fatti dei piatti stanno nel catalogo, condiviso con la scheda
AllergiApp, e riportarli indietro vorrebbe dire disfare una correzione di
allergeni. Quando l'aspetto diventerà premium, il muro va in
`build_public_menu()` e non sul bottone Pubblica — altrimenti un allergene
corretto resta fermo perché qualcuno ha provato un carattere che non ha
pagato.

**L'indirizzo del menù c'è dal 2026-09-01** (migration 707, applicata il
02/09), ma **non è
attivo**: in fondo all'editor una card lo propone dal nome del locale,
controlla che sia libero e lo salva su `partner_venues.slug`. Serve a
mettere il nome al sicuro, non a distribuirlo — la pagina pubblica non
esiste ancora, e la card lo dichiara con una pastiglia. Chi la rende
cliccabile prima che la pagina risponda sta consegnando un indirizzo da
stampare che porta a un errore.

**Un locale, un indirizzo alla volta** (Tema 22, che rovescia il 17):
cambiarlo libera il precedente, senza storico e senza reindirizzamenti.
La conseguenza — un QR stampato che smette di funzionare — la produce il
ristoratore con un gesto suo, e si copre con un avviso al momento del
cambio: **il posto dove metterlo è `MenuAddress.tsx`**, il giorno in cui
esisterà la pubblicazione. Non aggiungere una tabella di slug ritirati
senza rileggere il Tema 22.

Il controllo di disponibilità passa dalla funzione `partner_slug_taken` e
non da una select: le RLS mostrano a ogni partner solo i propri locali,
quindi una select direbbe "libero" anche per un indirizzo già preso.

**Il QR c'è** (`MenuQr`, sotto la card dell'indirizzo, quando uno slug è
stato scelto): anteprima, copia del link, PNG e vettoriale — il secondo
non è un lusso, è quello che chiede la tipografia. Finché la pagina
pubblica non è **online** porta un avviso ambra attaccato ai bottoni di
scarico: è lì che qualcuno sta per portare un file in stampa, e un QR
stampato non si corregge da remoto.

**La pagina pubblica esiste** e sta sul branch `landing`
(`/menu/[slug]`): legge `get_public_menu`, cioè solo lo scatto pubblicato.
Manca il **deploy** — finché il branch non è pushato, quell'indirizzo non
risponde a nessuno.

## L'account e l'accesso

`/account` non è una pagina di sola lettura: da lì si correggono **nome,
cognome e telefono** (la registrazione li chiede di fretta, e un refuso nel
nome poi ti saluta in cima alla home ogni volta), si **cambia la password**, e
si **ritira il consenso marketing**. L'ultimo non è una comodità: un consenso
si revoca con la stessa facilità con cui si dà, e darlo era una casella
spuntata — quindi qui è un interruttore che scrive subito, non un modulo da
confermare e tantomeno una mail da scrivere a qualcuno. La data
(`marketing_consent_at`) se ne va con la revoca: tenerla vorrebbe dire
conservare la prova di un permesso che non c'è più.

Nessuna migration serve: `partner_accounts_own` è già `FOR ALL` sulla propria
riga (700), e `updated_at` lo muove il trigger.

**Password dimenticata** (`/login`): al portale si entra una volta al mese,
quindi dimenticarla è il caso normale e non l'eccezione. Due cose da non
cambiare distrattamente:

- Il link della mail porta a **`/account?password=1`**, cioè allo stesso
  riquadro da cui si cambia la password stando già dentro: una pagina sola con
  due ingressi, invece di due moduli identici da tenere allineati. È un
  **parametro** e non un'ancora perché Supabase si prende il *frammento*
  dell'indirizzo per il suo gettone (`#access_token=…`) e un `#password`
  verrebbe sovrascritto.
- Non si dice **mai** se quell'email esiste: risponderebbe a chi prova
  indirizzi per sapere chi è iscritto. Il messaggio è lo stesso in tutti i
  casi, e per la stessa ragione un rifiuto del server non si mostra.

⚠️ **Dipende dalla config Supabase, non solo dal codice.** L'indirizzo di
ritorno dev'essere nella `uri_allow_list` del progetto, altrimenti il link
della mail rimanda al `site_url` e chi lo apre finisce da un'altra parte senza
capire perché. Stato al 2026-09-01: in lista ci sono
`https://partner.allergiapp.com/**` e `https://allergiapp-partner.vercel.app/**`
— **la produzione funziona, `http://localhost:3001` no** (il `site_url` è
`http://localhost:3000`, cioè l'app). Per provare il recupero in locale va
aggiunto `http://localhost:3001/**` alla lista. Si legge e si cambia via
Management API senza Dashboard: v. la memoria
`reference_supabase_management_api`.

Il progetto ha `mailer_autoconfirm = true`, quindi la registrazione non manda
nessun link di conferma: il ramo `checkEmail` del login oggi non si raggiunge,
e resta lì perché quell'impostazione può cambiare.

Restano da fare, **prima di aprire il portale al pubblico**: i link a
condizioni d'uso e informativa privacy (oggi due `TODO` in `/login` e
nell'onboarding), che aspettano le pagine legali.

## Le foto dei piatti e il logo

Bucket **`partner`** (migration 702), separato da `images` dell'app: porta un
tetto alla dimensione e l'elenco dei tipi ammessi, cioè un limite applicato
dal *server*, e tiene distinti i due mondi utenti/partner. Le policy chiedono
la propria cartella **e** un profilo partner.

Tre cose da non perdere se qualcuno ci rimette mano:

- **Due misure, generate al caricamento e mai dopo.** Sul piano gratuito
  Supabase non esiste la trasformazione immagini lato server: una misura che
  non si genera adesso non si potrà più ottenere se non facendo ricaricare
  le foto al ristoratore, una per una. Grande 900px per la scheda e
  l'ingrandimento, miniatura 240px per le liste — che è quella che si
  moltiplica per quaranta.
- **WebP con ripiego JPEG.** `canvas.toBlob` con un tipo che il browser non
  sa scrivere **non fallisce**: restituisce un PNG in silenzio, che su una
  fotografia pesa molte volte tanto. Quindi il tipo di quello che torna si
  controlla.
- **Il ritaglio quadrato lo sceglie il ristoratore** (`PhotoCropDialog`, che
  dal 02/09 sta in `src/components/` perché serve anche al logo): si trascina
  su **due assi** e ci si avvicina con lo **zoom**. Con lo zoom a uno il
  quadrato è il più grande che ci sta dentro e su un asse non c'è margine —
  il comportamento di prima, che aveva un asse solo. Si mostra perché è
  distruttivo e definitivo: l'originale non lo teniamo. Il ritaglio viaggia
  come `Crop` (`{x, y, zoom}`, tutto in frazioni) così lo stesso vale per la
  miniatura e per la grande, senza misure da riscalare.
- **Avvicinandosi si salva meno.** Il quadrato ritagliato si stringe e non si
  ingrandisce mai oltre i pixel che ci sono: a zoom alto il file salvato è più
  piccolo di 900px, ed è la verità di quanto è rimasto. Per questo lo zoom si
  ferma a 4.

**Il logo del locale sta nello stesso bucket** (`<utente>/logos/<casuale>`),
dal 2026-09-02: un file solo e nessuna miniatura, perché la misura piena
(lato lungo 240px) è già quella di una miniatura, e **le proporzioni restano
intatte** — un logo non si ritaglia, o si taglia il nome del ristorante. Il
fondo bianco si disegna prima: quasi tutti arrivano in PNG trasparente, e su
un formato senza trasparenza diventerebbe nero.

Prima era un **data URL dentro `partner_venues.logo_url`**, cioè l'immagine
in testo dentro la riga. La colonna non è cambiata — prima conteneva
l'immagine, adesso il suo indirizzo — quindi **nessuna migration**, e i loghi
vecchi continuano a mostrarsi finché non vengono sostituiti. Il motivo vero
non era il portale ma la **pagina pubblica**: un data URL finisce dentro ogni
pagina generata, invece di essere scaricato una volta e tenuto in cache.

**I file partono con "conservabile un anno"** (`cacheControl`), non con l'ora
predefinita di Supabase: il nome è casuale e non si sovrascrive mai, quindi il
file a quell'indirizzo non può cambiare e una cache lunga non ha rischi. ⚠️
Non copiare questo valore sulle foto delle **recensioni nell'app**: là il
percorso è fisso (`<idRecensione>_<indice>.webp`) e la sostituzione riscrive
lo stesso file — si cambierebbe il nome, non la durata.

I file si cancellano in tre momenti, ognuno con la sua condizione: la foto
sostituita **dopo** che la riga è stata scritta; il piatto eliminato allo
scadere dell'annulla e **solo se** la riga è sparita davvero (un piatto che
ricompare con l'immagine rotta è peggio di un file di troppo); le foto
caricate e abbandonate allo smontaggio della maschera, non nel bottone
Annulla, perché da lì si esce anche con la ✕ e con Esc.

Il **logo** segue la stessa regola della foto sostituita: si porta via il
precedente solo **dopo** che la riga è stata scritta davvero (`setIdentity` in
`venues.ts`). Cancellando prima, una scrittura fallita lascerebbe la riga a
puntare a un file distrutto da noi. Sui loghi vecchi, che sono data URL e non
file, la cancellazione non fa niente.

Restano fuori portata gli orfani da scheda chiusa al momento sbagliato o da
scrittura rifiutata. Una passata di pulizia è stata **valutata e rimandata**:
cancellerebbe per *assenza*, quindi con un elenco dei piatti incompleto
porterebbe via foto vere — v. `../TODO.md` per il motivo esteso.

⚠️ **Per verificare se un file è stato cancellato non serve chiedere il suo
indirizzo pubblico**: la CDN continua a servire una copia in cache anche con
`cache: 'no-store'`. Va guardata `storage.objects`.

## App installabile (icone e schermate di avvio)

Il portale si installa sulla home ("Aggiungi a Home" su iOS, "Installa" su
Android). I file stanno in `public/` e li genera uno script, non si ritoccano
a mano:

```bash
node partner/scripts/generate-pwa-assets.mjs
```

Sorgente unica: `assets/icons/logo/plate-forks.png`, la mascotte con le
posate — **deliberatamente diversa dall'icona dell'app** (`assets/icon.png`),
perché chi ha installato anche l'app del cliente deve distinguere le due
icone in home senza leggere il nome.

Lo script stampa anche l'elenco `startupImage` da incollare in
`src/app/layout.tsx`: se si aggiunge un modello di iPhone o iPad va
aggiornata la lista `SPLASH` nello script e ricopiato l'elenco.

Due vincoli da non perdere se si rigenerano gli asset:

- **La mascotte non va mai ridimensionata sulle schermate di avvio.** A
  grandezza naturale l'immagine resta entro i 256 colori del sorgente e il
  PNG si scrive indicizzato: 16 schermate pesano ~970 KB invece di 3,1 MB.
- **L'icona maskable tiene la mascotte al 62%, non all'80%.** I launcher
  Android ritagliano un cerchio più stretto della "safe zone" che si cita di
  solito; all'80% le posate venivano tagliate.

I file PWA (`manifest.webmanifest`, `sw.js`, `offline.html`, `icons/`,
`splash/`) devono restare raggiungibili senza credenziali: il browser scarica
il manifest da solo, e un 401 lì significa nessuna installazione offerta.
Vale la pena ricordarlo se un domani si rimette un muro davanti al portale.

Il service worker **non mette in cache l'applicazione** di proposito:
intercetta solo le navigazioni per servire `offline.html`. Così un deploy
nuovo non resta indietro dietro una cache da svuotare. Esiste perché senza
worker Chrome su Android non propone nemmeno l'installazione.

Ha il **navigation preload** attivo, e non è un dettaglio: un worker con un
fetch handler obbliga il browser ad accenderlo *prima* di chiedere la pagina
alla rete, ed è il motivo per cui un sito può sembrare più lento **dopo**
averlo installato. Col preload la richiesta parte in parallelo. Se un domani
si toglie quel `navigationPreload.enable()`, l'avvio peggiora senza che
niente si rompa — cioè in modo difficile da collegare alla causa.

## Tempi di apertura — cosa è già stato misurato

Misurato sul dominio live il 2026-08-30, per non rifare l'analisi da capo:

| | costo |
|---|---|
| HTML dal server | 150-270 ms |
| ~~muro basic auth~~ | costava un giro, ~150 ms; rimosso il 30/08 |
| rinnovo token Supabase | ~100 ms via cavo, 200-400 ms da telefono, **in serie dopo il JS** |
| JS: 180 KB compressi (~50 KB sono il client Supabase) | esecuzione su telefono **300-800 ms** |

Nell'HTML iniziale c'è solo `Caricamento…`: il portale non disegna niente
finché il JS non ha finito e la sessione non è stata ripristinata.

**La cura è la sessione nei cookie (`@supabase/ssr`), e dal 2026-08-31 non
è più bloccata**: il vincolo era che finché i locali stavano in
localStorage il server non poteva comunque disegnare il contenuto, e quello
scambio è fatto. Ora il server prenderebbe sessione dal cookie e locali dal
database in un colpo solo. Tocca quattro file (`AuthGuard`, `login/page`,
`account/page`, `PartnerOnboarding`). Dettagli e alternative scartate
(alzare `jwt_exp`, togliere il muro, alleggerire il bundle) in `../TODO.md`,
sezione Ristoranti Premium.

Nota: la tabella qui sopra è di prima delle letture condivise (31/08), che
hanno tolto due interrogazioni all'apertura di `/piatti` e una all'apertura
di ogni piatto. I tempi del JS non cambiano; cambia quanto si aspetta dopo.

## ⚠️ Deploy: l'ultimo commit del push deve toccare `partner/`

Per non buildare a ogni push dell'app Expo, il progetto ha un Ignored
Build Step: `git diff --quiet HEAD^ HEAD -- .` — builda solo se `partner/`
è cambiata **nell'ultimo commit**, non nel push intero.

Quindi con un push di più commit, se l'ultimo NON tocca `partner/` (es. un
commit su `TODO.md`), Vercel salta la build e si porta via anche i commit
sotto: il deployment risulta *Canceled* e in produzione resta la versione
precedente (successo il 2026-08-23, commit `abe18e2` + `4c05f60`).

Attenzione anche al rimedio: **Redeploy dalla dashboard NON serve**,
ripete l'ultimo deployment *riuscito*, cioè ricostruisce il commit
vecchio. Serve un nuovo commit che tocchi `partner/`.
