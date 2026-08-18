import Link from 'next/link'
import ThisWeek from '@/components/ThisWeek'

export default function Home() {
  return (
    <>
      <h1>YDS-120 practice tracker</h1>
      <p className="muted">
        A course, a fingering chart and a listener for the Yamaha YDS-120. The app hears what you
        play, over the USB cable or through the microphone, and keeps your practice history.
      </p>

      <ThisWeek />

      <div className="panel">
        <h2>Start here</h2>
        <ol style={{ margin: 0, paddingLeft: 20, color: 'var(--muted)' }}>
          <li>
            Set up an input on the <Link href="/monitor">Monitor</Link>: the USB cable needs MIDI
            controller mode on the instrument, or use the microphone and no cable at all
          </li>
          <li>Use Chrome or Edge. Firefox and Safari do not implement Web MIDI</li>
          <li>
            Blow with no keys pressed and press <strong>Match to open C#</strong>, so the app names
            notes the way your instrument does
          </li>
          <li>
            Open <Link href="/learn">Learn</Link> and do this week&apos;s exercises
          </li>
        </ol>
      </div>

      <div className="row">
        <Link href="/learn">
          <button>Start this week</button>
        </Link>
        <Link href="/monitor">
          <button className="ghost">Open Monitor</button>
        </Link>
        <Link href="/exercises">
          <button className="ghost">Scale trainer</button>
        </Link>
        <Link href="/progress">
          <button className="ghost">See progress</button>
        </Link>
      </div>
    </>
  )
}
