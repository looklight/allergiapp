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

⚠️ **Due debiti aperti da questo cambio**, entrambi visibili a schermo:

1. **La rinomina non è stata fatta.** Nel codice il tipo si chiama ancora
   `Showcase` e le schermate dicono ancora "Vetrina". È stato tenuto fuori di
   proposito dal giro in cui il codice è stato rimesso in pari col database:
   mescolare la riparazione di un guasto con un cambio di parole vuol dire
   non sapere più quale dei due ha rotto cosa.
2. **Gli interruttori "in vetrina" in `/piatti` non fanno niente.** I piatti
   accesi ora pendono dalla scheda, che senza claim non esiste: `setDishOn`
   esce senza scrivere (e senza fingere), ma il comando a schermo resta lì
   senza spiegazione. Va disabilitato con un messaggio.

## Sviluppo

```bash
cd partner
npm install
npm run dev   # http://localhost:3001 (porta diversa dall'admin)
```

Env in `.env.local` (stesso progetto Supabase di app e admin):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

⚠️ **Non lanciare `npm run build` mentre `npm run dev` sta girando**:
scrivono nella stessa cartella `.next` e la build di produzione sovrascrive
i file che il server ha in uso. Il portale resta piantato su `Caricamento…`
con i chunk a 404, e sembra un errore del codice. Si rimedia fermando il
server, `rm -rf .next`, e riavviando.

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
  che sa come. Le liste (catalogo e vetrine) stanno **in un posto solo e
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
- `src/lib/showcases.ts` — il **locale** (`partner_venues`): nome, logo,
  colore, link, e gli id dei piatti accesi sulla sua scheda. Il nome e
  l'aspetto stanno qui e non in un modulo a parte perché è la **stessa riga**
  che questo file legge già: una seconda interrogazione sulla stessa tabella
  è esattamente quello che il livello dati condiviso serve a togliere.
  `cardId` è null quando non c'è nessuna scheda — chi mostra comandi che
  scrivono lì deve spegnerli.
- `src/lib/menus.ts` — i menù, con sezioni e righe. **Non cancella e
  reinserisce: sovrascrive per id**, perché gli id li generiamo noi e
  l'interfaccia li usa come chiavi — con id nuovi a ogni salvataggio, una
  riga che si sta trascinando cambierebbe identità sotto le dita. Le righe si
  ripuliscono PRIMA delle sezioni: il vincolo della 704 fa risalire fuori
  sezione le righe di una sezione cancellata, e nell'ordine sbagliato i
  piatti riapparirebbero in cima invece di sparire.
- `src/lib/menuBrand.ts` — solo costanti: i sei colori (scelti da noi, tutti
  scuri abbastanza da reggere il testo) e la riduzione del logo. ⚠️ Il logo è
  ancora un **data URL dentro la riga**, non un file su Storage: va portato
  su `photos.ts`, per la stessa ragione scritta nella 702.
- `src/components/menus/` — selettore dei piatti dal catalogo (con "Nuovo
  piatto", che apre la stessa maschera del gestionale), riga con prezzo e
  maniglia di trascinamento, aspetto del locale, anteprima pubblica col
  filtro allergeni, finestra di creazione.
- `src/lib/dishes.ts` — il catalogo piatti, che è **del partner** e non della
  vetrina: lo stesso piatto si accende in più locali senza duplicarsi.
  Acceso/spento è uno stato della coppia piatto-vetrina, non del piatto.
- `src/components/dishes/` — maschera, riga della tabella, pannello laterale,
  finestra di eliminazione e **finestra del ritaglio** dei piatti.
- `src/lib/useModal.ts` — comportamento comune di tutte le finestre: Esc,
  fuoco che entra e non esce col Tab, scorrimento della pagina bloccato.
- Le pagine: `/` le vetrine, `/vetrina/[id]` l'editor con l'anteprima,
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

Tre cose da non disfare per sbaglio:

- **Il filtro allergeni riordina, non nasconde.** I piatti esclusi restano
  leggibili in fondo alla loro sezione, col motivo scritto. Farli sparire
  direbbe che quel che resta è stato *verificato*, e il dato lo dichiara il
  ristoratore. Per le esigenze il testo dice "non indicato per", mai "non è".
- **Il prezzo è in centesimi interi**, e il campo tiene il testo mentre si
  scrive: altrimenti chi scrive "12," se lo vede riscrivere sotto le dita.
- **Logo e colore appartengono al LOCALE, non al menù.** Al tavolo carta,
  pranzo e bevande sono linguette della stessa pagina: un logo per menù
  darebbe tre intestazioni diverse allo stesso ristorante.

Alla creazione la domanda è **"di quale ristorante?"**, non "che nome dai al
menù": il nome del menù è solo l'etichetta della linguetta e si chiede dal
secondo menù dello stesso locale in poi. Il nome del ristorante invece non ha
nessun'altra fonte — chi non fa il claim non ce l'ha da nessuna parte.

Non c'è ancora **niente della pubblicazione**: nessuno slug, nessun QR,
nessuna pagina pubblica. Sono la fase successiva, e le regole dello slug
(mai riassegnato, v. Tema 17) si decidono insieme a quella.

## Le foto dei piatti

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
- **Il ritaglio quadrato lo sceglie il ristoratore** (`PhotoCropDialog`), e
  ha un asse solo: il quadrato preso è il più grande che ci sta dentro,
  quindi sul lato corto è già tutto dentro. Si mostra perché è distruttivo e
  definitivo — l'originale non lo teniamo.

I file si cancellano in tre momenti, ognuno con la sua condizione: la foto
sostituita **dopo** che la riga è stata scritta; il piatto eliminato allo
scadere dell'annulla e **solo se** la riga è sparita davvero (un piatto che
ricompare con l'immagine rotta è peggio di un file di troppo); le foto
caricate e abbandonate allo smontaggio della maschera, non nel bottone
Annulla, perché da lì si esce anche con la ✕ e con Esc.

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
è più bloccata**: il vincolo era che finché le vetrine stavano in
localStorage il server non poteva comunque disegnare il contenuto, e quello
scambio è fatto. Ora il server prenderebbe sessione dal cookie e vetrine dal
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
