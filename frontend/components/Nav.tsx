'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const LINKS = [
  { href: '/monitor', label: 'Monitor' },
  { href: '/learn', label: 'Learn' },
  { href: '/exercises', label: 'Exercises' },
  { href: '/progress', label: 'Progress' },
]

export default function Nav() {
  const path = usePathname()
  const { user, loading, logout } = useAuth()

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
            {l.label}
          </Link>
        ))}
        <div className="spacer" />
        {loading ? null : user ? (
          <>
            <span className="link">{user.displayName}</span>
            <button className="ghost" onClick={() => logout()}>
              Log out
            </button>
          </>
        ) : (
          <Link href="/login" className="link">
            Log in
          </Link>
        )}
      </div>
    </nav>
  )
}
