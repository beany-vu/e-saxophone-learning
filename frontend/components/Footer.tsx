'use client'

import { useI18n } from '@/lib/i18n-context'

/** Where the project lives. Also the invitation to send a fix. */
export const REPO_URL = 'https://github.com/beany-vu/e-saxophone-learning'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="site-footer">
      <span>{t('footer.openSource')}</span>{' '}
      <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
        {t('footer.contribute')}
      </a>
    </footer>
  )
}
