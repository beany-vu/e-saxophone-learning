'use client'

import { isBlackKey, noteName, PIANO_HIGH, PIANO_LOW, pitchClassName } from '@/lib/notes'

type Props = {
  active: number[]
  /** Optional note to highlight as the one you should play next. */
  target?: number | null
  low?: number
  high?: number
  showLabels?: boolean
}

export default function Piano({
  active,
  target = null,
  low = PIANO_LOW,
  high = PIANO_HIGH,
  showLabels = true,
}: Props) {
  const all: number[] = []
  for (let n = low; n <= high; n++) all.push(n)

  const whites = all.filter((n) => !isBlackKey(n))
  const activeSet = new Set(active)

  return (
    <div className="piano">
      <div className="whites">
        {whites.map((n) => (
          <div
            key={n}
            className={`white${activeSet.has(n) ? ' active' : ''}${target === n ? ' target' : ''}`}
            title={noteName(n)}
          >
            {showLabels && pitchClassName(n) === 'C' && <div className="kb">{noteName(n)}</div>}
          </div>
        ))}
      </div>

      {/* Black keys sit on the seam between two white keys, so each one is
          positioned at the boundary after the white key below it. */}
      {whites.map((w, i) => {
        const black = w + 1
        if (!isBlackKey(black) || black > high) return null
        return (
          <div
            key={black}
            className={`black${activeSet.has(black) ? ' active' : ''}${target === black ? ' target' : ''}`}
            style={{ left: `${((i + 1) / whites.length) * 100}%` }}
            title={noteName(black)}
          />
        )
      })}
    </div>
  )
}
