import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { I18nProvider, useI18n } from '@/lib/i18n-context'

function Probe() {
  const { lang, setLang, t } = useI18n()
  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="text">{t('nav.learn')}</span>
      <span data-testid="values">{t('course.weekOf', { week: 2, total: 20 })}</span>
      <button onClick={() => setLang('fr')}>fr</button>
    </div>
  )
}

describe('the language switch', () => {
  beforeEach(() => localStorage.clear())

  it('starts in English so the server and the client agree', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('en')
    expect(screen.getByTestId('text').textContent).toBe('Learn')
  })

  it('switches every string to French at once', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    act(() => screen.getByText('fr').click())
    expect(screen.getByTestId('text').textContent).toBe('Apprendre')
    expect(screen.getByTestId('values').textContent).toBe('Semaine 2 sur 20')
  })

  it('remembers the choice for next time', () => {
    const first = render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    act(() => screen.getByText('fr').click())
    expect(localStorage.getItem('yds120.lang')).toBe('fr')
    first.unmount()

    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('text').textContent).toBe('Apprendre')
  })

  it('ignores a stored language it does not have', () => {
    localStorage.setItem('yds120.lang', 'de')
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('lang').textContent).toBe('en')
  })
})

function NoteProbe() {
  const { naming, setNaming, setLang, n } = useI18n()
  return (
    <div>
      <span data-testid="naming">{naming}</span>
      <span data-testid="note">{n(67)}</span>
      <button onClick={() => setNaming('solfege')}>solfege</button>
      <button onClick={() => setLang('fr')}>to-fr</button>
      <button onClick={() => setLang('nl')}>to-nl</button>
    </div>
  )
}

describe('note naming', () => {
  beforeEach(() => localStorage.clear())

  it('names notes with letters in English', () => {
    render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('note').textContent).toBe('G4')
  })

  it('switches to do re mi when asked', () => {
    render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    act(() => screen.getByText('solfege').click())
    expect(screen.getByTestId('note').textContent).toBe('sol4')
  })

  it('follows the language until the reader chooses for themselves', () => {
    const first = render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    act(() => screen.getByText('to-fr').click())
    expect(screen.getByTestId('note').textContent).toBe('sol4')
    act(() => screen.getByText('to-nl').click())
    expect(screen.getByTestId('note').textContent).toBe('G4')
    first.unmount()

    // Once chosen, the choice sticks across a language change.
    render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    act(() => screen.getByText('solfege').click())
    act(() => screen.getByText('to-nl').click())
    expect(screen.getByTestId('note').textContent).toBe('sol4')
  })

  it('remembers the naming for next time', () => {
    const first = render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    act(() => screen.getByText('solfege').click())
    first.unmount()
    render(
      <I18nProvider>
        <NoteProbe />
      </I18nProvider>,
    )
    expect(screen.getByTestId('naming').textContent).toBe('solfege')
  })
})
