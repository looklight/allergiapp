import './globals.css';
import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'AllergiApp Partner',
  description: 'Gestisci le vetrine del tuo locale su AllergiApp.',
  // portale in test: v. src/app/robots.ts
  robots: { index: false, follow: false },
  // Installabile su home screen. I file stanno in public/ ed escono dal muro
  // basic auth: il browser scarica il manifest SENZA credenziali (v. middleware).
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Partner', statusBarStyle: 'default' },
  // Next emette già lo standard `mobile-web-app-capable`; questo è il nome
  // storico che iOS riconosce da sempre, per le versioni più vecchie.
  other: { 'apple-mobile-web-app-capable': 'yes' },
};

// viewport-fit=cover serve a env(safe-area-inset-*), cioè allo spazio sotto la
// bottom nav su iPhone. Va dichiarato qui: scritto a mano nell'<head> Next ci
// aggiungeva comunque il suo viewport di default e lo annullava.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#F9FAFB',
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
