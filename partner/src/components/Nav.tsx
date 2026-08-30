'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';
import { useShowcases } from '@/lib/showcases';

function StorefrontIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l1.5-5h15L21 9" />
      <path d="M3 9a3 3 0 006 0 3 3 0 006 0 3 3 0 006 0" />
      <path d="M4.5 11.5V20h15v-8.5" />
      <path d="M9.5 20v-5h5v5" />
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
  const { showcases } = useShowcases();

  const items = [
    { href: '/', label: d.nav.showcase, Icon: StorefrontIcon },
    { href: '/piatti', label: d.nav.dishes, Icon: PlateIcon },
    { href: '/abbonamenti', label: d.nav.subscriptions, Icon: CardIcon },
    { href: '/account', label: d.nav.account, Icon: UserIcon },
  ];

  function isActive(href: string) {
    // l'editor /vetrina/[id] appartiene alla voce "Vetrine"
    return href === '/'
      ? pathname === '/' || pathname.startsWith('/vetrina')
      : pathname.startsWith(href);
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
              {/* Sottomenu vetrine: solo navigazione, si crea/elimina dalla lista */}
              {href === '/' && showcases && showcases.length > 0 && (
                <div className="mt-1 space-y-0.5 pl-9">
                  {showcases.map((s) => (
                    <Link
                      key={s.id}
                      href={`/vetrina/${s.id}`}
                      className={`block truncate rounded-md px-2 py-1.5 text-[13px] transition-colors ${
                        pathname === `/vetrina/${s.id}`
                          ? 'bg-gray-100 font-medium text-gray-900'
                          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                    >
                      {s.venueName.trim() || d.home.unnamed}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* Bottom nav mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-gray-200 bg-white bottom-nav-safe md:hidden">
        <div className="flex h-16">
          {items.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-1 text-xs font-medium ${
                isActive(href) ? 'text-gray-900' : 'text-gray-500'
              }`}
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
