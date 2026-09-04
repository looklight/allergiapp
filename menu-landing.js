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
  var stato = { accent: '#2E6B4F', font: 'modern', scale: '1', section: 'underline', layout: 'row' };

  var CARATTERI = ['classic', 'bold', 'light'];
  var STILI_SEZIONE = ['underline', 'banner', 'plain'];

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

    // L'impaginazione a blocco è tutta nel CSS: incolonna e centra quello che
    // a riga sta su una riga sola. Anche qui si riscrive la stessa classe che
    // scriverebbe il server.
    doc.body.classList.toggle('layout-block', stato.layout === 'block');

    // I titoli di sezione portano lo stile addosso, uno per uno: nel menù è
    // già così, quindi qui non si inventa niente — si riscrive la stessa
    // classe che scriverebbe il server.
    var titoli = doc.querySelectorAll('.menu-section-title');
    for (var i = 0; i < titoli.length; i++) {
      STILI_SEZIONE.forEach(function (st) {
        titoli[i].classList.remove('is-' + st);
      });
      titoli[i].classList.add('is-' + stato.section);
    }
  }

  // ── LA BARRA IN ALTO, DOPO IL PRIMO DITO ──────────────────────────────
  // Ferma dice tutto: chi è, cosa offre, dove si comincia. Appena si scorre
  // non serve più a presentarsi — serve a non perdere il filo — quindi resta
  // il logo, che riporta a casa, e un bottone corto: «Accedi». Le voci di
  // mezzo parlano dell'app agli utenti, e qui davanti c'è un ristoratore.
  //
  // Quaranta punti e non zero: un dito che sfiora non deve far cambiare la
  // pagina sotto gli occhi.
  var SOGLIA = 40;
  var pagina = document.body;
  var scorsa = null;

  function guardaLoScorrimento() {
    var giu = window.scrollY > SOGLIA;
    if (giu === scorsa) return;
    scorsa = giu;
    pagina.classList.toggle('is-scrolled', giu);
  }

  guardaLoScorrimento();
  window.addEventListener('scroll', guardaLoScorrimento, { passive: true });

  // ── LE COMPARSE ───────────────────────────────────────────────────────
  // Gli elementi marcati `anim-ready` si accendono quando entrano in vista, e
  // poi non si osservano più: una comparsa che si ripete a ogni passaggio
  // diventa un tic. Stessa ricetta della pagina Ristoranti (restaurants.js),
  // stessa soglia.
  if ('IntersectionObserver' in window) {
    var osservatore = new IntersectionObserver(function (voci) {
      voci.forEach(function (voce) {
        if (!voce.isIntersecting) return;
        voce.target.classList.add('anim-done');
        osservatore.unobserve(voce.target);
      });
    }, { threshold: 0.15 });
    document.querySelectorAll('.anim-ready').forEach(function (el) {
      osservatore.observe(el);
    });
  } else {
    // Senza osservatore niente comparsa: meglio tutto visibile che tutto
    // invisibile.
    document.querySelectorAll('.anim-ready').forEach(function (el) {
      el.classList.add('anim-done');
    });
  }

  // ── LE ANNOTAZIONI ────────────────────────────────────────────────────
  // Chi arriva qui non sa ancora cosa sta guardando. Le tre frasi lo
  // accompagnano nell'ordine in cui gli servono: prima cos'è quella cosa, poi
  // che si tocca, poi che continua sotto. Cambiano man mano che il blocco
  // scorre, perché è scorrendo che uno arriva ai comandi.
  var pastiglia = document.getElementById('ml-hint');
  var voci = pastiglia ? pastiglia.querySelectorAll('.ml-hint-voce') : [];
  var blocco = frame.closest('.ml-split');
  var voceAccesa = 0;

  if (pastiglia) {
    pastiglia.classList.add('is-1');
    // Comparsa in ritardo: prima si vede il telefono, poi qualcuno ci scrive
    // sopra. Se nel frattempo si è già scorso non cambia niente — la scritta
    // giusta l'ha già scelta `annota()`, questa accende solo l'inchiostro.
    setTimeout(function () {
      pastiglia.classList.add('is-pronta');
    }, 1100);
  }

  function annota() {
    if (!voci.length || !blocco) return;
    var b = blocco.getBoundingClientRect();
    // Quanto del blocco è già passato sopra la metà dello schermo: zero
    // quando ci si arriva, uno quando lo si è finito.
    var percorso = (window.innerHeight / 2 - b.top) / Math.max(b.height, 1);
    var quale = percorso < 0.22 ? 0 : percorso < 0.55 ? 1 : 2;
    if (quale === voceAccesa) return;
    voci[voceAccesa].classList.remove('is-on');
    voci[quale].classList.add('is-on');
    // La pastiglia si sposta all'altezza di quello che nomina, e su schermo
    // stretto cambia anche lato: le due classi le legge il foglio di stile.
    pastiglia.classList.remove('is-1', 'is-2', 'is-3');
    pastiglia.classList.add('is-' + (quale + 1));
    voceAccesa = quale;
  }

  annota();
  window.addEventListener('scroll', annota, { passive: true });
  window.addEventListener('resize', annota);

  // ── QUANTO SI RIMPICCIOLISCE LA CARTA ────────────────────────────────
  // Il menù dentro la cornice è disegnato alle misure vere di un telefono —
  // 393 per 852 — e poi RIMPICCIOLITO fino a stare nello schermo che il
  // formato concede. Così testi, margini e pastiglie restano fra loro come
  // staranno al tavolo: è una fotografia del telefono, non un telefono
  // schiacciato. Il conto lo fa qui e non nel CSS perché è una divisione fra
  // due misure, e il CSS non la sa fare.
  var LARGHEZZA_VERA = 393;
  var schermo = frame.parentElement;

  function ridimensiona() {
    var largo = schermo.clientWidth;
    if (!largo) return;
    schermo.style.setProperty('--ml-scala', largo / LARGHEZZA_VERA);
  }

  ridimensiona();
  window.addEventListener('resize', ridimensiona);

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
    var voluto = lang === 'en' ? '/menu-demo/en' : '/menu-demo';
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
