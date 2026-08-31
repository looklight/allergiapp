'use client';

// Le manopole dell'aspetto: un logo e un colore, e basta (Tema 8). Non c'è un
// selettore di colore libero — le tinte le abbiamo scelte noi, tutte scure
// abbastanza da reggere il testo, perché un menù venduto come leggibile da
// chi ha un'allergia non può lasciar scegliere beige su panna.
import { useRef } from 'react';
import { useI18n } from '@/lib/i18n';
import { DEFAULT_LOGO, MENU_ACCENTS, accentHex, logoDataUrl, type MenuBrand } from '@/lib/menuBrand';

export default function BrandBar({
  brand,
  onChange,
}: {
  brand: MenuBrand;
  onChange: (next: Partial<MenuBrand>) => void;
}) {
  const { d, locale } = useI18n();
  const file = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{d.menuEditor.brandTitle}</h2>
      {/* Che valga per tutti i menù del locale va detto QUI: si cambia da
          dentro un menù, e senza avviso sembrerebbe una scelta di questo */}
      <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.brandHint}</p>

      {/* Il nome viene per primo perché è l'unico obbligatorio: senza, in
          cima al menù non c'è niente da leggere. È anche l'unica fonte
          possibile — senza claim non esiste nessun altro posto da cui
          prenderlo, ed è da qui che uscirà lo slug dell'indirizzo. */}
      <div className="mt-3">
        <input
          type="text"
          value={brand.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder={d.menuEditor.venueNamePlaceholder}
          aria-label={d.menuEditor.venueNameLabel}
          className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-3">
        <div className="flex items-center gap-2.5">
          {/* Si mostra quello che comparirà davvero, non un segnaposto
              tratteggiato: senza logo proprio è quello di AllergiApp, e
              vederlo qui è come si scopre che c'è */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoUrl || DEFAULT_LOGO}
            alt={d.menuEditor.logoAlt}
            className={`h-11 w-11 rounded-full border object-cover ${
              brand.logoUrl === '' ? 'border-dashed border-gray-300' : 'border-gray-200'
            }`}
          />
          <div className="flex flex-col items-start gap-0.5">
            <button
              onClick={() => file.current?.click()}
              className="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
            >
              {brand.logoUrl === '' ? d.menuEditor.logoAdd : d.menuEditor.logoReplace}
            </button>
            {brand.logoUrl !== '' ? (
              <button
                onClick={() => onChange({ logoUrl: '' })}
                className="text-xs text-gray-400 transition-colors hover:text-red-600"
              >
                {d.menuEditor.logoRemove}
              </button>
            ) : (
              <span className="text-xs text-gray-400">{d.menuEditor.logoDefaultHint}</span>
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
                  .then((logoUrl) => onChange({ logoUrl }))
                  .catch((errore) => console.error('[partner] logo:', errore));
              }
              // Azzerare il campo: scegliendo di nuovo LO STESSO file il
              // browser non scatterebbe un secondo change, e sembrerebbe che
              // il caricamento non abbia funzionato
              e.target.value = '';
            }}
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{d.menuEditor.accent}</span>
          <div className="flex gap-1.5">
            {MENU_ACCENTS.map((colore) => {
              const scelto = brand.accent === colore.code;
              return (
                <button
                  key={colore.code}
                  onClick={() => onChange({ accent: colore.code })}
                  aria-label={colore[locale]}
                  title={colore[locale]}
                  aria-pressed={scelto}
                  // L'anello sta FUORI dalla pastiglia (offset) e non dentro:
                  // un bordo bianco interno mangerebbe il colore proprio nella
                  // pastiglia scelta, cioè quella che si sta guardando
                  className={`h-7 w-7 rounded-full transition-shadow ${
                    scelto ? 'ring-2 ring-gray-900 ring-offset-2' : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                  }`}
                  style={{ backgroundColor: accentHex(colore.code) }}
                />
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
