// Thin wrapper over fetch. Every call is same-origin (/api/... is proxied to
// the Go service by next.config.mjs), and credentials:'include' makes the
// browser send the session cookie.

export type User = { id: string; email: string; displayName: string }

export type SessionBrief = {
  id: string
  source: string
  durationSeconds: number
  notesPlayed: number
  startedAt: string
}

/** How one warm-up or song has gone so far. */
export type ItemStat = {
  item: string
  source: string
  timesPlayed: number
  bestAccuracy: number
  totalSeconds: number
  lastPlayedAt: string
}

export type Summary = {
  totalSessions: number
  totalNotes: number
  totalSeconds: number
  noteCounts: Record<string, number>
  recentSessions: SessionBrief[]
  itemStats: ItemStat[]
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  const text = await res.text()
  const body = text ? JSON.parse(text) : {}
  if (!res.ok) throw new ApiError(res.status, body.error || `request failed (${res.status})`)
  return body as T
}

export const api = {
  signup: (email: string, password: string, displayName?: string) =>
    request<User>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName }),
    }),

  login: (email: string, password: string) =>
    request<User>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request<{ status: string }>('/api/auth/logout', { method: 'POST' }),

  me: () => request<User>('/api/auth/me'),

  summary: () => request<Summary>('/api/practice/summary'),

  saveSession: (payload: {
    source: string
    /** Which warm-up or song, when the session was one. */
    item?: string
    durationSeconds: number
    notesPlayed: number
    correctNotes?: number
    wrongNotes?: number
    noteCounts: Record<string, number>
  }) =>
    request<{ id: string }>('/api/practice/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
}
