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
  { href: '/announcements', label: 'Annunci' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    supabase
      .from('reports')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .then(({ count }) => setPendingCount(count ?? 0));
  }, [pathname]);

  return (
    <aside className="w-56 bg-gray-900 text-white h-screen sticky top-0 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-lg font-bold">AllergiApp</h1>
        <p className="text-xs text-gray-400">Admin</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm mb-1 ${
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
          className="text-sm text-gray-400 hover:text-white"
        >
          Esci
        </button>
      </div>
    </aside>
  );
}
