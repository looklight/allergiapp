'use client';

// Dove si sceglie quale quadrato tenere, prima di caricare.
//
// Il ritaglio è DISTRUTTIVO e definitivo: non teniamo l'originale, e sul piano
// gratuito non esiste una trasformazione lato server che permetta di
// ripensarci. Quello che si esclude qui è perso, quindi va mostrato mentre si
// può ancora scegliere — ritagliare dal centro di nascosto è il modo classico
// di tagliare mezza portata a una foto scattata di traverso.
//
// LA STESSA FINESTRA SERVE ANCHE AL LOGO DEL LOCALE (dal 2026-09-02): il logo
// si vede sempre dentro un cerchio, quindi il problema è identico e la
// risposta pure. Da qui nasce anche il perché lo zoom: su un logo largo, il
// quadrato più grande possibile prende sfondo inutile ai lati, e senza potersi
// avvicinare non c'era modo di riempire il cerchio col marchio.
//
// DUE ASSI E UNO ZOOM, e niente di più: nessuna maniglia da afferrare,
// nessuna rotazione. LA PROPORZIONE la decide chi apre la finestra (`ratio`,
// larghezza diviso altezza): 1 per piatti e logo, larga e bassa per la
// copertina del menù. È un parametro e non una seconda finestra, perché il
// gesto è lo stesso e due copie divergerebbero al primo ritocco. Con lo zoom a uno il
// quadrato è il più grande che ci sta dentro e su un asse non c'è margine —
// esattamente il comportamento di prima, che era a un asse solo.
import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useModal } from '@/lib/useModal';
import { CROP_CENTRO, ZOOM_MAX, type Crop } from '@/lib/photos';

// Di quanto si sposta il ritaglio a ogni freccia della tastiera: due
// centesimi della corsa, cioè una cinquantina di passi da un capo all'altro
const PASSO_TASTIERA = 0.02;

// Quanto è fitto il cursore dello zoom. Passi grossi si sentono a scatti su
// un'immagine ferma sotto gli occhi.
const PASSO_ZOOM = 0.05;

export default function PhotoCropDialog({
  file,
  ratio = 1,
  onConfirm,
  onCancel,
  onUnreadable,
}: {
  file: File;
  // larghezza / altezza del ritaglio. 1 = quadrato (piatti, logo)
  ratio?: number;
  // Il quadrato scelto: dove cade sui due assi (0..1) e quanto ci si è
  // avvicinati. Il centro senza ingrandimento è CROP_CENTRO.
  onConfirm: (crop: Crop) => void;
  onCancel: () => void;
  // il file non è un'immagine che il browser sappia aprire
  onUnreadable: () => void;
}) {
  const { d } = useI18n();
  const panel = useModal<HTMLDivElement>(onCancel);
  const [src, setSrc] = useState<string | null>(null);
  const [dimensioni, setDimensioni] = useState<{ w: number; h: number } | null>(null);
  const [crop, setCrop] = useState<Crop>(CROP_CENTRO);
  const cornice = useRef<HTMLDivElement>(null);
  // Da dove è partito il trascinamento: il punto toccato e il ritaglio di
  // allora. Serve perché lo spostamento è relativo, non assoluto — altrimenti
  // il quadrato salterebbe sotto il dito al primo movimento.
  const partenza = useRef<{ x: number; y: number; crop: Crop } | null>(null);

  // L'indirizzo temporaneo del file va restituito, o resta appeso alla pagina
  // per tutta la sua vita
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Il lato del quadrato in frazione di ciascun asse. Tenendo tutto in
  // frazioni non serve misurare nessun pixel, e il conto resta giusto a
  // qualunque grandezza si veda la foto.
  // Il rettangolo più grande con quella proporzione che ci sta dentro: lo
  // limita la larghezza o l'altezza, a seconda di quale "finisce" prima. Con
  // ratio 1 il conto torna al quadrato di prima.
  const pienaW =
    dimensioni === null
      ? 1
      : dimensioni.w / dimensioni.h > ratio
        ? dimensioni.h * ratio
        : dimensioni.w;
  const cropW = pienaW / crop.zoom;
  const cropH = cropW / ratio;
  const quotaX = dimensioni === null ? 1 : cropW / dimensioni.w;
  const quotaY = dimensioni === null ? 1 : cropH / dimensioni.h;
  // Quanto si può scorrere su ciascun asse. Zero sul lato corto quando lo
  // zoom è uno: là non c'è niente da scegliere.
  const corsaX = 1 - quotaX;
  const corsaY = 1 - quotaY;
  const scorrevole = corsaX > 0.001 || corsaY > 0.001;

  function limita(v: number) {
    return Math.min(1, Math.max(0, v));
  }

  function sposta(e: React.PointerEvent<HTMLDivElement>) {
    if (partenza.current === null) return;
    const rect = cornice.current?.getBoundingClientRect();
    if (!rect) return;
    const da = partenza.current;
    // Su un asse senza margine il trascinamento non deve fare niente, e
    // dividere per zero farebbe un salto a fondo corsa
    const dx = corsaX > 0.001 ? (e.clientX - da.x) / (rect.width * corsaX) : 0;
    const dy = corsaY > 0.001 ? (e.clientY - da.y) / (rect.height * corsaY) : 0;
    setCrop((c) => ({ ...c, x: limita(da.crop.x + dx), y: limita(da.crop.y + dy) }));
  }

  function daTastiera(e: React.KeyboardEvent) {
    const passi: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    const passo = passi[e.key];
    if (!passo) return;
    e.preventDefault();
    setCrop((c) => ({
      ...c,
      x: corsaX > 0.001 ? limita(c.x + passo[0] * PASSO_TASTIERA) : c.x,
      y: corsaY > 0.001 ? limita(c.y + passo[1] * PASSO_TASTIERA) : c.y,
    }));
  }

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

        {/* overflow-hidden regge l'ombra fuori dal quadrato, che è disegnata
            con un'ombra larghissima invece che con quattro fasce da tenere
            allineate a mano */}
        <div ref={cornice} className="relative mx-auto select-none overflow-hidden">
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

          {dimensioni !== null && (
            <div
              tabIndex={0}
              aria-label={d.editor.cropTitle}
              onKeyDown={daTastiera}
              onPointerDown={(e) => {
                if (!scorrevole) return;
                partenza.current = { x: e.clientX, y: e.clientY, crop };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={sposta}
              onPointerUp={() => {
                partenza.current = null;
              }}
              onPointerCancel={() => {
                partenza.current = null;
              }}
              style={{
                left: `${crop.x * corsaX * 100}%`,
                top: `${crop.y * corsaY * 100}%`,
                width: `${quotaX * 100}%`,
                height: `${quotaY * 100}%`,
                touchAction: 'none',
                // Tutto ciò che sta fuori dal quadrato è quello che si perde
                boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
              }}
              className={`absolute border-2 border-white outline-none ring-inset focus-visible:ring-2 focus-visible:ring-gray-900 ${
                scorrevole ? 'cursor-move' : ''
              }`}
            >
              {/* Dove cadrà il cerchio nelle liste: il quadrato è quello che
                  si salva, il cerchio è come lo si vedrà quasi sempre. Su un
                  ritaglio non quadrato non ha senso e non c'è. */}
              {ratio === 1 && (
                <div className="pointer-events-none absolute inset-0 rounded-full border border-dashed border-white/70" />
              )}
            </div>
          )}
        </div>

        {/* Lo zoom sta SOTTO l'immagine e non addosso al quadrato: è l'unico
            comando con due estremi, e un cursore vero si usa anche da tastiera
            senza che dobbiamo inventarci niente. */}
        <label className="flex items-center gap-3 text-xs text-gray-500">
          {d.editor.cropZoom}
          <input
            type="range"
            min={1}
            max={ZOOM_MAX}
            step={PASSO_ZOOM}
            value={crop.zoom}
            onChange={(e) => setCrop((c) => ({ ...c, zoom: Number(e.target.value) }))}
            className="min-w-0 flex-1 accent-gray-900"
          />
        </label>

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
            onClick={() => onConfirm(crop)}
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
