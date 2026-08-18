'use client'

import Link from 'next/link'
import ThisWeek from '@/components/ThisWeek'
import { useI18n } from '@/lib/i18n-context'

export default function Home() {
  const { t } = useI18n()

  return (
    <>
      <h1>{t('home.title')}</h1>
      <p className="muted">{t('home.intro')}</p>

      <ThisWeek />

      <div className="panel">
        <h2>{t('home.startHere')}</h2>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)' }}>
          <li>{t('home.step1')}</li>
          <li>{t('home.step2')}</li>
          <li>{t('home.step3')}</li>
          <li>{t('home.step4')}</li>
        </ol>
      </div>

      <div className="row">
        <Link href="/learn">
          <button>{t('home.startWeek')}</button>
        </Link>
        <Link href="/monitor">
          <button className="ghost">{t('home.openMonitor')}</button>
        </Link>
        <Link href="/exercises">
          <button className="ghost">{t('home.scaleTrainer')}</button>
        </Link>
        <Link href="/progress">
          <button className="ghost">{t('home.seeProgress')}</button>
        </Link>
      </div>
    </>
  )
}
