'use client';

// Il logo del locale: era dentro "Aspetto", ora sta in cima all'editor,
// accanto al nome — nello stesso ordine in cui lo mostra l'anteprima (logo,
// poi nome), alla stessa scala.
//
// La didascalia sta DENTRO al cerchio, su sfondo scurito, e non sotto: fuori
// dal cerchio su un fondo chiaro si leggeva a fatica, e in più occupava uno
// spazio che — anche da invisibile — spostava il logo fuori dal centro
// rispetto al nome (items-center lo allineava contando anche quello).
//
// Dal 2026-09-02 il logo è un FILE su Storage e non più un'immagine dentro la
// riga del locale: quindi il caricamento può volerci un attimo e può fallire,
// e tutte e due le cose si vedono — prima il cerchio cambiava e basta, perché
// non usciva niente dal browser.
import { useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_LOGO } from '@/lib/menuBrand';
import { MAX_FILE_BYTES, PhotoError, uploadLogo, type Crop } from '@/lib/photos';
import PhotoCropDialog from '../PhotoCropDialog';

export default function LogoPicker({
  logoUrl,
  onChange,
}: {
  logoUrl: string;
  onChange: (logoUrl: string) => void;
}) {
  const { d } = useI18n();
  const file = useRef<HTMLInputElement>(null);
  const [caricamento, setCaricamento] = useState(false);
  // Il file scelto, in attesa che si dica quale quadrato tenerne. Il logo si
  // vede sempre dentro un cerchio — qui e in cima al menù — quindi un logo
  // largo verrebbe tagliato comunque: tanto vale far scegliere dove, ed è la
  // stessa finestra delle foto dei piatti.
  const [daRitagliare, setDaRitagliare] = useState<File | null>(null);
  // Perché non è andata, con le stesse due categorie delle foto dei piatti:
  // il file non è leggibile (cambia file) oppure non è arrivato (riprova).
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
      onChange(await uploadLogo(scelto, crop));
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
          ? d.menuEditor.logoFailed
          : null;

  return (
    <div className="shrink-0">
      {daRitagliare !== null && (
        <PhotoCropDialog
          file={daRitagliare}
          onConfirm={(crop) => carica(daRitagliare, crop)}
          onCancel={() => setDaRitagliare(null)}
          onUnreadable={() => {
            setDaRitagliare(null);
            setErrore('read');
          }}
        />
      )}
    <div className="group relative inline-block">
      {/* Si mostra quello che comparirà davvero, non un segnaposto
          tratteggiato: senza logo proprio è quello di AllergiApp, e vederlo
          qui è come si scopre che c'è */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || DEFAULT_LOGO}
        alt={d.menuEditor.logoAlt}
        className={`block h-14 w-14 rounded-full border object-cover ${
          logoUrl === '' ? 'border-dashed border-gray-300' : 'border-gray-200'
        }`}
      />
      {/* Mentre il file sale, il cerchio lo dice: senza, si resta davanti al
          logo di prima senza sapere se il clic è servito a qualcosa */}
      {caricamento && (
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/75 text-[9px] font-medium text-gray-600">
          {d.menuEditor.logoLoading}
        </span>
      )}
      <button
        type="button"
        disabled={caricamento}
        onClick={() => file.current?.click()}
        aria-label={logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 px-1 text-center text-[9px] font-medium leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
      </button>
      {/* Il "Togli": un badge in un angolo e non una seconda riga dentro il
          cerchio, che a quella taglia di font non ci sarebbe stata */}
      {logoUrl !== '' && !caricamento && (
        <button
          type="button"
          onClick={() => {
            setErrore(null);
            onChange('');
          }}
          aria-label={d.menuEditor.logoRemove}
          title={d.menuEditor.logoRemove}
          className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-gray-400 opacity-0 shadow ring-1 ring-gray-200 transition-opacity hover:text-red-600 group-hover:opacity-100 group-focus-within:opacity-100"
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
      <input
        ref={file}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const scelto = e.target.files?.[0];
          // Un logo che non si carica non deve far saltare la schermata: si
          // lascia quello di prima e si dice cos'è andato storto
          if (scelto) scegli(scelto);
          // Azzerare il campo: scegliendo di nuovo LO STESSO file il
          // browser non scatterebbe un secondo change, e sembrerebbe che
          // il caricamento non abbia funzionato
          e.target.value = '';
        }}
      />
    </div>
      {messaggio !== null && (
        <p className="mt-1 max-w-[9rem] text-[10px] leading-tight text-red-600">{messaggio}</p>
      )}
    </div>
  );
}
