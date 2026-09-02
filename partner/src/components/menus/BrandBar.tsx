'use client';

// L'ASPETTO DEL MENÙ AL TAVOLO: il colore e le poche manopole che decidono
// quanto è densa la carta.
//
// Le tinte le abbiamo scelte noi e non c'è un selettore libero (Tema 8): sono
// tutte scure abbastanza da reggere il testo, perché un menù venduto come
// leggibile da chi ha un'allergia non può lasciar scegliere beige su panna.
//
// Le due impostazioni sono dello stesso genere: dicono COSA si vede in lista,
// non cambiano nessun dato. Le foto restano sui piatti nel catalogo — qui si
// sceglie soltanto se questa superficie le mostra, e la scheda AllergiApp in
// app continua a mostrarle comunque.
//
// ⚠️ QUELLO CHE QUI NON SI PUÒ SPEGNERE sono gli allergeni sotto ai piatti e
// il filtro: sono la ragione per cui questo menù esiste, e il primo che li
// spegnesse ci toglierebbe il prodotto dalle mani. Chi aggiunge manopole in
// questa scatola si fermi prima di arrivare lì.
//
// Il logo e il nome del locale non sono qui: il nome è il titolo in cima alla
// pagina, il logo gli sta accanto (LogoPicker).
import { useI18n } from '@/lib/i18n';
import { MENU_ACCENTS, accentHex } from '@/lib/menuBrand';

export default function BrandBar({
  accent,
  showPhotos,
  showDescriptions,
  onAccent,
  onShowPhotos,
  onShowDescriptions,
}: {
  accent: string;
  showPhotos: boolean;
  showDescriptions: boolean;
  onAccent: (accent: string) => void;
  onShowPhotos: (value: boolean) => void;
  onShowDescriptions: (value: boolean) => void;
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
                onClick={() => onAccent(colore.code)}
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

      {/* Gli interruttori sotto al colore, staccati da una riga: il colore è
          identità, questi due sono impaginazione. L'effetto si vede
          nell'anteprima accanto, quindi non serve spiegarli a parole più di
          una riga. */}
      <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3">
        <Interruttore
          label={d.menuEditor.showPhotos}
          hint={d.menuEditor.showPhotosHint}
          value={showPhotos}
          onChange={onShowPhotos}
        />
        <Interruttore
          label={d.menuEditor.showDescriptions}
          hint={d.menuEditor.showDescriptionsHint}
          value={showDescriptions}
          onChange={onShowDescriptions}
        />
      </div>
    </div>
  );
}

// Una casella di spunta vera e non un cursore: dice sì/no, si tocca su tutta
// la riga, e da tastiera funziona senza che dobbiamo scrivere niente.
function Interruttore({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-gray-900"
      />
      <span className="min-w-0">
        <span className="block text-sm text-gray-900">{label}</span>
        <span className="block text-xs text-gray-500">{hint}</span>
      </span>
    </label>
  );
}
