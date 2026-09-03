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
import { APPEARANCE_711 } from '@/lib/features';
import { CURRENCIES } from '@/lib/menus';
import {
  HEADING_FONTS,
  LINE_HEIGHTS,
  SECTION_STYLES,
  LINE_HEIGHT_FACTORS,
  TEXT_SCALES,
  type DishPhotoShape,
  type HeadingFont,
  type LineHeight,
  type SectionStyle,
  type TextScale,
} from '@/lib/venues';
import CoverPicker from './CoverPicker';

export default function BrandBar({
  accent,
  currency,
  showPhotos,
  photoShape,
  showDescriptions,
  sectionStyle,
  headingFont,
  textScale,
  lineHeight,
  coverUrl,
  // Se l'aspetto di adesso è diverso da quello in sala, e c'è una sala a cui
  // tornare: fuori di qui è appearanceChanged di menu_publish_state (710).
  changed,
  onRevert,
  onCurrency,
  onAccent,
  onPhotos,
  onShowDescriptions,
  onSectionStyle,
  onHeadingFont,
  onTextScale,
  onLineHeight,
  onCover,
}: {
  accent: string;
  // ⚠️ LA VALUTA NON È ASPETTO, sta qui solo perché è qui che si va a
  // sistemare come si legge il menù. Vive sul MENÙ (le altre manopole sono
  // del locale), quindi conta come modifica di CONTENUTO — "Rimetti com'è in
  // sala" non la tocca, e cambiarla accende l'avviso "modifiche non
  // pubblicate" come cambiare un prezzo. È giusto così: al tavolo cambia
  // quello che il cliente legge accanto a ogni piatto.
  currency: string;
  showPhotos: boolean;
  photoShape: DishPhotoShape;
  showDescriptions: boolean;
  sectionStyle: SectionStyle;
  headingFont: HeadingFont;
  textScale: TextScale;
  lineHeight: LineHeight;
  coverUrl: string;
  changed: boolean;
  onRevert: () => void;
  onCurrency: (value: string) => void;
  onAccent: (accent: string) => void;
  // Una scelta sola con tre risposte, due campi sotto (v. migration 711):
  // spegnendo le foto la forma NON si azzera, così riaccendendole si ritrova
  // quella che si era scelta.
  onPhotos: (next: { showPhotos: boolean; photoShape: DishPhotoShape }) => void;
  onShowDescriptions: (value: boolean) => void;
  onSectionStyle: (value: SectionStyle) => void;
  onHeadingFont: (value: HeadingFont) => void;
  onTextScale: (value: TextScale) => void;
  onLineHeight: (value: LineHeight) => void;
  onCover: (value: string) => void;
}) {
  const { d, locale } = useI18n();

  // Il riassunto sulla riga chiusa: chi non apre deve sapere lo stesso come
  // sta messo. Senza, sarebbe una scatola misteriosa proprio sopra al menù.
  const riassunto = [
    // La valuta apre la fila: da quando il suo comando sta qui dentro, senza
    // questa parola una scatola chiusa la nasconderebbe del tutto.
    currency,
    d.menuEditor.headingFonts[headingFont],
    d.menuEditor.sectionStyles[sectionStyle],
    // 'Normale' non si scrive: sarebbe una parola in più su ogni riga chiusa
    // per dire che non è stato cambiato niente.
    textScale === 'normal' ? null : d.menuEditor.textScales[textScale],
    lineHeight === 'normal' || !APPEARANCE_711
      ? null
      : d.menuEditor.lineHeights[lineHeight],
    !showPhotos
      ? d.menuEditor.summaryPhotosOff
      : photoShape === 'round'
        ? d.menuEditor.summaryPhotosRound
        : d.menuEditor.summaryPhotosSquare,
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

      {/* La valuta prima del colore: è quella che decide come si legge ogni
          riga del menù, mentre il colore decide come si vede. Era in cima
          all'editor, accanto al nome del locale, dove sembrava una proprietà
          del ristorante invece che del suo listino. */}
      <div className="mt-3 flex items-center gap-2">
        <span className="text-xs text-gray-500">{d.menuEditor.currency}</span>
        <select
          value={currency}
          onChange={(e) => onCurrency(e.target.value)}
          aria-label={d.menuEditor.currency}
          className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-gray-900 focus:outline-none"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} {c.symbol}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
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

      {/* LA GRANDEZZA DEI TESTI, subito sotto al pacchetto: sono la stessa
          materia — come sono fatte le lettere — e separarli manderebbe a
          cercare in due punti la stessa decisione.

          Tre scelte e non un cursore (v. TEXT_SCALES): un cursore libero
          finirebbe tirato al minimo per far stare la carta in una schermata,
          e la prima riga a diventare illeggibile sarebbe quella degli
          allergeni.

          Ogni scelta si scrive con la propria grandezza, come i pacchetti si
          scrivono col proprio carattere: si sceglie guardando, non leggendo
          un nome. */}
      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-4 border-t border-gray-100 pt-3">
        {/* GRANDEZZA E INTERLINEA SULLA STESSA RIGA: sono la stessa domanda
            vista da due parti — quanto è fitta la carta. La grandezza cambia
            quanto sono grandi le lettere, l'interlinea quanto respirano fra
            loro, e su un menù di una pagina sola la seconda si nota più della
            prima. Separarle in due blocchi sovrapposti avrebbe fatto cercare
            in due punti la stessa decisione. Su schermo stretto vanno a capo
            da sé. */}
        <div>
        <p className="text-xs text-gray-500">{d.menuEditor.textScale}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {TEXT_SCALES.map((grandezza) => {
            const scelto = textScale === grandezza;
            return (
              <button
                key={grandezza}
                onClick={() => onTextScale(grandezza)}
                aria-pressed={scelto}
                className={`rounded-lg border px-3 py-1.5 transition-colors ${
                  grandezza === 'compact'
                    ? 'text-xs'
                    : grandezza === 'roomy'
                    ? 'text-base'
                    : 'text-sm'
                } ${
                  scelto ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.textScales[grandezza]}
              </button>
            );
          })}
        </div>
        </div>

        {/* L'interlinea aspetta la sua colonna (v. APPEARANCE_711). Ogni
            scelta si scrive con la propria interlinea su due righe: una
            parola sola non mostrerebbe niente, ed è l'unica cosa che
            l'interlinea fa. */}
        {APPEARANCE_711 && (
          <div>
            <p className="text-xs text-gray-500">{d.menuEditor.lineHeight}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {LINE_HEIGHTS.map((aria) => {
                const scelto = lineHeight === aria;
                return (
                  <button
                    key={aria}
                    onClick={() => onLineHeight(aria)}
                    aria-pressed={scelto}
                    className={`rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                      scelto
                        ? 'border-gray-900 ring-1 ring-gray-900'
                        : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <span
                      className="block max-w-[86px] text-left"
                      style={{ lineHeight: LINE_HEIGHT_FACTORS[aria] * 1.35 }}
                    >
                      {d.menuEditor.lineHeights[aria]}
                      <br />
                      {d.menuEditor.lineHeightSample}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Il pavimento, detto a chi sceglie: senza questa riga "Compatta"
            sembra rimpicciolire tutto, allergeni compresi, e chi ci tiene non
            la toccherebbe mai. Vale per tutt'e due le manopole di questa
            riga. */}
        <p className="w-full text-xs leading-relaxed text-gray-400">{d.menuEditor.textScaleFloor}</p>
      </div>

      <CoverPicker coverUrl={coverUrl} accent={accentHex(accent)} onChange={onCover} />

      {/* Gli interruttori sotto al colore, staccati da una riga: il colore è
          identità, questi due sono impaginazione. L'effetto si vede
          nell'anteprima accanto, quindi non serve spiegarli a parole più di
          una riga. */}
      {/* LE FOTO: tre risposte a una domanda sola, e si scelgono guardandole
          come i titoli delle sezioni. "Nessuna" sta in fila con le altre due
          e non è un interruttore a parte: per chi decide sono tre modi di
          fare la stessa cosa — che aspetto ha la carta — non un sì/no più
          un'opzione nascosta dentro il sì. */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">{d.menuEditor.photos}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <SceltaFoto
            scelto={!showPhotos}
            label={d.menuEditor.photoShapes.none}
            onClick={() => onPhotos({ showPhotos: false, photoShape })}
          >
            <span className="h-7 w-7 rounded-md border border-dashed border-gray-300" />
          </SceltaFoto>
          <SceltaFoto
            scelto={showPhotos && photoShape === 'square'}
            label={d.menuEditor.photoShapes.square}
            onClick={() => onPhotos({ showPhotos: true, photoShape: 'square' })}
          >
            <span className="h-7 w-7 rounded-md bg-gray-200" />
          </SceltaFoto>
          {/* Le tonde compaiono col loro interruttore: la colonna che le
              tiene (migration 711) non esiste ancora, e un bottone che non
              salva niente è peggio di un bottone che non c'è. */}
          {APPEARANCE_711 && (
            <SceltaFoto
              scelto={showPhotos && photoShape === 'round'}
              label={d.menuEditor.photoShapes.round}
              onClick={() => onPhotos({ showPhotos: true, photoShape: 'round' })}
            >
              <span className="h-7 w-7 rounded-full bg-gray-200" />
            </SceltaFoto>
          )}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-gray-400">{d.menuEditor.photosHint}</p>
      </div>

      <div className="mt-4 space-y-2.5 border-t border-gray-100 pt-3">
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

// Una delle tre risposte sulle foto: il campioncino sopra, il nome sotto.
// Stessa forma delle scelte sui titoli di sezione, perché è la stessa cosa —
// si decide guardando, non leggendo un nome.
function SceltaFoto({
  scelto,
  label,
  onClick,
  children,
}: {
  scelto: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={scelto}
      title={label}
      className={`flex w-[84px] flex-col items-center gap-1.5 rounded-lg border bg-white px-2 py-2 transition-colors ${
        scelto ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
      }`}
    >
      {children}
      <span className="text-[10px] text-gray-500">{label}</span>
    </button>
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
