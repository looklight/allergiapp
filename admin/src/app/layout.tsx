'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { AuthContext, useAuthState } from '@/lib/auth';
import AuthGuard from '@/components/AuthGuard';
import Sidebar from '@/components/Sidebar';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const authState = useAuthState();
  const pathname = usePathname();
  const isLoginPage = pathname === '/login';

  return (
    <html lang="it">
      <head>
        <title>AllergiApp Admin</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Applica il tema prima del paint per evitare il flash: scelta manuale
            salvata in localStorage, altrimenti preferenza di sistema. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AuthContext.Provider value={authState}>
          {isLoginPage ? (
            children
          ) : (
            <AuthGuard>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-background p-4 pt-20 md:p-6 md:pt-6 min-w-0">{children}</main>
              </div>
            </AuthGuard>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}
