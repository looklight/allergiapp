'use client';

// LE DUE COSE CHE SI FANNO CON UN LOCALE (19/09): il menù al tavolo e la
// scheda su AllergiApp. Un componente solo, in due misure:
//
//   full     la home di chi non ha ancora un locale — è l'onboarding. Sparisce
//            da sola col primo locale: nessuno stato da ricordare, nessun
//            «non mostrare più».
//   compact  la finestra «Nuovo locale»: il primo ci arriva dopo aver appena
//            visto la versione grande, e ripeterla intera sarebbe un doppione;
//            dal secondo in poi basta il promemoria.
//
// PRIMA IL MENÙ, POI LA SCHEDA: è l'ordine in cui la maggior parte dei
// ristoratori le usa, e il gratuito viene prima del Pro. Fino al 19/09 la
// finestra spiegava solo la scheda — cioè la cosa che si fa per seconda, e
// che non tutti fanno. Stesso ordine e stesse parole della pagina d'accesso
// (LoginPitch): chi si iscrive ritrova dentro quello che ha letto fuori.
//
// Sono due cose INDIPENDENTI (DIGITAL_MENU.md, Temi 10 e 16), quindi due
// blocchi sempre visibili e non un interruttore: un interruttore direbbe «o
// l'una o l'altra».
//
// I disegni sono i pezzi veri del menù e della scheda, rimpiccioliti, come
// faceva la finestra di prima: la pill «Senza…» è quella del filtro al
// tavolo, e il piatto che contiene l'allergene resta leggibile in fondo — il
// filtro RIORDINA, non nasconde (Tema 18), e il disegno non deve promettere
// altro.
import { useI18n } from '@/lib/i18n';
import { allergenName } from '@/lib/allergens';
import ProTag from '@/components/ProTag';

function FreeTag() {
  const { d } = useI18n();
  return (
    <span className="shrink-0 rounded-full bg-[#E8F5E9] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#2E7D32]">
      {d.paths.free}
    </span>
  );
}

// Il QR: gli stessi tre quadrati della pagina d'accesso
function MenuIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <path d="M13.5 13.5h3v3h-3zM20.5 13.5v.01M13.5 20.5v.01M17.5 17.5h3M20.5 20.5h.01" />
    </svg>
  );
}

// Il segnaposto sulla mappa: il ristorante come lo trova chi lo cerca
function AppIcon({ className }: { className: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function AllergenPill({ code }: { code: string }) {
  const { locale } = useI18n();
  return (
    <span className="rounded-full bg-[#FFF8E1] px-1.5 py-px text-[10px] font-medium text-[#8D6E00]">
      {allergenName(code, locale)}
    </span>
  );
}

// Il menù al tavolo col filtro acceso su «glutine»: il piatto adatto sale,
// quello che lo contiene resta leggibile, in fondo
function MenuSketch() {
  const { d, locale } = useI18n();
  return (
    <div aria-hidden="true" className="rounded-xl border border-gray-200 bg-white p-3">
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 px-2.5 py-1 text-[11px] font-medium text-white">
        <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" />
        </svg>
        {d.paths.sampleFilter} {allergenName('gluten', locale).toLowerCase()}
      </span>
      <div className="mt-2.5 divide-y divide-gray-100">
        <div className="flex items-center justify-between gap-2 pb-2">
          <span className="truncate text-[12px] font-medium text-gray-900">{d.paths.sampleDishOk}</span>
          <AllergenPill code="crustaceans" />
        </div>
        <div className="flex items-center justify-between gap-2 pt-2 opacity-50">
          <span className="truncate text-[12px] text-gray-700">{d.paths.sampleDishNo}</span>
          <span className="flex shrink-0 gap-1">
            <AllergenPill code="gluten" />
            <AllergenPill code="eggs" />
          </span>
        </div>
      </div>
    </div>
  );
}

// Il locale del portale che si aggancia al ristorante già nell'app
function AppSketch() {
  const { d } = useI18n();
  return (
    <div aria-hidden="true" className="flex items-center gap-2">
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
        <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l1.5-5h15L21 9" />
          <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
          <path d="M4.5 11.5V20h15v-8.5" />
        </svg>
        <span className="min-w-0 flex-1 truncate text-[12px] text-gray-700">{d.paths.sampleVenue}</span>
      </div>
      <svg className="h-4 w-4 shrink-0 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12h15M13 6l6 6-6 6" />
      </svg>
      <div className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-2">
        <AppIcon className="h-4 w-4 shrink-0 text-[#4CAF50]" />
        <span className="min-w-0 flex-1 truncate text-[12px] text-gray-700">{d.paths.sampleRestaurant}</span>
      </div>
    </div>
  );
}

export default function VenuePaths({ size }: { size: 'full' | 'compact' }) {
  const { d } = useI18n();

  const paths = [
    {
      key: 'menu',
      icon: MenuIcon,
      title: d.paths.menuTitle,
      tag: <FreeTag />,
      text: size === 'full' ? d.paths.menuText : d.paths.menuShort,
      sketch: <MenuSketch />,
    },
    {
      key: 'app',
      icon: AppIcon,
      title: d.paths.appTitle,
      tag: <ProTag variant="needed" />,
      text: size === 'full' ? d.paths.appText : d.paths.appShort,
      sketch: <AppSketch />,
    },
  ];

  if (size === 'compact') {
    return (
      <ul className="space-y-3">
        {paths.map(({ key, icon: Icon, title, tag, text }) => (
          <li key={key} className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#4CAF50]/10 text-[#388E3C]">
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
                {title}
                {tag}
              </p>
              <p className="mt-0.5 text-[13px] text-gray-600">{text}</p>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // Stessa forma dei riquadri della pagina d'accesso e della dashboard, e
  // alti uguali: affiancati si guardano, e sono due cose pari
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {paths.map(({ key, icon: Icon, title, tag, text, sketch }) => (
        <li key={key} className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4CAF50]/10 text-[#388E3C]">
              <Icon className="h-5 w-5" />
            </span>
            {tag}
          </div>
          <p className="mt-3 text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{text}</p>
          {/* in fondo al riquadro: i due disegni partono alla stessa quota */}
          <div className="mt-auto pt-4">{sketch}</div>
        </li>
      ))}
    </ul>
  );
}
