// Il comportamento del menù al tavolo: il filtro e i due fogli.
//
// La pagina arriva INTERA dal server, dettagli dei piatti compresi: qui non si
// costruisce niente, si accende, si spegne e si sposta. È la ragione per cui
// il menù si legge anche in una sala interrata con due tacche — e per cui il
// filtro risponde all'istante invece di chiedere qualcosa alla rete.
//
// IL FILTRO RIORDINA, NON NASCONDE (DIGITAL_MENU.md, Tema 2): il piatto che
// non va bene sbiadisce, scende in fondo alla sua sezione e dice PERCHÉ.
// Nasconderlo direbbe che quello che resta è stato verificato, e il dato lo
// dichiara il ristorante.
(function () {
  'use strict';

  var scelte = { allergens: [], diets: [] };

  var filtro = document.getElementById('menu-filter');
  var contatore = document.getElementById('menu-filter-count');
  var pastiglia = document.getElementById('menu-filter-badge');
  var pannello = document.getElementById('menu-filter-sheet');
  var foglioPiatto = document.getElementById('menu-dish-sheet');
  var corpoPiatto = document.getElementById('menu-dish-body');
  var totale = filtro ? Number(filtro.dataset.total || 0) : 0;

  // I testi arrivano dal server già tradotti: qui non c'è nessun dizionario,
  // e la lingua della pagina non può divergere da quella dei messaggi.
  var testi = window.__MENU_TEXTS__ || {};

  function codici(el, attributo) {
    var raw = el.getAttribute(attributo) || '';
    return raw === '' ? [] : raw.split(',');
  }

  // Perché un piatto è finito in fondo. Vuoto = va bene per chi guarda.
  //
  // ⚠️ "non dichiarato vegetariano" NON vuol dire "non è vegetariano": per
  // questo la riga non sparisce e il testo dice "non indicato per", che è
  // quello che sappiamo davvero.
  function esclusione(item) {
    var suoi = codici(item, 'data-allergens');
    var sue = codici(item, 'data-diets');
    return {
      contiene: scelte.allergens.filter(function (c) { return suoi.indexOf(c) >= 0; }),
      nonPer: scelte.diets.filter(function (c) { return sue.indexOf(c) < 0; }),
    };
  }

  function etichetta(kind, code) {
    var mappa = (testi.labels || {})[kind] || {};
    return (mappa[code] || code).toLowerCase();
  }

  function riga(lista, kind) {
    return lista
      .map(function (c) { return etichetta(kind, c); })
      .join(', ');
  }

  function aggiorna() {
    var scelti = scelte.allergens.length + scelte.diets.length;
    var adatti = 0;

    document.querySelectorAll('.menu-section').forEach(function (sezione) {
      var lista = sezione.querySelector('.menu-items');
      if (!lista) return;
      var dentro = [];
      var fuori = [];

      lista.querySelectorAll('.menu-item').forEach(function (item) {
        var perche = esclusione(item);
        var escluso = perche.contiene.length > 0 || perche.nonPer.length > 0;
        item.classList.toggle('is-off', escluso);

        var motivo = item.querySelector('.menu-item-reason');
        var allergeni = item.querySelector('.menu-item-allergens');
        if (motivo) {
          if (escluso) {
            // Col filtro acceso il motivo prende il posto dell'elenco intero:
            // chi ha appena toccato "senza glutine" vuole sapere perché QUESTO
            // piatto è in fondo, non rileggersi tutti i suoi allergeni.
            var pezzi = [];
            if (perche.contiene.length > 0) {
              pezzi.push(testi.contains.replace('{list}', riga(perche.contiene, 'allergens')));
            }
            if (perche.nonPer.length > 0) {
              pezzi.push(testi.notFor.replace('{list}', riga(perche.nonPer, 'diets')));
            }
            motivo.textContent = pezzi.join(' · ');
            motivo.hidden = false;
            if (allergeni) allergeni.hidden = true;
          } else {
            motivo.hidden = true;
            motivo.textContent = '';
            if (allergeni) allergeni.hidden = false;
          }
        }

        if (escluso) fuori.push(item); else { dentro.push(item); adatti++; }
      });

      // Riordino: gli esclusi in fondo, gli altri nell'ordine del ristoratore.
      // Si riscrive la lista solo se è cambiata davvero, o a ogni tocco il
      // browser rifarebbe il lavoro per niente.
      var voluto = dentro.concat(fuori);
      var attuale = Array.prototype.slice.call(lista.children);
      var uguale = voluto.length === attuale.length && voluto.every(function (el, i) {
        return el === attuale[i];
      });
      if (!uguale) voluto.forEach(function (el) { lista.appendChild(el); });
    });

    // Le pastiglie accese risalgono in testa alla fila. È la regola che tiene
    // insieme il pannello e la fila: senza, si sceglie dal pannello, si
    // chiude, il menù si riordina sotto gli occhi e il motivo è fuori schermo
    // a destra — un effetto senza la sua causa.
    var fila = document.getElementById('menu-pills');
    if (fila) {
      var pastiglie = Array.prototype.slice.call(fila.children);
      var accese = pastiglie.filter(function (p) { return p.getAttribute('aria-pressed') === 'true'; });
      var spente = pastiglie.filter(function (p) { return p.getAttribute('aria-pressed') !== 'true'; });
      accese.concat(spente).forEach(function (p) { fila.appendChild(p); });
    }

    if (pastiglia) {
      pastiglia.textContent = scelti > 0 ? String(scelti) : '';
      pastiglia.hidden = scelti === 0;
    }
    if (contatore) {
      contatore.hidden = scelti === 0;
      if (scelti > 0) {
        var modello = adatti === 1 ? testi.summaryOne : testi.summary;
        contatore.textContent = modello
          .replace('{matching}', String(adatti))
          .replace('{total}', String(totale));
      }
    }
  }

  // La stessa pastiglia esiste due volte — nella fila e nel pannello — e le
  // due devono restare d'accordo: si cerca per codice, non per elemento.
  function sincronizza() {
    document.querySelectorAll('.menu-pill').forEach(function (p) {
      var kind = p.dataset.kind;
      var on = scelte[kind] && scelte[kind].indexOf(p.dataset.code) >= 0;
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  document.addEventListener('click', function (e) {
    var p = e.target.closest ? e.target.closest('.menu-pill') : null;
    if (!p) return;
    var kind = p.dataset.kind;
    var code = p.dataset.code;
    if (!scelte[kind]) return;
    var i = scelte[kind].indexOf(code);
    if (i >= 0) scelte[kind].splice(i, 1); else scelte[kind].push(code);
    sincronizza();
    aggiorna();
  });

  var apri = document.getElementById('menu-filter-open');
  if (apri && pannello) {
    apri.addEventListener('click', function () { pannello.hidden = false; });
  }
  var azzera = document.getElementById('menu-filter-reset');
  if (azzera) {
    azzera.addEventListener('click', function () {
      scelte = { allergens: [], diets: [] };
      sincronizza();
      aggiorna();
    });
  }

  // Il dettaglio del piatto: il contenuto sta già dentro la riga, nascosto in
  // un <template>. Qui si copia nel foglio, segnando in rosso gli allergeni
  // che il cliente ha escluso — così sa subito qual è quello che lo riguarda.
  document.addEventListener('click', function (e) {
    var row = e.target.closest ? e.target.closest('.menu-item-row') : null;
    if (!row || !foglioPiatto || !corpoPiatto) return;
    var item = row.closest('.menu-item');
    var modello = item ? item.querySelector('template.menu-detail') : null;
    if (!modello) return;
    corpoPiatto.innerHTML = '';
    corpoPiatto.appendChild(modello.content.cloneNode(true));
    corpoPiatto.querySelectorAll('.menu-chip[data-kind="allergens"]').forEach(function (chip) {
      if (scelte.allergens.indexOf(chip.dataset.code) >= 0) chip.classList.add('is-hit');
    });
    foglioPiatto.hidden = false;
  });

  // Chiudere: il tocco fuori dal pannello, e Esc per chi è su un computer.
  // Il tocco DENTRO non chiude, o scegliendo una pastiglia nel pannello il
  // pannello si chiuderebbe da solo.
  document.querySelectorAll('.menu-sheet').forEach(function (foglio) {
    foglio.addEventListener('click', function (e) {
      if (e.target === foglio) foglio.hidden = true;
    });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.menu-sheet').forEach(function (foglio) { foglio.hidden = true; });
  });
})();
