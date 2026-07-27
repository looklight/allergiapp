'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n } from '@/lib/i18n';

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

function MapPinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-5.5-7-11a7 7 0 1114 0c0 5.5-7 11-7 11z" />
      <circle cx="12" cy="10" r="2.5" />
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

  const items = [
    { href: '/', label: d.nav.showcase, Icon: StorefrontIcon },
    { href: '/locale', label: d.nav.venue, Icon: MapPinIcon },
    { href: '/account', label: d.nav.account, Icon: UserIcon },
  ];

  function isActive(href: string) {
    return href === '/' ? pathname === '/' : pathname.startsWith(href);
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
            <Link
              key={href}
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
