import './globals.css';
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';

import { ThemeProvider } from '@/components/theme/theme-provider';
import { Toaster } from '@/components/ui/sonner';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-display',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://firdam.app'),
  title: {
    default: 'Firdam — Everything that matters. One place.',
    template: '%s · Firdam',
  },
  description:
    'Firdam is a modern life management platform. Organize family, finance, travel, shopping, health, community, and more — everything that matters, in one place.',
  applicationName: 'Firdam',
  keywords: [
    'Firdam',
    'life management',
    'productivity',
    'family',
    'finance',
    'travel',
    'shopping',
    'health',
    'community',
  ],
  authors: [{ name: 'Firdam' }],
  creator: 'Firdam',
  publisher: 'Firdam',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FBF7F4' },
    { media: '(prefers-color-scheme: dark)', color: '#14100D' },
  ],
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-icon.svg', type: 'image/svg+xml' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Firdam',
    title: 'Firdam — Everything that matters. One place.',
    description:
      'Firdam is a modern life management platform. Organize every part of your life in one calm, beautiful place.',
    images: [
      {
        url: '/opengraph-image.svg',
        width: 1200,
        height: 630,
        alt: 'Firdam — Everything that matters. One place.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firdam — Everything that matters. One place.',
    description:
      'A modern life management platform. Organize everything that matters in one calm, beautiful place.',
    images: ['/opengraph-image.svg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${display.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
