import type { Metadata } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/seo'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { InputProvider } from '@/lib/input-context'
import { I18nProvider } from '@/lib/i18n-context'
import Nav from '@/components/Nav'
import Analytics from '@/components/Analytics'
import Footer from '@/components/Footer'

export const metadata: Metadata = {
  // Resolves every relative URL below, and the per page canonicals.
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    // Each page names itself first: a result reading "Scale trainer" is worth
    // more than six results all reading the site name.
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: { canonical: SITE_URL },
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
  },
  twitter: { card: 'summary_large_image', title: SITE_NAME, description: SITE_DESCRIPTION },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions inject attributes into <html> and <body> before React
    // hydrates (for example data-xt-extension-active), which React reports as a
    // hydration mismatch. suppressHydrationWarning only covers the element's own
    // attributes and text, not its children, so real mismatches inside the app
    // are still reported.
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <Analytics />
        <I18nProvider>
          <AuthProvider>
            <InputProvider>
              <Nav />
              <div className="container">{children}</div>
              <Footer />
            </InputProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
