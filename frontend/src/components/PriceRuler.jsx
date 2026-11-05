import { taka, timeAgo } from '../hooks'
import { DiffTag } from './States'

// Picks round tick values (e.g. 40, 45, 50) that cover [lo, hi]
function ticks(lo, hi) {
  const span = hi - lo
  const step = [1, 2, 5, 10, 20, 25, 50, 100].find((s) => span / s <= 6) || 200
  const out = []
  for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) out.push(v)
  return out
}

/**
 * The core visual: every area gets a horizontal track on the same price
 * scale. The bar spans min to max of community reports, the dot is the
 * median, and the hatched band is the official TCB range, so you can see
 * at a glance which areas are cheaper or dearer than the government rate.
 */
export default function PriceRuler({ feed }) {
  const { areas, official, product, cheapest_area_id } = feed
  const values = areas.flatMap((a) => [a.min_price, a.max_price])
  if (official) values.push(official.min_price, official.max_price)
  const pad = (Math.max(...values) - Math.min(...values)) * 0.08 || 2
  const lo = Math.min(...values) - pad
  const hi = Math.max(...values) + pad
  const x = (v) => `${((v - lo) / (hi - lo)) * 100}%`
  const w = (a, b) => `${((b - a) / (hi - lo)) * 100}%`

  const Band = () => official && (
    <div className="official-band absolute inset-y-0"
      style={{ left: x(official.min_price), width: w(official.min_price, official.max_price) }} />
  )

  return (
    <div>
      {/* Axis */}
      <div className="grid grid-cols-1 md:grid-cols-[12.5rem_1fr_6.5rem] md:gap-4">
        <div className="hidden md:block" />
        <div className="relative h-6 text-xs text-slate tabular">
          {ticks(lo, hi).map((t) => (
            <span key={t} className="absolute -translate-x-1/2" style={{ left: x(t) }}>৳{t}</span>
          ))}
        </div>
        <div className="hidden md:block" />
      </div>

      <ol className="divide-y divide-line">
        {areas.map((a, i) => {
          const cheapest = a.area_id === cheapest_area_id
          return (
            <li key={a.area_id}
              className={`relative grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 py-3 md:grid-cols-[12.5rem_1fr_6.5rem] ${
                cheapest ? 'before:absolute before:-left-3 before:inset-y-2 before:w-1 before:rounded-full before:bg-turmeric' : ''}`}>
              <div className="min-w-0">
                <p className="font-display text-[17px] font-semibold leading-tight">
                  {a.area_name_bn}
                  {cheapest && (
                    <span className="ml-2 rounded-full bg-turmeric px-2 py-0.5 align-middle font-body text-[11px] font-semibold text-ink">
                      Cheapest
                    </span>
                  )}
                </p>
                <p className="text-sm text-slate">{a.area_name}, {a.reports} reports</p>
              </div>

              {/* Track */}
              <div className="relative col-span-2 h-7 rounded-md bg-white ring-1 ring-line md:col-span-1 md:order-none order-last"
                aria-label={`${a.area_name}: ${taka(a.min_price)} to ${taka(a.max_price)}, median ${taka(a.median_price)}`}>
                <Band />
                <div className={`grow-in absolute top-1/2 h-2 -translate-y-1/2 rounded-full ${cheapest ? 'bg-turmeric' : 'bg-leaf/70'}`}
                  style={{ left: x(a.min_price), width: `max(${w(a.min_price, a.max_price)}, 6px)`, animationDelay: `${i * 40}ms` }} />
                <div className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
                  style={{ left: x(a.median_price) }} />
              </div>

              <div className="text-right">
                <p className="font-display text-xl font-bold tabular leading-none">{taka(a.median_price)}</p>
                <DiffTag pct={a.vs_official_pct} />
              </div>
            </li>
          )
        })}
      </ol>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate">
        <span className="flex items-center gap-2"><span className="official-band inline-block h-3 w-6 rounded-sm" />Official TCB range</span>
        <span className="flex items-center gap-2"><span className="inline-block h-2 w-6 rounded-full bg-leaf/70" />Lowest to highest reported</span>
        <span className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-ink" />Median</span>
        <span>Per {product.unit}. Latest report {timeAgo(areas.reduce((m, a) => (a.last_reported > m ? a.last_reported : m), areas[0].last_reported))}.</span>
      </div>
    </div>
  )
}
