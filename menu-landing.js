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

  // ── I FUMETTI, COME LE CASELLE DI DIALOGO DI UN VIDEOGIOCO ────────────
  // Tutti e due — lo spoiler in cima e quello della sezione AllergiApp — si
  // montano allo stesso modo: il piatto entra, il riquadro si apre, le
  // battute si scrivono lettera per lettera, una dopo l'altra, e la casella
  // si svuota fra una e l'altra. Una volta sola, quando il fumetto entra in
  // vista: partire all'apertura voleva dire recitare a nessuno. Piatto e
  // riquadro li muove il foglio di stile; qui si scrivono le battute. Sta
  // prima del controllo sul telefono qui sotto perché non ne dipende.
  //
  // ⚠️ SI SCRIVE UNA COPIA, NON LA FRASE VERA. i18n riscrive l'originale
  // all'avvio — sempre, anche in italiano: legge translations.json e rimette
  // l'innerHTML — e a ogni cambio di lingua: lettere spezzate lì dentro
  // sparirebbero a metà. L'originale resta intero e trasparente sotto (lo
  // leggono motori di ricerca e lettori di schermo), e la copia, nascosta a
  // questi ultimi, gli sta sopra nella stessa cella. Se i18n lo riscrive
  // mentre si scrive, le copie si rifanno dal testo nuovo e riprendono dal
  // punto in cui erano: i ritardi si contano dall'entrata in scena, non dalla
  // nascita della copia. Finito di scrivere, le copie se ne vanno e restano
  // gli originali.
  var menoMoto = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var INIZIO = 820; // dopo l'entrata del piatto e l'apertura del riquadro (v. CSS)
  var PASSO = 12;   // una lettera ogni 12 millesimi: veloce, come nei giochi
  var PAUSA = 120;  // il fiato dopo la punteggiatura
  var TIENI = 400;  // quanto resta una battuta prima che la casella si svuoti

  function recita(dialogo) {
    var battute = Array.prototype.slice.call(dialogo.querySelectorAll('.ml-battuta'));
    if (!battute.length) return;
    var inScena = 0;
    var copie = [];
    var fine = null;
    var guardia = new MutationObserver(scrivi);

    function scrivi() {
      var trascorso = performance.now() - inScena;
      var t = INIZIO;

      copie.forEach(function (c) { c.remove(); });
      copie = battute.map(function (frase, i) {
        var copia = document.createElement('span');
        copia.className = frase.className;
        copia.classList.remove('is-coperta');
        copia.classList.add('ml-copia');
        copia.setAttribute('aria-hidden', 'true');

        // Stessi elementi (grassetto, nome in verde), ma ogni carattere in
        // una scatola sua con il suo ritardo.
        (function ricalca(da, a) {
          Array.prototype.forEach.call(da.childNodes, function (nodo) {
            if (nodo.nodeType === 1) {
              var el = nodo.cloneNode(false);
              a.appendChild(el);
              ricalca(nodo, el);
            } else if (nodo.nodeType === 3) {
              Array.from(nodo.textContent).forEach(function (c) {
                var lettera = document.createElement('span');
                lettera.className = 'ml-lettera';
                lettera.textContent = c;
                lettera.style.setProperty('--d', Math.round(t - trascorso) + 'ms');
                a.appendChild(lettera);
                t += PASSO + (/[:.,!?]/.test(c) ? PAUSA : 0);
              });
            }
          });
        })(frase, copia);

        // Tutte tranne l'ultima: letta la battuta, la casella si svuota e
        // un attimo dopo comincia la prossima.
        if (i < battute.length - 1) {
          t += TIENI;
          copia.style.setProperty('--via', Math.round(t - trascorso) + 'ms');
          copia.classList.add('is-passa');
          t += 80;
        }

        frase.parentNode.appendChild(copia);
        frase.classList.add('is-coperta');
        return copia;
      });

      clearTimeout(fine);
      fine = setTimeout(function () {
        guardia.disconnect();
        copie.forEach(function (c) { c.remove(); });
        copie = [];
        battute.forEach(function (frase) { frase.classList.remove('is-coperta'); });
      }, Math.max(0, t - trascorso));
    }

    function entraInScena() {
      inScena = performance.now();
      dialogo.classList.add('is-via');
      scrivi();
      battute.forEach(function (frase) {
        guardia.observe(frase, { childList: true, characterData: true, subtree: true });
      });
    }

    dialogo.classList.add('is-attesa');
    if ('IntersectionObserver' in window) {
      var vedetta = new IntersectionObserver(function (voci) {
        if (!voci[0].isIntersecting) return;
        vedetta.disconnect();
        entraInScena();
      }, { threshold: 0.6 });
      vedetta.observe(dialogo);
    } else {
      entraInScena();
    }
  }

  if (!menoMoto) {
    Array.prototype.forEach.call(document.querySelectorAll('.ml-dialogo'), recita);
  }

  // ── I FUMETTI, STRETTI QUANTO IL TESTO ────────────────────────────────
  // Un paragrafo che va a capo si prende tutta la larghezza che gli si dà,
  // anche se le sue righe sono più corte: il riquadro restava con un vuoto a
  // destra. Qui si misura la riga più lunga delle battute vere e il fumetto
  // si stringe su di lei. Le righe le ha già bilanciate il foglio di stile
  // (`text-wrap: balance`), così si stringe su righe pari. Si rimisura quando
  // cambia la lingua, la finestra, o arriva il carattere vero.
  //
  // Le righe partono tutte dal bordo sinistro della battuta (testo a
  // sinistra): la più lunga è quella che arriva più a destra.
  //
  // ⚠️ SI PUÒ MISURARE MENTRE IL RIQUADRO SI APRE, cioè sotto uno `scale()`:
  // i rettangoli arrivano schiacciati. Si dividono per la scala del momento,
  // letta confrontando la misura a video con quella d'impaginazione
  // (`offsetWidth`, che la trasformazione non tocca). E a fine apertura si
  // rimisura comunque.
  function abbraccia(fumetto) {
    var battute = fumetto.querySelectorAll('.ml-battuta:not(.ml-copia)');
    if (!battute.length) return;
    fumetto.style.width = '';
    var scala = fumetto.getBoundingClientRect().width / (fumetto.offsetWidth || 1);
    if (!scala) return;
    var riga = 0;
    Array.prototype.forEach.call(battute, function (b) {
      var sinistra = b.getBoundingClientRect().left;
      // Solo i pezzi di testo: un gruppo che va a capo per conto suo
      // (`.ml-riga`) ha una scatola larga quanto tutto il posto, e misurato
      // intero terrebbe il riquadro spalancato.
      var passi = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
      var r = document.createRange();
      while (passi.nextNode()) {
        r.selectNodeContents(passi.currentNode);
        Array.prototype.forEach.call(r.getClientRects(), function (q) {
          riga = Math.max(riga, (q.right - sinistra) / scala);
        });
      }
    });
    if (!riga) return;
    // Imbottitura e bordo: la misura va data al riquadro intero
    // (border-box, v. styles.css).
    var intorno = fumetto.offsetWidth - battute[0].offsetWidth;
    fumetto.style.width = Math.ceil(riga + intorno + 1) + 'px';
  }

  var fumetti = Array.prototype.slice.call(document.querySelectorAll('.ml-dialogo .ml-fumetto'));
  fumetti.forEach(function (fumetto) {
    abbraccia(fumetto);
    var lingua = new MutationObserver(function () { abbraccia(fumetto); });
    Array.prototype.forEach.call(fumetto.querySelectorAll('.ml-battuta'), function (b) {
      lingua.observe(b, { childList: true, characterData: true, subtree: true });
    });
    // Solo la fine dell'apertura del riquadro: anche le lettere, comparendo,
    // mandano la loro fine d'animazione fin qui.
    fumetto.addEventListener('animationend', function (e) {
      if (e.target === fumetto) abbraccia(fumetto);
    });
  });
  window.addEventListener('resize', function () { fumetti.forEach(abbraccia); });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { fumetti.forEach(abbraccia); });
  }

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

    // ⚠️ LA SEZIONE AllergiApp SI MONTA TUTTA INSIEME, non un pezzo alla
    // volta. I suoi ritardi — due secondi e mezzo abbondanti, nel foglio di
    // stile — sono scritti per il dialogo del piatto, e contano da quando il
    // piatto comincia a parlare. Lasciando che ogni pezzo partisse quando
    // entra in vista lui, in una sezione alta due schermate ognuno contava da
    // un momento suo: i pezzi arrivavano sconnessi dal dialogo e l'uno
    // dall'altro, e alcuni tre secondi dopo che li stavi già guardando. Il via
    // è uno solo, ed è quello del fumetto.
    var sezione = document.querySelector('.ml-app');
    var viaSezione = sezione && sezione.querySelector('.ml-dialogo');
    var pezziSezione = viaSezione
      ? Array.prototype.slice.call(sezione.querySelectorAll('.anim-ready'))
      : [];

    if (pezziSezione.length) {
      var insieme = new IntersectionObserver(function (voci) {
        if (!voci[0].isIntersecting) return;
        insieme.disconnect();
        pezziSezione.forEach(function (el) { el.classList.add('anim-done'); });
      }, { threshold: 0.6 });
      insieme.observe(viaSezione);
    }

    document.querySelectorAll('.anim-ready').forEach(function (el) {
      if (pezziSezione.indexOf(el) !== -1) return;
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

  // Nessuna comparsa in ritardo: nella stessa schermata parla il piatto
  // dello spoiler, e una scritta che arriva da sola lo disturbava (v. il
  // foglio di stile, `.ml-hint`).
  if (pastiglia) pastiglia.classList.add('is-1');

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
