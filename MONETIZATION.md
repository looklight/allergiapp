# Monetizzazione — riflessioni esplorative

> Documento di lavoro: raccoglie le riflessioni fatte finora (luglio 2026), **non è un piano**.
> Quando decideremo di partire, da qui nascerà il piano operativo a fasi.
> Nessuna timeline: si accumula qui finché non siamo pronti.

## Stato attuale in breve (al 2026-07-27)

- **Portale partner**: progetto Next.js separato su `partner.allergiapp.com`
  (cartella `partner/` nel repo, Vercel deploya da `main`). L'admin non si tocca.
- **Modello**: app gratis per gli utenti; lato ristoratori **premium-only**
  (abbonamento mensile/annuale via Stripe, **solo B2B a P.IVA**, nessun
  payout). Eventuale piano free deciso in seguito, sui dati dei fondatori.
- **Flusso**: iscrizione leggera → dashboard compilabile come **bozza
  privata** → claim = nome/cognome + 5 campi aziendali (paese, denominazione,
  P.IVA/VAT validata via VIES, sede, email fatturazione) + associazione a una
  scheda dell'app → abbonamento = pubblicazione.
- **Verifica**: identica in ogni paese, nessun documento nel flusso normale;
  i cancelli sono dichiarazione tracciabile + carta + fattura + moderazione a
  valle. Documento+selfie solo in escalation nei casi contesi.
- **Il premium vende strumenti** (piatti+allergeni, link, risposte,
  analytics, certificazioni), **mai visibilità o sicurezza**: pin e
  ordinamento restano community-driven.
- **Abbonamento scaduto** = downgrade morbido (contenuti mai cancellati,
  vetrina spenta, win-back al rinnovo).
- **Cold start**: fondatori con premium regalato 6–12 mesi nelle città dense.
- **Fattura elettronica**: la emettiamo noi via SdI (Stripe non la fa).
- **Fondazioni (27/07, seconda sessione)**: portale IT+EN con i18n dal
  giorno 1; un solo gestore per locale (un account può gestire più locali,
  mai il contrario); 1 abbonamento = 1 locale, non trasferibile; fase 1 solo
  claim di schede esistenti (locale mancante → messaggio ponte verso l'app);
  migrations partner in serie 7xx su main.

## Principio guida

**L'app resta gratuita per gli utenti. Si monetizza il lato ristoratori.**

In un'app di sicurezza per allergici la fiducia è il prodotto: qualsiasi cosa
suoni come "visibilità comprata" o "badge a pagamento" la distrugge. Da qui la
regola fondante:

> Il premium vende **strumenti e informazioni**, mai visibilità né percezione
> di sicurezza. Nessun effetto su pin, ordinamento, punteggi o matching
> aggregato. Il colore dei pin resta guidato dalla community.

Obiettivo economico realistico della prima fase: **sostenibilità
dell'infrastruttura** (Supabase Pro, EAS a pagamento → sblocco OTA, costi
Apple/Google), non profitto.

## Strade valutate e scartate

| Strada | Perché no |
|---|---|
| Premium B2C per gli utenti | Il core (cercare ristoranti sicuri) deve restare gratis: è la promessa dell'app e la base della community che genera le recensioni |
| Pubblicità | Le allergie sono dati art. 9 GDPR: ads profilate praticamente escluse; contextual generico rende poco e degrada l'esperienza |
| Vendita insight/dati a terzi | Campo minato con dati sanitari, anche in forma aggregata |
| Tip jar / donazioni | Non scartata del tutto, ma resa marginale: costo quasi zero, rende poco |

Restano valide come **quick win parallele**: affiliazioni prenotazione
(TheFork e simili; Booking quando arriverà la feature hotel/B&B) — zero
attrito, zero conflitto di fiducia, l'utente ha già scelto il ristorante.

## Il modello: piattaforma self-service per ristoratori (stile Airbnb)

Il ristoratore gestisce da solo i propri asset; la piattaforma fornisce
strumenti ben fatti (UI/UX curata) per un mutuo vantaggio: schede più ricche →
app migliore per gli allergici → più utenti → più valore per il ristoratore.

Vincolo pratico che rende il self-service obbligato: una persona sola non può
essere il collo di bottiglia di claim, contenuti e fatturazione.

### I quattro pezzi

1. **Claim automatico della scheda** ("Sei il proprietario?")
   - Il claim è il **cancello d'ingresso di tutto**: primo pezzo da disegnare.
   - Design dettagliato nella sezione "Claim self-service" più sotto
     (definito 2026-07-27).

2. **Dashboard ristoratore — prodotto web separato dall'app**
   - **DECISO (2026-07-27): progetto Next.js separato su
     `partner.allergiapp.com`.** Nuova cartella nel repo (es. `partner/`,
     accanto ad `admin/`), progetto Vercel dedicato che deploya **da `main`**
     con root directory — niente branch di deploy dedicato stile `admin-prod`,
     per non replicarne il tech debt. L'admin resta com'è.
   - Perché separato dall'admin: cookie/sessioni isolate tra sottodomini,
     superficie di rischio distinta (admin = interno, portale = pubblico),
     deploy e ritmi di evoluzione indipendenti, identità propria per il
     ristoratore (un URL con "admin" sembra la porta di servizio).
   - Perché "partner": caldo e coerente col mutuo vantaggio a fondamento del
     modello, stessa parola in italiano e inglese, copre anche i futuri
     hotel/B&B (sono tutti "partner", non tutti "ristoratori"). Scartati:
     `business` (freddo/corporate), `pro` (si legge come premium B2C, che non
     esisterà), nomi italiani tipo `gestione`/`locali` (non scalano all'estero).
   - Stesso progetto Supabase di app e admin, ma ruolo distinto (né utente app
     né admin): tabella tipo `restaurant_managers` (utente → ristorante) con
     RLS scoped per ristorante, popolata dal flusso di claim.
   - MAI dentro l'app mobile: il lato business evolve al ritmo del web, zero
     dipendenza da build store e OTA bloccate.
   - Sezioni: dati e link (prenotazione, delivery, menù, sito), piatti/servizi,
     recensioni con risposta, certificazioni, mini-analytics.
   - Il **mini-analytics** ("questo mese: X visite al profilo, Y click sul
     menù") è il motore della conversione a pagamento — come le statistiche
     host di Airbnb.
   - **Vincolo non negoziabile (art. 9 GDPR)**: l'analytics mostrato ai
     ristoratori è SOLO aggregato generico (visite, click) — **mai segmentato
     per profilo allergie/esigenze degli utenti** ("ti hanno visto 12
     celiaci" = trattamento di dati sanitari per fini commerciali, escluso
     come la vendita di insight).

3. **Billing self-serve**
   - Chi paga è un'azienda, non l'utente dell'app → portale web + **Stripe
     Checkout + Customer Portal**. Niente IAP, niente 15–30% agli store.
   - Il ristoratore si abbona, cambia carta, disdice, scarica fatture da solo.
   - **Solo abbonamento (mensile o annuale), nessun payout**: il partner paga,
     non incassa mai attraverso la piattaforma. Conseguenze: niente Stripe
     Connect; niente obblighi DAC7 (riguardano le piattaforme tramite cui i
     venditori *guadagnano*); annuale con sconto classico (~2 mesi gratis),
     mensile come barriera d'ingresso bassa per lo scettico; il programma
     fondatori converte naturalmente in annuale a fine periodo gratuito.
   - **Granularità (deciso 2026-07-27): 1 abbonamento = 1 locale, non
     trasferibile** — né tra locali né tra account (chi subentra dopo un
     contro-claim fa il proprio abbonamento, non eredita quello altrui;
     nessuna funzione di "spostamento" da costruire). Su Stripe: un
     **Customer per azienda** (anagrafica, carta e fatture in un posto
     solo), una **Subscription per locale** agganciata a quel Customer;
     eventuali sconti multi-locale via coupon sul Customer, senza toccare
     l'architettura.
   - **Attenzione — il KYB di Stripe NON scatta**: Stripe verifica l'identità
     aziendale di chi *riceve* denaro, non di chi paga. Un abbonato è solo un
     titolare di carta: la carta dà tracciabilità (segnale alla TripAdvisor),
     non prova di titolarità. Il cancello vero resta il claim.
   - **Solo B2B, riservato a titolari di P.IVA (deciso 2026-07-27)** — niente
     acquisto "da privato": (a) la P.IVA è l'identità su cui si reggono
     verifica e deterrente — un pagamento da privato riaprirebbe la porta
     della vetrina comprata da terzi; (b) ogni incasso va comunque
     documentato, col B2B la fattura parte in automatico; (c) il B2C
     attiverebbe tutele consumer UE (recesso 14gg) e regimi IVA OSS. Nei ToS:
     "servizio riservato ad attività con partita IVA". Nota: la **carta può
     essere personale** — l'intestatario della fattura è l'azienda, mezzo di
     pagamento e identità del cliente sono cose diverse. Estero B2B semplice:
     intra-UE reverse charge con VIES, extra-UE fuori campo (Stripe Tax
     gestisce la logica; dati comunque a SdI). Chiarito anche il ruolo della
     PEC: per fatturare NON serve (senza recapito si emette con codice
     destinatario 0000000 → cassetto fiscale del cliente) — la PEC è l'ancora
     di *verifica*, non di consegna fattura.
   - **Fatturazione elettronica (SdI)**: vendendo B2B a P.IVA italiane la
     fattura la emettiamo noi, in formato FatturaPA via SdI — Stripe non lo fa
     nativamente. Soluzioni: connettore Stripe → gestionale (Fatture in Cloud
     e simili) oppure, a bassi volumi, il commercialista dal report mensile.
     Da verificare col commercialista prima di partire.

4. **Moderazione a posteriori, non approvazione preventiva**
   - Il ristoratore pubblica subito; gli utenti segnalano; si interviene
     dall'admin solo sulle segnalazioni.
   - **Scala graduata degli interventi admin** (2026-07-27): rimozione del
     singolo contenuto (un piatto, una foto, un link) → sospensione
     dell'intera vetrina → revoca del claim. Ogni intervento con motivazione
     al partner e possibilità di replica (DSA art. 17). Il ristoratore ha
     inoltre la **pausa volontaria** della propria vetrina (v. sezione
     modello commerciale).
   - Eccezione: le **certificazioni** (v. sotto), dove la posta è la sicurezza.
   - Perimetro dell'auto-pubblicazione: libero su foto, piatti, link, risposte;
     vincolato su tutto ciò che può suonare come promessa di sicurezza. **Mai
     campi liberi tipo "adatto ai celiaci"** — solo checkbox strutturate con
     wording nostro, vagliato legalmente.

## Claim self-service (design 2026-07-27)

### Principio cardine (v3, 2026-07-27)

**Stesso identico percorso in qualsiasi paese; ogni claim è ancorato a una
persona identificata e a un'azienda dichiarata tracciabile.** Persona = nome,
cognome, email (già verificata: è l'accesso al portale). Azienda =
anagrafica fiscale con **P.IVA/VAT come identificativo universale**. Il
collegamento col locale è dichiarato, sempre revocabile, protetto dalla
moderazione a posteriori; i cancelli "duri" del caso normale sono la carta al
checkout e la fattura intestata all'azienda dichiarata (col premium-only
nessuno pubblica senza pagare). La verifica forte dell'identità (documento +
selfie) è **arma di escalation** per i contesi, non un passo del flusso.
Requisito internazionale (scelta utente 2026-07-27): il prodotto nasce
uniforme come Airbnb/Booking — **nessun primitivo solo-locale nel percorso
utente** (niente PEC, registri camerali, SIRET…); le differenze paese vivono
solo nel backend (SdI, regimi IVA) o negli strumenti admin.

### Il flusso

1. **Account** — registrazione normale su partner.allergiapp.com, stesso pool
   auth Supabase. L'account da solo non dà poteri: si è partner solo dopo il
   claim (anagrafica + associazione). L'accesso deriva dalle righe di `restaurant_managers`
   (utente → ristorante), NON dal campo `role` su profiles (evita superfici
   di role-escalation). **Uno-a-molti (deciso 2026-07-27)**: un account può
   gestire più locali (catene oggi, hotel domani), ma ogni locale ha **un
   solo gestore** — vincolo di unicità sul claim *attivo* (indice parziale:
   le righe contese/storiche con altri stati restano possibili), niente
   inviti co-gestori, il subentro passa solo dal contro-claim. Nota per la
   bozza SQL: il nome `restaurant_managers` nasceva many-to-many — valutare
   un nome più fedele.
2. **Trova il tuo locale** — ricerca per nome/città. Il ramo "non c'è?
   aggiungilo" è **rimandato (deciso 2026-07-27)**: in fase 1 si claimano
   solo schede esistenti; a ricerca vuota un messaggio ponte ("Non trovi il
   tuo locale? Aggiungilo dall'app AllergiApp, poi torna qui a richiederne
   la gestione") — il flusso community `app/restaurants/add.tsx` esiste già
   e la scheda creata appare subito nella ricerca del portale.
   L'inserimento nativo nel portale (inserimento + claim in un colpo,
   moderazione a posteriori) diventa **prerequisito della fase 4**: quando
   arriva il partner organico, non deve passare dall'app consumer.
3. **Anagrafica aziendale (al primo claim)** — form unico mondiale, 5 campi:
   **paese, denominazione, identificativo fiscale (P.IVA/VAT), sede, email di
   fatturazione**; blocco condizionale invisibile dove serve (es. codice SDI
   *facoltativo* per l'Italia — senza, si emette con 0000000 → cassetto
   fiscale). Validazione uniforme in tutta l'UE via **VIES** (gratis),
   best-effort altrove. Dati chiesti una volta per azienda, riusati su tutti
   i suoi locali e passati al checkout (mai doppio inserimento). Doppio
   servizio: fatturazione + **deterrente** (chi non è il titolare deve
   dichiarare il falso su un'azienda reale e tracciabile). L'account resta
   leggero (email+password): l'anagrafica scatta al primo claim, la vera
   "registrazione da partner".
4. **Identificazione della persona** — nome, cognome, email: l'email è già
   verificata (è l'accesso al portale), nome e cognome sono dichiarati.
   Niente documento nel flusso normale (scelta 2026-07-27, semplicità): la
   verifica forte documento+selfie via provider globale (candidato: **Stripe
   Identity** — stesso vendor del billing, ~100 paesi, ~1,5–2 € a verifica)
   è riservata all'**escalation** nei casi contesi, dove l'admin può
   pretenderla.
5. **Collegamento persona → azienda → locale: dichiarato** — nessun registro
   lo "prova" in modo trasversale (insegna ≠ ragione sociale, sede ≠
   indirizzo del locale), quindi non ci si prova: il collegamento è
   dichiarato e protetto dalle difese a valle (contro-claim, segnalazioni,
   moderazione a posteriori, audit, rate limit, decadenza per inattività) più
   i cancelli economici (carta + fattura: chi dichiara la P.IVA altrui fa
   arrivare fatture nel cassetto fiscale della vittima — anomalia che emerge
   da sola). Scommessa alla Airbnb, sostenibile con economia a basso
   incentivo.
6. **Casi contesi** — un solo claim attivo per locale. Contro-claim sempre
   possibile: il gestore attuale è notificato e deve ri-verificarsi entro X
   giorni, altrimenti la gestione passa. Conflitti veri (es. cambio gestione)
   → coda admin con documenti aziendali (SCIA/licenza, visura, contratto) o
   video-verifica: lì serve un occhio umano, e lì l'admin può usare anche
   strumenti locali (per l'Italia: PEC, registri camerali) — dietro le
   quinte, mai nel percorso utente.
7. **Checkout** — la carta aggiunge tracciabilità (può essere personale:
   l'intestatario fattura resta l'azienda, v. billing).

> **Archivio metodi superati (tutti il 2026-07-27):**
> - **v1** — codice via email su dominio del sito o SMS/chiamata vocale
>   on-demand al numero pubblico del locale (modello Yelp/Google), fallback
>   documenti. Scartato: macchinoso e frustrante (titolare remoto, dettatura
>   codici, social engineering sulla chiamata).
> - **v2** — codice alla PEC aziendale ricavata da INI-PEC a partire dalla
>   P.IVA (primitivo forte ma solo italiano). Scartato per il requisito di
>   uniformità internazionale: nessun primitivo solo-locale nel percorso
>   utente. La PEC resta utilizzabile dall'admin come prova nei contesi
>   italiani.

### Taratura della semplicità (2026-07-27)

Senza soldi che girano lato partner l'incentivo alla frode è basso →
controlli proporzionati: leggeri ma reali. La semplificazione sta nel
**come**, non nel **se** — gli allergeni per piatto sono informazione di
sicurezza e l'etichetta "secondo il ristoratore" vale solo se chi parla è
davvero il ristoratore. Nel v3 i cancelli sono: dichiarazione tracciabile
(anagrafica + P.IVA), pagamento, moderazione a valle:

- **Burocrazia solo se serve due volte**: si chiedono soltanto dati che
  servono comunque (anagrafica per fatturare, identità per rispondere del
  claim) e **mai attese di revisione umana né documenti nel caso normale** —
  VIES valida la P.IVA in tempo reale, il resto è dichiarativo. Il
  design di marzo 2026 (`restaurant_claims` con documento + verifica manuale
  di OGNI claim) resta superato: NON copiarlo. (Stessa sorte per il "badge
  premium" e l'`ORDER BY is_premium` di quello schema: violano il principio
  guida.)
- **Verifica al momento di pubblicare, non all'ingresso** (raffinato
  2026-07-27): account leggero e dashboard subito **compilabile come bozza
  privata** — il ristoratore inserisce piatti, dettagli e foto prima ancora
  del claim, senza che nulla appaia nell'app. Anagrafica + associazione alla
  scheda + abbonamento scattano solo per pubblicare. Leva di conversione: al
  paywall non compra una promessa, **pubblica un lavoro già fatto**.
  Implicazioni: i contenuti partner vivono in tabelle proprie legate
  all'account (stato bozza), agganciate al `restaurant_id` solo al claim; nel
  ramo "il locale non c'è" la scheda base creata (nome, indirizzo, posizione)
  può andare live subito come contenuto community — solo la vetrina resta
  dietro claim + abbonamento.
- **Google Business Profile OAuth rimandata**: elegante ma è una nuova
  integrazione Google mentre la direzione è rimuoverle; l'identity
  verification copre già tutto il mondo con un metodo solo.

### Benchmark (come verificano gli altri, lug 2026)

- **Yelp/Google**: codice al contatto pubblico in scheda — il modello
  classico dei listing (era il nostro v1). Google in più: video-verifica
  (vetrina, interni, prova d'accesso) come metodo forte; cartolina postale
  ormai residuale.
- **TripAdvisor**: email dominio + telefono in scheda + verifica via carta di
  credito (il circuito pagamenti come KYC).
- **Booking/delivery/TheFork**: documenti + KYC completo o contratto
  commerciale — sostenibile solo perché gestiscono transazioni; per noi no.
- **Airbnb**: verifica l'identità della *persona*, non la titolarità
  dell'asset — l'asset è dichiarato e la fiducia si gestisce a valle.
- Da tenere come **arma di riserva**: video-verifica per le contese serie;
  carta salvata / micro-addebito alla TripAdvisor se il gratuito venisse
  abusato (v. sotto).
- Il modello scelto (v3) è un **Airbnb alleggerito**: persona identificata
  (nome/cognome/email) + azienda e asset dichiarati + cancelli economici
  (carta, fattura) + fiducia gestita a valle; verifica documentale solo in
  escalation. Nota storica: la
  PEC italiana (recapito legale certificato, indice pubblico INI-PEC) era
  stata scelta come metodo principale (v2) perché più forte di qualsiasi
  primitivo dei player globali, poi accantonata per il requisito di
  uniformità internazionale — resta un asso nella manica dell'admin per i
  contesi italiani.

### Anti-squatting e account fraudolenti

Caso: riscatto il locale perché è gratis, poi zero contenuti o intralcio al
vero titolare. Tre meccanismi (in ordine di importanza):

1. **Il claim decade se non usato** ("use it or lose it"): zero contenuti e
   zero accessi dopo N mesi → promemoria → auto-revoca, scheda torna "non
   gestita". Stesso principio della scadenza morbida delle dichiarazioni: il
   diritto sulla scheda si mantiene vivo, non è un possesso perpetuo.
2. **Il claim non è mai un lucchetto**: contro-claim con ri-verifica (v. casi
   contesi sopra).
3. **Segnali in admin, non burocrazia in ingresso**: rate limit sui claim per
   account; pannello admin che evidenzia pattern sospetti (stesso account su
   città diverse, claim con zero contenuti, link modificati subito dopo il
   claim — l'unico vettore di phishing); segnalazione dall'app "profilo
   gestito dalla persona sbagliata"; audit log di claim e modifiche, revoca
   sempre possibile.

Requisito tecnico dal giorno 1: lo schema del claim deve avere **stati e
timestamp** che rendano possibili revoca, scadenza e ri-verifica senza
migrazioni dolorose. I meccanismi si attivano quando servono.

**Decisione (2026-07-27): il claim resta gratuito, gli strumenti sono
premium.** Nota di percorso: l'idea del pagamento come *deterrente
anti-disturbo* era stata scartata (il troll non passa comunque la verifica; il
truffatore con carta valida passerebbe anche il paywall — niente KYB, v.
billing); è poi prevalso l'argomento di *posizionamento* — la dichiarazione
del ristoratore è una vetrina, e le vetrine si pagano (v. sezione "Modello
commerciale: premium-only al lancio"). Effetto collaterale benvenuto: col
premium-only il contenimento abusi è totale, perché ogni strumento di
contenuto sta dietro il paywall.

## Menù con allergeni per piatto (la feature più forte)

Il ristoratore dichiara i piatti e gli allergeni di ciascuno → l'utente vede
automaticamente le compatibilità col proprio profilo esigenze (riuso del
pattern verde/ambra già esistente a livello recensione).

**Aggancio legale forte**: il Reg. 1169/2011 già obbliga i ristoratori a
dichiarare i 14 allergeni. Non chiediamo nulla di nuovo: digitalizziamo un
obbligo esistente. È anche l'argomento di vendita ("il tuo menù allergeni, a
norma, consultabile da chi ne ha davvero bisogno").

### Vincoli di design (non negoziabili)

- **Paternità della dichiarazione**: wording sempre attribuito — "senza
  glutine *secondo il ristoratore*", mai "sicuro per te". Il verde sul piatto
  non deve mai leggersi come garanzia di AllergiApp.
- **Contaminazione crociata**: il Reg. 1169 copre gli ingredienti, non le
  tracce. Niente triplo stato (contiene/tracce/non contiene) per piatto —
  troppo oneroso, verrebbe compilato male. Invece: **disclaimer strutturale a
  livello locale**, sempre visibile sopra il menù.
- **Freschezza del dato**: un menù allergeni vecchio è più pericoloso di
  nessun menù. Timestamp "aggiornato il…" visibile all'utente; promemoria
  periodico al ristoratore; senza riconferma entro X mesi il matching **degrada
  a neutro** ("dichiarazione non aggiornata"), senza cancellare nulla.
- **Due segnali separati, mai fusi**: dichiarazione del ristoratore (dato
  dichiarativo) e recensioni della community (dato esperienziale) si
  triangolano ma non si sommano in un punteggio unico. Il pin color resta
  community-driven.

## Modello commerciale: premium-only al lancio (deciso 2026-07-27)

**Si parte solo col premium a pagamento (abbonamento mensile/annuale);
nessun livello gratuito di strumenti al lancio.** Un eventuale piano free
verrà valutato in seguito, sui dati.

Le ragioni:

- **Posizionamento**: la compatibilità *vera* per l'utente viene dalle
  recensioni della community — gratuita e indipendente. La dichiarazione del
  ristoratore è un segnale auto-prodotto, dichiaratamente di parte: una
  **vetrina**, e le vetrine si pagano (è il modello TripAdvisor/TheFork).
- **Asimmetria della reversibilità**: aggiungere un free tier domani è un
  regalo; toglierlo dopo averlo dato è uno scandalo. Partire stretti e
  allargare sui dati è l'unica direzione di marcia sicura.
- **Semplicità radicale al lancio**: niente cap da tarare, niente logica di
  downgrade, contenimento abusi totale (tutti gli strumenti di contenuto
  dietro il paywall, con la carta che aggiunge tracciabilità).
- **Il programma fondatori è il "piano free", ma temporaneo e controllato**:
  premium regalato, su invito, nelle città giuste. Fa anche da esperimento
  naturale: il comportamento della coorte (compilano i menù? convertono?) è
  il dato su cui decidere se e come introdurre un free tier vero.

Incastri operativi:

- **Correzioni ai dati di base senza tier gratuito**: telefono/orari/indirizzo
  sbagliati passano dalla segnalazione già esistente nell'app (moderazione a
  posteriori), come per qualsiasi utente. Nessuno paga per correggere la
  realtà.
- **Il claim resta gratuito** (anagrafica + associazione) e dà la dashboard
  con la bozza compilabile; la pubblicazione arriva solo con l'abbonamento.
  Ordine fisso: prima il claim completo, poi il checkout — mai incassare
  senza un claim completo.
- **Abbonamento scaduto = downgrade morbido, gratis per architettura**
  (osservazione utente 2026-07-27): i contenuti partner vivono in tabelle
  proprie e la scheda app li mostra solo con abbonamento attivo → la
  pubblicazione è un **interruttore di visibilità** legato allo stato
  dell'abbonamento, niente da spostare o cancellare. Ciclo di vita della
  scheda partner: bozza → associata+pubblicata → associata+non pubblicata
  (scaduto: gestionale ancora accessibile, app mostra la scheda community) →
  di nuovo pubblicata al rinnovo. Lo stato "scaduto con contenuti" è una leva
  di **win-back** ("i tuoi piatti sono pronti, riattiva e torni live").
  Distinzione importante: la **decadenza per inattività NON si applica**
  all'ex abbonato con contenuti — quella regola colpisce lo squatting (claim
  con zero contenuti e zero accessi); chi ha lavorato mantiene claim e
  associazione a tempo indeterminato, li perde solo per contro-claim.
- **Lo stesso interruttore serve quattro casi (aggiunto 2026-07-27)** — la
  vetrina può spegnersi per: (1) **scadenza abbonamento**; (2) **pausa
  volontaria del ristoratore** — un click, riattivabile da lui; è anche una
  feature di *sicurezza*: menù cambiato e dichiarazioni non più accurate →
  spegne subito invece di lasciare live info pericolose (coerente col
  principio di freschezza); (3) **sospensione admin** (es. verifica su
  segnalazione), con motivazione e possibilità di replica (DSA art. 17);
  (4) **revoca del claim** (gestore sbagliato/frode: si scioglie
  l'associazione). In tutti i casi: lato app solo la scheda community senza
  alcuna segnaletica del perché; contenuti mai cancellati. Requisito tecnico:
  lo stato di visibilità porta un **motivo** (expired / paused_by_partner /
  suspended_by_admin / claim_revoked) + timestamp + audit.

Perché non viola il principio guida ("mai vendere percezione di sicurezza"):
il premium compra **spazio informativo dichiarato e attribuito**, non
punteggio, ranking né percezione aggregata. Restano non negoziabili: wording
sempre attribuito, due segnali mai fusi, pin community-driven, nessun effetto
su ordinamento, e **lato utente nessuna segnaletica del paywall** — si mostra
ciò che c'è ("menù dichiarato dal ristoratore"), mai l'assenza come mancanza.

> **Archivio — opzione C (freemium col cap, proposta 2026-07-27, superata lo
> stesso giorno)**: N piatti gratis col claim (~10–15), illimitati + pacchetto
> col premium; downgrade morbido (piatti oltre cap nascosti, mai cancellati).
> Resta la candidata naturale se un giorno si introdurrà un piano free.

## Certificazioni

L'unica voce che sfiora la promessa di sicurezza (coerenza con la rimozione
dei claim di sicurezza, revisione legale lug 2026). Due livelli:

1. **Fase iniziale**: documento mostrato "as is" con etichetta chiara
   "fornito dal ristoratore, non verificato da AllergiApp".
2. **Fase successiva (più valore, più lavoro)**: solo certificazioni
   riconosciute da lista curata (es. AIC "Alimentazione Fuori Casa" per i
   celiaci), verificate contro gli elenchi pubblici degli enti.

## Legale

Valutazione d'insieme (2026-07-27, da confermare con avvocato prima del
lancio): il design è ben orientato — B2B-only evita il diritto dei
consumatori; "niente effetti su pin/ranking" rende banale la trasparenza P2B;
wording attribuito + checkbox + moderazione a posteriori tengono la
dichiarazione allergeni come contenuto del ristoratore (safe harbor hosting
DSA); il Reg. 1169 mette l'obbligo allergeni in capo al ristoratore. **Quattro
lavori prima del primo euro**: (1) ToS portale + pacchetto P2B, con clausola
"la dichiarazione in app non sostituisce gli obblighi 1169 nel locale,
esattezza responsabilità del ristoratore"; (2) vaglio legale del wording
checkbox/disclaimer; (3) privacy policy del portale; (4) assetto fiscale
(posizione IVA da cui fatturare, SdI, ROC — commercialista).

- **P2B (Reg. UE 2019/1150)**: scatta col primo ristorante pagante —
  trasparenza su ranking e termini, gestione reclami. Da preventivare prima di
  incassare il primo euro. Idem valutazioni **ROC**.
- **Analytics partner mai segmentato per allergie** (v. vincolo art. 9 nella
  sezione dashboard): solo aggregati generici.
- Dati allergie utenti = **art. 9 GDPR**: esclude ads profilate e vendita
  insight (v. sopra).
- Risposte alle recensioni portano con sé moderazione e segnalazioni (già
  aperto il fronte DSA art. 17 dalla revisione legale).
- **Identity verification (solo escalation) = trattamento di documenti
  d'identità** (dati personali veri, non aziendali): il provider (es. Stripe
  Identity) agisce da responsabile del trattamento con DPA e retention
  gestita — serve un paragrafo dedicato nella privacy policy del portale
  partner, non un progetto a sé.

## Cold start

Un ristoratore paga solo se l'app gli porta clienti; con ~4000 utenti globali
la densità per città è ancora bassa. Strategia:

- **Ristoranti fondatori**: premium regalato 6–12 mesi nelle 2–3 città con più
  utenti e recensioni.
- Si popolano le schede, si misurano i click (analytics già in casa), e quando
  ci sono numeri ("il tuo profilo è stato visto X volte") c'è anche
  l'argomento di vendita.

## Fondazioni tecniche del portale (decise 2026-07-27)

- **Lingue**: IT + EN al lancio, con struttura i18n montata dal giorno 1
  (retrofittarla dopo tocca ogni componente); le 15 lingue dell'app non sono
  un obiettivo del portale.
- **Migrations**: serie dedicata **7xx** (700, 701, …) in `supabase/` su
  main, accanto alle serie esistenti (app = numeri bassi, admin = 5xx) —
  ogni ambiente col suo filone, così coesistono senza collisioni di numeri.
  Flusso invariato: file nel repo come storia canonica, applicazione a mano
  via SQL editor, mai `supabase db push`.
- **Responsive mobile-first** (requisito utente 2026-07-27): il portale
  dev'essere pienamente usabile da telefono quanto da desktop — il
  ristoratore vive in sala, non alla scrivania. Shell: sidebar su desktop,
  bottom bar su mobile.
- **Legacy marzo 2026: nessuna cancellazione** (decisione utente
  2026-07-27): le strutture della 001 (restaurant_claims, restaurant_dishes,
  restaurant_allergens, colonne is_premium/owner_id/subscription_* su
  restaurants) restano nel DB, semplicemente non usate dal nuovo design —
  potrebbero tornare utili. Unico prerequisito prima del primo abbonamento
  vero (e non è una cancellazione): neutralizzare l'`ORDER BY is_premium
  DESC` ancora presente negli RPC live (ultima definizione in 068) — oggi
  inerte, al primo premium diventerebbe ranking a pagamento.
- **Percorso di costruzione concordato**: prima la bozza dello schema SQL
  (da rivedere insieme, senza applicare nulla), poi lo scaffold Next.js di
  `partner/`, progetto Vercel/DNS solo quando c'è qualcosa da deployare.
  Stato al 2026-07-27: bozza `supabase/migrations/700_partner_foundation.sql`
  scritta (NON applicata) e scaffold `partner/` creato (Next 15, Tailwind
  v4, auth Supabase client-side come l'admin, i18n IT/EN, shell responsive
  con pagine placeholder Vetrina/Locale/Account; dev su porta 3001).

## Fasi (bozza, da trasformare in piano quando saremo pronti)

1. Claim self-service + dashboard in anteprima
2. Strumenti premium base: sezioni info/link + menù piatti con matching —
   rilasciati alla coorte fondatori (premium regalato), che fa da seeding e
   da beta
3. Mini-analytics nella dashboard ristoratore
4. Billing Stripe: apertura della vendita vera (prerequisito: inserimento
   locale nativo nel portale, v. flusso claim punto 2)
5. Risposte alle recensioni (+ moderazione/segnalazioni)
6. Certificazioni (prima "as is" con disclaimer, poi verificate)

Trasversali: lavoro legale P2B/ROC prima del primo incasso (fase 4);
programma fondatori a cavallo delle fasi 2–4; a valle, decisione su un
eventuale piano free coi dati della coorte fondatori.

## Questioni aperte

- Prezzo del premium (riferimento mercato listing locali: ~10–30 €/mese)
- Criteri per valutare l'eventuale piano free futuro (dati coorte fondatori:
  compilazione menù, conversione a pagamento, abusi)
- Quali città per i ristoranti fondatori (guardare densità utenti/recensioni)
- Wording esatto di disclaimer e checkbox allergeni (vaglio legale)
- Soglia X mesi per la scadenza morbida delle dichiarazioni
- Provider di identity verification per l'escalation nei contesi (candidato:
  Stripe Identity): costi reali, copertura paesi, retention documenti,
  DPA/GDPR
- Wording e UX dell'anagrafica al claim (chiarire perché chiediamo la P.IVA:
  fatturazione + responsabilità del claim, non schedatura)
- Validazione dell'identificativo fiscale fuori UE (VIES copre solo l'UE):
  quali equivalenti best-effort per paese
- Soglie temporali del claim: N mesi di inattività per la decadenza, X giorni
  per la ri-verifica su contro-claim
- Fatturazione elettronica SdI: connettore Stripe → gestionale vs
  commercialista; da definire col commercialista prima del primo incasso

> **Chiuse il 2026-07-27 (seconda sessione)**: gestori multipli (no: un solo
> gestore per locale, uno-a-molti), granularità abbonamento (1 per locale,
> non trasferibile), lingue (IT+EN con i18n dal giorno 1) — v. sezioni
> relative.
