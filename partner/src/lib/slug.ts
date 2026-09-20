// L'indirizzo pubblico del menù: `allergiapp.com/v/<slug>`.
//
// La lettera non nomina il contenuto di proposito (deciso il 2026-09-20):
// oggi lì sotto c'è il menù, domani può starci il locale intero, e un
// prefisso che dice «menu» sarebbe già sbagliato quel giorno — stampato su
// un QR incollato al tavolo. Il vecchio `/menu/<slug>` risponde per sempre
// con un 308 permanente (landing/vercel.json).
//
// Lo slug è del LOCALE (DIGITAL_MENU.md, Temi 13 e 17) e ne ha UNO alla
// volta: cambiandolo il precedente torna libero, senza storico e senza
// reindirizzamenti. La conseguenza — un QR già stampato smette di funzionare —
// la rompe il ristoratore con un gesto suo, e si copre con un avviso al
// momento del cambio, non con una tabella che nessuno ripulisce (Tema 17,
// riscritto il 2026-09-01).
//
// Qui dentro solo la FORMA. Se sia libero lo sa solo il database, e lo chiede
// venues.ts con `partner_slug_taken` (migration 707).

// Gli stessi numeri del CHECK della 707: sotto i tre caratteri non identifica
// niente, sopra i sessanta non sta su una locandina.
export const SLUG_MIN = 3;
export const SLUG_MAX = 60;

// Minuscolo, lettere e cifre ASCII, trattini singoli in mezzo. Deve combaciare
// col vincolo della 707: quello che passa di qui e non di là diventerebbe un
// errore del database a salvataggio già iniziato.
const FORMA = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export function slugValido(slug: string): boolean {
  return (
    FORMA.test(slug) && slug.length >= SLUG_MIN && slug.length <= SLUG_MAX
  );
}

// La proposta che il portale mette nel campo, ricavata dal nome del locale.
// Gli accenti si scompongono e si buttano via gli spiccioli (à → a): un
// indirizzo con la à dentro esiste, ma si detta male al telefono e si scrive
// peggio da una tastiera straniera — e questo indirizzo finisce su una
// locandina, non in un segnalibro.
export function slugProposto(nome: string): string {
  const senzaAccenti = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return senzaAccenti
    .toLowerCase()
    // tutto ciò che non è lettera o cifra diventa un trattino: spazi,
    // apostrofi ("l'osteria"), punti, e-commerciali
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    // il taglio può lasciare un trattino appeso in coda
    .replace(/-+$/, '');
}

// Come si legge l'indirizzo per intero. Senza `https://` davanti: quello che
// il ristoratore deve riconoscere sulla locandina è il dominio più il suo
// nome, e il protocollo è rumore che allunga la riga.
//
// La pagina pubblica è viva dal 2026-09-02: questo indirizzo si apre davvero,
// e quello che il ristoratore legge qui è quello che finisce sul QR.
export const MENU_DOMINIO = 'allergiapp.com/v/';
