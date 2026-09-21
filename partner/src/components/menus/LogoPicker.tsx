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
import { useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/lib/i18n';
import { MAX_FILE_BYTES, PhotoError, uploadLogo, type Crop } from '@/lib/photos';
import PhotoCropDialog from '../PhotoCropDialog';

export default function LogoPicker({
  logoUrl,
  onChange,
  // Quello che va appoggiato NELL'ANGOLO IN ALTO A SINISTRA del cerchio —
  // oggi il distintivo Pro, perché al tavolo il logo ci arriva solo con
  // l'abbonamento (migration 718). Sta appoggiato sopra e non in una riga
  // sua: una riga in più sposterebbe il cerchio rispetto al nome, che è
  // esattamente il difetto che questo blocco ha già risolto una volta (v.
  // la didascalia dentro al cerchio, qui sopra).
  //
  // Arriva già confezionato invece che come un sì/no, così il logo non deve
  // sapere niente di abbonamenti né di paywall: sa solo che in quell'angolo
  // ci può stare qualcosa. L'angolo in alto a DESTRA è occupato dalla ✕.
  pro,
}: {
  logoUrl: string;
  onChange: (logoUrl: string) => void;
  pro?: ReactNode;
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
      {/* Sopra alla velatura del "Sostituisci" (z-10): senza, passandoci
          sopra col dito il distintivo finiva sotto e non si premeva più.

          COMPARE AL PASSAGGIO DEL MOUSE (scelta dell'utente, 21/09), con la
          ricetta già usata dal cestino delle righe del catalogo: solo dove
          c'è un puntatore (`[@media(hover:hover)]`), e dove non c'è —
          telefono e tablet — resta visibile, o non ci sarebbe modo di
          trovarlo. È lo stesso momento in cui compaiono la velatura e la ✕,
          quindi l'angolo del logo si accende tutto insieme.

          `group-focus-within` e non `focus-visible` come là: qui a prendere
          il fuoco è il bottone DENTRO, e da spento è comunque raggiungibile
          col tabulatore — senza questa riga si arriverebbe a premere un
          bottone invisibile. */}
      {pro && (
        <span className="absolute -left-1 -top-1 z-10 transition-opacity group-focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
          {pro}
        </span>
      )}
      {/* Si mostra quello che comparirà DAVVERO. Senza logo il cliente non
          vedrà niente (v. MenuPreview), quindi qui non si mette il piattino di
          AllergiApp: sarebbe una promessa che il menù non mantiene. Resta un
          cerchio tratteggiato con un'icona, che è un invito a caricarne uno. */}
      {logoUrl !== '' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={d.menuEditor.logoAlt}
          className="block h-14 w-14 rounded-full border border-gray-200 object-cover"
        />
      ) : (
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="9" cy="9" r="1.6" />
            <path d="M21 15l-5-5-9 9" />
          </svg>
        </span>
      )}
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
