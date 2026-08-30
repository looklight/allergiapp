'use client';

// Il comportamento da tastiera comune a tutte le finestre del portale: si
// chiude con Esc, il fuoco entra dentro quando si apre, col Tab non ne esce
// finché è aperta, e torna dov'era quando si chiude.
//
// Senza, chi naviga da tastiera apre una finestra e continua a muoversi nella
// pagina dietro, che nel frattempo è coperta: preme Invio e attiva qualcosa
// che non sta vedendo.
import { useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Il ref va sul PANNELLO, non sullo sfondo scuro: è il pannello la finestra,
// e lo sfondo serve solo a chiuderla col clic fuori.
export function useModal<T extends HTMLElement>(onClose: () => void) {
  const panel = useRef<T>(null);
  // La chiusura arriva quasi sempre come funzione scritta al volo, diversa a
  // ogni render: tenerla in un ref evita che l'effetto riparta di continuo
  // rimandando il fuoco all'inizio mentre si sta ancora compilando.
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;

    // La pagina dietro non deve scorrere sotto la finestra aperta: girare la
    // rotella e vedere muoversi qualcosa che non si sta guardando è il modo
    // più rapido di far sembrare rotta un'interfaccia. La barra di scorrimento
    // che sparisce lascerebbe il suo posto vuoto e la pagina salterebbe di
    // lato: il padding la sostituisce per il tempo che la finestra è aperta.
    const { overflow, paddingRight } = document.body.style;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    const items = () => [...(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])];
    // Il primo elemento su cui si può agire; se non ce n'è, il pannello stesso.
    // preventScroll perché il pannello entra animato da fuori schermo: dare il
    // fuoco a qualcosa che è ancora là fuori farebbe rincorrere la pagina.
    (items()[0] ?? panel.current)?.focus({ preventScroll: true });

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        close.current();
        return;
      }
      if (e.key !== 'Tab') return;
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
  }, []);

  return panel;
}
