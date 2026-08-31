# AllergiApp Partner

Portale web per i ristoratori (`partner.allergiapp.com`) — claim della
scheda, vetrina (piatti+allergeni, link), abbonamento. Design e decisioni in
`../MONETIZATION.md`; il menù digitale, che nascerà da questo stesso
catalogo, in `../DIGITAL_MENU.md`.

**I dati stanno su Supabase dal 2026-08-30** (tabelle `partner_*`, migration
700/701) e le foto sullo Storage dal 31/08 (bucket `partner`, migration 702).
Il localStorage non tiene più niente se non la lingua scelta.

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
- `src/lib/showcases.ts` — le vetrine (una per locale): link, nome, e gli id
  dei piatti accesi.
- `src/lib/dishes.ts` — il catalogo piatti, che è **del partner** e non della
  vetrina: lo stesso piatto si accende in più locali senza duplicarsi.
  Acceso/spento è uno stato della coppia piatto-vetrina, non del piatto.
- `src/components/dishes/` — maschera, riga della tabella, pannello laterale,
  finestra di eliminazione e **finestra del ritaglio** dei piatti.
- `src/lib/useModal.ts` — comportamento comune di tutte le finestre: Esc,
  fuoco che entra e non esce col Tab, scorrimento della pagina bloccato.
- Le pagine: `/` le vetrine, `/vetrina/[id]` l'editor con l'anteprima,
  `/piatti` il gestionale del catalogo.

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
