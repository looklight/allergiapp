# AllergiApp Partner

Portale web per i ristoratori (`partner.allergiapp.com`) — claim della
scheda, vetrina (piatti+allergeni, link), abbonamento. Design e decisioni in
`../MONETIZATION.md`.

## Sviluppo

```bash
cd partner
npm install
npm run dev   # http://localhost:3001 (porta diversa dall'admin)
```

Env in `.env.local` (stesso progetto Supabase di app e admin):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

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
  Dominio `partner.allergiapp.com`, dietro basic auth nel middleware.

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
`splash/`) sono **fuori dal muro basic auth** nel middleware: il browser
scarica il manifest senza credenziali, e un 401 lì significa nessuna
installazione offerta.

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
| muro basic auth | **un solo giro, ~150 ms** — non è lui la lentezza |
| rinnovo token Supabase | ~100 ms via cavo, 200-400 ms da telefono, **in serie dopo il JS** |
| JS: 180 KB compressi (~50 KB sono il client Supabase) | esecuzione su telefono **300-800 ms** |

Nell'HTML iniziale c'è solo `Caricamento…`: il portale non disegna niente
finché il JS non ha finito e la sessione non è stata ripristinata.

**La cura è la sessione nei cookie (`@supabase/ssr`), ma va fatta insieme
alla migration 700**, non prima: finché le vetrine stanno in localStorage il
server non potrebbe comunque disegnare il contenuto. Dettagli e alternative
scartate (alzare `jwt_exp`, togliere il muro, alleggerire il bundle) in
`../TODO.md`, sezione Ristoranti Premium.

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
