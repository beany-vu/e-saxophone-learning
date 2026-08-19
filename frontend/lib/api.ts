// Thin wrapper over fetch. Every call is same-origin (/api/... is proxied to
// the Go service by next.config.mjs), and credentials:'include' makes the
// browser send the session cookie.

export type User = {
  id: string
  email: string
  displayName: string
  /** Empty until the learner picks dates. Per account, not per browser. */
  courseStart: string
  courseTargetEnd: string
  /** Weeks of the course ticked off, ascending. */
  courseWeeksDone: number[]
  /** Whether this account may manage other accounts. */
  isAdmin: boolean
}

/** One row of the user list, which only admins can fetch. */
export type AdminUser = {
  id: string
  email: string
  displayName: string
  isAdmin: boolean
  createdAt: string
  sessions: number
  notesPlayed: number
  correctNotes: number
  secondsPractised: number
  /** Empty when they have never saved a session. */
  lastPracticedAt: string
}

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

  setCourseDates: (startDate: string, targetEnd: string, weeksDone?: number[]) =>
    request<{ status: string }>('/api/practice/course', {
      method: 'PUT',
      body: JSON.stringify({ startDate, targetEnd, weeksDone }),
    }),

  saveSession: (payload: {
    source: string
    /** Which warm-up or song, when the session was one. */
    item?: string
    durationSeconds: number
    notesPlayed: number
    correctNotes?: number
    wrongNotes?: number
    /** Times the bar had to wait, when the run was played in time. */
    stalls?: number
    /** Notes that landed inside the timing window. */
    onTimeNotes?: number
    noteCounts: Record<string, number>
  }) =>
    request<{ id: string }>('/api/practice/sessions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // ---- Admin. Every one of these 403s for an ordinary account. ----

  listUsers: () => request<{ users: AdminUser[] }>('/api/admin/users'),

  setUserAdmin: (id: string, isAdmin: boolean) =>
    request<{ id: string; isAdmin: boolean }>(`/api/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isAdmin }),
    }),

  deleteUser: (id: string) =>
    request<{ status: string }>(`/api/admin/users/${id}`, { method: 'DELETE' }),

  setUserPassword: (id: string, password: string) =>
    request<{ status: string }>(`/api/admin/users/${id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ password }),
    }),
}
