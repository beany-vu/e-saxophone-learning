'use client'

import { useI18n } from '@/lib/i18n-context'

/** Where the project lives. Also the invitation to send a fix. */
export const REPO_URL = 'https://github.com/beany-vu/e-saxophone-learning'

export default function Footer() {
  const { t } = useI18n()

  return (
    <footer className="site-footer">
      <p>
        <span>{t('footer.openSource')}</span>{' '}
        <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
          {t('footer.contribute')}
        </a>
      </p>
      <p>{t('footer.star')}</p>
      {/* One workshop, three doors: the sister projects link to each other. */}
      <p>
        {t('footer.more')}:{' '}
        <a href="https://beany-vu.github.io/michi-chat/" target="_blank" rel="noopener noreferrer">
          {t('footer.moreChat')}
        </a>
        {' · '}
        <a href="https://michi-vz.netlify.app/" target="_blank" rel="noopener noreferrer">
          {t('footer.moreVz')}
        </a>
        {' · '}
        <a href="https://hoang.body-and-binary.net/" target="_blank" rel="noopener noreferrer">
          {t('footer.moreMaker')}
        </a>
      </p>
    </footer>
  )
}
