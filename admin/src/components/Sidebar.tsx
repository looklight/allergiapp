'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/restaurants', label: 'Ristoranti' },
  { href: '/users', label: 'Utenti' },
  { href: '/media', label: 'Media' },
  { href: '/reports', label: 'Segnalazioni' },
  { href: '/announcements', label: 'Annunci' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [hasActiveAnnouncement, setHasActiveAnnouncement] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'));
    // Finché l'utente non sceglie manualmente, segue le preferenze di sistema.
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme')) return; // override manuale presente
      document.documentElement.classList.toggle('dark', e.matches);
      setIsDark(e.matches);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  useEffect(() => {
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
    supabase
      .from('announcements')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .then(({ count }) => setHasActiveAnnouncement((count ?? 0) > 0));
  }, [pathname]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const navBody = (
    <>
      <Link href="/dashboard" className="block p-4 border-b border-sidebar-border hover:bg-sidebar-accent-hover transition-colors">
        <h1 className="text-lg font-bold">AllergiApp</h1>
        <p className="text-xs text-sidebar-muted">Admin</p>
      </Link>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-3 py-2.5 rounded text-sm mb-1 ${
              pathname.startsWith(item.href)
                ? 'bg-sidebar-accent text-sidebar-foreground'
                : 'text-sidebar-muted hover:bg-sidebar-accent-hover'
            }`}
          >
            {item.label}
            {item.href === '/reports' && pendingCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[1.25rem] h-5 flex items-center justify-center px-1.5">
                {pendingCount}
              </span>
            )}
            {item.href === '/announcements' && hasActiveAnnouncement && (
              <span className="w-2 h-2 rounded-full bg-green-400" />
            )}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-sidebar-border flex items-center justify-between">
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-sm text-sidebar-muted hover:text-sidebar-foreground py-1"
        >
          Esci
        </button>
        <button
          onClick={toggleTheme}
          className="text-sidebar-muted hover:text-sidebar-foreground p-1"
          aria-label={isDark ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
          title={isDark ? 'Tema chiaro' : 'Tema scuro'}
        >
          {isDark ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar text-sidebar-foreground flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-baseline gap-2">
          <h1 className="text-base font-bold">AllergiApp</h1>
          <span className="text-xs text-sidebar-muted">Admin</span>
        </Link>
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
          <aside className="absolute top-0 left-0 w-64 max-w-[80%] h-full bg-sidebar text-sidebar-foreground flex flex-col">
            <div className="flex justify-end p-2">
              <button
                onClick={() => setOpen(false)}
                className="p-2 text-sidebar-muted hover:text-sidebar-foreground"
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
      <aside className="hidden md:flex w-48 bg-sidebar text-sidebar-foreground h-screen sticky top-0 flex-col">
        {navBody}
      </aside>
    </>
  );
}
