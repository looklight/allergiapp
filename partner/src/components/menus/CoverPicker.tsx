'use client';

// LA COPERTINA DEL MENÙ: l'immagine dietro l'intestazione, al posto del
// colore pieno.
//
// ⚠️ SOTTO CI VA SEMPRE UNA VELATURA SCURA, e non è una scelta di gusto: il
// nome del locale è bianco, e sopra una foto chiara — una sala luminosa, un
// piatto di pasta — sparisce. È lo stesso motivo per cui le tinte le
// scegliamo noi (DIGITAL_MENU.md, Temi 8 e 25). Chi la toglie rende
// illeggibile l'unica cosa che il cliente legge per forza.
//
// Il ritaglio è LARGO E BASSO (3:1): è una fascia in cima allo schermo di un
// telefono, non una fotografia da guardare. Più alta mangerebbe il menù, che
// è la ragione per cui il cliente ha inquadrato il QR.
import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { COPERTINA_RATIO, MAX_FILE_BYTES, PhotoError, uploadCover, type Crop } from '@/lib/photos';
import PhotoCropDialog from '../PhotoCropDialog';

export default function CoverPicker({
  coverUrl,
  accent,
  onChange,
}: {
  coverUrl: string;
  // il colore del locale: è quello che si vede quando la copertina non c'è,
  // e va mostrato qui perché è l'alternativa vera
  accent: string;
  onChange: (coverUrl: string) => void;
}) {
  const { d } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const [daRitagliare, setDaRitagliare] = useState<File | null>(null);
  const [caricamento, setCaricamento] = useState(false);
  const [errore, setErrore] = useState<'read' | 'upload' | 'size' | null>(null);

  function scegli(scelto: File) {
    setErrore(null);
    if (scelto.size > MAX_FILE_BYTES) {
      setErrore('size');
      return;
    }
    setDaRitagliare(scelto);
  }

  async function carica(scelto: File, crop: Crop) {
    setDaRitagliare(null);
    setCaricamento(true);
    try {
      onChange(await uploadCover(scelto, crop));
    } catch (e) {
      setErrore(e instanceof PhotoError ? e.kind : 'upload');
    } finally {
      setCaricamento(false);
    }
  }

  const messaggio =
    errore === 'size'
      ? d.menuEditor.logoTooBig
      : errore === 'read'
        ? d.menuEditor.logoUnreadable
        : errore === 'upload'
          ? d.menuEditor.coverFailed
          : null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-500">{d.menuEditor.cover}</p>

      {daRitagliare !== null && (
        <PhotoCropDialog
          file={daRitagliare}
          ratio={COPERTINA_RATIO}
          onConfirm={(crop) => carica(daRitagliare, crop)}
          onCancel={() => setDaRitagliare(null)}
          onUnreadable={() => {
            setDaRitagliare(null);
            setErrore('read');
          }}
        />
      )}

      {/* Il riquadro mostra quello che si vedrà DAVVERO, velatura compresa:
          scegliere una copertina guardandola pulita e poi trovarla scurita nel
          menù sarebbe una sorpresa, e per giunta al ristoratore sembrerebbe un
          difetto nostro. Senza copertina si vede il colore, che è
          l'alternativa vera. */}
      <div
        className="relative mt-2 flex h-16 items-center justify-center overflow-hidden rounded-lg bg-cover bg-center"
        style={
          coverUrl === ''
            ? { backgroundColor: accent }
            : {
                backgroundImage: `linear-gradient(rgba(0,0,0,0.45), rgba(0,0,0,0.6)), url(${coverUrl})`,
              }
        }
      >
        <span className="text-sm font-semibold text-white drop-shadow">
          {caricamento ? d.menuEditor.logoLoading : d.menuEditor.coverSample}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={() => file.current?.click()}
          disabled={caricamento}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          {coverUrl === '' ? d.menuEditor.coverAdd : d.menuEditor.logoReplace}
        </button>
        {coverUrl !== '' && !caricamento && (
          <button
            onClick={() => {
              setErrore(null);
              onChange('');
            }}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:text-red-700"
          >
            {d.menuEditor.logoRemove}
          </button>
        )}
      </div>

      {messaggio !== null && <p className="mt-1 text-[11px] text-red-600">{messaggio}</p>}

      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const scelto = e.target.files?.[0];
          if (scelto) scegli(scelto);
          // Azzerare il campo: riscegliendo LO STESSO file il browser non
          // scatterebbe un secondo change, e sembrerebbe non aver funzionato
          e.target.value = '';
        }}
      />
    </div>
  );
}
