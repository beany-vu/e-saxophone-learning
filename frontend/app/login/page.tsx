'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'

export default function LoginPage() {
  const { user, login, signup, logout } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'login') await login(email, password)
      else await signup(email, password, displayName)
      router.push('/monitor')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'something went wrong')
    } finally {
      setBusy(false)
    }
  }

  if (user) {
    return (
      <div className="panel" style={{ maxWidth: 420 }}>
        <h2>{t('login.signedIn')}</h2>
        <p className="muted">
          {t('login.loggedInAs', { name: user.displayName, email: user.email })}
        </p>
        <button className="ghost" onClick={() => logout()}>
          {t('nav.logout')}
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>{mode === 'login' ? t('login.logIn') : t('login.createAccount')}</h1>
      <p className="muted">{t('login.historyNote')}</p>

      <form className="panel" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="name">{t('login.displayName')}</label>
            <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">{t('login.email')}</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pw">
            {t('login.password')} {mode === 'signup' && t('login.passwordHint')}
          </label>
          <input
            id="pw"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="row">
          <button type="submit" disabled={busy}>
            {busy ? t('login.working') : mode === 'login' ? t('login.logIn') : t('login.signUp')}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? t('login.needAccountShort') : t('login.haveOneShort')}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
