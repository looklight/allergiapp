'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/restaurants', label: 'Ristoranti' },
  { href: '/users', label: 'Utenti' },
  { href: '/reports', label: 'Segnalazioni' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navBody = (
    <>
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">AllergiApp</h1>
        <p className="text-xs text-gray-400">Admin</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-3 py-2.5 rounded text-sm mb-1 ${
              pathname.startsWith(item.href)
                ? 'bg-gray-700 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            {item.label}
            {item.href === '/reports' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5">
                {pendingCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-gray-400 hover:text-white py-1"
        >
          Esci
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-gray-900 text-white flex items-center justify-between px-4 h-14">
        <div className="flex items-baseline gap-2">
          <h1 className="text-base font-bold">AllergiApp</h1>
          <span className="text-xs text-gray-400">Admin</span>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="relative p-2 -mr-2"
          aria-label="Apri menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute top-1 right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[1rem] h-4 flex items-center justify-center px-1">
              {pendingCount}
            </span>
          )}
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute top-0 left-0 w-64 max-w-[80%] h-full bg-gray-900 text-white flex flex-col">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-gray-400 hover:text-white"
                aria-label="Chiudi menu"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            {navBody}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-48 bg-gray-900 text-white h-screen sticky top-0 flex-col">
        {navBody}
      </aside>
    </>
  );
}
