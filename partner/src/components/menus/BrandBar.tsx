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
import { accentiSceglibili, accentHex, DEFAULT_ACCENT } from '@/lib/menuBrand';
import { APPEARANCE_711, APPEARANCE_PREMIUM } from '@/lib/features';
import ProTag from '@/components/ProTag';
import { CURRENCIES } from '@/lib/menus';
import {
  ALLERGEN_DISPLAYS,
  DISH_SEPARATORS,
  HEADING_FONTS,
  LINE_HEIGHTS,
  SECTION_STYLES,
  MENU_LAYOUTS,
  TEXT_SCALES,
  type AllergenDisplay,
  type DishPhotoShape,
  type DishSeparator,
  type HeadingFont,
  type LineHeight,
  type MenuLayout,
  type SectionStyle,
  type SocialLink,
  type TextScale,
} from '@/lib/venues';
import CoverPicker from './CoverPicker';
import SocialLinks from './SocialLinks';

export default function BrandBar({
  accent,
  currency,
  layout,
  separator,
  showPhotos,
  photoShape,
  showDescriptions,
  allergenDisplay,
  haSezioni,
  sectionStyle,
  headingFont,
  textScale,
  lineHeight,
  coverUrl,
  // Se l'aspetto di adesso è diverso da quello in sala, e c'è una sala a cui
  // tornare: fuori di qui è appearanceChanged di menu_publish_state (710).
  changed,
  esempio,
  onRevert,
  onReset,
  onCurrency,
  onLayout,
  onSeparator,
  onAccent,
  onPhotos,
  onShowDescriptions,
  onAllergenDisplay,
  onSectionStyle,
  onHeadingFont,
  onTextScale,
  onLineHeight,
  onCover,
  socials,
  onSocials,
  abbonato,
}: {
  accent: string;
  // ⚠️ LA VALUTA NON È ASPETTO, sta qui solo perché è qui che si va a
  // sistemare come si legge il menù. Vive sul MENÙ (le altre manopole sono
  // del locale), quindi conta come modifica di CONTENUTO — "Rimetti com'è in
  // sala" non la tocca, e cambiarla accende l'avviso "modifiche non
  // pubblicate" come cambiare un prezzo. È giusto così: al tavolo cambia
  // quello che il cliente legge accanto a ogni piatto.
  currency: string;
  // La STRUTTURA, non un preset: decide come è disposto un piatto e non
  // riscrive nessuna delle voci qui sotto (v. MENU_LAYOUTS).
  layout: MenuLayout;
  separator: DishSeparator;
  showPhotos: boolean;
  photoShape: DishPhotoShape;
  showDescriptions: boolean;
  // Come si legge la riga degli allergeni al tavolo: a parole o a icone.
  // ⚠️ Non è un interruttore per nasconderli (Tema 23).
  allergenDisplay: AllergenDisplay;
  // Questo menù ha almeno una sezione CON UN NOME, cioè un titolo che al
  // tavolo si vede. Se non ce n'è, la voce «Titoli delle sezioni» non compare
  // (stessa regola delle foto con «a blocco»): non c'è niente da vedere
  // cambiare. ⚠️ I blocchi di testo NON contano — hanno un aspetto loro e
  // non passano da section_style.
  haSezioni: boolean;
  sectionStyle: SectionStyle;
  headingFont: HeadingFont;
  textScale: TextScale;
  lineHeight: LineHeight;
  coverUrl: string;
  changed: boolean;
  // Il comando dei tre piatti finti nell'anteprima, che sta QUI perché è qui
  // che si sceglie l'aspetto: il bottone va dove si decide, non dove si
  // guarda. null quando il menù ha già dei piatti dentro — allora valgono i
  // suoi e non c'è niente da dimostrare.
  esempio: { acceso: boolean; cambia: () => void } | null;
  onRevert: () => void;
  // La via d'uscita di chi NON è abbonato: non ha una sala a cui tornare, ma
  // ha comunque provato delle cose e deve poterle disfare in un colpo.
  onReset: () => void;
  onCurrency: (value: string) => void;
  onLayout: (value: MenuLayout) => void;
  onSeparator: (value: DishSeparator) => void;
  onAccent: (accent: string) => void;
  // Una scelta sola con tre risposte, due campi sotto (v. migration 711):
  // spegnendo le foto la forma NON si azzera, così riaccendendole si ritrova
  // quella che si era scelta.
  onPhotos: (next: { showPhotos: boolean; photoShape: DishPhotoShape }) => void;
  onShowDescriptions: (value: boolean) => void;
  onAllergenDisplay: (value: AllergenDisplay) => void;
  onSectionStyle: (value: SectionStyle) => void;
  onHeadingFont: (value: HeadingFont) => void;
  onTextScale: (value: TextScale) => void;
  onLineHeight: (value: LineHeight) => void;
  onCover: (value: string) => void;
  socials: SocialLink[];
  onSocials: (next: SocialLink[]) => void;
  // Il locale ha l'abbonamento? Da abbonato non c'è più niente da sbloccare,
  // quindi l'etichetta grigia sparisce: il distintivo ambra accanto al nome
  // del locale, in home, dice già che ce l'ha (v. ProTag).
  abbonato: boolean;
}) {
  const { d, locale } = useI18n();

  // Ha toccato qualcosa delle manopole che il reset rimette a posto? Si
  // confronta con gli stessi valori di partenza del database
  // (venue_appearance_defaults, migration 711): se i due elenchi divergono,
  // il bottone offre di disfare qualcosa che non c'è.
  const toccato =
    accent !== DEFAULT_ACCENT ||
    headingFont !== 'modern' ||
    sectionStyle !== 'underline' ||
    textScale !== 'normal' ||
    lineHeight !== 'normal' ||
    layout !== 'row' ||
    separator !== 'rule' ||   // v. migration 720
    photoShape !== 'square' ||
    allergenDisplay !== 'text';


  return (
    // <details> e non un interruttore fatto da noi: apre e chiude da solo,
    // funziona da tastiera e i lettori di schermo lo annunciano senza che
    // dobbiamo scrivere niente. CHIUSA di partenza: l'aspetto si sceglie una
    // volta, il menù si tocca ogni giorno. Com'è messa lo mostra
    // l'anteprima accanto, non la riga chiusa (v. sotto).
    <details className="group rounded-2xl border border-gray-200 bg-white shadow-sm">
      {/* LA RIGA CHIUSA È UN INVITO, NON UN RIASSUNTO (richiesta dell'utente,
          15/09). Prima elencava le scelte fatte ("€ · Moderno · Sottolineato ·
          foto quadrate…"): una fila di parole grigie che chi non ha ancora
          aperto la scatola non sa leggere, e chi l'ha già sistemata non ha
          bisogno di rileggere — l'anteprima accanto le mostra meglio.

          Ed è una delle porte dell'abbonamento: le personalizzazioni sono la
          voce premium candidata (Tema 31). Quindi deve farsi notare senza
          urlare: un'icona nel colore scelto per il menù, un titolo vero, una
          frase che dice cosa si ottiene, e un bottone "Personalizza". Nessuna
          etichetta "Premium" finché il listino non è deciso.

          ⚠️ AGGIORNATO IL 16/09: il listino c'è (MONETIZATION.md) e l'etichetta
          arriva, ma dietro APPEARANCE_PREMIUM — cioè solo quando la migration
          718 rende vero quello che dice. Resta un'etichetta, non un lucchetto:
          le manopole si toccano tutte, e l'anteprima le mostra. Serve a non
          far scoprire il confine DOPO mezz'ora di lavoro. */}
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 [&::-webkit-details-marker]:hidden">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ring-1 ring-inset ring-black/10"
          style={{ backgroundColor: accentHex(accent) }}
          aria-hidden="true"
        >
          {/* la tavolozza */}
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3a9 9 0 100 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.4-4-7.9-9-7.9z" />
            <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
            <circle cx="10.5" cy="7" r="1" fill="currentColor" />
            <circle cx="15" cy="7.5" r="1" fill="currentColor" />
          </svg>
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-900">{d.menuEditor.brandTitle}</span>
            {APPEARANCE_PREMIUM && !abbonato && <ProTag variant="needed" />}
          </span>
          <span className="block text-xs text-gray-500">{d.menuEditor.brandTeaser}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 transition-colors group-hover:border-gray-400 group-open:border-gray-200 group-open:text-gray-500">
          <span className="group-open:hidden">{d.menuEditor.brandOpen}</span>
          <span className="hidden group-open:inline">{d.menuEditor.brandClose}</span>
          <svg
            className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
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
        </span>
      </summary>

      <div className="@container border-t border-gray-100 p-4">
      {/* La riga che dice cosa si fa qui, e accanto il modo di vederlo
          succedere: con un menù ancora vuoto l'anteprima è uno schermo
          bianco, e ogni scelta di questa scatola si farebbe alla cieca. */}
      {/* Il confine si dice APRENDO la scatola, dove si sta per lavorare, e
          non solo con l'etichetta sulla riga chiusa: chi arriva qui dentro
          deve sapere prima di scegliere un colore che al tavolo ci arriva
          con l'abbonamento — e che foto e descrizioni restano sue comunque. */}
      {APPEARANCE_PREMIUM && !abbonato && (
        <p className="mb-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-gray-600">
          {d.menuEditor.brandPremiumNote}
        </p>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="min-w-0 flex-1 text-xs text-gray-500">{d.menuEditor.brandHint}</p>
        {esempio && (
          <button
            onClick={esempio.cambia}
            // Col bordo, come gli altri comandi secondari del portale: senza,
            // era testo grigio in mezzo ad altro testo grigio e non si capiva
            // che si potesse premere (richiesta dell'utente, 16/09).
            className="shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 transition-colors hover:border-gray-400 hover:text-gray-900"
          >
            {esempio.acceso ? d.menuEditor.previewSampleHide : d.menuEditor.previewSampleShow}
          </button>
        )}
      </div>

      {/* TRE GRUPPI E NON DODICI GRADINI. Prima ogni voce aveva la stessa
          etichettina grigia e lo stesso filetto sopra: dodici righe di pari
          peso, in cui niente diceva che colore e copertina sono la stessa
          domanda. I gruppi rispondono alle tre domande che uno si fa
          guardando una carta — com'è disposta, di chi è, come si legge — e
          il titolo di ognuno è quello dei blocchi dell'editor (text-sm
          font-medium), non l'ennesimo maiuscoletto: quello è dell'AREA, e
          due maiuscoletti annidati sarebbero due gradi dello stesso rango.

          LA DISPOSIZIONE (rivista il 2026-09-06 su indicazione dell'utente):
          i gruppi stanno UNO SOTTO L'ALTRO e prendono tutta la larghezza —
          così le pastiglie del Testo si distendono sui ~640px invece di
          stringersi in una colonna da 305. Ad affiancarsi sono due VOCI
          dentro L'identità (colore e copertina), non i gruppi fra loro.

          Provata prima l'altra strada — «La carta» larga e i due gruppi
          piccoli affiancati — e scartata: due colonne piene fanno 322px, ma
          le file da TRE schede (titoli delle sezioni, fra i piatti) ne
          vogliono 328, quindi lì le colonne non ci stavano comunque.

          Le soglie sono del CONTENITORE (@container) e non della finestra:
          questa scatola cambia larghezza quando compare l'anteprima del
          telefono, e una soglia sulla finestra l'avrebbe spezzata proprio
          dove sta larga. Sotto, colonna sola: il telefono a 375px era già
          stato curato e non si disfa. */}
      <div className="mt-4 space-y-5">
      {/* L'IMPAGINAZIONE È LA PRIMA VOCE, perché è la struttura: decide come
          è disposto un piatto, e tutto quello che c'è sotto la decora.

          ⚠️ È UNO STILE, NON UN PRESET (decisione dell'utente): scegliendola
          non si riscrive nessuna delle manopole qui sotto — colore,
          carattere, grandezza restano come il ristoratore li ha messi. Un
          preset che li impostasse tutti insieme cancellerebbe scelte già
          fatte, e chi ha passato dieci minuti sul colore non se lo aspetta.

          L'unica conseguenza è che "a blocco" non mostra le foto, quindi la
          manopola della loro forma sparisce — e sotto c'è scritto perché e
          che non si perde niente. */}
      {APPEARANCE_711 && (
        <div>
          <p className="text-xs text-gray-500">{d.menuEditor.layout}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {MENU_LAYOUTS.map((impaginazione) => {
              const scelto = layout === impaginazione;
              return (
                <button
                  key={impaginazione}
                  onClick={() => onLayout(impaginazione)}
                  aria-pressed={scelto}
                  title={d.menuEditor.layoutHints[impaginazione]}
                  className={`w-[132px] overflow-hidden rounded-lg border bg-white p-2 text-left transition-colors ${
                    scelto ? 'border-gray-900' : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <AssaggioImpaginazione tipo={impaginazione} />
                  {/* Solo il nome, e più deciso: la didascalia sotto ogni
                      scheda diceva a parole quello che il campione disegnato
                      mostra già, e quello che l'anteprima accanto fa vedere
                      per davvero. Resta come titolo del bottone, per chi la
                      pagina la ascolta invece di guardarla. */}
                  <span className="mt-1.5 block text-sm font-medium text-gray-900">
                    {d.menuEditor.layouts[impaginazione]}
                  </span>
                </button>
              );
            })}
          </div>
          {layout === 'block' && (
            <p className="mt-2 text-xs leading-relaxed text-gray-400">
              {d.menuEditor.layoutNoPhotos} {d.menuEditor.layoutWantsDescriptions}
            </p>
          )}
        </div>
      )}


      {/* LA VOCE C'È SOLO SE C'È UN TITOLO DA VEDERE (2026-09-06, stessa
          regola delle foto con «a blocco»): un menù senza sezioni con un nome
          non mostra nessun titolo, quindi qui non ci sarebbe niente da
          scegliere. Col menù di esempio acceso invece si mostra: è lì apposta
          per giudicare l'aspetto prima di aver scritto un piatto, e le sue
          sezioni un titolo ce l'hanno.

          I TITOLI DELLE SEZIONI, e il segno fra i piatti, e le foto: erano
          schede con un campione disegnato, «si sceglie guardando invece di
          leggere tre nomi». PASTIGLIE dal 2026-09-06, su osservazione
          dell'utente che supera quella ragione: il campione è largo un
          centimetro, l'anteprima accanto è grande come un telefono e mostra
          il risultato vero. Due modi di far vedere la stessa cosa, e uno dei
          due è migliore. */}
      {(haSezioni || esempio?.acceso) && (
      <div>
        <p className="text-xs text-gray-500">{d.menuEditor.sectionStyle}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SECTION_STYLES.map((stile) => {
            const scelto = sectionStyle === stile;
            return (
              <button
                key={stile}
                onClick={() => onSectionStyle(stile)}
                aria-pressed={scelto}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.sectionStyles[stile]}
              </button>
            );
          })}
        </div>
      </div>
      )}


      {/* Il segno fra un piatto e l'altro. Vale in TUTT'E DUE le
          impaginazioni: legarlo a «a blocco» avrebbe aggiunto una manopola
          che compare e sparisce, e il pregio di questa strada è che ne
          dipende una sola. */}
      {APPEARANCE_711 && (
        <div>
          <p className="text-xs text-gray-500">{d.menuEditor.separator}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {DISH_SEPARATORS.map((segno) => {
              const scelto = separator === segno;
              return (
                <button
                  key={segno}
                  onClick={() => onSeparator(segno)}
                  aria-pressed={scelto}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
                >
                  {d.menuEditor.separators[segno]}
                </button>
              );
            })}
          </div>
        </div>
      )}


      {/* LE FOTO SPARISCONO CON «A BLOCCO» (2026-09-06, scelta dell'utente):
          quell'impaginazione non le mostra, quindi qui non c'è niente da
          scegliere. Il valore resta scritto sul locale, e tornando «A riga»
          si ritrova la forma di prima: sparisce il comando, non la scelta.
          Prima spariva solo la manopola della FORMA e restava «nessuna /
          quadrate / tonde», cioè un comando che al tavolo non cambiava
          niente. */}
      {(!APPEARANCE_711 || layout !== 'block') && (
        <div>
          <p className="text-xs text-gray-500">{d.menuEditor.photos}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { chiave: 'none' as const, scelto: !showPhotos, next: { showPhotos: false, photoShape } },
              {
                chiave: 'square' as const,
                scelto: showPhotos && photoShape === 'square',
                next: { showPhotos: true, photoShape: 'square' as DishPhotoShape },
              },
              // Le tonde hanno bisogno della colonna della 711.
              ...(APPEARANCE_711
                ? [
                    {
                      chiave: 'round' as const,
                      scelto: showPhotos && photoShape === 'round',
                      next: { showPhotos: true, photoShape: 'round' as DishPhotoShape },
                    },
                  ]
                : []),
            ].map(({ chiave, scelto, next }) => (
              <button
                key={chiave}
                onClick={() => onPhotos(next)}
                aria-pressed={scelto}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.photoShapes[chiave]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-gray-400">{d.menuEditor.photosHint}</p>
        </div>
      )}

      {/* COME SI LEGGONO GLI ALLERGENI, sopra le descrizioni: sono le due
          voci che decidono quanto racconta ogni riga, e questa pesa di più.

          ⚠️ NON nasconde niente (Tema 23): sono due modi di leggere la stessa
          riga. A icone la parola «Contiene» sparisce dalle righe e la
          polarità la dice la legenda in fondo alla carta; nel dettaglio del
          piatto gli allergeni restano sempre scritti. */}
      <div>
        <p className="text-xs text-gray-500">{d.menuEditor.allergenDisplay}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {ALLERGEN_DISPLAYS.map((modo) => {
            const scelto = allergenDisplay === modo;
            return (
              <button
                key={modo}
                onClick={() => onAllergenDisplay(modo)}
                aria-pressed={scelto}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.allergenDisplays[modo]}
              </button>
            );
          })}
        </div>
        {allergenDisplay === 'icon' && (
          <p className="mt-2 text-xs leading-relaxed text-gray-400">
            {d.menuEditor.allergenDisplayHint}
          </p>
        )}
      </div>

      <Interruttore
        label={d.menuEditor.showDescriptions}
        hint={d.menuEditor.showDescriptionsHint}
        value={showDescriptions}
        onChange={onShowDescriptions}
      />

      <div className="border-t border-gray-100" />

      {/* Colore e copertina AFFIANCATI: il colore è una fila di sei
          pastiglie e la copertina un riquadro, e uno sopra l'altro
          lasciavano mezza riga vuota per ognuno. */}
      <div className="grid gap-x-8 gap-y-4 @[600px]:grid-cols-2 @[600px]:items-start">
        <div>
          {/* L'etichetta SOPRA e non accanto: da dieci tinte in su la fila va
              a capo, e una riga che si sdoppia accanto a una parola le lascia
              intorno uno spazio che non è di nessuno. */}
          <p className="text-xs text-gray-500">{d.menuEditor.accent}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {accentiSceglibili(accent).map((colore) => {
              const scelto = accent === colore.code;
              return (
                <button
                  key={colore.code}
                  onClick={() => onAccent(colore.code)}
                  aria-label={colore[locale]}
                  title={colore[locale]}
                  aria-pressed={scelto}
                  // L'anello sta FUORI dalla pastiglia (offset) e non dentro:
                  // un bordo bianco interno mangerebbe il colore proprio
                  // nella pastiglia scelta, cioè quella che si sta guardando
                  className={`h-7 w-7 rounded-full transition-shadow ${
                    scelto
                      ? 'ring-2 ring-gray-900 ring-offset-2'
                      : 'hover:ring-2 hover:ring-gray-300 hover:ring-offset-2'
                  }`}
                  style={{ backgroundColor: accentHex(colore.code) }}
                />
              );
            })}
          </div>
        </div>

        <CoverPicker coverUrl={coverUrl} accent={accentHex(accent)} onChange={onCover} />
      </div>

      <div className="border-t border-gray-100" />

      {/* IL PACCHETTO DI STILE, e si sceglie leggendolo: ogni scelta scrive
          il proprio nome CON quel carattere. Un elenco di nomi ("Fraunces",
          "Jost") non direbbe niente a un ristoratore, e a essere onesti
          nemmeno a molti di noi.

          Un pacchetto decide tutta la tipografia del menù, non solo i
          titoli: metà pagina in un carattere e metà in un altro sembra un
          errore, non una scelta. Dove il carattere costa leggibilità — le
          righe minute degli allergeni — il pacchetto compensa da sé, un
          punto in più e un grigio più scuro. */}
      <div>
        <p className="text-xs text-gray-500">{d.menuEditor.headingFont}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {HEADING_FONTS.map((carattere) => {
            const scelto = headingFont === carattere;
            return (
              <button
                key={carattere}
                onClick={() => onHeadingFont(carattere)}
                aria-pressed={scelto}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  carattere === 'modern' ? '' : `heading-${carattere}`
                } ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
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
      <div className="flex flex-wrap gap-x-8 gap-y-4">
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
                className={`rounded-full border px-3 py-1.5 transition-colors ${
                  grandezza === 'compact'
                    ? 'text-xs'
                    : grandezza === 'roomy'
                    ? 'text-base'
                    : 'text-sm'
                } ${
                  scelto
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                }`}
              >
                {d.menuEditor.textScales[grandezza]}
              </button>
            );
          })}
        </div>
        </div>

        {/* L'INTERLINEA come pastiglia semplice. Ogni scelta si scriveva su
            DUE righe («Stretta / due righe») perché l'interlinea si vede solo
            fra due righe, ed era l'unico modo di mostrarla dentro il bottone.
            Tolto il 2026-09-06 su richiesta dell'utente, e vale la stessa
            ragione delle pastiglie: l'interlinea vera si vede nell'anteprima
            accanto, mentre qui il campione raddoppiava l'altezza di tre
            bottoni per un accenno. La stringa `lineHeightSample` («due
            righe») è stata tolta dai dizionari insieme al campione: non la
            usava nessun altro. */}
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
                    className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                      scelto
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-300 bg-white text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {d.menuEditor.lineHeights[aria]}
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
      </div>

      {/* I LINK IN FONDO AL MENÙ: un gruppo suo, in fondo alla scatola e con
          il titolo degli altri tre (richiesta dell'utente, 16/09). Stava
          dentro «L'identità», sotto la copertina: per contenuto ci stava —
          logo, colore e profili sono la stessa domanda, di chi è questo menù
          — ma per PESO no. Un campo di testo con un bottone «Aggiungi» non è
          una manopola come le altre: è una cosa che si compila, e infilata
          in coda a un gruppo sembrava un ripensamento invece di una voce. */}
      <div className="border-t border-gray-100" />

      <div>
        <p className="text-sm font-medium text-gray-900">{d.menuEditor.socialsGroup}</p>
        <p className="mt-0.5 text-xs text-gray-500">{d.menuEditor.socialsGroupHint}</p>
        <div className="mt-3">
          <SocialLinks socials={socials} onChange={onSocials} />
        </div>
      </div>

      {/* LA VALUTA NON È IN NESSUNO DEI TRE GRUPPI, ed è deliberato: non è
          aspetto. Vive sul MENÙ e non sul locale, conta come modifica di
          contenuto e "Rimetti com'è in sala" non la tocca. Sta qui sotto,
          staccata, finché non si sposta nell'area Contenuto accanto al nome
          del menù — che è il suo posto vero. */}
      <div className="mt-6 border-t border-gray-100 pt-3">
      <div className="flex items-center gap-2">
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
      {/* DUE VIE D'USCITA, mai insieme, perché rispondono a due domande
          diverse: chi è abbonato torna a QUELLO CHE I CLIENTI STANNO
          LEGGENDO; chi non lo è non ha una sala a cui tornare — il suo
          aspetto al tavolo è quello di partenza — e allora la sola cosa
          sensata è disfare le prove.

          ⚠️ Per il non abbonato il bottone non compare se non ha toccato
          niente: un "rimetti com'era" su una scatola già com'era è un invito
          a chiedersi cosa si è rotto. */}
      {changed ? (
        <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
          <button
            onClick={onRevert}
            className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
          >
            {d.menuEditor.appearanceRevert}
          </button>
        </div>
      ) : (
        toccato && (
          <div className="mt-4 flex justify-end border-t border-gray-100 pt-3">
            <button
              onClick={onReset}
              className="rounded-lg px-2 py-1 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-900"
            >
              {d.menuEditor.appearanceReset}
            </button>
          </div>
        )
      )}
      </div>
    </details>
  );
}

// Il campioncino dell'impaginazione: non parole ma la FORMA di un piatto,
// disegnata con dei rettangolini. È l'unico modo di far vedere in venti
// pixel la differenza fra "in riga" e "incolonnato" — leggere due nomi
// costringerebbe a immaginarsi il risultato e poi a controllarlo
// nell'anteprima.
function AssaggioImpaginazione({ tipo }: { tipo: MenuLayout }) {
  if (tipo === 'block') {
    return (
      <span className="flex h-9 flex-col items-center justify-center gap-1 rounded bg-gray-50 px-2">
        <span className="block h-1 w-10 rounded-sm bg-gray-300" />
        <span className="block h-1 w-16 rounded-sm bg-gray-200" />
        <span className="block h-1 w-6 rounded-sm bg-gray-300" />
      </span>
    );
  }
  return (
    <span className="flex h-9 items-center gap-1.5 rounded bg-gray-50 px-2">
      <span className="block h-5 w-5 shrink-0 rounded-sm bg-gray-300" />
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="block h-1 w-full rounded-sm bg-gray-300" />
        <span className="block h-1 w-2/3 rounded-sm bg-gray-200" />
      </span>
      <span className="block h-1 w-3 shrink-0 rounded-sm bg-gray-300" />
    </span>
  );
}

// Il campioncino del separatore: due piatti finti e in mezzo il segno.

// Il campioncino dentro ogni scelta: la stessa parola disegnata nei tre
// modi, in miniatura. Non è un'anteprima fedele — è un promemoria visivo, e

// Una delle tre risposte sulle foto: il campioncino sopra, il nome sotto.
// Stessa forma delle scelte sui titoli di sezione, perché è la stessa cosa —

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
