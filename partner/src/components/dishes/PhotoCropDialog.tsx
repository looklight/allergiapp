'use client';

// Dove si sceglie quale quadrato tenere, prima di caricare.
//
// Il ritaglio è DISTRUTTIVO e definitivo: non teniamo l'originale, e sul piano
// gratuito non esiste una trasformazione lato server che permetta di
// ripensarci. Quello che si esclude qui è perso, quindi va mostrato mentre si
// può ancora scegliere — ritagliare dal centro di nascosto è il modo classico
// di tagliare mezza portata a una foto scattata di traverso.
//
// Un asse solo, e non è una semplificazione: il quadrato che prendiamo è il
// più grande che ci sta dentro, quindi sul lato corto è già tutto dentro e
// l'unico grado di libertà è scorrere lungo il lato lungo. Niente zoom,
// niente maniglie, niente proporzioni da scegliere.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';

// Di quanto si sposta il ritaglio a ogni freccia della tastiera: due
// centesimi della corsa, cioè una cinquantina di passi da un capo all'altro
const PASSO_TASTIERA = 0.02;

export default function PhotoCropDialog({
  file,
  onConfirm,
  onCancel,
  onUnreadable,
}: {
  file: File;
  // posizione: 0 = tutto a sinistra (o in alto), 1 = tutto a destra (in basso),
  // 0.5 = il centro, che è da dove si parte
  onConfirm: (posizione: number) => void;
  onCancel: () => void;
  // il file non è un'immagine che il browser sappia aprire
  onUnreadable: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const [src, setSrc] = useState<string | null>(null);
  const [dimensioni, setDimensioni] = useState<{ w: number; h: number } | null>(null);
  const [posizione, setPosizione] = useState(0.5);
  const cornice = useRef<HTMLDivElement>(null);
  // Da dove è partito il trascinamento: il punto toccato e il ritaglio di
  // allora. Serve perché lo spostamento è relativo, non assoluto — altrimenti
  // il quadrato salterebbe sotto il dito al primo movimento.
  const partenza = useRef<{ punto: number; posizione: number } | null>(null);

  // L'indirizzo temporaneo del file va restituito, o resta appeso alla pagina
  // per tutta la sua vita
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const orizzontale = dimensioni !== null && dimensioni.w >= dimensioni.h;
  // Quanto occupa il quadrato sul lato lungo, in frazione: è il rapporto fra i
  // due lati. Tenendo tutto in frazioni non serve misurare nessun pixel, e il
  // conto resta giusto a qualunque grandezza si veda la foto.
  const quota = dimensioni === null
    ? 1
    : orizzontale
      ? dimensioni.h / dimensioni.w
      : dimensioni.w / dimensioni.h;
  // Quanto si può scorrere. Zero su una foto già quadrata: niente da scegliere.
  const corsa = 1 - quota;
  const scorrevole = corsa > 0.001;
  const inizio = posizione * corsa;

  function sposta(e: React.PointerEvent<HTMLDivElement>) {
    if (!scorrevole || partenza.current === null) return;
    const rect = cornice.current?.getBoundingClientRect();
    if (!rect) return;
    const lato = orizzontale ? rect.width : rect.height;
    const punto = orizzontale ? e.clientX : e.clientY;
    const delta = (punto - partenza.current.punto) / (lato * corsa);
    setPosizione(Math.min(1, Math.max(0, partenza.current.posizione + delta)));
  }

  function daTastiera(e: React.KeyboardEvent) {
    if (!scorrevole) return;
    const indietro = orizzontale ? 'ArrowLeft' : 'ArrowUp';
    const avanti = orizzontale ? 'ArrowRight' : 'ArrowDown';
    if (e.key !== indietro && e.key !== avanti) return;
    e.preventDefault();
    const verso = e.key === avanti ? 1 : -1;
    setPosizione((p) => Math.min(1, Math.max(0, p + verso * PASSO_TASTIERA)));
  }

  // Le due fasce in ombra sono ciò che si perde: si disegnano ai lati del
  // quadrato, e su una foto quadrata non esistono proprio.
  const primaFascia = orizzontale
    ? { left: 0, top: 0, bottom: 0, width: `${inizio * 100}%` }
    : { left: 0, right: 0, top: 0, height: `${inizio * 100}%` };
  const secondaFascia = orizzontale
    ? { right: 0, top: 0, bottom: 0, width: `${(corsa - inizio) * 100}%` }
    : { left: 0, right: 0, bottom: 0, height: `${(corsa - inizio) * 100}%` };
  const quadrato = orizzontale
    ? { left: `${inizio * 100}%`, width: `${quota * 100}%`, top: 0, bottom: 0 }
    : { top: `${inizio * 100}%`, height: `${quota * 100}%`, left: 0, right: 0 };

  return (
    // Il clic sullo sfondo NON chiude, al contrario delle altre finestre:
    // trascinando il ritaglio si finisce spesso col rilasciare fuori dal
    // riquadro, e quel clic butterebbe via la scelta appena fatta. Restano Esc
    // e Annulla, che sono gesti voluti.
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div className="backdrop-enter absolute inset-0 bg-black/60" />
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={d.editor.cropTitle}
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col gap-3 overflow-hidden rounded-2xl bg-white p-4 shadow-xl outline-none"
      >
        <p className="text-sm font-medium text-gray-900">{d.editor.cropTitle}</p>

        <div ref={cornice} className="relative mx-auto select-none">
          {src !== null && (
            <img
              src={src}
              alt=""
              onLoad={(e) =>
                setDimensioni({
                  w: e.currentTarget.naturalWidth,
                  h: e.currentTarget.naturalHeight,
                })
              }
              onError={onUnreadable}
              draggable={false}
              className="block max-h-[50vh] max-w-full"
            />
          )}

          {dimensioni !== null && scorrevole && (
            <>
              <div className="pointer-events-none absolute bg-black/55" style={primaFascia} />
              <div className="pointer-events-none absolute bg-black/55" style={secondaFascia} />
            </>
          )}

          {dimensioni !== null && (
            <div
              role={scorrevole ? 'slider' : undefined}
              aria-label={scorrevole ? d.editor.cropTitle : undefined}
              aria-orientation={scorrevole ? (orizzontale ? 'horizontal' : 'vertical') : undefined}
              aria-valuemin={scorrevole ? 0 : undefined}
              aria-valuemax={scorrevole ? 100 : undefined}
              aria-valuenow={scorrevole ? Math.round(posizione * 100) : undefined}
              tabIndex={scorrevole ? 0 : -1}
              onKeyDown={daTastiera}
              onPointerDown={(e) => {
                if (!scorrevole) return;
                partenza.current = {
                  punto: orizzontale ? e.clientX : e.clientY,
                  posizione,
                };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={sposta}
              onPointerUp={() => {
                partenza.current = null;
              }}
              onPointerCancel={() => {
                partenza.current = null;
              }}
              style={{ ...quadrato, touchAction: 'none' }}
              className={`absolute border-2 border-white outline-none ring-inset focus-visible:ring-2 focus-visible:ring-gray-900 ${
                scorrevole ? (orizzontale ? 'cursor-ew-resize' : 'cursor-ns-resize') : ''
              }`}
            >
              {/* Dove cadrà il cerchio nelle liste: il quadrato è quello che si
                  salva, il cerchio è solo come lo si vedrà quasi sempre */}
              <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-white/70" />
            </div>
          )}
        </div>

        <p className="text-xs text-gray-500">
          {scorrevole ? d.editor.cropHint : d.editor.cropHintSquare}
        </p>

        <div className="flex shrink-0 items-center justify-end gap-1">
          <button
            onClick={onCancel}
            className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
          >
            {d.common.cancel}
          </button>
          <button
            onClick={() => onConfirm(posizione)}
            disabled={dimensioni === null}
            className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700 disabled:opacity-40"
          >
            {d.editor.cropConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
