'use client';

// Il messaggio che rende reversibile un'eliminazione per qualche secondo.
//
// Si prende il fuoco quando appare: è la conseguenza diretta di un gesto
// appena fatto, e soprattutto è l'unica strada per tornare indietro. Chi
// naviga da tastiera altrimenti resterebbe col fuoco su un bottone che
// nel frattempo è sparito insieme alla riga, e non saprebbe nemmeno che
// c'è un annulla da raggiungere prima che scada.
import { useEffect, useRef } from 'react';

// Quanto resta annullabile un'eliminazione
const UNDO_MS = 8000;

export default function UndoToast({
  message,
  undoLabel,
  onUndo,
  onExpire,
  returnFocusTo,
}: {
  message: string;
  undoLabel: string;
  onUndo: () => void;
  onExpire: () => void;
  // dove mandare il fuoco quando il toast se ne va: la riga da cui era
  // partito non esiste più, quindi serve un punto fermo della pagina
  returnFocusTo?: React.RefObject<HTMLElement | null>;
}) {
  const toast = useRef<HTMLDivElement>(null);
  const undoButton = useRef<HTMLButtonElement>(null);
  // La scadenza arriva come funzione scritta al volo, diversa a ogni render:
  // tenerla in un ref evita che il conto alla rovescia riparta da capo
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });

  useEffect(() => {
    const node = toast.current;
    undoButton.current?.focus();
    const timer = setTimeout(() => expire.current(), UNDO_MS);
    return () => {
      clearTimeout(timer);
      // Se il fuoco è ancora qui dentro, il toast sta per sparire da sotto:
      // va riportato su un punto fermo, non lasciato cadere sulla pagina.
      // L'ancora si legge adesso e non all'inizio apposta: qual è il punto
      // fermo dipende da com'è la pagina in questo momento (eliminando
      // l'ultimo piatto la barra sparisce e resta il bottone dello stato vuoto).
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (node?.contains(document.activeElement)) returnFocusTo?.current?.focus();
    };
  }, [returnFocusTo]);

  return (
    <div
      ref={toast}
      role="status"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-xl bg-gray-900 px-4 py-3 shadow-lg"
    >
      <span className="text-sm text-white">{message}</span>
      <button
        ref={undoButton}
        onClick={onUndo}
        className="rounded-lg text-sm font-medium text-white underline underline-offset-2 transition-opacity hover:opacity-80"
      >
        {undoLabel}
      </button>
    </div>
  );
}
