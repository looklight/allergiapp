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

module.exports = { escapeHtml, escapeAttr, formatRating, formatPriceRange, formatRelativeDate };
