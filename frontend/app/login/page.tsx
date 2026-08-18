'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function LoginPage() {
  const { user, login, signup, logout } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
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
        <h2>Signed in</h2>
        <p className="muted">
          You are logged in as {user.displayName} ({user.email}).
        </p>
        <button className="ghost" onClick={() => logout()}>
          Log out
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 420 }}>
      <h1>{mode === 'login' ? 'Log in' : 'Create an account'}</h1>
      <p className="muted">Your practice history is stored against your account.</p>

      <form className="panel" onSubmit={submit}>
        {mode === 'signup' && (
          <div className="field">
            <label htmlFor="name">Display name (optional)</label>
            <input id="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </div>
        )}
        <div className="field">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="pw">Password {mode === 'signup' && '(at least 8 characters)'}</label>
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
            {busy ? 'Working...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login')
              setError(null)
            }}
          >
            {mode === 'login' ? 'Need an account?' : 'Already have one?'}
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </div>
  )
}
