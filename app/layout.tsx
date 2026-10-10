import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai } from 'next/font/google';
import { Sidebar } from '@/components/layout/Sidebar';
import { themeInitScript } from '@/components/layout/ThemeToggle';
import { BASE_PATH, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const thai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  icons: {
    icon: [{ url: `${BASE_PATH}/favicon.svg`, type: 'image/svg+xml' }],
    apple: `${BASE_PATH}/apple-touch-icon.png`,
  },
  title: { default: SITE_NAME, template: `%s · ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    locale: 'th_TH',
    images: [{ url: `${SITE_URL}/og.png`, width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: { card: 'summary_large_image', images: [`${SITE_URL}/og.png`] },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f6f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1014' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // data-theme is set by the inline script before hydration.
    <html lang="th" className={`${thai.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        {/* First thing in <body>, so it runs before anything paints. Keep it out of <head>:
            there it made hydration fail intermittently (React #418 on about 1 load in 10),
            and the recovery re-render dropped data-theme. Measured 0 in 180 loads here. */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <Sidebar />
        <div className="lg:pl-[260px]">{children}</div>
      </body>
    </html>
  );
}
