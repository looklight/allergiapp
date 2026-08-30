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

---

## Aperto, non deciso

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
