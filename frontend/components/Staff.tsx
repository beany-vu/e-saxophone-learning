'use client'

import { staffNote, STAFF_TOP } from '@/lib/staff'

// A melody drawn on the treble staff, which is what saxophone music uses.
// Deliberately plain: no stems, no beams, no bar lines. It exists so you learn
// where a note sits on the page, not to replace printed music.

const LINE_GAP = 10 // pixels between staff lines
const HALF = LINE_GAP / 2 // one step is half a gap
const NOTE_SPACING = 30
const LEFT_PAD = 34
const TOP_PAD = 42 // room for ledger lines above the staff

// The bottom line's y, with everything measured up from it.
const BASELINE = TOP_PAD + STAFF_TOP * HALF

const yFor = (step: number) => BASELINE - step * HALF

export default function Staff({
  notes,
  current,
  lyrics,
}: {
  notes: number[]
  /** Index of the note to highlight, if any. */
  current?: number | null
  lyrics?: string[]
}) {
  const width = LEFT_PAD + Math.max(1, notes.length) * NOTE_SPACING + 16
  const height = BASELINE + 46

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={`Staff notation, ${notes.length} notes`}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* The five lines. */}
      {[0, 2, 4, 6, 8].map((step) => (
        <line
          key={step}
          x1={8}
          x2={width - 8}
          y1={yFor(step)}
          y2={yFor(step)}
          stroke="var(--line)"
          strokeWidth="1"
        />
      ))}

      {/* A treble clef, drawn as its letter rather than a glyph we would have
          to embed a font for. The G line is the one it names. */}
      <text
        x={12}
        y={yFor(2) + 6}
        fontSize="20"
        fontStyle="italic"
        fontWeight="700"
        fill="var(--muted)"
      >
        G
      </text>

      {notes.map((midi, i) => {
        const note = staffNote(midi)
        const x = LEFT_PAD + i * NOTE_SPACING + NOTE_SPACING / 2
        const y = yFor(note.step)
        const on = current === i
        const colour = on ? 'var(--accent)' : 'var(--text)'

        return (
          <g key={i} aria-label={`note ${i + 1}`}>
            {note.ledgerLines.map((step) => (
              <line
                key={step}
                x1={x - 9}
                x2={x + 9}
                y1={yFor(step)}
                y2={yFor(step)}
                stroke="var(--line)"
                strokeWidth="1"
              />
            ))}
            {note.accidental && (
              <text x={x - 20} y={y + 4} fontSize="12" fill={colour}>
                {note.accidental === '#' ? '♯' : '♭'}
              </text>
            )}
            <ellipse cx={x} cy={y} rx="5.5" ry="4.2" fill={colour} transform={`rotate(-20 ${x} ${y})`} />
            {/* Stem: down on high notes, up on low ones, as engraving does. */}
            <line
              x1={note.step >= 4 ? x - 5 : x + 5}
              x2={note.step >= 4 ? x - 5 : x + 5}
              y1={y}
              y2={note.step >= 4 ? y + 26 : y - 26}
              stroke={colour}
              strokeWidth="1.4"
            />
            {lyrics?.[i] && (
              <text x={x} y={height - 6} fontSize="10" textAnchor="middle" fill="var(--muted)">
                {lyrics[i]}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
