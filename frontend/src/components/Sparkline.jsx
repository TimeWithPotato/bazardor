import { taka } from '../hooks'

// Small 7-day line of the Dhaka-wide median, with the official band behind it.
export default function Sparkline({ points, official }) {
  const W = 280, H = 90, P = 8
  const vals = points.map((p) => p.median_price).filter((v) => v != null)
  if (vals.length < 2) return <p className="text-sm text-slate">Not enough reports yet to show a trend.</p>

  const all = [...vals, ...(official ? [official.min_price, official.max_price] : [])]
  const lo = Math.min(...all) * 0.97, hi = Math.max(...all) * 1.03
  const x = (i) => P + (i / (points.length - 1)) * (W - 2 * P)
  const y = (v) => H - P - ((v - lo) / (hi - lo)) * (H - 2 * P)

  const path = points
    .map((p, i) => (p.median_price == null ? null : `${x(i)},${y(p.median_price)}`))
    .filter(Boolean).join(' L')
  const last = [...points].reverse().find((p) => p.median_price != null)
  const lastIdx = points.lastIndexOf(last)
  const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short' })

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        aria-label={`Median price over the last ${points.length} days, latest ${taka(last.median_price)}`}>
        {official && (
          <rect x={P} width={W - 2 * P} y={y(official.max_price)}
            height={y(official.min_price) - y(official.max_price)} fill="#1F5C3F" opacity="0.08" />
        )}
        <path d={`M${path}`} fill="none" stroke="#1F5C3F" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={x(lastIdx)} cy={y(last.median_price)} r="4" fill="#E3A21A" stroke="#fff" strokeWidth="2" />
      </svg>
      <figcaption className="mt-1 flex justify-between text-xs text-slate">
        <span>{fmt(points[0].date)}</span><span>Today</span>
      </figcaption>
    </figure>
  )
}
