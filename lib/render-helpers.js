// HTML rendering primitives: escape per XSS-safety, formattatori dati.

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Alias per chiarezza nei context attributo HTML.
const escapeAttr = escapeHtml;

// ⚠️ UN INDIRIZZO NON È UNA STRINGA QUALSIASI. escapeAttr mette al sicuro le
// virgolette, non lo SCHEMA: `javascript:...` passa intatto, e in un href è
// codice che gira sul telefono di chi ha inquadrato il QR. Questa pagina la
// legge chiunque, e i link li scrive il ristoratore.
//
// Vuoto = non si disegna il link. Il controllo c'è anche nel portale e nella
// funzione che costruisce lo scatto: è l'ultimo dei tre, ed è quello che
// conta, perché è l'unico che sta dove l'href nasce.
function safeHref(url) {
  const v = String(url == null ? '' : url).trim();
  return /^https?:\/\//i.test(v) ? escapeAttr(v) : '';
}

function formatRating(n) {
  if (n == null) return '—';
  return Number(n).toFixed(1).replace(/\.0$/, '');
}

function formatPriceRange(n) {
  if (!n || n < 1) return '';
  return '€'.repeat(Math.min(4, Math.max(1, n)));
}

function formatRelativeDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleDateString(locale === 'en' ? 'en-US' : 'it-IT', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
}

module.exports = { escapeHtml, escapeAttr, safeHref, formatRating, formatPriceRange, formatRelativeDate };
