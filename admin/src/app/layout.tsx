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
      </head>
      <body>
        <AuthContext.Provider value={authState}>
          {isLoginPage ? (
            children
          ) : (
            <AuthGuard>
              <div className="flex min-h-screen">
                <Sidebar />
                <main className="flex-1 bg-gray-50 p-6">{children}</main>
              </div>
            </AuthGuard>
          )}
        </AuthContext.Provider>
      </body>
    </html>
  );
}
