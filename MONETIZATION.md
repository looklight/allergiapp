# Monetizzazione — riflessioni esplorative

> Documento di lavoro: raccoglie le riflessioni fatte finora (luglio 2026), **non è un piano**.
> Quando decideremo di partire, da qui nascerà il piano operativo a fasi.
> Nessuna timeline: si accumula qui finché non siamo pronti.

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
   - Metodi in ordine di semplicità: email su dominio del sito del ristorante;
     codice via SMS/chiamata al numero pubblico della scheda; verifica tramite
     Google Business Profile sul `google_place_id` (già in DB).
   - Coda admin solo per i casi ambigui: l'automazione copre il ~95%, il
     fallback umano esiste anche in Airbnb/Google.
   - Il claim è il **cancello d'ingresso di tutto**: primo pezzo da disegnare.

2. **Dashboard ristoratore — prodotto web separato dall'app**
   - Area nuova accanto/dentro l'admin Next.js (o progetto a sé). MAI dentro
     l'app mobile: il lato business evolve al ritmo del web, zero dipendenza
     da build store e OTA bloccate.
   - Sezioni: dati e link (prenotazione, delivery, menù, sito), piatti/servizi,
     recensioni con risposta, certificazioni, mini-analytics.
   - Il **mini-analytics** ("questo mese: X visite al profilo, Y click sul
     menù") è il motore della conversione a pagamento — come le statistiche
     host di Airbnb.

3. **Billing self-serve**
   - Chi paga è un'azienda, non l'utente dell'app → portale web + **Stripe
     Checkout + Customer Portal**. Niente IAP, niente 15–30% agli store.
   - Il ristoratore si abbona, cambia carta, disdice, scarica fatture da solo.

4. **Moderazione a posteriori, non approvazione preventiva**
   - Il ristoratore pubblica subito; gli utenti segnalano; si interviene
     dall'admin solo sulle segnalazioni.
   - Eccezione: le **certificazioni** (v. sotto), dove la posta è la sicurezza.
   - Perimetro dell'auto-pubblicazione: libero su foto, piatti, link, risposte;
     vincolato su tutto ciò che può suonare come promessa di sicurezza. **Mai
     campi liberi tipo "adatto ai celiaci"** — solo checkbox strutturate con
     wording nostro, vagliato legalmente.

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

## Modello freemium: cap sui piatti

Risolve la tensione "il matching migliora la leggibilità → i paganti
sembrerebbero più sicuri":

- **Gratis col claim**: dichiarazione fino a **N piatti** (~10–15, da tarare
  sulla distribuzione reale dei menù). Framing positivo: "dichiara gratis i
  tuoi piatti principali".
- **Premium**: piatti illimitati + link, risposte alle recensioni, analytics
  completo, certificazioni.
- Il prezzo scala col valore: la trattoria da 12 piatti sta comoda nel gratuito
  (e intanto arricchisce l'app); il ristorante da 50 piatti sente il limite e
  ha un motivo concreto per pagare.

Regole:

- **Downgrade morbido**: a premium scaduto i piatti oltre il cap si nascondono
  lato utente ma restano nel gestionale, pronti a riapparire. Mai cancellare
  dati che qualcuno ha faticato a inserire.
- **Lato utente nessuna segnaletica del paywall**: si mostra "8 piatti
  dichiarati dal ristoratore", mai "menù parziale" o indizi che il ristorante
  non paga. La pressione all'upgrade vive solo nella dashboard ristoratore
  ("10/10 piatti gratuiti usati").

## Certificazioni

L'unica voce che sfiora la promessa di sicurezza (coerenza con la rimozione
dei claim di sicurezza, revisione legale lug 2026). Due livelli:

1. **Fase iniziale**: documento mostrato "as is" con etichetta chiara
   "fornito dal ristoratore, non verificato da AllergiApp".
2. **Fase successiva (più valore, più lavoro)**: solo certificazioni
   riconosciute da lista curata (es. AIC "Alimentazione Fuori Casa" per i
   celiaci), verificate contro gli elenchi pubblici degli enti.

## Legale

- **P2B (Reg. UE 2019/1150)**: scatta col primo ristorante pagante —
  trasparenza su ranking e termini, gestione reclami. Da preventivare prima di
  incassare il primo euro. Idem valutazioni **ROC**.
- Dati allergie utenti = **art. 9 GDPR**: esclude ads profilate e vendita
  insight (v. sopra).
- Risposte alle recensioni portano con sé moderazione e segnalazioni (già
  aperto il fronte DSA art. 17 dalla revisione legale).

## Cold start

Un ristoratore paga solo se l'app gli porta clienti; con ~4000 utenti globali
la densità per città è ancora bassa. Strategia:

- **Ristoranti fondatori**: premium regalato 6–12 mesi nelle 2–3 città con più
  utenti e recensioni.
- Si popolano le schede, si misurano i click (analytics già in casa), e quando
  ci sono numeri ("il tuo profilo è stato visto X volte") c'è anche
  l'argomento di vendita.

## Fasi (bozza, da trasformare in piano quando saremo pronti)

1. Claim self-service + sezioni info/link sulla scheda
2. Menù piatti + allergeni con matching (freemium col cap)
3. Mini-analytics nella dashboard ristoratore
4. Billing Stripe + premium
5. Risposte alle recensioni (+ moderazione/segnalazioni)
6. Certificazioni (prima "as is" con disclaimer, poi verificate)

Trasversali: lavoro legale P2B/ROC prima del primo incasso; programma
ristoranti fondatori a cavallo delle fasi 2–4.

## Questioni aperte

- Valore preciso del cap piatti (tarare sui menù reali)
- Prezzo del premium (riferimento mercato listing locali: ~10–30 €/mese)
- Portale ristoratori: area dentro l'admin Next.js o progetto separato?
- Quali città per i ristoranti fondatori (guardare densità utenti/recensioni)
- Wording esatto di disclaimer e checkbox allergeni (vaglio legale)
- Soglia X mesi per la scadenza morbida delle dichiarazioni
