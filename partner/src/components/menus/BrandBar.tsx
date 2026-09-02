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
import { HEADING_FONTS, SECTION_STYLES, type HeadingFont, type SectionStyle } from '@/lib/venues';
import CoverPicker from './CoverPicker';

export default function BrandBar({
  accent,
  showPhotos,
  showDescriptions,
  sectionStyle,
  headingFont,
  coverUrl,
  // Se l'aspetto di adesso è diverso da quello in sala, e c'è una sala a cui
  // tornare: fuori di qui è appearanceChanged di menu_publish_state (710).
  changed,
  onRevert,
  onAccent,
  onShowPhotos,
  onShowDescriptions,
  onSectionStyle,
  onHeadingFont,
  onCover,
}: {
  accent: string;
  showPhotos: boolean;
  showDescriptions: boolean;
  sectionStyle: SectionStyle;
  headingFont: HeadingFont;
  coverUrl: string;
  changed: boolean;
  onRevert: () => void;
  onAccent: (accent: string) => void;
  onShowPhotos: (value: boolean) => void;
  onShowDescriptions: (value: boolean) => void;
  onSectionStyle: (value: SectionStyle) => void;
  onHeadingFont: (value: HeadingFont) => void;
  onCover: (value: string) => void;
}) {
  const { d, locale } = useI18n();

  // Il riassunto sulla riga chiusa: chi non apre deve sapere lo stesso come
  // sta messo. Senza, sarebbe una scatola misteriosa proprio sopra al menù.
  const riassunto = [
    d.menuEditor.headingFonts[headingFont],
    d.menuEditor.sectionStyles[sectionStyle],
    showPhotos ? d.menuEditor.summaryPhotosOn : d.menuEditor.summaryPhotosOff,
    showDescriptions ? d.menuEditor.summaryDescOn : null,
  ]
    .filter((pezzo): pezzo is string => pezzo !== null)
    .join(' · ');

  return (
    // <details> e non un interruttore fatto da noi: apre e chiude da solo,
    // funziona da tastiera e i lettori di schermo lo annunciano senza che
    // dobbiamo scrivere niente. CHIUSA di partenza: l'aspetto si sceglie una
    // volta, il menù si tocca ogni giorno — e il riassunto sulla riga evita
    // di doverla aprire per sapere com'è messa.
    <details className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span
          className="h-4 w-4 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: accentHex(accent) }}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">
            {d.menuEditor.brandTitle}
          </span>
          <span className="block truncate text-xs text-gray-500">{riassunto}</span>
        </span>
        <svg
          className="h-4 w-4 shrink-0 text-gray-400 transition-transform group-open:rotate-180"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </summary>

      <div className="border-t border-gray-100 p-4">
      <p className="text-xs text-gray-500">{d.menuEditor.brandHint}</p>

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

      {/* I TITOLI DELLE SEZIONI si scelgono guardandoli, non leggendo tre
          nomi: ogni scelta mostra la parola "Antipasti" com'è, in piccolo.
          Un elenco a tendina con scritto "filetto / fascia / solo testo"
          costringerebbe a immaginarsi il risultato e poi a controllarlo
          nell'anteprima — due passaggi per una scelta che è tutta visiva. */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">{d.menuEditor.sectionStyle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SECTION_STYLES.map((stile) => {
            const scelto = sectionStyle === stile;
            return (
              <button
                key={stile}
                onClick={() => onSectionStyle(stile)}
                aria-pressed={scelto}
                title={d.menuEditor.sectionStyles[stile]}
                className={`w-[104px] overflow-hidden rounded-lg border bg-white p-1.5 text-left transition-colors ${
                  scelto ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                <Assaggio stile={stile} accent={accentHex(accent)} />
                <span className="mt-1.5 block text-[10px] text-gray-500">
                  {d.menuEditor.sectionStyles[stile]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* IL PACCHETTO DI STILE, e si sceglie leggendolo: ogni scelta scrive
          il proprio nome CON quel carattere. Un elenco di nomi ("Fraunces",
          "Jost") non direbbe niente a un ristoratore, e a essere onesti
          nemmeno a molti di noi.

          Un pacchetto decide tutta la tipografia del menù, non solo i
          titoli: metà pagina in un carattere e metà in un altro sembra un
          errore, non una scelta. Dove il carattere costa leggibilità — le
          righe minute degli allergeni — il pacchetto compensa da sé, un
          punto in più e un grigio più scuro. */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">{d.menuEditor.headingFont}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HEADING_FONTS.map((carattere) => {
            const scelto = headingFont === carattere;
            return (
              <button
                key={carattere}
                onClick={() => onHeadingFont(carattere)}
                aria-pressed={scelto}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  carattere === 'modern' ? '' : `heading-${carattere}`
                } ${
                  scelto ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.headingFonts[carattere]}
              </button>
            );
          })}
        </div>
      </div>

      <CoverPicker coverUrl={coverUrl} accent={accentHex(accent)} onChange={onCover} />

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

      {/* TORNARE INDIETRO, e solo da qui dentro.

          Compare solo se c'è qualcosa da annullare, cioè se una di queste
          manopole è diversa da come si vede adesso al tavolo. Sta in fondo
          alla scatola dell'aspetto e NON accanto a "Pubblica le modifiche":
          lassù sembrerebbe annullare anche i piatti e i prezzi, che è
          l'unica cosa che questo bottone non deve mai poter fare — i fatti
          dei piatti stanno nel catalogo, e disfarli vorrebbe dire riportare
          indietro una correzione di allergeni.

          Testo grigio e non un bottone pieno: è la via d'uscita di chi ha
          provato qualcosa, non una delle scelte da fare qui. */}
      {changed && (
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
          <button
            onClick={onRevert}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {d.menuEditor.appearanceRevert}
          </button>
        </div>
      )}
      </div>
    </details>
  );
}

// Il campioncino dentro ogni scelta: la stessa parola disegnata nei tre
// modi, in miniatura. Non è un'anteprima fedele — è un promemoria visivo, e
// quella fedele è il telefono che sta accanto.
function Assaggio({ stile, accent }: { stile: SectionStyle; accent: string }) {
  if (stile === 'banner') {
    return (
      <span
        className="block rounded-sm px-1 py-0.5 text-[7px] font-semibold uppercase tracking-wide text-white"
        style={{ backgroundColor: accent }}
      >
        Antipasti
      </span>
    );
  }
  if (stile === 'plain') {
    return (
      <span className="block px-0.5 py-0.5 text-[9px] font-semibold text-gray-900">Antipasti</span>
    );
  }
  return (
    <span
      className="block border-b px-0.5 pb-0.5 text-[7px] font-semibold uppercase tracking-wide"
      style={{ color: accent, borderColor: `${accent}33` }}
    >
      Antipasti
    </span>
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
