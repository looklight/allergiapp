'use client';

// Il comportamento da tastiera comune a tutte le finestre del portale: si
// chiude con Esc, il fuoco entra dentro quando si apre, col Tab non ne esce
// finché è aperta, e torna dov'era quando si chiude.
//
// Senza, chi naviga da tastiera apre una finestra e continua a muoversi nella
// pagina dietro, che nel frattempo è coperta: preme Invio e attiva qualcosa
// che non sta vedendo.
import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// ------------------------------------------------------------------
// LE FINESTRE APERTE, IN PILA
//
// Le finestre si ANNIDANO: il ritaglio della foto sta dentro la maschera del
// piatto, il foglio di dettaglio dentro l'anteprima a telefono. Ognuna
// ascoltava per conto suo su window, e siccome sono due ascoltatori sullo
// stesso posto un Esc partiva a tutte e due: si chiudeva il ritaglio E la
// maschera che c'era sotto, buttando via nome, allergeni e traduzioni appena
// scritti — senza chiedere niente. (Il ritaglio disabilita apposta la
// chiusura col clic fuori per non perdere la scelta appena fatta: l'Esc la
// portava via lo stesso, e in più si portava via il resto.)
//
// Quindi si tiene la pila di quelle aperte e a rispondere è solo l'ultima.
// Vale anche per il Tab: una finestra annidata è figlia nel DOM di quella che
// la contiene, quindi la trappola di sotto conta anche gli elementi di sopra
// e lascerebbe tabulare dal ritaglio dentro la maschera coperta.
// ------------------------------------------------------------------
const pila: object[] = [];

// La parte minima: iscrive la finestra alla pila per il tempo che resta
// aperta e la fa chiudere con Esc, ma solo se è lei quella in cima.
// Sta da sola perché non tutte le finestre vogliono il resto: il foglio di
// dettaglio dentro l'anteprima non deve bloccare lo scorrimento della pagina
// del PORTALE, perché quello che sta coprendo è lo schermo simulato del
// cliente. Restituisce come chiedere, in un dato istante, se tocca a lei.
export function useEscape(onClose: () => void): () => boolean {
  // La chiusura arriva quasi sempre come funzione scritta al volo, diversa a
  // ogni render: tenerla in un ref evita che l'effetto riparta di continuo
  // rimandando il fuoco all'inizio mentre si sta ancora compilando.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Un oggetto qualsiasi: serve solo a riconoscersi dentro la pila
  const io = useRef({});
  const inCima = useCallback(() => pila[pila.length - 1] === io.current, []);

  useEffect(() => {
    const me = io.current;
    pila.push(me);

    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Escape') return;
      if (pila[pila.length - 1] !== me) return;
      close.current();
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      const dove = pila.indexOf(me);
      if (dove >= 0) pila.splice(dove, 1);
    };
  }, []);

  return inCima;
}

// Il ref va sul PANNELLO, non sullo sfondo scuro: è il pannello la finestra,
// e lo sfondo serve solo a chiuderla col clic fuori.
export function useModal<T extends HTMLElement>(onClose: () => void) {
  const panel = useRef<T>(null);
  const inCima = useEscape(onClose);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;

    // La pagina dietro non deve scorrere sotto la finestra aperta: girare la
    // rotella e vedere muoversi qualcosa che non si sta guardando è il modo
    // più rapido di far sembrare rotta un'interfaccia. La barra di scorrimento
    // che sparisce lascerebbe il suo posto vuoto e la pagina salterebbe di
    // lato: il padding la sostituisce per il tempo che la finestra è aperta.
    // Con due finestre annidate la seconda non trova più nessuna barra da
    // sostituire (l'ha già tolta la prima) e non tocca niente: al ritorno
    // ognuna rimette quello che aveva trovato.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    const items = () => [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    // Il primo elemento su cui si può agire; se non ce n'è, il pannello stesso.
    // preventScroll perché il pannello entra animato da fuori schermo: dare il
    // fuoco a qualcosa che è ancora là fuori farebbe rincorrere la pagina.
    (items()[0] ?? panel.current)?.focus({ preventScroll: true });

    // Esc lo gestisce useEscape: qui resta la trappola del Tab, che vale solo
    // per la finestra in cima (v. la pila qui sopra)
    function onKey(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !inCima()) return;
      const focusable = items();
      if (focusable.length === 0) return;
      // Arrivati all'ultimo si riparte dal primo, e all'indietro viceversa
      const edge = e.shiftKey ? focusable[0] : focusable[focusable.length - 1];
      if (document.activeElement === edge) {
        e.preventDefault();
        (e.shiftKey ? focusable[focusable.length - 1] : focusable[0]).focus();
      }
    }

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
      previous?.focus();
    };
  }, [inCima]);

  return panel;
}
