import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/lib/auth-context'
import { InputProvider } from '@/lib/input-context'
import { I18nProvider } from '@/lib/i18n-context'
import Nav from '@/components/Nav'

export const metadata: Metadata = {
  title: 'e-Saxophone Practice',
  description: 'Practice tracking for digital saxophones, made for the Yamaha YDS-120',
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
        <I18nProvider>
          <AuthProvider>
            <InputProvider>
              <Nav />
              <div className="container">{children}</div>
            </InputProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  )
}
