'use client';

// Il logo del locale: era dentro "Aspetto", ora sta in cima all'editor,
// accanto al nome — nello stesso ordine in cui lo mostra l'anteprima (logo,
// poi nome). Impilato invece che in fila, come nel vecchio riquadro: qui
// condivide la riga col titolo, e una didascalia larga glielo spingerebbe
// fuori dallo schermo.
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
    <div className="group flex shrink-0 flex-col items-center gap-1">
      {/* Si mostra quello che comparirà davvero, non un segnaposto
          tratteggiato: senza logo proprio è quello di AllergiApp, e vederlo
          qui è come si scopre che c'è. Grande quanto il titolo accanto, non
          più la miniatura di prima: è la stessa coppia logo+nome
          dell'anteprima, alla stessa scala. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl || DEFAULT_LOGO}
        alt={d.menuEditor.logoAlt}
        onClick={() => file.current?.click()}
        className={`h-14 w-14 cursor-pointer rounded-full border object-cover transition-opacity hover:opacity-80 ${
          logoUrl === '' ? 'border-dashed border-gray-300' : 'border-gray-200'
        }`}
      />
      {/* La didascalia si vede solo al passaggio: a riposo qui deve restare
          solo il logo, come lo vede il cliente. Su telefono, dove il
          passaggio non esiste, resta sempre visibile — stessa scelta delle
          frecce di MenuItemRow. */}
      <div className="flex items-center gap-1.5 whitespace-nowrap text-[11px] font-medium opacity-100 transition-opacity md:opacity-0 md:group-focus-within:opacity-100 md:group-hover:opacity-100">
        <button
          onClick={() => file.current?.click()}
          className="text-gray-500 transition-colors hover:text-gray-900"
        >
          {logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
        </button>
        {logoUrl !== '' && (
          <>
            <span className="text-gray-300" aria-hidden="true">·</span>
            <button
              onClick={() => onChange('')}
              className="text-gray-400 transition-colors hover:text-red-600"
            >
              {d.menuEditor.logoRemove}
            </button>
          </>
        )}
      </div>
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
