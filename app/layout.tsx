import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Thai, Noto_Serif_Thai } from 'next/font/google';
import { NavDataProvider } from '@/components/layout/NavData';
import { listLessonSlugs } from '@/lib/content';
import { SUBJECTS } from '@/lib/subjects';
import { BASE_PATH, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';
import './globals.css';

const thai = IBM_Plex_Sans_Thai({
  subsets: ['thai', 'latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-thai',
  display: 'swap',
});

// Editorial headlines: a Thai serif that pairs with Plex Sans Thai for body text.
const display = Noto_Serif_Thai({
  subsets: ['thai', 'latin'],
  weight: ['500', '600', '700'],
  variable: '--font-display-thai',
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
  themeColor: '#faf9f6',
  colorScheme: 'light',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The "js" class is added before first paint so scroll reveals start hidden only when JS can show them.
    <html lang="th" className={`${thai.variable} ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh font-sans antialiased">
        {/* First thing in <body> (in <head> it made hydration fail intermittently). */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
        <NavDataProvider lessonSlugs={Object.fromEntries(SUBJECTS.map((s) => [s.id, listLessonSlugs(s.id)]))}>
          {children}
        </NavDataProvider>
      </body>
    </html>
  );
}
