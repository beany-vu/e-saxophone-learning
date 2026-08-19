'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { api, ApiError, type AdminUser } from '@/lib/api'
import { useAuth } from '@/lib/auth-context'
import { useI18n } from '@/lib/i18n-context'

/** A date the way a person reads one, or empty if there is nothing to show. */
function shortDate(iso: string) {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth()
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  // Which row has a panel open, and what has been typed into it. Both live
  // here rather than in the row so only one can ever be open at a time.
  const [passwordFor, setPasswordFor] = useState<AdminUser | null>(null)
  const [password, setPassword] = useState('')
  const [deleteFor, setDeleteFor] = useState<AdminUser | null>(null)
  const [typedEmail, setTypedEmail] = useState('')

  const load = useCallback(() => {
    api
      .listUsers()
      .then((r) => {
        setUsers(r.users)
        setError(null)
      })
      .catch((err) => {
        // A 403 here is not a fault: it is an ordinary account on an admin
        // page, and the page below says so in plain words.
        if (!(err instanceof ApiError && err.status === 403)) {
          setError(err instanceof Error ? err.message : 'could not load accounts')
        }
        setUsers([])
      })
  }, [])

  useEffect(() => {
    if (user?.isAdmin) load()
  }, [user?.isAdmin, load])

  if (authLoading) return <p className="muted">{t('admin.loading')}</p>

  if (!user) {
    return (
      <div className="panel" style={{ maxWidth: 480 }}>
        <p className="muted">{t('admin.notAllowed')}</p>
        <Link href="/login">
          <button>{t('nav.login')}</button>
        </Link>
      </div>
    )
  }

  // The page is hidden from the nav for everyone else, but a typed URL still
  // lands here, and the API would refuse anyway. Say why rather than showing
  // an empty table.
  if (!user.isAdmin) {
    return (
      <div className="panel" style={{ maxWidth: 480 }}>
        <h1>{t('admin.title')}</h1>
        <p className="muted">{t('admin.notAllowed')}</p>
      </div>
    )
  }

  async function act(id: string, run: () => Promise<unknown>, done: string) {
    setBusyId(id)
    setError(null)
    setNotice(null)
    try {
      await run()
      setNotice(done)
      load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'that did not work')
    } finally {
      setBusyId(null)
    }
  }

  function practice(u: AdminUser) {
    if (u.sessions === 0) return t('admin.neverPractised')
    const accuracy = u.notesPlayed === 0 ? 0 : Math.round((u.correctNotes / u.notesPlayed) * 100)
    const summary = t('admin.practiceSummary', {
      sessions: u.sessions,
      notes: u.notesPlayed,
      accuracy,
    })
    const last = shortDate(u.lastPracticedAt)
    return last ? `${summary} - ${t('admin.lastPractised', { date: last })}` : summary
  }

  return (
    <>
      <h1>{t('admin.title')}</h1>
      <p className="muted">{t('admin.intro')}</p>

      {error && <p className="error">{error}</p>}
      {notice && <p className="muted">{notice}</p>}

      {users === null ? (
        <p className="muted">{t('admin.loading')}</p>
      ) : (
        <div className="panel">
          <p className="muted" style={{ marginTop: 0 }}>
            {t('admin.count', { n: users.length })}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>{t('admin.colUser')}</th>
                  <th>{t('admin.colEmail')}</th>
                  <th>{t('admin.colRole')}</th>
                  <th>{t('admin.colJoined')}</th>
                  <th>{t('admin.colPractice')}</th>
                  <th>{t('admin.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const self = u.id === user.id
                  const busy = busyId === u.id
                  return (
                    <tr key={u.id}>
                      <td>
                        {u.displayName}
                        {self && <span className="muted"> ({t('admin.you')})</span>}
                      </td>
                      <td className="mono">{u.email}</td>
                      <td>{u.isAdmin ? t('admin.roleAdmin') : t('admin.roleLearner')}</td>
                      <td>{shortDate(u.createdAt)}</td>
                      <td className="muted">{practice(u)}</td>
                      <td>
                        <div className="row" style={{ gap: 6 }}>
                          {/* Demoting or deleting yourself is refused by the
                              API too; not offering it is friendlier than
                              letting the click fail. */}
                          <button
                            className="ghost"
                            disabled={busy || (self && u.isAdmin)}
                            onClick={() =>
                              act(
                                u.id,
                                () => api.setUserAdmin(u.id, !u.isAdmin),
                                t(u.isAdmin ? 'admin.demoted' : 'admin.promoted', {
                                  email: u.email,
                                }),
                              )
                            }
                          >
                            {u.isAdmin ? t('admin.demote') : t('admin.promote')}
                          </button>
                          <button
                            className="ghost"
                            disabled={busy}
                            onClick={() => {
                              setPasswordFor(u)
                              setPassword('')
                              setDeleteFor(null)
                              setNotice(null)
                            }}
                          >
                            {t('admin.resetPassword')}
                          </button>
                          <button
                            className="ghost"
                            disabled={busy || self}
                            onClick={() => {
                              setDeleteFor(u)
                              setTypedEmail('')
                              setPasswordFor(null)
                              setNotice(null)
                            }}
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {passwordFor && (
        <div className="panel" style={{ maxWidth: 460, borderColor: 'var(--accent)' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.newPassword', { email: passwordFor.email })}</h2>
          <p className="muted">{t('admin.passwordHint')}</p>
          <div className="field">
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-label={t('admin.newPassword', { email: passwordFor.email })}
            />
          </div>
          <div className="row">
            <button
              disabled={password.length < 8 || busyId === passwordFor.id}
              onClick={() => {
                const target = passwordFor
                act(target.id, () => api.setUserPassword(target.id, password), t('admin.passwordSet'))
                setPasswordFor(null)
                setPassword('')
              }}
            >
              {t('admin.setIt')}
            </button>
            <button className="ghost" onClick={() => setPasswordFor(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {deleteFor && (
        <div className="panel" style={{ maxWidth: 460, borderColor: 'var(--bad)' }}>
          <h2 style={{ marginTop: 0 }}>{t('admin.deleteHeading', { email: deleteFor.email })}</h2>
          <p className="error">{t('admin.deleteWarning')}</p>
          <div className="field">
            <label htmlFor="confirm-email">{t('admin.deleteConfirmHint')}</label>
            <input
              id="confirm-email"
              value={typedEmail}
              onChange={(e) => setTypedEmail(e.target.value)}
            />
          </div>
          <div className="row">
            {/* Typing the address out is the whole guard: there is no undo
                behind this button. */}
            <button
              disabled={typedEmail.trim().toLowerCase() !== deleteFor.email || busyId === deleteFor.id}
              onClick={() => {
                const target = deleteFor
                act(target.id, () => api.deleteUser(target.id), t('admin.deleteConfirmed'))
                setDeleteFor(null)
                setTypedEmail('')
              }}
            >
              {t('common.delete')}
            </button>
            <button className="ghost" onClick={() => setDeleteFor(null)}>
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
