'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useVenues, useVenueChoice, currentVenue } from '@/lib/venues';

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
      <path d="M9.75 20v-5.5h4.5V20" />
    </svg>
  );
}

// Piatto visto dall'alto: al posto di posate che a 20px diventano un groviglio
function PlateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
    </svg>
  );
}

// Carta aperta: due facciate e le righe dei piatti. Distinta dal piatto visto
// dall'alto del catalogo, perché sono due cose diverse — i fatti e la carta.
function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.5v13" />
      <path d="M12 6.5C10.5 5 8 4.5 4 4.5v13c4 0 6.5.5 8 2 1.5-1.5 4-2 8-2v-13c-4 0-6.5.5-8 2z" />
      <path d="M6.5 9h3M6.5 12h3M14.5 9h3M14.5 12h3" />
    </svg>
  );
}

function CardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 9.5h19M6 14.5h4" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.5-6.5 8-6.5S20 17 20 21" />
    </svg>
  );
}

export default function Nav() {
  const pathname = usePathname();
  const { d } = useI18n();
  // La scheda è di UN locale: la voce punta a quello che si sta guardando,
  // lo stesso che sceglie la tendina della home (v. useVenueChoice)
  const { venues } = useVenues();
  const { venueId } = useVenueChoice();
  const venue = currentVenue(venues ?? null, venueId);

  const items = [
    { href: '/', label: d.nav.home, short: d.nav.home, Icon: HomeIcon },
    { href: '/piatti', label: d.nav.dishes, short: d.nav.dishes, Icon: PlateIcon },
    { href: '/menu', label: d.nav.menus, short: d.nav.menus, Icon: MenuIcon },
    // Senza locali non c'è nessuna scheda da aprire: la voce non c'è, invece
    // di esserci e non portare da nessuna parte
    ...(venue
      ? [
          {
            href: `/locale/${venue.id}`,
            label: d.nav.card,
            short: d.nav.cardShort,
            Icon: CardIcon,
          },
        ]
      : []),
    // Gli abbonamenti sono finiti DENTRO Account (01/09): finché sono un
    // tappo, una voce di primo livello prometteva più di quanto c'è
    { href: '/account', label: d.nav.account, short: d.nav.account, Icon: UserIcon },
  ];

  function isActive(href: string) {
    if (href === '/') return pathname === '/';
    // la scheda di QUALSIASI locale accende la voce, anche dopo un cambio
    if (href.startsWith('/locale')) return pathname.startsWith('/locale');
    // gli abbonamenti stanno dentro Account, quindi accendono Account
    if (href === '/account') return pathname.startsWith('/account') || pathname.startsWith('/abbonamenti');
    return pathname.startsWith(href);
  }

  return (
    <>
      {/* Sidebar desktop */}
      {/* Sticky a tutta altezza: resta ferma anche se la pagina scorre */}
      <aside className="hidden md:flex md:sticky md:top-0 md:h-screen w-60 shrink-0 flex-col overflow-y-auto border-r border-gray-200 bg-white">
        <div className="px-5 py-6">
          <span className="text-lg font-semibold text-gray-900">{d.common.appName}</span>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {items.map(({ href, label, Icon }) => (
            <div key={href}>
              <Link
                href={href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive(href)
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
              {/* Qui c'era il sottomenu con l'elenco dei locali. È sparito con
                  la panoramica: il locale si cambia dalla tendina in cima a
                  "/", e due modi di cambiarlo che portano in due posti diversi
                  (il sottomenu apriva l'editor) sono un modo di sbagliare. */}
            </div>
          ))}
        </nav>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white bottom-nav-safe md:hidden">
        <div className="flex h-16">
          {items.map(({ href, short, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-1 text-xs font-medium ${
                isActive(href) ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
              {/* Con quattro voci su uno schermo da 320px la colonna è larga
                  quanto "Abbonamenti": senza truncate l'etichetta andrebbe a
                  capo e la barra si alzerebbe sotto le icone. Meglio una
                  parola tagliata che una riga in più. */}
              <span className="w-full truncate text-center">{short}</span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
