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
  title: {
    default: 'Firdam — Modular Life Management',
    template: '%s · Firdam',
  },
  description:
    'Firdam is a modern modular life management platform. Organize prayer times, family, finance, travel, shopping, health, and community in one calm, beautiful place.',
  keywords: [
    'life management',
    'productivity',
    'prayer times',
    'finance',
    'family',
    'modular app',
  ],
  authors: [{ name: 'Firdam' }],
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1518' },
  ],
  openGraph: {
    title: 'Firdam — Modular Life Management',
    description:
      'Organize every part of your life in one calm, beautiful place.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Firdam — Modular Life Management',
    description:
      'Organize every part of your life in one calm, beautiful place.',
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
