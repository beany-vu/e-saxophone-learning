import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminPage from './page'
import type { AdminUser, User } from '@/lib/api'

// The page is all guards and confirmations, so the API is a stand-in: what
// matters here is which calls the interface allows, not what the server does
// with them. The server's own guards are covered by the Go tests.
const listUsers = vi.fn()
const setUserAdmin = vi.fn()
const deleteUser = vi.fn()
const setUserPassword = vi.fn()

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>()
  return {
    ...actual,
    api: {
      listUsers: () => listUsers(),
      setUserAdmin: (id: string, isAdmin: boolean) => setUserAdmin(id, isAdmin),
      deleteUser: (id: string) => deleteUser(id),
      setUserPassword: (id: string, pw: string) => setUserPassword(id, pw),
    },
  }
})

let currentUser: User | null = null
vi.mock('@/lib/auth-context', () => ({
  useAuth: () => ({ user: currentUser, loading: false }),
}))

vi.mock('@/lib/i18n-context', async () => {
  const { translate } = await import('@/lib/i18n')
  return {
    useI18n: () => ({
      t: (key: string, values?: Record<string, string | number>) =>
        translate('en', key as never, values),
    }),
  }
})

function account(over: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'u2',
    email: 'learner@example.com',
    displayName: 'Learner',
    isAdmin: false,
    createdAt: '2026-08-01T10:00:00Z',
    sessions: 3,
    notesPlayed: 100,
    correctNotes: 90,
    secondsPractised: 600,
    lastPracticedAt: '2026-08-18T10:00:00Z',
    ...over,
  }
}

const me: User = {
  id: 'u1',
  email: 'admin@example.com',
  displayName: 'Admin',
  courseStart: '',
  courseTargetEnd: '',
  courseWeeksDone: [],
  isAdmin: true,
}

beforeEach(() => {
  vi.clearAllMocks()
  currentUser = { ...me }
  listUsers.mockResolvedValue({
    users: [
      // The admin has never practised, which keeps the two rows distinct and
      // covers the empty-history wording at the same time.
      account({
        id: 'u1',
        email: 'admin@example.com',
        displayName: 'Admin',
        isAdmin: true,
        sessions: 0,
        notesPlayed: 0,
        correctNotes: 0,
        lastPracticedAt: '',
      }),
      account(),
    ],
  })
})

describe('the users page', () => {
  it('tells an ordinary account why it is empty, rather than showing a table', async () => {
    currentUser = { ...me, isAdmin: false }
    render(<AdminPage />)
    expect(screen.getByText(/for admins/i)).toBeTruthy()
    expect(listUsers).not.toHaveBeenCalled()
  })

  it('lists the accounts with their role and practice', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('learner@example.com')).toBeTruthy())
    expect(screen.getByText('2 accounts')).toBeTruthy()
    expect(screen.getByText(/3 sessions, 100 notes, 90% right/)).toBeTruthy()
    expect(screen.getByText('never practised')).toBeTruthy()
  })

  it('promotes an ordinary account', async () => {
    setUserAdmin.mockResolvedValue({ id: 'u2', isAdmin: true })
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('learner@example.com')).toBeTruthy())

    fireEvent.click(screen.getByRole('button', { name: 'Make admin' }))
    await waitFor(() => expect(setUserAdmin).toHaveBeenCalledWith('u2', true))
  })

  // Both of these are refused by the API as well. The interface not offering
  // them is what stops an admin from locking themselves out by reflex.
  it('does not offer to demote or delete your own account', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('admin@example.com')).toBeTruthy())

    const ownRow = screen.getByText('admin@example.com').closest('tr')!
    const demote = Array.from(ownRow.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Remove admin'),
    )
    const remove = Array.from(ownRow.querySelectorAll('button')).find(
      (b) => b.textContent === 'Delete',
    )
    expect((demote as HTMLButtonElement).disabled).toBe(true)
    expect((remove as HTMLButtonElement).disabled).toBe(true)
  })

  it('holds the delete button shut until the email is typed out in full', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('learner@example.com')).toBeTruthy())

    const row = screen.getByText('learner@example.com').closest('tr')!
    fireEvent.click(Array.from(row.querySelectorAll('button')).find((b) => b.textContent === 'Delete')!)

    const confirm = screen.getByLabelText(/type the email/i)
    const doIt = screen.getAllByRole('button', { name: 'Delete' }).at(-1) as HTMLButtonElement
    expect(doIt.disabled).toBe(true)

    fireEvent.change(confirm, { target: { value: 'learner@example.co' } })
    expect(doIt.disabled).toBe(true)

    fireEvent.change(confirm, { target: { value: 'learner@example.com' } })
    expect(doIt.disabled).toBe(false)

    deleteUser.mockResolvedValue({ status: 'deleted' })
    fireEvent.click(doIt)
    await waitFor(() => expect(deleteUser).toHaveBeenCalledWith('u2'))
  })

  it('will not send a new password shorter than the API accepts', async () => {
    render(<AdminPage />)
    await waitFor(() => expect(screen.getByText('learner@example.com')).toBeTruthy())

    const row = screen.getByText('learner@example.com').closest('tr')!
    fireEvent.click(
      Array.from(row.querySelectorAll('button')).find((b) => b.textContent === 'Set password')!,
    )

    const field = screen.getByLabelText(/new password for/i)
    const setIt = screen.getByRole('button', { name: 'Set it' }) as HTMLButtonElement
    fireEvent.change(field, { target: { value: 'short' } })
    expect(setIt.disabled).toBe(true)

    fireEvent.change(field, { target: { value: 'longenough1' } })
    expect(setIt.disabled).toBe(false)

    setUserPassword.mockResolvedValue({ status: 'password set' })
    fireEvent.click(setIt)
    await waitFor(() => expect(setUserPassword).toHaveBeenCalledWith('u2', 'longenough1'))
  })
})
