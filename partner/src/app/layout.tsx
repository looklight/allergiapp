'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { AuthContext, useAuthState } from '@/lib/auth';
import { I18nProvider } from '@/lib/i18n';
import AuthGuard from '@/components/AuthGuard';
import Nav from '@/components/Nav';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="it">
      <head>
        <title>AllergiApp Partner</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
      </head>
      <body className="bg-gray-50 text-gray-900 antialiased">
        <I18nProvider>
          <AuthContext.Provider value={authState}>
            {isLoginPage ? (
              children
            ) : (
              <AuthGuard>
                <div className="flex min-h-screen">
                  <Nav />
                  <main className="flex-1 pb-bottom-nav md:pb-0">
                    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
                      {children}
                    </div>
                  </main>
                </div>
              </AuthGuard>
            )}
          </AuthContext.Provider>
        </I18nProvider>
      </body>
    </html>
  );
}
