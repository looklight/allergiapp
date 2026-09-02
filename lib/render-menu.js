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
//     sembrare che il menù sia nostro.
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

const { escapeHtml, escapeAttr } = require('./render-helpers');
const { labelFor } = require('./labels');
const { inOrdine } = require('./menu-order');
const { renderFooter } = require('./render-shell');

const SITE_ORIGIN = 'https://allergiapp.com';
const DEFAULT_LOGO = '/images/happyplate.webp';

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
  const { venueName, logoUrl, accent, tableConditions, menu, slug } = dati;
  const canonical = `${SITE_ORIGIN}/menu/${slug}`;
  const pastiglie = pastiglieDisponibili(menu);
  const piatti = tuttiIPiatti(menu);
  const gruppi = menu.groups.filter((g) =>
    g.kind === 'note'
      ? (g.name || '').trim() !== '' || (g.description || '').trim() !== ''
      : g.items.length > 0
  );

  return `<!DOCTYPE html>
<html lang="${locale}">
${renderHead(dati, locale, t, canonical)}
<body class="menu-body" style="--accent:${escapeAttr(accent || '#3f3f46')}">
${renderHeader(dati, locale, t)}
${pastiglie.length > 0 ? renderFiltro(pastiglie, piatti.length, locale, t) : ''}
<main class="menu-main">
${gruppi.length === 0
    ? `<p class="menu-empty">${escapeHtml(t('menuEmpty'))}</p>`
    : gruppi.map((g) => renderGruppo(g, menu.currency, locale, t)).join('\n')}
${(tableConditions || '').trim() !== '' && gruppi.length > 0
    ? `<p class="menu-conditions">${escapeHtml(tableConditions)}</p>`
    : ''}
</main>
${renderPannelloFiltri(pastiglie, locale, t)}
${renderFoglio(t)}
<div class="menu-brand">
  <a href="/" class="menu-brand-link">
    <img src="${DEFAULT_LOGO}" alt="" class="menu-brand-logo">
    <span>${locale === 'en' ? 'Menu with allergen filter by' : 'Menù con filtro allergeni di'} <strong>AllergiApp</strong></span>
  </a>
</div>
${renderFooter(locale)}
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
<link rel="canonical" href="${escapeAttr(canonical)}">
${LINGUE.map((l) => {
    const href = l.code === 'it' ? canonical : `${canonical}/${l.code}`;
    return `<link rel="alternate" hreflang="${l.code}" href="${escapeAttr(href)}">`;
  }).join('\n')}
<meta property="og:title" content="${escapeAttr(titolo)}">
<meta property="og:description" content="${escapeAttr(descrizione)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeAttr(canonical)}">
<link rel="stylesheet" href="/styles.css">
<link rel="stylesheet" href="/menu-page.css">
</head>`;
}

// L'intestazione è l'unico posto in cui il colore scelto dal ristoratore fa
// da fondo: sul testo dei piatti sarebbe una scelta di contrasto lasciata a
// lui, che il Tema 8 non concede.
function renderHeader(dati, locale, t) {
  const { venueName, logoUrl, menu, slug } = dati;
  return `<header class="menu-header">
  <div class="menu-header-top">
    <img src="${escapeAttr(logoUrl || DEFAULT_LOGO)}" alt="" class="menu-logo">
    <h1 class="menu-venue">${escapeHtml(venueName)}</h1>
    <nav class="menu-langs" aria-label="${escapeAttr(t('menuLanguage'))}">
      ${LINGUE.map((l) => {
        const href = l.code === 'it' ? `/menu/${slug}` : `/menu/${slug}/${l.code}`;
        const attivo = l.code === locale;
        return `<a href="${escapeAttr(href)}" class="menu-lang${attivo ? ' is-on' : ''}"${
          attivo ? ' aria-current="true"' : ''
        } lang="${l.code}" title="${escapeAttr(l.label)}">${l.short}</a>`;
      }).join('')}
    </nav>
  </div>
  ${(menu.description || '').trim() !== ''
      ? `<p class="menu-intro">${escapeHtml(menu.description)}</p>`
      : ''}
</header>`;
}

// IL FILTRO. È la ragione per cui questo menù non è come gli altri menù col
// QR, quindi sta in alto, si tocca subito e non è mai a pagamento: è la
// dimostrazione del prodotto.
//
// Il bottone "Filtri" sta FUORI dalla fila che scorre, ancorato a sinistra:
// da lì non se ne va mai, e la fila gli scorre accanto. Le pastiglie accese
// risalgono sempre in testa — senza, si sceglie dal pannello, si chiude, il
// menù si riordina sotto gli occhi e il motivo è fuori schermo a destra.
function renderFiltro(pastiglie, totale, locale, t) {
  return `<div class="menu-filter" id="menu-filter" data-total="${totale}">
  <div class="menu-filter-head">
    <p class="menu-filter-hint">${escapeHtml(t('menuFilterHint'))}</p>
    <p class="menu-filter-count" id="menu-filter-count" hidden></p>
  </div>
  <div class="menu-filter-row">
    <button type="button" class="menu-filter-button" id="menu-filter-open">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>
      ${escapeHtml(t('menuFilterButton'))}
      <span class="menu-filter-badge" id="menu-filter-badge" hidden></span>
    </button>
    <div class="menu-pills" id="menu-pills">
      ${pastiglie.map((p) => renderPastiglia(p, locale, t)).join('\n      ')}
    </div>
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
function renderGruppo(gruppo, currency, locale, t) {
  if (gruppo.kind === 'note') {
    return `<div class="menu-note">
  ${(gruppo.name || '').trim() !== '' ? `<p class="menu-note-title">${escapeHtml(gruppo.name)}</p>` : ''}
  ${(gruppo.description || '').trim() !== '' ? `<p class="menu-note-text">${escapeHtml(gruppo.description)}</p>` : ''}
</div>`;
  }
  return `<section class="menu-section">
  ${(gruppo.name || '').trim() !== '' ? `<h2 class="menu-section-title">${escapeHtml(gruppo.name)}</h2>` : ''}
  ${(gruppo.description || '').trim() !== '' ? `<p class="menu-section-desc">${escapeHtml(gruppo.description)}</p>` : ''}
  <ul class="menu-items">
${gruppo.items.map((item) => renderRiga(item, currency, locale, t)).join('\n')}
  </ul>
</section>`;
}

// La riga si tocca tutta, non solo il nome: sul telefono un bersaglio piccolo
// è un bersaglio mancato. Apre il dettaglio, che è dove stanno la descrizione
// intera e TUTTI gli allergeni — nella riga si vede solo quello che riguarda
// il filtro acceso, ma chi ha un'allergia deve poter controllare l'elenco
// completo prima di ordinare.
function renderRiga(item, currency, locale, t) {
  const p = prezzo(item.priceCents, currency, locale);
  const allergeni = (item.allergens || []).join(',');
  const esigenze = (item.diets || []).join(',');
  return `    <li class="menu-item${item.highlighted ? ' is-highlighted' : ''}" data-allergens="${escapeAttr(allergeni)}" data-diets="${escapeAttr(esigenze)}">
      <button type="button" class="menu-item-row" aria-label="${escapeAttr(t('menuDetailOpen', { dish: item.name }))}">
        ${item.thumbUrl
          ? `<img src="${escapeAttr(item.thumbUrl)}" alt="" class="menu-thumb">`
          : '<span class="menu-thumb menu-thumb-empty"></span>'}
        <span class="menu-item-body">
          <span class="menu-item-line">
            ${item.highlighted ? '<svg class="menu-star" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 3.5l2.55 5.6 6.05.58-4.55 4.06 1.3 5.94L12 16.75l-5.35 2.93 1.3-5.94-4.55-4.06 6.05-.58L12 3.5z"/></svg>' : ''}
            <span class="menu-item-name">${escapeHtml(item.name)}</span>
            ${(item.description || '').trim() !== ''
              ? '<svg class="menu-info" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
              : ''}
            ${p !== '' ? `<span class="menu-price">${escapeHtml(p)}</span>` : ''}
          </span>
          ${item.highlighted && (item.highlightNote || '').trim() !== ''
            ? `<span class="menu-item-note">${escapeHtml(item.highlightNote)}</span>`
            : ''}
          <span class="menu-item-allergens">${
            (item.allergens || []).length > 0
              ? `${escapeHtml(t('menuContains'))} ${escapeHtml((item.allergens || []).map((c) => labelFor(c, locale)).join(', '))}`
              : ''
          }</span>
          <span class="menu-item-reason" hidden></span>
        </span>
      </button>
${renderDettaglio(item, p, locale, t)}
    </li>`;
}

// Il dettaglio sta DENTRO la riga, nascosto: la pagina arriva intera al primo
// caricamento e aprire un piatto non chiede niente alla rete. Il foglio che
// sale dal basso lo prende da qui.
function renderDettaglio(item, p, locale, t) {
  return `      <template class="menu-detail">
        ${item.photoUrl
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
          ${item.photoUrl ? `<p class="menu-detail-photo-note">${escapeHtml(t('menuDetailPhoto'))}</p>` : ''}
        </div>
      </template>`;
}

// Il pannello con l'elenco intero. È QUI, e non nella fila, che ha senso
// separare allergeni ed esigenze: in un elenco due titoletti aiutano a
// scorrere, in una fila da sette sarebbero una barriera in mezzo.
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

// Il foglio del dettaglio: uno solo, vuoto, riempito dalla riga toccata.
function renderFoglio(t) {
  return `<div class="menu-sheet" id="menu-dish-sheet" hidden>
  <div class="menu-sheet-panel" role="dialog" aria-modal="true" id="menu-dish-panel">
    <div class="menu-sheet-head is-plain"><span class="menu-sheet-grip"></span></div>
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
