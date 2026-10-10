import './globals.css';
import type { Metadata } from 'next';
import { IBM_Plex_Sans_Arabic, Inter, Plus_Jakarta_Sans } from 'next/font/google';

import { ThemeProvider } from '@/components/theme/theme-provider';
import { AuthProvider } from '@/components/auth/auth-provider';
import { Toaster } from '@/components/ui/sonner';
import { SITE } from '@/lib/site';

// Brand guide: Plus Jakarta Sans (primary), Inter (secondary), IBM Plex Sans Arabic.
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });
const display = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-display' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600'],
  variable: '--font-arabic',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: 'Firdam — One Home for Your Muslim Life',
    template: '%s · Firdam',
  },
  description:
    'Firdam is the digital home for Muslim families: halal places near you, halal meal planning, prayer times, Ramadan, Quran and duas, family calendar, groceries and budget — in one calm, trusted app.',
  applicationName: 'Firdam',
  keywords: [
    'Firdam',
    'Muslim family app',
    'halal food near me',
    'halal meal planner',
    'prayer times',
    'Ramadan planner',
    'Quran',
    'duas',
    'zakat calculator',
    'family organizer',
  ],
  authors: [{ name: 'Firdam' }],
  creator: 'Firdam',
  publisher: 'Firdam',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8F4EE' },
    { media: '(prefers-color-scheme: dark)', color: '#18120F' },
  ],
  icons: {
    icon: [
      { url: '/images/logo.png', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo.png', type: 'image/png' },
    ],
  },
  openGraph: {
    type: 'website',
    siteName: 'Firdam',
    title: 'Firdam — One Home for Your Muslim Life',
    description:
      'Halal places, halal meals, prayer times, Ramadan, Quran and family life — together in one calm, trusted app for Muslim families.',
    images: [
      {
        url: '/images/logo.png',
        width: 1024,
        height: 1024,
        alt: 'Firdam — One Home for Your Muslim Life',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firdam — One Home for Your Muslim Life',
    description:
      'Halal places, halal meals, prayer times, Ramadan, Quran and family life — in one app for Muslim families.',
    images: ['/images/logo.png'],
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
        className={`${jakarta.variable} ${display.variable} ${inter.variable} ${arabic.variable} font-sans antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            {children}
            <Toaster richColors closeButton />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
