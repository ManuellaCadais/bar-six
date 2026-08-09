import type { Metadata, Viewport } from 'next';
import { fontVariables } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'SIX Wowness Club — Bar',
    template: '%s · SIX Wowness Club',
  },
  description:
    'Cardápio digital do bar da SIX Sport Life. Escaneie, monte seu pedido e acompanhe em tempo real.',
  applicationName: 'SIX Wowness Club',
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0B0A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
