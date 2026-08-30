import './globals.css';
import type { Metadata, Viewport } from 'next';
import Shell from '@/components/Shell';

export const metadata: Metadata = {
  title: 'AllergiApp Partner',
  description: 'Gestisci le vetrine del tuo locale su AllergiApp.',
  // portale in test: v. src/app/robots.ts
  robots: { index: false, follow: false },
  // Installabile su home screen. I file stanno in public/.
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Partner',
    statusBarStyle: 'default',
    // Schermate di avvio iOS: le genera scripts/generate-pwa-assets.mjs, che
    // stampa questo stesso elenco. Dove nessuna misura corrisponde iOS mostra
    // una schermata del solo colore di fondo — il comportamento di prima.
    startupImage: [
      {
        url: '/splash/750x1334.png',
        media:
          '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1125x2436.png',
        media:
          '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1170x2532.png',
        media:
          '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1179x2556.png',
        media:
          '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1206x2622.png',
        media:
          '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/828x1792.png',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1242x2688.png',
        media:
          '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1284x2778.png',
        media:
          '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1290x2796.png',
        media:
          '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1320x2868.png',
        media:
          '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      {
        url: '/splash/1488x2266.png',
        media:
          '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1536x2048.png',
        media:
          '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1620x2160.png',
        media:
          '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1640x2360.png',
        media:
          '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/1668x2388.png',
        media:
          '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      {
        url: '/splash/2048x2732.png',
        media:
          '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
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
