/* Le manopole della prova su /menu.
 *
 * COSA FA, in una riga: cambia colore, carattere e grandezza del menù che sta
 * dentro il telefono, senza ricaricarlo.
 *
 * PERCHÉ FUNZIONA COSÌ. Il menù è disegnato dal server e arriva già fatto: il
 * colore è la variabile `--accent` scritta sul suo <body>, la grandezza è
 * `--ms`, il carattere è una classe `font-*`. Sono le stesse tre cose che il
 * ristoratore sceglie nel portale — non una loro imitazione — quindi qui non
 * si ridisegna niente: si toccano quei tre valori e il browser rifà i conti
 * da solo. È la ragione per cui la prova risponde all'istante.
 *
 * ⚠️ SI OFFRONO SOLO LE MANOPOLE CHE ESISTONO DAVVERO NEL PORTALE. Interlinea
 * e separatore sono già capiti dalla pagina pubblica, ma aspettano la
 * migration 711: metterle qui prometterebbe una scelta che il ristoratore,
 * appena registrato, non troverebbe (DIGITAL_MENU.md, Tema 31). */

(function () {
  'use strict';

  var frame = document.getElementById('ml-demo-frame');
  var pannello = document.getElementById('ml-knobs');
  if (!frame || !pannello) return;

  // I valori di partenza sono quelli con cui il server ha già disegnato il
  // menù: il pannello parte d'accordo con quello che si vede.
  var stato = { accent: '#333333', font: 'modern', scale: '1' };

  var CARATTERI = ['classic', 'bold', 'light'];

  function applica() {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return; // niente da fare: il telefono non è ancora arrivato
    }
    if (!doc || !doc.body) return;

    doc.body.style.setProperty('--accent', stato.accent);
    doc.body.style.setProperty('--ms', stato.scale);

    CARATTERI.forEach(function (c) {
      doc.body.classList.remove('font-' + c);
    });
    if (stato.font !== 'modern') doc.body.classList.add('font-' + stato.font);
  }

  // ── I CARATTERI, PRIMA CHE SERVANO ────────────────────────────────────
  // I tre caratteri si scaricano solo quando qualcosa li usa. Al primo clic
  // su «Classico» la carta si ridisegnava una volta col ripiego di sistema e
  // una seconda col carattere vero appena arrivato: uno scatto, e per giunta
  // proprio nel momento in cui si sta guardando l'effetto.
  //
  // Qui si chiedono tutti e sei i tagli (due pesi per famiglia: il marcato
  // dei titoli e quello del corpo) appena il browser è libero, così al clic
  // sono già in casa e il cambio è netto. Il carattere di sistema — quello di
  // partenza — non si scarica, quindi non c'è niente da scaldare.
  var TAGLI = [
    '600 1em Fraunces', '400 1em Fraunces',
    '700 1em Archivo', '500 1em Archivo',
    '300 1em Jost', '400 1em Jost',
  ];

  function scaldaCaratteri() {
    var doc;
    try {
      doc = frame.contentDocument;
    } catch (e) {
      return;
    }
    if (!doc || !doc.fonts || !doc.fonts.load) return;
    TAGLI.forEach(function (taglio) {
      // Le lettere accentate servono a chiedere il sottoinsieme GIUSTO: i
      // file sono divisi per intervalli di caratteri, e senza un esempio si
      // scalderebbe quello sbagliato.
      try {
        doc.fonts.load(taglio, 'Antipasti àèìòù').catch(function () {});
      } catch (e) {
        /* browser senza FontFace: pazienza, si torna allo scatto di prima */
      }
    });
  }

  function appenaLibero(cosa) {
    if (window.requestIdleCallback) window.requestIdleCallback(cosa, { timeout: 3000 });
    else setTimeout(cosa, 1500);
  }

  // Il menù dentro la cornice si ridisegna solo quando cambia la lingua: a
  // ogni arrivo le scelte fatte finora vanno rimesse, o tornerebbe grigio.
  frame.addEventListener('load', function () {
    applica();
    appenaLibero(scaldaCaratteri);
  });
  applica();
  appenaLibero(scaldaCaratteri);

  pannello.addEventListener('click', function (e) {
    var bottone = e.target.closest('button[data-value]');
    if (!bottone) return;

    var gruppo = bottone.parentElement;
    var manopola = gruppo.getAttribute('data-knob');
    if (!manopola) return;

    stato[manopola] = bottone.getAttribute('data-value');

    Array.prototype.forEach.call(gruppo.children, function (b) {
      var acceso = b === bottone;
      b.classList.toggle('is-on', acceso);
      b.setAttribute('aria-pressed', acceso ? 'true' : 'false');
    });

    applica();
  });

  // ── LA LINGUA ──────────────────────────────────────────────────────────
  // Il telefono deve parlare la lingua della pagina che lo contiene, non
  // quella del browser: chi legge la pagina in inglese e trova il menù in
  // italiano pensa che il menù l'inglese non lo sappia. La scelta è la stessa
  // che fa i18n-site.js per il resto della pagina.

  function lingua() {
    try {
      var param = new URLSearchParams(window.location.search).get('lang');
      if (param === 'it' || param === 'en') return param;
      var salvata = localStorage.getItem('allergiapp_preferred_language');
      if (salvata === 'it' || salvata === 'en') return salvata;
    } catch (e) {
      /* browser senza depositi: si prosegue con quella del browser */
    }
    return (navigator.language || 'it').slice(0, 2) === 'en' ? 'en' : 'it';
  }

  function mostraIn(lang) {
    var voluto = lang === 'en' ? '/menu-demo?lang=en' : '/menu-demo';
    // Confronto sul percorso e non sull'intero indirizzo: `frame.src` torna
    // assoluto, e ricaricare il telefono a vuoto lo farebbe lampeggiare.
    if (frame.getAttribute('src') === voluto) return;
    frame.setAttribute('src', voluto);
  }

  mostraIn(lingua());

  // Il selettore in fondo alla pagina è di i18n-site.js: qui ci si accoda
  // per portare dietro anche il telefono.
  document.querySelectorAll('.lang-selector a[data-lang]').forEach(function (a) {
    a.addEventListener('click', function () {
      mostraIn(a.getAttribute('data-lang'));
    });
  });
})();
