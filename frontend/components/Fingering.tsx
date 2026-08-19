'use client'

import { SAX_KEYS, type SaxKeyId } from '@/lib/fingerings'

// A stylised saxophone key layout, seen as if the instrument were facing you.
// It is not to scale: every key is labelled, so it stays readable rather than
// pretty. Positions follow the real instrument's arrangement closely enough to
// find the key with your hands.
type Placed = { id: SaxKeyId; x: number; y: number; r: number; text: string }

const LAYOUT: Placed[] = [
  // Left thumb, behind the instrument.
  { id: 'oct', x: 22, y: 96, r: 13, text: '8' },
  // Palm side (left hand upper), drawn small since they are not covered here.
  // Left hand main keys.
  { id: 'lh1', x: 90, y: 62, r: 17, text: '1' },
  { id: 'bis', x: 62, y: 84, r: 9, text: 'bis' },
  { id: 'lh2', x: 90, y: 104, r: 17, text: '2' },
  { id: 'lh3', x: 90, y: 146, r: 17, text: '3' },
  // Left little finger cluster.
  { id: 'gsharp', x: 47, y: 176, r: 10, text: 'G#' },
  { id: 'lowCsharp', x: 47, y: 200, r: 10, text: 'C#' },
  { id: 'lowB', x: 25, y: 188, r: 10, text: 'B' },
  { id: 'lowBb', x: 25, y: 212, r: 10, text: 'Bb' },
  // Right hand side keys, worked with the side of the right index.
  { id: 'sideE', x: 133, y: 150, r: 9, text: 'E' },
  { id: 'sideC', x: 133, y: 172, r: 9, text: 'C' },
  { id: 'sideBb', x: 133, y: 194, r: 9, text: 'Bb' },
  // Right hand main keys.
  { id: 'rh1', x: 90, y: 210, r: 17, text: '4' },
  { id: 'rh2', x: 90, y: 252, r: 17, text: '5' },
  { id: 'rh3', x: 90, y: 294, r: 17, text: '6' },
  { id: 'fsharp', x: 124, y: 300, r: 9, text: 'F#' },
  // Right little finger.
  { id: 'lowEb', x: 128, y: 330, r: 10, text: 'Eb' },
  { id: 'lowC', x: 128, y: 354, r: 10, text: 'C' },
]

const labelFor = (id: SaxKeyId) => SAX_KEYS.find((k) => k.id === id)

export default function Fingering({
  keys,
  onToggle,
  size = 220,
  compact = false,
}: {
  /** Keys currently pressed. */
  keys: SaxKeyId[]
  /** When given, keys become clickable and this fires with the one clicked. */
  onToggle?: (key: SaxKeyId) => void
  size?: number
  /**
   * Drops the key labels, for the thumbnail under each note in a tune. At that
   * size the text is unreadable anyway, and the pattern of filled circles is
   * what you actually recognise.
   */
  compact?: boolean
}) {
  const pressed = new Set(keys)
  const interactive = Boolean(onToggle)

  return (
    <svg
      viewBox="0 0 160 380"
      width={size}
      height={(size * 380) / 160}
      role="img"
      aria-label={
        keys.length
          ? `Fingering: ${keys.map((k) => labelFor(k)?.label).join(', ')}`
          : 'No keys pressed'
      }
      style={{ maxWidth: '100%' }}
    >
      {/* The body, drawn behind everything else. */}
      <rect
        x="70"
        y="40"
        width="40"
        height="310"
        rx="20"
        fill="var(--panel-2)"
        stroke="var(--line)"
      />

      {LAYOUT.map((k) => {
        const on = pressed.has(k.id)
        return (
          // Deliberately no <title> child: React 19 treats <title> as page
          // metadata and hoists it to the document head, so one inside an SVG
          // renders differently on the server and the client, which is a
          // hydration error. The name lives in aria-label instead.
          <g
            key={k.id}
            aria-label={`${labelFor(k.id)?.label}, ${labelFor(k.id)?.finger}`}
            data-pressed={on ? 'true' : 'false'}
            onClick={onToggle ? () => onToggle(k.id) : undefined}
            style={{ cursor: interactive ? 'pointer' : 'default' }}
          >
            <circle
              cx={k.x}
              cy={k.y}
              r={k.r}
              fill={on ? 'var(--accent)' : 'var(--key-face)'}
              stroke={on ? 'var(--accent)' : 'var(--key-ring)'}
              // The thumbnail shrinks this 160-wide drawing to 34px, so a
              // ring has to be drawn about seven units thick to come out as a
              // visible one and a half pixels rather than a grey hair.
              strokeWidth={compact ? 7 : 2}
            />
            {!compact && (
              <text
                x={k.x}
                y={k.y + 4}
                textAnchor="middle"
                fontSize={k.r > 12 ? 12 : 8}
                fill={on ? '#1a1205' : 'var(--muted)'}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {k.text}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
