'use client';

import { usePathname } from 'next/navigation';
import { AuthContext, useAuthState } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import AuthGuard from './AuthGuard';
import Nav from './Nav';

// Tutto ciò che ha bisogno del browser (sessione, lingua, nav). Sta fuori dal
// layout perché la radice deve restare un componente server: è l'unico posto
// da cui si possono esportare metadata e viewport.
export default function Shell({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <I18nProvider>
      <AuthContext.Provider value={authState}>
        {isLoginPage ? (
          children
        ) : (
          <AuthGuard>
            <div className="flex min-h-screen">
              <Nav />
              <main className="flex-1 pb-bottom-nav">
                <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
                  {children}
                </div>
              </main>
            </div>
          </AuthGuard>
        )}
      </AuthContext.Provider>
    </I18nProvider>
  );
}
