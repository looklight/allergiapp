'use client';

// Il logo del locale: era dentro "Aspetto", ora sta in cima all'editor,
// accanto al nome — nello stesso ordine in cui lo mostra l'anteprima (logo,
// poi nome), alla stessa scala.
//
// La didascalia sta DENTRO al cerchio, su sfondo scurito, e non sotto: fuori
// dal cerchio su un fondo chiaro si leggeva a fatica, e in più occupava uno
// spazio che — anche da invisibile — spostava il logo fuori dal centro
// rispetto al nome (items-center lo allineava contando anche quello).
import { useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_LOGO, logoDataUrl } from '@/lib/menuBrand';

export default function LogoPicker({
  logoUrl,
  onChange,
}: {
  logoUrl: string;
  onChange: (logoUrl: string) => void;
}) {
  const { d } = useI18n();
  const file = useRef<HTMLInputElement>(null);

  return (
    <div className="group relative inline-block shrink-0">
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
      <button
        type="button"
        onClick={() => file.current?.click()}
        aria-label={logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/55 px-1 text-center text-[9px] font-medium leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      >
        {logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
      </button>
      {/* Il "Togli": un badge in un angolo e non una seconda riga dentro il
          cerchio, che a quella taglia di font non ci sarebbe stata */}
      {logoUrl !== '' && (
        <button
          type="button"
          onClick={() => onChange('')}
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
          // Un logo illeggibile non deve far saltare la schermata: si
          // lascia semplicemente quello di prima
          if (scelto) {
            void logoDataUrl(scelto)
              .then((next) => onChange(next))
              .catch((errore) => console.error('[partner] logo:', errore));
          }
          // Azzerare il campo: scegliendo di nuovo LO STESSO file il
          // browser non scatterebbe un secondo change, e sembrerebbe che
          // il caricamento non abbia funzionato
          e.target.value = '';
        }}
      />
    </div>
  );
}
