// I documenti legali: dove stanno e a che edizione siamo.
//
// Vivono sul sito (branch `landing`), non nel portale: sono gli stessi che
// legge chi usa l'app, con dentro una sezione per i ristoratori.
//
// ⚠️ TERMS_VERSION va cambiata OGNI VOLTA che si tocca il testo di
// allergiapp.com/terms o /privacy, e deve coincidere con la data che le due
// pagine mostrano sotto il titolo. È quella che finisce in
// partner_accounts.terms_version e che rende dimostrabile un'accettazione
// (art. 7 §1): una data d'accettazione senza l'edizione accettata non prova
// niente, perché il testo nel frattempo può essere cambiato.

export const SITO = 'https://allergiapp.com';
export const URL_CONDIZIONI = `${SITO}/terms`;
export const URL_INFORMATIVA = `${SITO}/privacy`;

export const TERMS_VERSION = '2026-09-06';
