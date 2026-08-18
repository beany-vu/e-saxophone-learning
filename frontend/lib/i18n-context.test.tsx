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
