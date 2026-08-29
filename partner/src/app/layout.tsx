import './globals.css';
import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'AllergiApp Partner',
  description: 'Gestisci le vetrine del tuo locale su AllergiApp.',
  // portale in test: v. src/app/robots.ts
  robots: { index: false, follow: false },
};

// viewport-fit=cover serve a env(safe-area-inset-*), cioè allo spazio sotto la
// bottom nav su iPhone. Va dichiarato qui: scritto a mano nell'<head> Next ci
// aggiungeva comunque il suo viewport di default e lo annullava.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// L'attributo lang qui è il valore di partenza: I18nProvider lo riallinea
// alla lingua scelta appena il client si idrata.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="bg-gray-50 text-gray-900 antialiased">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
