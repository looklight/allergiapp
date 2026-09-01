'use client';

// La manopola del colore: e basta (Tema 8). Non c'è un selettore libero — le
// tinte le abbiamo scelte noi, tutte scure abbastanza da reggere il testo,
// perché un menù venduto come leggibile da chi ha un'allergia non può
// lasciar scegliere beige su panna.
//
// Il logo e il nome del locale non sono più qui: il nome è il titolo in cima
// alla pagina, il logo gli sta accanto (LogoPicker) — restano solo il colore
// e la spiegazione che vale per tutti i menù di questo locale.
import { useI18n } from '@/lib/i18n';
import { MENU_ACCENTS, accentHex } from '@/lib/menuBrand';

export default function BrandBar({
  accent,
  onChange,
}: {
  accent: string;
  onChange: (accent: string) => void;
}) {
  const { d, locale } = useI18n();

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="text-sm font-semibold text-gray-900">{d.menuEditor.brandTitle}</h2>
      <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.brandHint}</p>

      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">{d.menuEditor.accent}</span>
        <div className="flex gap-1.5">
          {MENU_ACCENTS.map((colore) => {
            const scelto = accent === colore.code;
            return (
              <button
                key={colore.code}
                onClick={() => onChange(colore.code)}
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
  );
}
