'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'
import { LANGUAGES } from '@/lib/i18n'
import type { StringKey } from '@/lib/i18n'

const LINKS: { href: string; key: StringKey }[] = [
  { href: '/monitor', key: 'nav.monitor' },
  { href: '/learn', key: 'nav.learn' },
  { href: '/exercises', key: 'nav.exercises' },
  { href: '/progress', key: 'nav.progress' },
]

export default function Nav() {
  const path = usePathname()
  const { user, loading, logout } = useAuth()
  const { lang, setLang, t } = useI18n()

  return (
    <nav className="top">
      <div className="inner">
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="brand">
            YDS<span>-120</span>
          </div>
        </Link>
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className={`link${path === l.href ? ' active' : ''}`}>
            {t(l.key)}
          </Link>
        ))}
        <div className="spacer" />
        <select
          aria-label={t('nav.language')}
          value={lang}
          onChange={(e) => setLang(e.target.value as typeof lang)}
          style={{ width: 'auto', padding: '4px 8px', marginRight: 8 }}
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
        {loading ? null : user ? (
          <>
            <span className="link">{user.displayName}</span>
            <button className="ghost" onClick={() => logout()}>
              {t('nav.logout')}
            </button>
          </>
        ) : (
          <Link href="/login" className="link">
            {t('nav.login')}
          </Link>
        )}
      </div>
    </nav>
  )
}
