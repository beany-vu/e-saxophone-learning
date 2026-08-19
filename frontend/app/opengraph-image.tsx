import { ImageResponse } from 'next/og'
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/seo'

// The card people see when the link is pasted into a chat. Drawn here rather
// than shipped as a file so it stays in step with the name and the palette,
// and so no binary asset has to be kept in the repository.
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export const alt = SITE_NAME

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: '#0f1115',
          color: '#e7e9ee',
          fontFamily: 'sans-serif',
        }}
      >
        {/* Satori refuses a div with more than one child unless the display
            is spelled out, and it will not infer it from the children. */}
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: -1 }}>
          <span>e</span>
          <span style={{ color: '#ffb454' }}>-Saxophone</span>
          <span>&nbsp;Learning</span>
        </div>
        <div style={{ fontSize: 34, color: '#9aa3b2', marginTop: 28, lineHeight: 1.35 }}>
          {SITE_DESCRIPTION}
        </div>
        <div style={{ fontSize: 26, color: '#4ea8ff', marginTop: 40 }}>
          USB MIDI or microphone · MIT licensed
        </div>
      </div>
    ),
    size,
  )
}
