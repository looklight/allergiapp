// La pagina che il cliente apre col QR sul tavolo: /menu/[slug].
//
// È l'altra faccia del prodotto rispetto a /r/[slug]. Là siamo NOI a
// presentare un ristorante a chi lo sta scegliendo da lontano; qui è il
// RISTORANTE che porge il suo menù a chi è già seduto. La differenza non è di
// stile, decide cosa c'è nella pagina (DIGITAL_MENU.md, Tema 18):
//
//   • niente disclaimer in fondo — una carta stampata non la verifica nessun
//     terzo, e il QR non cambia la cosa. Resta una riga minuscola ATTACCATA AL
//     FILTRO, perché il filtro è l'unica cosa nostra in questa pagina ed è
//     l'unico punto in cui un cliente potrebbe leggerci una verifica;
//   • il fondo è del ristoratore: coperto, servizio, pagamenti;
//   • il marchio AllergiApp c'è, ma piccolo e in coda. Su un menù gratuito è
//     il nostro ritorno principale (Tema 10), e proprio per questo non deve
//     sembrare che il menù sia nostro: dice "Realizzato con", che è quello che
//     è successo, e non "Menù di", che è di chi cucina.
//
// IL FILTRO RIORDINA, NON NASCONDE (Tema 2). I piatti che non vanno bene
// restano leggibili in fondo alla loro sezione, col motivo scritto: farli
// sparire direbbe che quello che resta è stato verificato, e il dato lo
// dichiara il ristorante. Per le esigenze si dice "non indicato per", mai
// "non è".
//
// Il markup è INTERO nell'HTML, dettagli dei piatti compresi: chi apre il
// menù in una sala interrata con due tacche deve poterlo leggere, e il
// JavaScript qui accende, spegne e sposta — non costruisce niente.

const { escapeHtml, escapeAttr, safeHref } = require('./render-helpers');
const { labelFor } = require('./labels');
const { inOrdine } = require('./menu-order');
const { renderFooter } = require('./render-shell');
const { DISH_NOTES, notesOf, noteName } = require('./dish-notes');
const { allergenIcon } = require('./allergen-icons');

const SITE_ORIGIN = 'https://allergiapp.com';
const DEFAULT_LOGO = '/images/happyplate.webp';

// I COLORI, SCELTI DA NOI (Tema 8): il database tiene il CODICE, qui serve la
// tinta. Copia fedele di MENU_ACCENTS in partner/src/lib/menuBrand.ts, e la
// copia è voluta per la stessa ragione di menu-order.js: due progetti che si
// rilasciano separatamente. ⚠️ Aggiungendone una di là, va aggiunta anche qui
// — altrimenti quel locale finisce col colore di ripiego e nessuno se ne
// accorge, perché la pagina non dà errore.
//
// Il ripiego è il primo della fila, non il nero: una tinta sbagliata si nota,
// un fondo nero sembra una scelta.
// ⚠️ COPIA GEMELLA di MENU_ACCENTS in partner/src/lib/menuBrand.ts, dove
// stanno anche i nomi e il metro con cui si accetta una tinta nuova
// (contrasto col bianco >= 6.2, cioè non peggiore dell'ottone). Un colore
// aggiunto solo di là ricade qui su 'charcoal': il ristoratore sceglierebbe
// una tinta che il suo cliente al tavolo non vede mai.
const ACCENTI = {
  charcoal: '#333333',
  forest: '#2E6B4F',
  navy: '#1F4E79',
  brick: '#8C3A2B',
  plum: '#6B3F6E',
  // ⚠️ L'OTTONE NON È PIÙ OFFERTO dal portale (2026-09-06, sostituito dal
  // grigio) ma resta QUI: il renderer deve saper disegnare anche un codice
  // che nessuno può più scegliere, o uno scatto vecchio che lo contiene
  // ricadrebbe su carbone e un menù già in sala cambierebbe colore da solo.
  brass: '#7A5C1E',
  wine: '#6E2438',
  cocoa: '#5A3A2E',
  teal: '#1F5F5B',
  olive: '#4A5D23',
  grass: '#2F5E28',
  indigo: '#443A78',
  mulberry: '#78325E',
  slate: '#3F4A5A',
  sand: '#6B5A3C',
  pine: '#1E3B2A',
  ink: '#1A2340',
  rose: '#8C4A57',
  grey: '#5A5A5A',
};

// Il campo può arrivare come codice ('navy') o già come tinta ('#1F4E79'):
// nei dati finti era una tinta, dal database è un codice.
function tinta(accent) {
  if (typeof accent === 'string' && accent.startsWith('#')) return accent;
  return ACCENTI[accent] || ACCENTI.charcoal;
}

// Le lingue che questa pagina sa parlare oggi. L'indirizzo canonico — quello
// che finisce sul QR — non ha lingua: la sceglie il browser di chi apre, e da
// qui si può cambiare (Tema 21).
const LINGUE = [
  { code: 'it', label: 'Italiano', short: 'IT' },
  { code: 'en', label: 'English', short: 'EN' },
];

function prezzo(cents, currency, locale) {
  if (cents === null || cents === undefined) return '';
  return (cents / 100).toLocaleString(locale === 'en' ? 'en-GB' : 'it-IT', {
    style: 'currency',
    currency: currency || 'EUR',
  });
}

// Tutti i piatti del menù, sezioni comprese: serve ai conteggi e a sapere
// quali pastiglie ha senso offrire.
function tuttiIPiatti(menu) {
  return menu.groups.filter((g) => g.kind === 'section').flatMap((g) => g.items);
}

// Si offrono SOLO gli allergeni che qualche piatto dichiara e le esigenze che
// qualche piatto soddisfa: una pastiglia che non toglie niente è un bottone
// che non fa niente, e una che svuota il menù è peggio.
function pastiglieDisponibili(menu) {
  const piatti = tuttiIPiatti(menu);
  const allergeni = new Set();
  const esigenze = new Set();
  for (const p of piatti) {
    for (const a of p.allergens || []) allergeni.add(a);
    for (const t of p.diets || []) esigenze.add(t);
  }
  // "Senza glutine" NON deve comparire due volte. Il codice `gluten_free`
  // esiste fra le esigenze e `gluten` fra gli allergeni: due pastiglie con la
  // stessa identica scritta, che però filtrano in modo diverso — una chiede
  // che il glutine non sia fra gli allergeni dichiarati, l'altra che il
  // ristoratore abbia spuntato "senza glutine" su quel piatto. Davanti a un
  // celiaco seduto al tavolo è la peggior cosa possibile: due bottoni uguali
  // che danno due risposte.
  //
  // Resta l'ALLERGENE, perché gli allergeni il ristoratore li compila su ogni
  // piatto mentre l'esigenza è facoltativa. L'informazione non si perde: nel
  // dettaglio del piatto la targhetta verde "Senza glutine" resta, e lì è
  // un'informazione, non un comando.
  esigenze.delete('gluten_free');
  return inOrdine([
    ...[...allergeni].map((code) => ({ kind: 'allergens', code })),
    ...[...esigenze].map((code) => ({ kind: 'diets', code })),
  ]);
}

// L'etichetta che si legge sulla pastiglia: gli allergeni si dicono per
// negazione ("Senza glutine"), le esigenze col nome con cui il cliente si
// descrive ("Vegetariano").
function etichettaPastiglia(pill, locale, t) {
  if (pill.kind === 'diets') return labelFor(pill.code, locale);
  return `${t('menuWithout')} ${labelFor(pill.code, locale).toLowerCase()}`;
}

function renderMenuPage(dati, locale, t) {
  const { venueName, logoUrl, accent, tableConditions, slug, links } = dati;
  // LE CARTE: dalla 714 lo scatto ne porta una fila (`menus`), una per
  // linguetta. La forma a menù singolo la passa ancora il menù finto di
  // /menu-demo, che non viene da nessuno scatto: si accetta qui in una riga
  // invece di tenere due disegni.
  const carte = Array.isArray(dati.menus)
    ? dati.menus
    : dati.menu
      ? [dati.menu]
      : [];
  // La prima carta è quella aperta, e serve anche per le cose che stanno
  // FUORI dalle linguette: la presentazione sotto il nome del locale.
  const menu = carte[0] || { name: '', description: '', currency: 'EUR', groups: [] };
  // Le due manopole dell'aspetto, scelte dal ristoratore nel portale e
  // appese al LOCALE (migration 708). Prudenti sui valori mancanti: si
  // ricade su come si comportava la pagina prima che esistessero.
  const showPhotos = dati.showPhotos !== false;
  // Tonde o squadrate (migration 711). Uno scatto preso prima che la manopola
  // esistesse non ha il campo e ricade su 'square', cioè le miniature che
  // quel cliente sta già vedendo.
  const photoShape = dati.dishPhotoShape === 'round' ? 'round' : 'square';
  const showDescriptions = dati.showDescriptions === true;
  // Come si annunciano le sezioni. Un valore che non conosciamo ricade sul
  // filetto invece di lasciare il titolo senza stile: gli scatti pubblicati
  // prima della 709 non hanno questo campo.
  const sectionStyle = ['underline', 'banner', 'plain'].includes(dati.sectionStyle)
    ? dati.sectionStyle
    : 'underline';
  // Il carattere delle intestazioni. 'modern' è quello di sistema e non ha
  // nessuna classe: è il ripiego, ed è anche quello che non scarica niente.
  const headingFont = ['classic', 'bold', 'light'].includes(dati.headingFont)
    ? dati.headingFont
    : 'modern';
  // Quanto sono grandi i testi (migration 710). Non è una classe ma un
  // NUMERO scritto sulla radice: le misure del contenuto in menu-page.css
  // sono tutte calc(Npx * var(--ms)), quindi un valore solo le muove tutte
  // e non c'è un secondo elenco da tenere allineato quando ne nasce una.
  // Uno scatto preso prima che la manopola esistesse non ha il campo e
  // ricade su 1, cioè la pagina di sempre.
  // ⚠️ La riga degli allergeni ha il suo pavimento nel CSS (max()): 'compact'
  // rimpicciolisce la carta, non quella riga.
  const textScale = { compact: 0.92, roomy: 1.12 }[dati.textScale] ?? 1;
  // Quanta aria fra le righe (migration 711). Stessa ricetta della grandezza
  // e stessa copia gemella da tenere allineata (LINE_HEIGHT_FACTORS in
  // partner/src/lib/venues.ts): un numero solo sulla radice, e ogni
  // interlinea del contenuto in menu-page.css è calc(N * var(--lh)).
  // Uno scatto preso prima che la manopola esistesse non ha il campo e
  // ricade su 1, cioè la pagina di sempre.
  // ⚠️ La riga degli allergeni ha il suo pavimento nel CSS (max()): 'tight'
  // avvicina la carta, non quella riga.
  const lineHeight = { tight: 0.9, airy: 1.15 }[dati.lineHeight] ?? 1;
  // L'IMPAGINAZIONE (migration 711): 'row' è quella di sempre — foto, nome e
  // prezzo affiancati — mentre 'block' incolonna nome, descrizione e prezzo
  // al centro e non mostra le foto. Uno scatto preso prima che la manopola
  // esistesse non ha il campo e ricade su 'row', cioè la pagina di sempre.
  //
  // ⚠️ È UNO STILE, NON UN PRESET: decide la struttura e non tocca nessuna
  // delle altre voci d'aspetto, che restano quelle scelte dal ristoratore.
  const layout = dati.menuLayout === 'block' ? 'block' : 'row';
  // Il segno fra un piatto e l'altro. Vale in tutt'e due le impaginazioni.
  const separator = ['rule', 'ornament'].includes(dati.dishSeparator)
    ? dati.dishSeparator
    : 'none';
  // COME SI LEGGONO GLI ALLERGENI (migration 711): 'text' è la riga
  // «Contiene: glutine, uova» di sempre, 'icon' una fila di pittogrammi con la
  // legenda in fondo alla carta. Uno scatto preso prima che la manopola
  // esistesse non ha il campo e ricade sulle parole. Fino al 2026-09-15 questo
  // valore arrivava nello scatto ma nessuno lo leggeva: «a icone» cambiava
  // solo l'anteprima del portale.
  const allergenDisplay = dati.allergenDisplay === 'icon' ? 'icon' : 'text';
  // SENZA SLUG NON C'È UN INDIRIZZO. È il caso della prova su /menu: quel
  // menù non è pubblicato, non ha una pagina sua e non deve finire su Google.
  // Cadono con lui il canonico, le lingue alternative e il cambio lingua
  // nell'intestazione — non c'è nessun altro indirizzo da offrire.
  const canonical = slug ? `${SITE_ORIGIN}/menu/${slug}` : null;
  // DOVE PORTANO I BOTTONI DELLA LINGUA. Di norma all'indirizzo del menù; la
  // prova su /menu non ne ha uno e lo dice passando `langBase`. Senza né l'uno
  // né l'altro i bottoni non si mostrano: non c'è nessun posto dove mandarli.
  const baseLingue = slug ? `/menu/${slug}` : dati.langBase || null;
  // Le pastiglie si offrono su TUTTE le carte insieme: il filtro è una
  // proprietà della persona, non della carta. Chi è allergico alle noci lo
  // resta passando ai dolci, e una pastiglia che sparisce cambiando linguetta
  // sembrerebbe un guasto.
  const pastiglie = pastiglieDisponibili({ groups: carte.flatMap((c) => c.groups) });
  const piatti = carte.flatMap((c) => tuttiIPiatti(c));
  // Lo spazio della foto si tiene per ALLINEARE le righe fra loro: senza, in
  // un menù dove alcuni piatti hanno la foto e altri no, il testo partirebbe
  // da due punti diversi e la carta sembrerebbe storta scorrendola. Ma se non
  // ce l'ha NESSUNO non c'è niente da allineare, e restava una colonna di
  // quadrati grigi vuoti lunga tutto il menù.
  // Due condizioni diverse: il ristoratore può SPEGNERE le foto, e comunque
  // non ci sono se non le ha caricate nessuno. La prima è una scelta, la
  // seconda è il contenuto.
  // ⚠️ A BLOCCO LE FOTO NON CI SONO, e non è una dimenticanza: quella
  // impaginazione è la carta dei ristoranti che non mettono fotografie, e
  // infilarci una miniatura la riporterebbe a essere una lista. Il valore del
  // ristoratore resta scritto: tornando a 'row' le foto ricompaiono.
  const conFoto =
    layout === 'row' && showPhotos && piatti.some((p) => (p.thumbUrl || '').trim() !== '');
  const gruppiDi = (carta) =>
    carta.groups.filter((g) =>
      g.kind === 'note'
        ? (g.name || '').trim() !== '' || (g.description || '').trim() !== ''
        : g.items.length > 0
    );

  return `<!DOCTYPE html>
<html lang="${locale}">
${renderHead(dati, locale, t, canonical)}
<body class="menu-body${headingFont === 'modern' ? '' : ` font-${headingFont}`}${
    layout === 'block' ? ' layout-block' : ''
  }${separator === 'none' ? '' : ` sep-${separator}`}" style="--accent:${escapeAttr(tinta(accent))};--ms:${textScale};--lh:${lineHeight}">
${renderHeader(dati, locale, t, baseLingue, carte, menu)}
${pastiglie.length > 0 ? renderFiltro(pastiglie, locale, t) : ''}
<main class="menu-main">
${carte
    .map((carta, i) => {
      const gruppi = gruppiDi(carta);
      // Una carta per linguetta, tutte NEL DOCUMENTO e non caricate a
      // richiesta: la pagina arriva intera al primo caricamento, e cambiare
      // linguetta in una sala interrata con due tacche non deve chiedere
      // niente alla rete (Tema 11).
      return `<div class="menu-carta" data-carta="${i}"${i === 0 ? '' : ' hidden'}>
${gruppi.length === 0
        ? `<p class="menu-empty">${escapeHtml(t('menuEmpty'))}</p>`
        : gruppi
        .map((g) =>
          renderGruppo(g, carta.currency, locale, t, {
            conFoto,
            showPhotos,
            photoShape,
            showDescriptions,
            sectionStyle,
            layout,
            separator,
            allergenDisplay,
          })
        )
        .join('\n')}
</div>`;
    })
    .join('\n')}
${allergenDisplay === 'icon' ? renderLegenda(pastiglie, piatti, locale, t) : ''}
${/* LE CONDIZIONI AL TAVOLO sono del LOCALE, non della carta: coperto,
      servizio e pagamenti non cambiano passando dai vini ai dolci. Stanno
      quindi FUORI dalle linguette, una volta sola in fondo. */ ''}
${(tableConditions || '').trim() !== '' && carte.some((c) => gruppiDi(c).length > 0)
    ? `<p class="menu-conditions">${escapeHtml(tableConditions)}</p>`
    : ''}
${/* I LINK DEL RISTORATORE, in fondo e mai altrove: al tavolo si viene per il
      cibo, e un invito a seguire il locale prima della carta è una
      distrazione messa davanti alla cosa che serve (Tema 7). Arrivano già
      filtrati dallo scatto — solo social e sito, mai il telefono, e vuoti
      per i locali senza abbonamento — ma l'indirizzo si ricontrolla QUI,
      dove nasce l'href. */ ''}
${renderLink(links, carte)}
</main>
${renderPannelloFiltri(pastiglie, locale, t)}
${renderFoglio(t)}
${!canonical ? '' : `<div class="menu-brand">
  <a href="/" class="menu-brand-link">
    <img src="${DEFAULT_LOGO}" alt="" class="menu-brand-logo">
    <span>${escapeHtml(t('menuBrandBy'))} <strong>AllergiApp</strong></span>
  </a>
  <p class="menu-privacy-note">${escapeHtml(t('menuPrivacyNote'))}</p>
</div>
${renderFooter(locale)}`}
${renderTesti(pastiglie, locale, t)}
<script src="/menu-page.js" defer></script>
</body>
</html>`;
}

function renderHead(dati, locale, t, canonical) {
  const titolo = t('menuPageTitle', { name: dati.venueName });
  const descrizione = t('menuMetaDescription', { name: dati.venueName });
  return `<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(titolo)}</title>
<meta name="description" content="${escapeAttr(descrizione)}">
${canonical
    ? `<link rel="canonical" href="${escapeAttr(canonical)}">
${LINGUE.map((l) => {
    const href = l.code === 'it' ? canonical : `${canonical}/${l.code}`;
    return `<link rel="alternate" hreflang="${l.code}" href="${escapeAttr(href)}">`;
  }).join('\n')}
<meta property="og:url" content="${escapeAttr(canonical)}">`
    : '<meta name="robots" content="noindex">'}
<meta property="og:title" content="${escapeAttr(titolo)}">
<meta property="og:description" content="${escapeAttr(descrizione)}">
<meta property="og:type" content="website">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/menu-page.css">
</head>`;
}

// L'intestazione è l'unico posto in cui il colore scelto dal ristoratore fa
// da fondo: sul testo dei piatti sarebbe una scelta di contrasto lasciata a
// lui, che il Tema 8 non concede.
function renderHeader(dati, locale, t, baseLingue, carte, menu) {
  const { venueName, logoUrl } = dati;
  // La COPERTINA con sopra la velatura scura, o il colore pieno. La velatura
  // non è facoltativa: il nome è bianco, e su una foto chiara sparirebbe. Il
  // colore resta sotto come fondo, così se l'immagine non arriva
  // l'intestazione non diventa bianca.
  const copertina = (dati.coverUrl || '').trim();
  // UN DITO DI ARIA IN PIÙ SOPRA IL NOME, e solo dove serve: lo chiede la
  // prova su /menu, dove la carta è rimpicciolita e l'isola del telefono
  // finto arriva proprio sul nome del locale. Al tavolo non serve — lì i 28
  // punti del foglio di stile sono 28 punti veri — e infatti nessun menù
  // pubblicato passa questo campo.
  const aria = Number(dati.headerInset) > 0 ? Number(dati.headerInset) : 0;
  const sfondo = copertina
    ? `background-image:linear-gradient(rgba(0,0,0,0.45),rgba(0,0,0,0.6)),url('${escapeAttr(copertina)}')`
    : '';
  const inset = aria ? `padding-top:${28 + aria}px` : '';
  const stile = sfondo || inset ? ` style="${[sfondo, inset].filter(Boolean).join(';')}"` : '';
  return `<header class="menu-header${copertina ? ' has-cover' : ''}"${stile}>
  <div class="menu-header-top">
    ${logoUrl
      // SENZA LOGO NON C'È NESSUN LOGO: prima compariva quello di AllergiApp,
      // che accanto al nome del ristorante si legge come SE FOSSE il suo. Qui
      // siamo ospiti — il menù è del ristorante — e un nome da solo, ben
      // spaziato, è un'intestazione perfettamente finita.
      ? `<img src="${escapeAttr(logoUrl)}" alt="" class="menu-logo">`
      : ''}
    <h1 class="menu-venue">${escapeHtml(venueName)}</h1>
    ${!baseLingue ? '' : `<nav class="menu-langs" aria-label="${escapeAttr(t('menuLanguage'))}">
      ${LINGUE.map((l) => {
        const href = l.code === 'it' ? baseLingue : `${baseLingue}/${l.code}`;
        const attivo = l.code === locale;
        return `<a href="${escapeAttr(href)}" class="menu-lang${attivo ? ' is-on' : ''}"${
          attivo ? ' aria-current="true"' : ''
        } lang="${l.code}" title="${escapeAttr(l.label)}">${l.short}</a>`;
      }).join('')}
    </nav>`}
  </div>
  ${(menu.description || '').trim() !== ''
      ? `<p class="menu-intro">${escapeHtml(menu.description)}</p>`
      : ''}
${renderLinguette(carte, t)}
</header>`;
}

// LE LINGUETTE, e si vedono DA DUE CARTE IN SU. Con una carta sola una
// linguetta è un'etichetta che non si può nemmeno premere: dice al cliente
// una cosa che non gli serve (che i menù potrebbero essere più d'uno) e gli
// mangia una riga di schermo.
//
// L'indirizzo non cambia: il QR è incollato al tavolo e non si stacca a
// mezzogiorno, quindi carta, pranzo e vini stanno DENTRO la stessa pagina
// (DIGITAL_MENU.md, Tema 13). Sono bottoni, non collegamenti: non c'è nessun
// altro indirizzo dove andare.
//
// Un menù senza nome tiene la sua linguetta e la lascia vuota? No: prende un
// numero. Una linguetta muta non si può né leggere né descrivere a voce.
function renderLinguette(carte, t) {
  if (carte.length < 2) return '';
  return `  <div class="menu-tabs" role="tablist" aria-label="${escapeAttr(t('menuTabsLabel'))}">
${carte
    .map((carta, i) => {
      const nome = (carta.name || '').trim() || t('menuTabFallback', { n: i + 1 });
      return `    <button type="button" class="menu-tab${i === 0 ? ' is-on' : ''}" role="tab" data-carta="${i}" aria-selected="${i === 0 ? 'true' : 'false'}">${escapeHtml(nome)}</button>`;
    })
    .join('\n')}
  </div>`;
}

// IL FILTRO. È la ragione per cui questo menù non è come gli altri menù col
// QR, quindi sta in alto, si tocca subito e non è mai a pagamento: è la
// dimostrazione del prodotto.
//
// UNA FILA SOLA (2026-09-03, decisione dell'utente). Prima il bottone
// "Filtri" stava fuori dalla parte che scorre, ancorato a sinistra, perché
// "da lì non se ne va mai". Adesso scorre con le pastiglie ed è **solo
// l'icona**: la scritta ripeteva a parole quello che l'icona già dice, e due
// contenitori affiancati — uno fermo e uno che scorre — sono due cose da
// capire dove ne basta una. Il nome resta per chi non vede l'icona
// (aria-label e title), che è l'unico posto in cui serviva davvero.
//
// ⚠️ LE PASTIGLIE NON SI MUOVONO MAI (2026-09-04, decisione dell'utente).
// Fino a ieri quelle accese risalivano in testa alla fila. Erano due cose
// insieme — la scelta E lo spostamento — e la fila cambiava sotto il dito:
// chi ne accendeva due si ritrovava la seconda dove prima c'era la prima.
// Adesso ognuna resta al suo posto in graduatoria e si ACCENDE soltanto: la
// fila è una mappa ferma, e la si impara. Che qualcosa sia acceso lo dicono
// anche il numero sul bottone dei filtri e la riga «x di y» qui sopra, che
// stanno all'inizio e non scorrono via.
//
// IL NUMERO PRENDE IL POSTO DELL'ICONA, non le si mette accanto: affiancato,
// il bottone si allargava di mezzo dito e spingeva la fila intera a ogni
// scelta. Icona e numero si danno il cambio dentro una casella che non cambia
// misura — le misure stanno in menu-page.css, su .menu-filter-slot.
// ⚠️ NIENTE `data-total`: il totale lo conta il browser sulla carta aperta
// (menu-page.js). Con le linguette un numero scritto qui sarebbe la somma di
// tutte le carte, cioè un numero sbagliato in ogni menù che ne ha più d'una.
function renderFiltro(pastiglie, locale, t) {
  const nome = escapeAttr(t('menuFilterButton'));
  return `<div class="menu-filter" id="menu-filter">
  <div class="menu-filter-head">
    <p class="menu-filter-hint">${escapeHtml(t('menuFilterHint'))}</p>
    <p class="menu-filter-count" id="menu-filter-count" hidden></p>
  </div>
  <div class="menu-pills" id="menu-pills">
    <button type="button" class="menu-filter-button" id="menu-filter-open" aria-label="${nome}" title="${nome}">
      <span class="menu-filter-slot">
        <svg class="menu-filter-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
        <span class="menu-filter-badge" id="menu-filter-badge" hidden></span>
      </span>
    </button>
    ${pastiglie.map((p) => renderPastiglia(p, locale, t)).join('\n    ')}
  </div>
  <p class="menu-declared">${escapeHtml(t('menuFilterDeclared'))}</p>
</div>`;
}

function renderPastiglia(pill, locale, t) {
  return `<button type="button" class="menu-pill" aria-pressed="false" data-kind="${pill.kind}" data-code="${escapeAttr(pill.code)}">${escapeHtml(etichettaPastiglia(pill, locale, t))}</button>`;
}

// Un blocco di testo non è una sezione con dentro niente: non ha
// l'intestazione col colore del locale (quella annuncia dei piatti che qui non
// arrivano mai) e non partecipa al filtro — non c'è niente da riordinare, e
// sbiadirlo direbbe che riguarda le esigenze scelte, che è proprio quello che
// non è.
function renderGruppo(gruppo, currency, locale, t, aspetto) {
  const stile = aspetto.sectionStyle;
  if (gruppo.kind === 'note') {
    return `<div class="menu-note">
  ${(gruppo.name || '').trim() !== '' ? `<p class="menu-note-title">${escapeHtml(gruppo.name)}</p>` : ''}
  ${(gruppo.description || '').trim() !== '' ? `<p class="menu-note-text">${escapeHtml(gruppo.description)}</p>` : ''}
</div>`;
  }
  // I TRE MODI DI ANNUNCIARE UNA SEZIONE (Tema 25). La fascia esce dai
  // margini della colonna — dentro il menù deve toccare i bordi, o non è una
  // fascia ma un rettangolo con due strisce bianche ai lati — e regge solo
  // perché le tinte le scegliamo noi, tutte scure abbastanza da tenere il
  // bianco sopra.
  // `has-desc` stringe lo spazio sotto il titolo quando la descrizione c'è: è
  // sua, non della lista (v. menu-page.css). La decide chi rende e non un
  // `:has()` in CSS, così la regola resta identica alla copia del portale.
  const conDesc = (gruppo.description || '').trim() !== '' ? ' has-desc' : '';
  return `<section class="menu-section">
  ${(gruppo.name || '').trim() !== ''
      ? `<h2 class="menu-section-title is-${stile}${conDesc}">${escapeHtml(gruppo.name)}</h2>`
      : ''}
  ${(gruppo.description || '').trim() !== '' ? `<p class="menu-section-desc">${escapeHtml(gruppo.description)}</p>` : ''}
  <ul class="menu-items">
${gruppo.items.map((item) => renderRiga(item, currency, locale, t, aspetto)).join('\n')}
  </ul>
</section>`;
}

// La riga si tocca tutta, non solo il nome: sul telefono un bersaglio piccolo
// è un bersaglio mancato. La stella e la "i" stanno DENTRO l'involucro del
// nome (.menu-item-title): fuori, spinte contro il prezzo, sembravano dire
// qualcosa sul prezzo invece che sul piatto.
//
// ⚠️ QUESTA MARCATURA FA TUTT'E DUE LE IMPAGINAZIONI, e la seconda è tutta
// nel CSS (.layout-block in menu-page.css): il blocco incolonna e centra le
// stesse identiche parti, spostando il prezzo sotto la descrizione con
// `order`. Due marcature avrebbero voluto dire due dettagli da tenere
// allineati, e la riga degli allergeni è una di quelle parti — cioè la cosa
// che in nessuna impaginazione può cambiare. Apre il dettaglio, che è dove stanno la descrizione
// intera e TUTTI gli allergeni — nella riga si vede solo quello che riguarda
// il filtro acceso, ma chi ha un'allergia deve poter controllare l'elenco
// completo prima di ordinare.
// Le note del piatto in RIGA: icona e parola insieme, mai la sola icona.
// Un fiocco di neve accanto a un piatto, per un cliente tedesco, è un
// indovinello; la parola invece ce l'abbiamo già tradotta in quindici lingue e
// non costa niente. Il simbolo serve a far TROVARE la riga con l'occhio mentre
// si scorre la carta, non a sostituire l'informazione.
function renderNote(item, locale) {
  const note = notesOf(item);
  if (note.length === 0) return '';
  return `<span class="menu-item-notes">${note
    .map(
      (n) =>
        `<span class="menu-dish-note"><svg class="menu-dish-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n.icon}</svg>${escapeHtml(
          noteName(n, locale)
        )}</span>`
    )
    .join('')}</span>`;
}

// UN PITTOGRAMMA DI ALLERGENE, col suo nome dentro (<title> e aria-label): è
// quello che i lettori di schermo annunciano, quindi la riga resta leggibile a
// voce anche quando a vederla sono solo dei disegni. `decorativa` = il nome è
// già scritto accanto (la legenda): lì l'icona tace, o si sentirebbe «Glutine
// glutine». Copia gemella di IconaAllergene in MenuPreview.tsx.
function iconaAllergene(code, locale, decorativa) {
  const nome = labelFor(code, locale);
  return decorativa
    ? `<svg class="menu-allergen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${allergenIcon(code)}</svg>`
    : `<svg class="menu-allergen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="${escapeAttr(nome)}"><title>${escapeHtml(nome)}</title>${allergenIcon(code)}</svg>`;
}

// Le note del piatto A SOLE ICONE, per la modalità a icone: il nome resta per
// chi ascolta la pagina, e per tutti c'è la legenda in fondo.
function iconeNote(item, locale) {
  return notesOf(item)
    .map(
      (n) =>
        `<span class="menu-note-icon" role="img" aria-label="${escapeAttr(noteName(n, locale))}"><svg class="menu-dish-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n.icon}</svg></span>`
    )
    .join('');
}

// LA RIGA DEGLI ALLERGENI A ICONE, con le note in coda sulla stessa riga dopo
// un trattino disegnato (scelta dell'utente, 2026-09-06): due file di simboli
// una sotto l'altra si leggono come un blocco solo, e il cliente non capisce
// dove finisce «cosa c'è dentro» e comincia «com'è fatto». Il trattino è un
// filo e non un carattere: un trattino tipografico segue la linea di base del
// carattere, che qui sceglie il ristoratore, e finiva più in alto delle icone.
//
// Un allergene senza pittogramma non sparisce: resta la sua parola in mezzo.
// Niente spazi fra i pezzi: la riga vuota deve essere davvero vuota, o
// `:empty` nel CSS non la nasconde.
function rigaAIcone(item, locale) {
  const allergeni = item.allergens || [];
  const note = notesOf(item);
  return [
    ...allergeni.map((code) =>
      allergenIcon(code)
        ? iconaAllergene(code, locale, false)
        : `<span>${escapeHtml(labelFor(code, locale))}</span>`
    ),
    allergeni.length > 0 && note.length > 0 ? '<span class="menu-allergen-sep" aria-hidden="true"></span>' : '',
    note.length > 0 ? iconeNote(item, locale) : '',
  ].join('');
}

// LA LEGENDA, parte della modalità a icone e non una voce da accendere: con i
// simboli, la pagina deve poter dire cosa vogliono dire. In fondo alla carta,
// chiusa (<details>, nessuno script): al tavolo si guardano i piatti, e chi
// non conosce un simbolo la apre quando gli serve.
//
// Elenca SOLO gli allergeni che il menù dichiara davvero — la stessa lista
// delle pastiglie del filtro (Tema 2) — e le note usate davvero.
//
// ⚠️ LA POLARITÀ STA QUI. Senza la parola «Contiene» sui piatti, è questa
// legenda a dire che le icone sono cosa il piatto CONTIENE e non di cosa è
// privo: una spiga, in mezzo mondo, vuol dire «senza glutine». Per questo gli
// allergeni stanno sotto «Contiene:» e le note sotto «Da sapere», e non in un
// elenco unico come prima nell'anteprima del portale.
function renderLegenda(pastiglie, piatti, locale, t) {
  const allergeni = pastiglie.filter((p) => p.kind === 'allergens').map((p) => p.code);
  const note = DISH_NOTES.filter((n) => piatti.some((p) => notesOf(p).some((x) => x.code === n.code)));
  if (allergeni.length === 0 && note.length === 0) return '';
  return `<details class="menu-legend">
  <summary>${escapeHtml(t('menuIconsLegend'))}</summary>
  ${allergeni.length > 0
    ? `<p class="menu-legend-label">${escapeHtml(t('menuContains'))}</p>
  <ul class="menu-legend-list">${allergeni
      .map(
        (code) =>
          `<li>${allergenIcon(code) ? iconaAllergene(code, locale, true) : ''}<span>${escapeHtml(labelFor(code, locale))}</span></li>`
      )
      .join('')}</ul>`
    : ''}
  ${note.length > 0
    ? `<p class="menu-legend-label">${escapeHtml(t('menuDetailNotes'))}</p>
  <ul class="menu-legend-list">${note
      .map(
        (n) =>
          `<li><svg class="menu-dish-note-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n.icon}</svg><span>${escapeHtml(noteName(n, locale))}</span></li>`
      )
      .join('')}</ul>`
    : ''}
</details>`;
}

function renderRiga(item, currency, locale, t, aspetto) {
  const { conFoto, showPhotos, photoShape, showDescriptions, layout, allergenDisplay } = aspetto;
  const aIcone = allergenDisplay === 'icon';
  const tonda = photoShape === 'round' ? ' is-round' : '';
  // La MINIATURA in lista: solo nell'impaginazione a riga. La foto grande del
  // dettaglio invece resta (v. renderDettaglio) — "a blocco" decide come si
  // legge la carta, non che le foto caricate spariscano.
  const miniature = layout === 'row' && showPhotos;
  const p = prezzo(item.priceCents, currency, locale);
  const allergeni = (item.allergens || []).join(',');
  const esigenze = (item.diets || []).join(',');
  return `    <li class="menu-item${item.highlighted ? ' is-highlighted' : ''}" data-allergens="${escapeAttr(allergeni)}" data-diets="${escapeAttr(esigenze)}">
      <button type="button" class="menu-item-row" aria-label="${escapeAttr(t('menuDetailOpen', { dish: item.name }))}">
        ${miniature && item.thumbUrl
          ? `<img src="${escapeAttr(item.thumbUrl)}" alt="" class="menu-thumb${tonda}">`
          : conFoto
            ? `<span class="menu-thumb menu-thumb-empty${tonda}"></span>`
            : ''}
        <span class="menu-item-body">
          <span class="menu-item-line">
            <span class="menu-item-title">
              ${item.highlighted ? '<svg class="menu-star" width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.55 5.6 6.05.58-4.55 4.06 1.3 5.94L12 16.75l-5.35 2.93 1.3-5.94-4.55-4.06 6.05-.58L12 3.5z"/></svg>' : ''}
              <span class="menu-item-name">${escapeHtml(item.name)}</span>
              ${(item.description || '').trim() !== '' && !showDescriptions
                ? '<svg class="menu-info" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
                : ''}
            </span>
            ${p !== '' ? `<span class="menu-price">${escapeHtml(p)}</span>` : ''}
          </span>
          ${/* LA NOTA STA SOPRA LA DESCRIZIONE, attaccata al nome: «il piatto
                del mese» dice perché quel piatto è lì, e vale prima di sapere
                com'è fatto. Sotto alla descrizione si leggeva come una
                postilla. */ ''}
          ${item.highlighted && (item.highlightNote || '').trim() !== ''
            ? `<span class="menu-item-note">${escapeHtml(item.highlightNote)}</span>`
            : ''}
          ${showDescriptions && (item.description || '').trim() !== ''
            ? `<span class="menu-item-desc">${escapeHtml(item.description)}</span>`
            : ''}
          ${/* PRIMA GLI ALLERGENI, POI LE NOTE (scelta dell'utente,
                2026-09-06): stesso ordine del dettaglio del piatto — cosa c'è
                dentro, poi com'è fatto. Le note restano anche sul piatto
                escluso dal filtro: «surgelato» va detto comunque, e quel
                piatto il cliente potrebbe rimetterlo dentro. */ ''}
          ${/* A ICONE la riga porta anche le note, e la parola «Contiene» non
                c'è: la polarità la dice la legenda in fondo (renderLegenda). */ ''}
          <span class="menu-item-allergens${aIcone ? ' is-icons' : ''}">${
            aIcone
              ? rigaAIcone(item, locale)
              : (item.allergens || []).length > 0
                ? `${escapeHtml(t('menuContains'))} ${escapeHtml((item.allergens || []).map((c) => labelFor(c, locale)).join(', '))}`
                : ''
          }</span>
          <span class="menu-item-reason" hidden></span>
          ${/* A icone le note stanno nella riga qui sopra, che però col filtro
                acceso sparisce e lascia il posto al motivo (menu-page.js). Su
                quel piatto le note vanno dette comunque: questa copia a sole
                icone compare solo quando il piatto è escluso (.is-off, CSS). */ ''}
          ${aIcone
            ? notesOf(item).length > 0
              ? `<span class="menu-item-notes is-icons is-fallback">${iconeNote(item, locale)}</span>`
              : ''
            : renderNote(item, locale)}
        </span>
      </button>
${renderDettaglio(item, p, locale, t, showPhotos)}
    </li>`;
}

// Il dettaglio sta DENTRO la riga, nascosto: la pagina arriva intera al primo
// caricamento e aprire un piatto non chiede niente alla rete. Il foglio che
// sale dal basso lo prende da qui.
// Spente vuol dire spente anche qui: un'eccezione ("in lista no, nel
// dettaglio sì") sarebbe una regola in più da spiegare, e chi le nasconde
// perché sono disomogenee non le vuole nemmeno aprendo il piatto.
function renderDettaglio(item, p, locale, t, showPhotos) {
  return `      <template class="menu-detail">
        ${showPhotos && item.photoUrl
          ? `<img src="${escapeAttr(item.photoUrl)}" alt="" class="menu-detail-photo">`
          // Senza foto NON si mette un riquadro grigio: nella riga lo spazio
          // si tiene per allineare le righe fra loro, qui non c'è niente da
          // allineare e sarebbe mezza schermata di niente prima del nome.
          : ''}
        <div class="menu-detail-body">
          <div class="menu-detail-head">
            <h3>${escapeHtml(item.name)}</h3>
            ${p !== '' ? `<span class="menu-detail-price">${escapeHtml(p)}</span>` : ''}
          </div>
          ${(item.description || '').trim() !== ''
            ? `<p class="menu-detail-desc">${escapeHtml(item.description)}</p>`
            : ''}
          <p class="menu-detail-label">${escapeHtml(t('menuDetailAllergens'))}</p>
          ${(item.allergens || []).length === 0
            ? `<p class="menu-detail-none">${escapeHtml(t('menuDetailNoAllergens'))}</p>`
            : `<div class="menu-chips">${(item.allergens || [])
                .map((c) => `<span class="menu-chip" data-kind="allergens" data-code="${escapeAttr(c)}">${escapeHtml(labelFor(c, locale))}</span>`)
                .join('')}</div>`}
          ${(item.diets || []).length > 0
            ? `<p class="menu-detail-label">${escapeHtml(t('menuDetailDiets'))}</p>
          <div class="menu-chips">${(item.diets || [])
            .map((c) => `<span class="menu-chip is-diet">${escapeHtml(labelFor(c, locale))}</span>`)
            .join('')}</div>`
            : ''}
          ${notesOf(item).length > 0
            ? `<p class="menu-detail-label">${escapeHtml(t('menuDetailNotes'))}</p>
          <div class="menu-chips">${notesOf(item)
            .map((n) => `<span class="menu-chip is-note"><svg class="menu-chip-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${n.icon}</svg>${escapeHtml(noteName(n, locale))}</span>`)
            .join('')}</div>`
            : ''}
          ${showPhotos && item.photoUrl ? `<p class="menu-detail-photo-note">${escapeHtml(t('menuDetailPhoto'))}</p>` : ''}
        </div>
      </template>`;
}

// Il pannello con l'elenco intero. È QUI, e non nella fila, che ha senso
// separare allergeni ed esigenze: in un elenco due titoletti aiutano a
// scorrere, in una fila da sette sarebbero una barriera in mezzo.

// LA FILA DEI LINK in fondo alla pagina. Il nome del servizio si deduce
// dall'indirizzo, come nel portale (partner/src/lib/socials.ts): le due
// copie devono dire la stessa cosa, o lo stesso link si chiamerebbe in due
// modi a seconda di dove lo si guarda.
const SOCIAL_DOMINI = [
  ['Instagram', ['instagram.com', 'instagr.am']],
  ['Facebook', ['facebook.com', 'fb.com', 'fb.me']],
  ['TikTok', ['tiktok.com']],
  ['Tripadvisor', ['tripadvisor.']],
  ['WhatsApp', ['wa.me', 'whatsapp.com']],
  ['YouTube', ['youtube.com', 'youtu.be']],
  ['X', ['twitter.com', 'x.com']],
  ['LinkedIn', ['linkedin.com']],
];

// QUELLO CHE SI LEGGE: il nome della pagina, non quello del servizio —
// «iltuolocale» e non «Instagram» (copia di socialHandle nel portale). Il
// servizio lo dice il simbolo accanto, e ripeterlo scritto riempirebbe la
// fila con la stessa informazione quattro volte.
function nomePagina(url, label) {
  if ((label || '').trim() !== '') return label.trim();
  const servizio = nomeLink(url, '');
  if (servizio === '') return '';
  // Sconosciuto: si legge il dominio, che è come uno lo direbbe a voce.
  if (!ICONE_LINK[servizio]) return servizio;
  try {
    const pezzi = new URL(url).pathname.split('/').filter((p) => p !== '');
    const primo = (pezzi[0] || '').replace(/^@/, '');
    return primo !== '' ? primo : servizio;
  } catch {
    return servizio;
  }
}

function nomeLink(url, label) {
  if ((label || '').trim() !== '') return label.trim();
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return '';
  }
  const noto = SOCIAL_DOMINI.find(([, domini]) =>
    domini.some((d) => host === d || host.endsWith(`.${d}`) || host.includes(d))
  );
  return noto ? noto[0] : host;
}

// I SIMBOLI, copia di partner/src/lib/socials.ts (SOCIAL_ICONS): forme
// semplificate disegnate da noi, non i loghi ufficiali — quelli sono marchi
// altrui e si prendono dai kit dei rispettivi proprietari. Accanto resta
// sempre il nome scritto, che è anche quello che legge chi ascolta la pagina.
const ICONE_LINK = {
  instagram: [
    'M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z',
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M17.5 6.5h.01',
  ],
  Facebook: ['M14 8h2V5h-2a4 4 0 0 0-4 4v2H8v3h2v7h3v-7h2.5l.5-3H13v-2a1 1 0 0 1 1-1z'],
  TikTok: ['M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5', 'M14 4c.5 2.5 2 4 4.5 4.2'],
  WhatsApp: ['M4 20l1.2-3.6A7.5 7.5 0 1 1 8 19.2L4 20z', 'M9 9.5c0 3 2.5 5.5 5.5 5.5'],
  YouTube: [
    'M3 8.5a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3z',
    'M11 10l3.5 2-3.5 2z',
  ],
  X: ['M5 5l14 14', 'M19 5L5 19'],
  LinkedIn: [
    'M4 9h3v11H4z',
    'M5.5 4.5h.01',
    'M11 20V9h3v1.5A3.5 3.5 0 0 1 20 13v7h-3v-6a2 2 0 0 0-4 0v6z',
  ],
  Tripadvisor: [
    'M12 7c4 0 7 2 9 2',
    'M12 7c-4 0-7 2-9 2',
    'M7 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M17 10a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
  ],
  altro: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M3.5 9h17',
    'M3.5 15h17',
    'M12 3c2.5 2.5 3.5 5.5 3.5 9s-1 6.5-3.5 9c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3z',
  ],
};
ICONE_LINK.Instagram = ICONE_LINK.instagram;

function renderIconaLink(nome) {
  const tracciati = ICONE_LINK[nome] || ICONE_LINK.altro;
  return `<svg class="menu-link-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tracciati
    .map((d) => `<path d="${d}"/>`)
    .join('')}</svg>`;
}

function renderLink(links, carte) {
  const righe = (links || [])
    .map((l) => ({
      href: safeHref(l.url),
      nome: nomeLink(l.url, l.label),
      pagina: nomePagina(l.url, l.label),
    }))
    .filter((l) => l.href !== '' && l.nome !== '');
  if (righe.length === 0 || !carte.some((c) => gruppiDi(c).length > 0)) return '';
  return `<nav class="menu-links">
${righe
    .map(
      (l) =>
        // Il nome del SERVIZIO sta nell'etichetta accessibile: scritto si
        // legge il nome della pagina, e chi ascolta sentirebbe «iltuolocale»
        // senza sapere dove porta.
        `  <a class="menu-link" href="${l.href}" target="_blank" rel="noopener noreferrer nofollow" aria-label="${escapeAttr(`${l.nome}: ${l.pagina}`)}">${renderIconaLink(l.nome)}<span>${escapeHtml(l.pagina)}</span></a>`
    )
    .join('\n')}
</nav>`;
}

function renderPannelloFiltri(pastiglie, locale, t) {
  const allergeni = pastiglie.filter((p) => p.kind === 'allergens');
  const esigenze = pastiglie.filter((p) => p.kind === 'diets');
  if (pastiglie.length === 0) return '';
  return `<div class="menu-sheet" id="menu-filter-sheet" hidden>
  <div class="menu-sheet-panel" role="dialog" aria-modal="true" aria-label="${escapeAttr(t('menuFilterAll'))}">
    <div class="menu-sheet-head">
      <span class="menu-sheet-grip"></span>
      <p class="menu-sheet-title">${escapeHtml(t('menuFilterAll'))}</p>
      <button type="button" class="menu-sheet-reset" id="menu-filter-reset">${escapeHtml(t('menuFilterReset'))}</button>
    </div>
    <div class="menu-sheet-body">
      ${esigenze.length > 0
        ? `<p class="menu-sheet-label">${escapeHtml(t('menuFilterDietsTitle'))}</p>
      <div class="menu-pills is-wrap">${esigenze.map((p) => renderPastiglia(p, locale, t)).join('')}</div>`
        : ''}
      ${allergeni.length > 0
        ? `<p class="menu-sheet-label">${escapeHtml(t('menuFilterAllergensTitle'))}</p>
      <div class="menu-pills is-wrap">${allergeni.map((p) => renderPastiglia(p, locale, t)).join('')}</div>`
        : ''}
    </div>
  </div>
</div>`;
}

// IL DETTAGLIO DEL PIATTO: uno solo, vuoto, riempito dalla riga toccata.
//
// È un POPUP AL CENTRO e non più un foglio che sale dal basso. Il foglio dal
// basso è il gesto del telefono — si trascina giù per chiuderlo — ma qui il
// trascinamento non c'è mai stato: restava una scheda incollata al bordo
// inferiore, senza un modo evidente di chiuderla, che sullo schermo di un
// computer sembrava proprio rotta. Il popup invece dice da sé cos'è: sta al
// centro, ha la sua X, e si chiude toccando fuori.
//
// LE FRECCINE sono la ragione per cui vale la pena averlo aperto: chi legge
// un menù confronta due o tre piatti, e senza di loro ogni confronto costa
// chiudi-scorri-riapri. Scorrono la carta NELL'ORDINE IN CUI SI VEDE — che
// col filtro acceso è già stato riordinato — quindi seguono quello che il
// cliente ha davanti, non l'ordine con cui il ristoratore l'ha scritta.
function renderFoglio(t) {
  return `<div class="menu-sheet is-dialog" id="menu-dish-sheet" hidden>
  <div class="menu-sheet-panel is-dialog" role="dialog" aria-modal="true" id="menu-dish-panel">
    <div class="menu-dialog-bar">
      <button type="button" class="menu-dialog-nav" id="menu-dish-prev" aria-label="${escapeAttr(t('menuDetailPrev'))}" title="${escapeAttr(t('menuDetailPrev'))}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <button type="button" class="menu-dialog-nav" id="menu-dish-next" aria-label="${escapeAttr(t('menuDetailNext'))}" title="${escapeAttr(t('menuDetailNext'))}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"/></svg>
      </button>
      <button type="button" class="menu-dialog-close" id="menu-dish-close" aria-label="${escapeAttr(t('menuClose'))}" title="${escapeAttr(t('menuClose'))}">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <div class="menu-sheet-body" id="menu-dish-body"></div>
  </div>
</div>`;
}

// I testi che servono al comportamento del filtro, già tradotti dal server:
// il motivo scritto sotto un piatto escluso e il conteggio degli adatti. Così
// nella pagina non c'è nessun dizionario e la lingua dei messaggi non può
// divergere da quella del menù.
//
// Le etichette sono SOLO quelle dei codici che questo menù usa davvero: una
// carta di pesce non si porta dietro i nomi dei lupini.
function renderTesti(pastiglie, locale, t) {
  const labels = { allergens: {}, diets: {} };
  for (const p of pastiglie) labels[p.kind][p.code] = labelFor(p.code, locale);
  const dati = {
    labels,
    contains: t('menuExcludedContains'),
    notFor: t('menuExcludedNotFor'),
    summary: t('menuFilterSummary'),
    summaryOne: t('menuFilterSummaryOne'),
  };
  // `<` sfuggito: dentro uno <script> una stringa che contenesse "</script>"
  // chiuderebbe il blocco e il resto finirebbe a schermo come testo.
  const json = JSON.stringify(dati).replace(/</g, '\\u003c');
  return `<script>window.__MENU_TEXTS__ = ${json};</script>`;
}

module.exports = { renderMenuPage, pastiglieDisponibili };
