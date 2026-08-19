// Google Analytics 4, as two plain script tags rather than a package.
//
// React 19 hoists a <script async src> out of the body and loads it once, so
// next/script buys nothing here that would justify another dependency. The
// same reasoning as the missing i18n library: this is a tag, not a framework.
//
// Client-side navigation is counted by GA4's enhanced measurement, which
// listens for history events and is on by default. Turning "page changes based
// on browser history events" off in the GA admin would leave only the first
// page of each visit counted, and this component would then need to send a
// page_view itself.

/** A GA4 measurement id and nothing else, since it goes into inline source. */
const MEASUREMENT_ID = /^G-[A-Z0-9]+$/i

export default function Analytics({
  // Inlined by `next build`, so production needs it set as a build argument.
  // Unset in dev, which is what stops local practice from reaching the report.
  id = process.env.NEXT_PUBLIC_GA_ID ?? '',
}: {
  id?: string
}) {
  const measurementId = id.trim()
  if (!MEASUREMENT_ID.test(measurementId)) return null

  return (
    <>
      <script async src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} />
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${measurementId}');`,
        }}
      />
    </>
  )
}
