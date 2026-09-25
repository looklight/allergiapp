# Monetizzazione — riflessioni esplorative

> Documento di lavoro: raccoglie le riflessioni fatte finora (luglio 2026), **non è un piano**.
> Quando decideremo di partire, da qui nascerà il piano operativo a fasi.
> Nessuna timeline: si accumula qui finché non siamo pronti.

## Listino attuale (2026-09-15)

> Questa sezione **supera** "premium-only al lancio" (27/07) e "il claim
> resta gratuito": dove il resto del documento dice altro, vale questa.

**Prezzo di partenza**: **7,99 €/mese** oppure **60 €/anno**, un
abbonamento per locale. Da rivedere coi dati. Regime forfettario: fatture
senza IVA (con questi importi niente marca da bollo, che scatta sopra
77,47 €). Pagamenti con Stripe; strumento per la fattura elettronica SdI
ancora da scegliere.

**Gratis, sempre** — quello che usa il cliente al tavolo non si vende:
menù completo, piatti illimitati, filtro allergeni, QR, più menù per locale
(acceso per tutti dal 06/09: rimetterlo a pagamento vorrebbe dire togliere
una cosa già data).

**A pagamento, deciso:**
1. **Personalizzazione estetica del menù al tavolo** (logo, colori,
   caratteri, aspetto). Il muro sta nello scatto di pubblicazione
   (`build_public_menu`), non sulle manopole.
2. **La scheda su AllergiApp**: associazione del locale a un ristorante
   dell'app, con piatti/allergeni e link (prenotazione, delivery) visibili
   nella scheda. Ordine: **prima l'abbonamento, poi l'associazione**.
3. **Risposte alle recensioni** del proprio locale.

**Candidati, non decisi:**
- **Notifiche al gestore** (nuova recensione): naturale insieme alle risposte.
- **Statistiche** — l'unica voce che dà un motivo per pagare *ogni mese*.
  Orientamento: il pannello dei filtri gratis, a pagamento i numeri lato
  AllergiApp. Rimandate (4 nodi in `DIGITAL_MENU.md`).
- **QR col logo del locale** (il QR normale resta gratis; note in `TODO.md`).
- **Foto di copertina** della scheda.
- **Traduzioni automatiche del menù** (rimandate il 15/09).
- **Dominio proprio** per il menù.
- **Certificazioni** (fase tarda, delicata sul piano legale).

⚠️ **Il rischio del listino**: l'estetica si paga una volta e poi non ci
si pensa più. Quello che giustifica un canone mensile è la scheda in app
(che però l'app oggi non legge: serve una build nativa), le risposte alle
recensioni e, domani, le statistiche.

**Abbonamento concesso a mano**: l'admin può regalare l'abbonamento a chi
vuole e quando vuole (provenienza `manual`, con motivo e scadenza
facoltativa). Non si chiama "fondatori": i fondatori sono solo uno dei
motivi possibili. Tabella: migration 716 (`partner_subscriptions`, sul
locale).

**Dove si gestisce**: admin = elenco di tutti + concedi/revoca manuali +
link al cliente Stripe; portale = pagamento e carta del ristoratore;
webhook Stripe = funzione Supabase; rimborsi e disdette forzate dalla
dashboard Stripe.

## Stato attuale in breve (al 2026-07-27 — per lo stato di oggi v. «Piano operativo dell'abbonamento»)

- **Portale partner**: progetto Next.js separato su `partner.allergiapp.com`
  (cartella `partner/` nel repo, Vercel deploya da `main`). L'admin non si tocca.
- **Modello**: app gratis per gli utenti; lato ristoratori **premium-only**
  (abbonamento mensile/annuale via Stripe, **solo B2B a P.IVA**, nessun
  payout). Eventuale piano free deciso in seguito, sui dati dei fondatori.
- **Utenti e partner = due entità diverse, due percorsi di iscrizione
  separati** (deciso 22/08, modello Uber utente/driver): credenziale
  condivisa (stessa email possibile), profili distinti (`profiles` vs
  `partner_accounts`), nessun accesso automatico dall'app. Sezione dedicata
  più sotto.
- **Flusso**: iscrizione partner (persona: nome, cognome, contatto) →
  dashboard compilabile come **bozza privata** → claim = 5 campi aziendali
  (paese, denominazione, P.IVA/VAT validata via VIES, sede, email
  fatturazione) + associazione a una scheda dell'app → abbonamento =
  pubblicazione.
  > ⚠️ **ORDINE CAMBIATO il 2026-09-15 (decisione dell'utente): prima
  > l'abbonamento, poi l'associazione.** Il pagamento diventa il primo
  > cancello — chi associa un ristorante ha già carta e fattura intestate —
  > e la bozza privata resta compilabile prima di entrambi (migration 715:
  > anche i piatti della scheda stanno sul locale). Il resto di questo
  > documento descrive ancora l'ordine vecchio (claim → abbonamento) e va
  > riletto con questa correzione; nel portale l'ordine nuovo si vede in
  > `/abbonamenti`, mentre la pagina Scheda nomina solo l'associazione, con
  > garbo, senza un "attiva l'abbonamento" in cima al lavoro. Da decidere quando si
  > disegna il checkout: l'anagrafica aziendale del punto 3 del claim serve
  > alla fattura, quindi probabilmente si sposta al pagamento.
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

**Il pin del locale col menù del ristorante (deciso 2026-09-16).** Precisa la
regola qui sopra, non la smentisce:
- **Pallini** (zoom largo): identici a tutti gli altri. Il locale col menù non
  si distingue in nessun modo.
- **Pin** (zoom vicino): **contorno di un altro colore**. Non dice "migliore"
  né "più sicuro", dice solo *qui c'è il menù dichiarato dal ristorante, con
  piatti e allergeni*. È un'informazione, come l'icona della categoria.
- **Mai lo sfondo**: il riempimento verde/ambra/grigio è la compatibilità con
  le esigenze di chi guarda, e non si tocca.
- **Il contorno segue la scheda PUBBLICATA con piatti**, non `is_premium`: se
  la scheda si spegne, il contorno sparisce anche se l'abbonamento c'è.
- **Mai la parola "certificato"** nella legenda o altrove: il menù è
  dichiarato dal ristorante e non verificato da AllergiApp (stesso testo del
  disclaimer del portale).
- **Nessuna precedenza nelle ricerche né nelle liste.** L'unica cosa lato mappa
  è tecnica e invisibile: il locale non viene tagliato quando i pin sono troppi
  (esenzione dal diradamento, precedenza dentro il suo quadretto della 085),
  così il contorno compare davvero quando si avvicina lo zoom. A zoom largo
  resta un pallino come gli altri.

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

## Associazione locale ↔ ristorante (design 2026-09-17)

> Ripassa il «Claim self-service» di luglio qui sotto alla luce di
> abbonamenti (716), listino del 15/09 e piatti sul locale (715). Dove dice
> altro, vale questa. Design chiuso il 17/09 (quattro nodi + dati aziendali).
> **Parte 1 (database) FATTA il 18/09**: migration 721, applicata e verificata.
> Rivedendola sono emerse quattro regole che il design dava per implicite
> e che ora il database fa rispettare: per collegare serve un abbonamento
> attivo; un locale ha un solo collegamento vivo alla volta; chi è
> sospeso non può scollegarsi (azzererebbe la sospensione); dopo una
> revoca quel ristorante lo ridà solo l'admin, tramite una richiesta.
> Rivedendola coi dati veri (18/09) sono cambiate due regole, qui sotto
> barrate e riscritte: la P.IVA che VIES non trova passa dall'admin invece
> di bloccare, e un ristorante collegato non si cancella.

**Resta valido da luglio**: nessuna approvazione umana né documenti nel caso
normale (dichiarazione + difese a valle); un solo locale collegato per
ristorante (indice unico già nella 703); il ristorante deve esistere
nell'app (altrimenti messaggio ponte); a abbonamento finito il collegamento
resta, sparisce solo la scheda.

**Cambiato**: prima l'abbonamento, poi il collegamento; il collegamento non
porta dati, aggancia soltanto (i piatti della scheda stanno sul locale).

**Nodo 1 — quando la scheda si vede in app** (deciso 17/09, ~~almeno un
piatto~~ **tolto il 19/09**):
- Nessuno scrive «pubblicata». Visibile = **abbonamento attivo** sul locale
  **e** collegamento non in pausa/sospeso/revocato **e il visto del nostro
  team** (aggiunto il 19/09, migration 724). Calcolato dal database a ogni
  lettura.
- ~~e almeno un piatto scelto per la scheda~~ **Tolto il 19/09** (decisione
  dell'utente): «il partner ha pagato per il collegamento, decide lui come
  gestire la sua scheda — link, piatti, tutti e due o niente: ne risponde
  lui». Il **contorno del pin** resta invece legato ai piatti PUBBLICATI
  (`partner_card_dishes_published`, 728): dice «c'è il menù del ristorante»,
  e senza piatti non c'è. Da scrivere nella parte 4.
- **La scheda si PUBBLICA** (728, 19/09), come il menù al tavolo: la bozza è
  quella che si compila, l'app mostra la versione pubblicata. Si pubblica
  QUALI piatti e i link; nomi, foto e allergeni l'app li legge dal catalogo,
  quindi una correzione di allergeni non aspetta nessun bottone.
- Il ristoratore può solo mettere in pausa e riattivare; l'admin sospende e
  revoca. Chiude la falla di `partner_cards_owner` (703, `FOR ALL`): lo
  stato `published`/`expired` sparisce come valore scrivibile.
- Stesso criterio per contorno del pin e scheda. Senza piatti niente scheda:
  il contorno dice «c'è il menù del ristorante».

**Dati aziendali al collegamento** (deciso 17/09):
- Chiesti **sempre al collegamento**, pagato o regalato: **paese, ragione
  sociale, P.IVA** + spunta «Dichiaro di essere titolare o di agire per
  conto dell'azienda che gestisce questo locale». Sede ed email di
  fatturazione restano a Stripe.
- Una volta per azienda, riusati sui locali successivi (`partner_companies`).
- ~~VIES: P.IVA inesistente → collegamento bloccato; VIES giù o fuori UE →
  passa «da verificare».~~ **Cambiato il 18/09**: VIES non conosce le P.IVA
  che non hanno chiesto di fare scambi UE, cioè la maggior parte delle
  trattorie italiane (e spagnole): «non trovata» non vuol dire «non esiste».
  ~~Ora si collega da soli solo con la P.IVA confermata, il resto va in
  richiesta all'admin.~~
- **Rivisto il 19/09 — la certificazione è il controllo del nostro team.**
  Nessun dato aziendale prova che un'azienda gestisce QUEL locale; la serietà
  la danno insieme la persona che dichiara per un'azienda, l'abbonamento
  pagato con la fattura a quella azienda, e il visto di una persona del
  nostro team. Quindi:
  - **i dati si danno una volta, al pagamento**: ragione sociale e P.IVA
    sono quelle date a Stripe per la fattura, che `stripe-webhook` salva in
    `partner_companies` alla nascita dell'abbonamento (l'indirizzo resta a
    Stripe). All'associazione il portale le propone già compilate: si spunta
    la dichiarazione e si conferma. Chi paga è per forza chi dichiara. A mano
    solo senza Stripe (abbonamento offerto da noi): `partner-company`;
  - **si associa sempre** (con l'abbonamento): il ristorante si prenota
    subito, ma **la scheda compare in app solo dopo il visto dell'admin**
    (724). Il ristoratore vede «in verifica»;
  - **VIES resta, come controllo ufficiale per l'admin** (scelta
    dell'utente: gratuito, ufficiale, a norma), non come cancello. Nome e
    sede restituiti si tengono, visibili solo all'admin (per una ditta
    individuale la sede è spesso la casa). Se VIES non la conosce, l'admin
    guarda la P.IVA sul sito dell'Agenzia delle Entrate. La cifra di
    controllo italiana ferma i refusi prima;
  - la richiesta all'admin resta per due soli casi: ristorante di un altro
    account, ritorno dopo una revoca.
  - **nessuno approva la propria associazione, nemmeno un admin** (trovato
    alla prima prova, 19/09): nasce già vista solo quella che l'admin crea
    per il locale di un altro (o accogliendo una richiesta).
  - **Solo aziende, anche all'estero** (19/09): la carta può essere
    personale, la fattura e la dichiarazione sono dell'azienda del
    ristorante. Niente vendita a privati.
- ~~⚠️ Scoperto il 17/09: il webhook Stripe non scrive `partner_companies`.~~
  Da scrivere il 19/09 (v. sopra).

**Nodo 2 — ristorante già collegato a un altro account** (deciso 17/09;
sostituisce il contro-claim automatico di luglio):
- In ricerca: «Già gestito da un altro account», senza dire da chi.
- Pulsante «È il mio locale» → **richiesta all'admin** (testo libero + dati
  aziendali come un collegamento normale).
- **Decide l'admin a mano**: le due aziende affiancate coi dati VIES,
  documenti se servono. Se passa al nuovo: revoca del vecchio + nuovo
  collegamento, motivazione al vecchio gestore (DSA art. 17).
- Il gestore attuale **non** è avvisato della richiesta, solo della decisione.
- Nessun passaggio automatico: si aggiunge solo se le richieste diventano tante.

**Nodo 3 — scollegare o cambiare ristorante** (deciso 17/09):
- Il ristoratore **scollega da solo** dal portale, con conferma: scheda e
  contorno del pin spariscono subito; piatti, menù e abbonamento restano sul
  locale.
- **Cambiare** = scollegare + ricollegare, senza richiedere la P.IVA.
- **Risposte alle recensioni** legate al collegamento: scollegando si
  nascondono (mai cancellate), tornano ricollegando lo stesso ristorante,
  restano nascoste per sempre se il ristorante passa a un altro gestore.
- Nessun limite ai cambi; ogni cambio nel registro, l'admin vede gli eccessi.
- ~~Ristorante cancellato nell'app → collegamento cade (CASCADE della 703).~~
  **Cambiato il 18/09**: un ristorante con un collegamento in corso **non si
  cancella**, nemmeno dall'admin — prima si scollega con un motivo. Chi
  aggiunge un ristorante dall'app può cancellarlo, e l'80% dei ristoranti
  ha una recensione sola: senza il blocco, il cliente che l'aveva aggiunto
  toglieva recensione e ristorante e il ristoratore perdeva la scheda.

**L'admin vede ogni collegamento** (deciso il 18/09): anche quelli
automatici nascono «da controllare» e finiscono in una coda in admin, con
azienda, P.IVA e ristorante affiancati, finché l'admin non li segna come
visti (o sospende, o revoca). Il ristoratore non aspetta nessuno: il
controllo è dopo, non prima. Restano in coda anche i collegamenti già
chiusi (chi collega e scollega in fretta è uno schema da vedere). Quelli
decisi dall'admin nascono già visti.

**L'admin ha sempre il controllo** (principio dell'utente, 17/09): dall'admin
si può fare tutto quello che fa il ristoratore e di più — collegare,
scollegare, mettere in pausa, sospendere, revocare, riassegnare un
ristorante a un altro locale — ogni azione con motivo e riga in
`partner_audit_log`.

**Nodo 4 — la ricerca nel portale** (deciso 17/09):
- **Solo ristoranti che esistono già su AllergiApp.** Nessun inserimento dal
  portale.
- ~~Un campo unico nome + città~~ **Due campi, prima «Città o CAP» poi il nome,
  e un pulsante Cerca** (18/09: con un campo solo «trattoria roma» a Milano
  trovava anche i locali di Roma; col solo nome un «Pizzeria…» ne trova
  centinaia e il limite di 20 taglia fuori quello giusto). La città è
  obbligatoria, il nome parte col nome del locale; niente risultati a ogni
  lettera. Arrivati a 20 risultati la pagina lo dice. Le parole generiche
  (ristorante, trattoria, restaurant, gluten free…) possono mancare dal nome
  (19/09): «Ristorante Linfa» trova «Linfa Milano». Risultati
  con nome, indirizzo, categoria; i già collegati con la scritta del nodo 2.
- Conferma prima di collegare: indirizzo + piccola mappa, «È questo il tuo
  locale?».
- **Non si trova**: suggerire di aggiungerlo dall'app **lasciando almeno una
  recensione** (il flusso di aggiunta dell'app la chiede già insieme al
  ristorante), oppure di scrivere a **info@allergiapp.com** per problemi.
  Confermato il 18/09: l'app con la recensione è la strada normale (una
  recensione in più fa comodo); se non va, **lo aggiunge l'admin** su
  richiesta a info@.

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

### Design della vetrina (deciso 2026-07-27/28, con l'editor del portale)

Decisioni prese costruendo l'editor con anteprima live (mockup fedele della
scheda app in cornice telefono, dentro il portale):

- **Compatibilità per chi guarda**: per ogni piatto l'utente vede il match
  col proprio profilo — verde (nessuna sua esigenza tra gli allergeni
  dichiarati, diete richieste tutte taggate), ambra (contiene un suo
  allergene), grigio quando una sua dieta non è indicata: **l'assenza di
  dichiarazione non è mai mostrata come incompatibilità**. Piatto non
  compatibile con foto → foto in trasparenza.
- **Tag di compatibilità per piatto**: stessa lista esigenze dell'app
  (`constants/diets.ts`: vegetarian, vegan, histamine, nickel, diabetes) →
  matching uniforme coi profili. Doppio wording: il tag sul piatto è
  centrato sulle persone ("Per diabetici", come i peopleLabel dell'app),
  l'esigenza è breve dal punto di vista utente ("Diabete").
  Istamina/nichel/diabete sono claim di idoneità su dimensioni non binarie:
  wording SEGNATO per il vaglio legale già in programma.
- **Categorie facoltative**: set fisso tradotto (antipasti, primi, secondi,
  contorni, pizza, dolci, bevande, altro), nessuna di default; i piatti
  senza categoria vengono prima, le sezioni emergono solo se usate.
- **Foto piatti TONDE** (le foto community restano quadrate: due linguaggi
  visivi distinti); tap → foto intera (lato app). Upload max 10 MB con
  resize lato client a 640px — mai originali, l'egress Supabase è contato.
- **Presentazione in app**: carosello orizzontale di card nella scheda
  (badge scudo verde/ambra/grigio) + "Vedi tutto" → schermata menù dedicata
  a pieno schermo, raggruppata per categorie. È lavoro lato app: viaggia
  con una build store, e di fatto detta quando la vetrina potrà accendersi.
  **Aggiunta 2026-09-15**: il carosello mostra **al massimo 8 piatti**,
  poi un'ultima card "+N · Vedi tutto" verso la schermata dedicata — niente
  scorrimenti lunghi né decine di foto da scaricare dentro la scheda. Con un
  utente che ha esigenze, nel carosello vengono prima i piatti compatibili
  (verde, poi grigio, poi ambra): si riordina, non si nasconde. Il modello
  sta nell'anteprima del portale (`SchedaPreview`, `CAROUSEL_MAX`).
- **Link**: pill colorate (Prenotazione blu, Delivery arancio, Menù verde,
  Sito viola), nell'app su riga singola scorrevole (pattern
  CollectionPills). **Menù multi-lingua**: più URL etichettati per lingua,
  l'app mostra quello nella lingua dell'utente con fallback sul
  predefinito. **Delivery multi-provider** (Glovo/Deliveroo/Just Eat/Uber
  Eats/altro): un solo bottone; con più link, bottom sheet di scelta.
- **Portale**: simulatore "Occhi del visitatore" (collassabile) per vedere
  la scheda con le esigenze di un utente di prova — anche leva di vendita;
  layout desktop a due pannelli (editor scrollabile, anteprima ferma);
  bozza ancora in localStorage finché la 700 non verrà applicata.
- **Nessuna migration applicata**: fase di sola progettazione (decisione
  2026-07-28) — la 700 si aggiorna come documento di design e si applicherà
  tutta insieme a lavoro finito.

## Modello commerciale: premium-only al lancio (deciso 2026-07-27)

> ⚠️ **SUPERATO** dal "Listino attuale (2026-09-15)" in cima: il menù è
> gratis, l'associazione è a pagamento e viene dopo l'abbonamento. Resta
> valido il ragionamento sul downgrade morbido e sull'interruttore a
> quattro motivi.

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

## Risposte alle recensioni (design 2026-09-16)

Esce nel passo 5 del piano, con associazione e scheda in app: senza
associazione il portale non sa quali recensioni mostrare.

- **Si scrive solo dal portale**, mai dall'app. Il ristoratore vede solo
  quello che l'app mostra già a tutti, con lo stesso rispetto di
  `is_anonymous`: mai altro sull'utente (allergie = art. 9).
- **Visibile solo con abbonamento attivo**, regola «scade, sparisce; ti
  riabboni, torna»: la risposta resta salvata, l'app non la riceve. Il filtro
  sta nel database, non nel client. Conta l'abbonamento, **non** la scheda
  pubblicata (si risponde anche senza piatti caricati).
- **E solo dopo il visto del nostro team sul collegamento** (aggiunto il
  19/09 con la 724): senza, chi prende un locale non suo potrebbe rispondere
  in pubblico alle recensioni prima del controllo. Quindi visibile =
  abbonamento attivo **e** collegamento attivo e con `reviewed_at`, come la
  scheda tranne i piatti. Da decidere quando si costruiscono: con la scheda
  **in pausa** le risposte restano visibili o no?
- **In app**: blocco rientrato sotto la recensione, **logo del locale come
  avatar** + nome del locale + «Risposta del ristorante». Senza logo, icona
  generica di ristorante (niente iniziali). Non porta a nessun profilo.
  Niente etichetta «modificata».
- **Una risposta per recensione**, modificabile e cancellabile, lunghezza
  limitata; recensione cancellata → risposta cancellata.
- **Anche alle recensioni vecchie**, di prima dell'abbonamento (deciso 16/09).
- **L'utente non risponde alla risposta**: nessuna conversazione (deciso 16/09).
- **L'autore della recensione viene avvisato** della risposta con un
  **pallino nell'app**, come per i like (deciso 16/09). La notifica push
  arriverà quando si costruiscono le notifiche per tutti (passo 6).
- **Traduzione**: stesso pulsante delle recensioni (mig 074).
- **Moderazione**: testo libero, quindi può contenere promesse di sicurezza
  («da noi i celiaci sono al sicuro»). Non si blocca prima: risposta
  segnalabile come le recensioni, rimozione dall'admin con motivazione (DSA
  art. 17), divieto esplicito nelle condizioni d'uso del portale.
- **Prerequisito**: il logo oggi è un data URL dentro `partner_venues`; va
  portato su Storage prima che l'app lo mostri in ogni lista di recensioni.

> **Com'è venuta (25/09) — costruita, provata sul simulatore, non ancora
> uscita** (chiede la build nativa, come la scheda). Migrations **733-735
> applicate**. Cosa è cambiato rispetto al disegno qui sopra:
> - **Il logo era già su Storage dal 02/09**: il prerequisito non c'era più.
> - **Visibile = abbonamento in corso + collegamento attivo O IN PAUSA +
>   visto del team + non rimossa**: la pausa ferma la scheda, non la voce del
>   ristoratore. Una regola sola nel database, `partner_can_reply()`, uguale
>   per scrivere e per mostrare.
> - **Firma = nome del RISTORANTE nell'app** (quello in cima alla scheda),
>   non il nome del locale nel portale, che può essere un altro. Sotto:
>   «Risposta del ristorante · mese anno». Senza logo, icona di posate.
> - **La risposta NON si segnala** (ripensato il 25/09): darebbe solo lavoro
>   all'admin; chi non è d'accordo modifica la recensione, il ristoratore la
>   sua risposta. La moderazione è dell'admin, dalla pagina dell'account del
>   ristoratore (Rimuovi con motivo / Rimetti, nel registro partner). Nel
>   database restano, non usati, `reports.reply_id` e l'`id` restituito da
>   `get_review_replies` (734).
> - **Lingua salvata** dal browser del ristoratore (`it-IT` → `it`), così
>   «Traduci» si comporta come per le recensioni.
> - **Il consiglio sotto il campo** parla di come rispondere bene, non di
>   allergie (testo dell'utente). ⚠️ Il divieto di promettere sicurezza va
>   quindi scritto **nelle condizioni d'uso del portale** — DA FARE prima del
>   rilascio, o una rimozione non avrebbe una regola a cui appoggiarsi.
> - **Nel portale** è una voce della barra, «Recensioni», che c'è solo quando
>   si può rispondere. Dentro: «Come appari nelle risposte» (il logo del
>   locale si sceglie anche da qui: nell'app subito, al tavolo dopo
>   Pubblica), il riepilogo dei voti alla Google Maps (le barre sono il
>   filtro per stelle), «Da rispondere / Tutte», le esigenze dell'autore come
>   pill ambra. I nomi dei ~97 altri alimenti sono una copia gemella SOLO per
>   mostrarli: ai piatti si associano sempre e solo i 15 allergeni.
> - **Pallino** per data (`profiles.last_seen_review_replies_at`), dentro
>   `useNotificationDot` insieme ai like; si spegne aprendo il profilo.

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
  Costruito e approvato come base design (stessa data): **editor vetrina con
  anteprima live della scheda app** in cornice telefono — replica fedele di
  sezioni e token della scheda vera (senza fascia prezzo: mai valorizzata),
  con le proposte di design integrate: link partner come chip stile
  "Indicazioni", sezione Menù con attribuzione "Dichiarato dal ristoratore"
  + timestamp + disclaimer contaminazione sempre visibile, pill ambra
  "Contiene: …" (semantica allergeni PRESENTI, Reg. 1169). Bozza per ora in
  localStorage; persistenza vera all'applicazione della 700 (codici
  allergene già identici a `allergens.code`).

## Utenti e partner: due entità, due percorsi (deciso 2026-08-22)

Requisito dell'utente, formulato con l'analogia Uber (app passeggeri / app
driver): **utenti dell'app e partner sono due entità totalmente diverse**.
L'utente cerca ristoranti, il partner è il ristoratore che vuole provare e
sottoscrivere il premium. Uno può essere anche l'altro, ma **i due percorsi
di iscrizione restano separati**: nessun utente dell'app ha accesso
automatico alla sezione partner.

Cosa è condiviso e cosa no:

- **Condivisa: la credenziale.** Un solo `auth.users`, quindi la stessa
  email (e la stessa password) può servire entrambi i mondi. È un requisito
  esplicito dell'utente: il ristoratore non deve inventarsi una seconda
  identità per usare la sua email di sempre.
- **Separate: le entità.** `profiles` = utente dell'app (avatar, allergeni,
  recensioni). `partner_accounts` = profilo partner (persona: nome, cognome,
  contatto). Non condividono un campo e nascono da due atti distinti.
  Chi si iscrive dal portale senza usare l'app **non ha** una riga in
  `profiles`: non esiste nella community, non conta nei DAU.
- **Separati: i moduli.** L'iscrizione partner chiede più dell'email —
  almeno nome e cognome, gli altri campi si valuteranno. Non è "la stessa
  registrazione con un flag in più": è un altro modulo.
- **Nessun ponte dall'app.** Niente voce "diventa partner" nell'app: al
  portale si arriva da `partner.allergiapp.com`, di proposito.

Perché NON due sistemi di login separati (valutato e scartato):

1. La richiesta "stessa email" li esclude: due sistemi separati con la
   stessa email = due account gemelli con password diverse, confusione.
2. Le tabelle partner referenziano `restaurants(id)`: claim e vetrine
   devono stare nello stesso database delle schede, sennò servirebbe
   sincronizzazione tra due DB.
3. Un login esterno non è riconosciuto dalle RLS: si dovrebbe rifare
   l'autorizzazione a mano in un backend con la service-role key,
   sostituendo un impianto già verificato (audit RLS giugno 2026, mig 064)
   con controlli scritti a mano. Più codice, più superficie di errore.

Unico motivo per ripensarci in futuro: policy di sicurezza **diverse** per i
partner (2FA obbligatoria per chi gestisce fatturazione, sessioni più corte).
Supabase applica una sola policy per progetto.

Scala a tre gradini, ognuno con i suoi dati:

1. **Profilo partner** (la persona) — nome, cognome, contatto, lingua,
   accettazione condizioni. Affinamento del design di luglio, dove nome e
   cognome stavano nel modulo del claim: ora salgono qui e il claim resta
   puramente aziendale.
2. **Claim** (l'azienda) — denominazione, paese, P.IVA/VIES, sede, email di
   fatturazione. Invariato.
3. **Abbonamento** — il pagamento, che pubblica la vetrina.

Ricadute tecniche (già riportate nella bozza 700):

- FK dei contenuti partner su `partner_accounts(user_id)`, non su
  `profiles(id)`: il cancello è **strutturale**, niente profilo partner ⇒
  niente vetrine, per vincolo di database e non per controllo applicativo.
- Il cancello non può mai essere `raw_user_meta_data`: è modificabile dal
  client con la anon key.
- `partner_audit_log.actor_user_id` resta su `auth.users` (lì agiscono anche
  gli admin, che sono utenti dell'app e non partner).
- **Da fare all'applicazione della 700**: guardia in
  `supabase/functions/delete-account` — oggi chiama `auth.admin.deleteUser`,
  che cancellando la credenziale porterebbe via anche il mondo partner della
  stessa persona.
- Il controllo all'ingresso del portale (oggi `AuthGuard` chiede solo "c'è
  una sessione?", quindi qualunque utente dell'app entrerebbe) diventa "esiste
  un profilo partner?" solo con la 700: finché i dati stanno in localStorage
  qualsiasi controllo sarebbe aggirabile.

## Piano operativo dell'abbonamento (2026-09-16)

> Sostituisce le "Fasi (bozza)" qui sotto, che restano come traccia storica.
> Criterio dell'ordine: **l'estetica del menù è l'unica voce a pagamento che
> non chiede una versione nuova dell'app**, quindi è la prima che può valere
> davvero. Scheda in app e risposte alle recensioni viaggiano insieme, in una
> build nativa.

> **Dove siamo (21/09):** passi 1 e 2 FATTI. Del passo 5 è **fatta e online
> l'associazione** (parti 1-3: database 721-726, portale, dashboard admin),
> col visto del nostro team prima che una scheda si veda. Della **parte 4,
> l'app**, è scritta la scheda: la 731 fa da sportello unico, il riquadro e la
> schermata «Vedi tutto» sono in `main` e girano sul simulatore — non sono
> ancora uscite, perché chiedono una build nativa. **Le risposte alle
> recensioni sono fatte (25/09)**, stessa build. Restano: **contorno del
> pin** e `ORDER BY is_premium` neutralizzato. Da fare anche il passo 3 (ristoratori veri) e il
> 4 (fatturazione, commercialista).

> **La scheda nell'app, com'è venuta (21/09).** L'anteprima del portale
> (`SchedaPreview`) era il disegno: si è trascritta, non riprogettata. Ordine
> nella scheda del ristorante: banner della compatibilità → **pill dei
> collegamenti** → sezione **Menù (N)** chiusa da un filo sopra e sotto, come
> «La tua opinione» e «Recensioni» → **Foto dei clienti** (il titolo compare
> solo quando sopra ci sono i piatti: senza, quelle sono le uniche foto della
> scheda) → il resto.
>
> Quello che si è deciso strada facendo, guardandola girare:
> - **L'avviso si comporta come quello delle recensioni**: ⓘ accanto al
>   titolo, «Nascondi» che se lo ricorda (`menuDisclaimerDismissed`). Nella
>   schermata «Vedi tutto» resta invece sempre scritto: il carosello è
>   un'occhiata, quella schermata è dove uno decide se ordinare.
> - **Il piatto si apre**, con la stessa finestra del menù al tavolo (popup al
>   centro, foto 4:3, freccine ‹ › fra un piatto e l'altro) e con TUTTI gli
>   allergeni dichiarati, non solo quelli di chi guarda. Dal carosello si
>   arriva direttamente al piatto toccato.
> - **La scelta fra più destinazioni** (tre delivery, o prenotazione online e
>   telefono) è un foglio che sale dal basso, con lo stampo degli altri fogli
>   dell'app (`ShareProfileSheet`, `ListEditorSheet`): niente animazione
>   nativa, che porta su anche l'ombra. Senza titolo: ci si arriva da una pill
>   che dice già cosa stai facendo. Il telefono mostra il NUMERO.
> - **Le pill dei collegamenti sono bottoni**, non etichette: portano fuori
>   dall'app, quindi 13 semigrassetto e ~35 punti di altezza.
> - **Le foto**: solo miniature nelle liste, la grande solo aprendo il piatto.
>   La 731 tiene le due misure separate senza ripiego, così una lista non può
>   scaricare i 900px nemmeno per sbaglio.
> - **Categorie e note dei piatti** sono copie gemelle del portale in
>   `constants/` (le note senza icone: quelle restano di là finché non è
>   deciso come si vedono qui).
> - **Le stringhe stanno solo in it/en**: l'area ristoranti dell'app non
>   esiste nelle altre quattro lingue, che ripiegano sull'inglese.
> - **Filo aperto**: la 731 restituisce anche `menuSlug` (l'indirizzo del menù
>   al tavolo, solo se online) e l'app non lo usa. O gli si dà un posto nella
>   scheda, o si smette di chiederlo.

**Passo 1 — le fondamenta, tutte lato web** ✅ FATTO il 16/09 (nessun
incasso, nessun obbligo nuovo)
1. ✅ Applicare la **716** a mano dal SQL editor e verificarla (tabella, indice
   parziale, funzione, policy). Tracking fermo alla 045: mai `db push`.
2. ✅ **FATTO il 16/09** — su Stripe, nella **sandbox** `acct_1T8Pk3AWJFZcd82B`
   (account italiano in euro, non ancora attivato: `charges_enabled` false, ed
   è giusto così finché non si vende): prodotto `prod_VGlG0chTtdC9lt`
   "AllergiApp" con due prezzi ricorrenti — 7,99 €/mese
   (`price_1UGDk4AWJFZcd82B4ZUDcEsf`) e 60 €/anno
   (`price_1UGDk5AWJFZcd82BXROJy3Rj`).
   ⚠️ Il codice li cerca per **lookup key** (`allergiapp_monthly`,
   `allergiapp_yearly`), mai per id: i prezzi in Stripe non si modificano, si
   sostituiscono, e in modalità reale gli id saranno altri. Cambiare listino =
   creare il prezzo nuovo e spostargli l'etichetta.
3. ✅ **FATTO il 16/09** — due **Edge Function Supabase** accanto a
   `delete-account` (non route del portale: il segreto di Stripe resta in un
   posto solo, vicino al database), pubblicate e **provate da capo a fondo**:
   abbonamento creato su Stripe → riga `active` in `partner_subscriptions`;
   disdetta → riga `canceled` con le date giuste.
   ⚠️ Tre trappole pagate per strada, da non ripetere:
   - **La libreria di Stripe va importata con `npm:`, mai da esm.sh**: quella
     build tira dentro i polyfill Node di deno.land e la funzione muore a
     runtime. Il guaio è che falliva **in silenzio** — Stripe ritenta e basta,
     e senza guardare i log della funzione sembrava tutto a posto.
   - **Un endpoint webhook per volta**: due endpoint sullo stesso indirizzo
     hanno firme diverse, e metà delle consegne viene rifiutata.
   - **La chiave segreta e l'endpoint devono stare nella STESSA sandbox**
     (qui `acct_1T8Pk3AWJFZcd82B`): con la chiave dell'altro ambiente la
     rilettura risponde "No such subscription".
   - `stripe-checkout`: apre il pagamento per un locale del richiedente.
     Stripe raccoglie al checkout i dati aziendali (P.IVA, sede), che il
     webhook riversa in `partner_companies`.
   - `stripe-webhook`: scrive `partner_subscriptions` a ogni rinnovo,
     disdetta o pagamento fallito. È l'unico che scrive le righe `stripe`.
4. ✅ `/abbonamenti` nel portale smette di essere un tappo: stato vero, bottone
   che paga, e il portale cliente di Stripe per carta e disdetta.
5. ✅ In admin (migration 717): elenco degli abbonamenti e **«Concedi abbonamento»** (manuale,
   con motivo e scadenza), con riga nell'audit.

**Passo 2 — il primo muro: l'estetica del menù** ✅ FATTO il 16/09
(migration 718 e 719; pg_cron acceso per il giro quotidiano)
Il muro sta in `build_public_menu`, non sul bottone (Tema 27): le manopole si
toccano sempre, al tavolo arriva l'aspetto di base finché non c'è
l'abbonamento. Niente lucchetti nel portale, e **niente si perde**: chi paga
ritrova quello che aveva impostato. Da decidere qui: i due locali di prova,
e se l'estetica già pubblicata oggi resta accesa.

> **Scade, sparisce; ti abboni prima, resta** (16/09). Vale per tutti allo
> stesso modo, anche per le concessioni nostre: una di tre mesi che arriva a
> scadenza porta via l'aspetto come una disdetta. Quello che NON si perde
> sono le scelte — colore, carattere, copertina restano scritte sul locale e
> l'anteprima le mostra: si riabbona, preme Pubblica, e tornano al tavolo.
> Le disdette le intercetta un trigger (718); le scadenze per data, che non
> sono un evento, un giro quotidiano (719).

**Passo 3 — due o tre ristoratori veri**, con abbonamento concesso a mano.
È la prova chiesta da `DIGITAL_MENU.md` prima delle statistiche, e insieme
il primo collaudo del passo 1. Si scopre presto se l'estetica da sola regge
un canone mensile.

**Passo 4 — prima di incassare davvero** (fuori dal codice, col
commercialista): strumento per la fattura elettronica SdI, condizioni d'uso
+ P2B, controllo che l'account Stripe sia intestato alla P.IVA e non alla
persona. Poi Stripe passa in modalità reale.

**Passo 5 — associazione e app, nella stessa build nativa**: design del
claim, chiusura della falla `partner_cards_owner`, la scheda letta dall'app,
risposte alle recensioni, `ORDER BY is_premium` neutralizzato nelle ricerche,
contorno del pin per i locali con scheda pubblicata (v. «Principio guida»).

**Passo 6 — le voci che danno un motivo per pagare ogni mese**: notifiche al
gestore e statistiche.

> **Le email al ristoratore** (idea dell'utente, 19/09): partono dal
> registro `partner_audit_log`, che la 724 rende completo. Momenti:
> `card_created` («stiamo controllando il tuo locale»), `card_reviewed`
> («la tua scheda è pronta»), `card_status_changed` verso suspended/revoked
> con la nota («sospeso: motivo…», dovuta per DSA art. 17),
> `request_decided` («la tua richiesta è stata accolta/respinta»). Servono
> un servizio di invio (Resend, Postmark…) sul dominio allergiapp.com e i
> testi in due lingue. Non prima che ci sia qualcosa di live.

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

- ~~Prezzo del premium~~ — di partenza 7,99 €/mese o 60 €/anno (15/09), v. "Listino attuale"
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
