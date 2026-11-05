import { Link } from 'react-router-dom'
import { api } from '../api'
import { taka, useAsync } from '../hooks'
import { DiffTag, ErrorNote, Skeleton } from '../components/States'

export default function OverviewPage() {
  const ov = useAsync(() => api.overview(), [])

  return (
    <div>
      <h1 className="font-display text-[2rem] font-bold leading-tight md:text-4xl">All items</h1>
      <p className="mt-2 max-w-xl text-[17px] text-slate">
        What shoppers actually paid this week, next to the official rate.
      </p>

      <div className="mt-6">
        {ov.error && <ErrorNote error={ov.error} onRetry={ov.reload} />}
        {ov.loading && <Skeleton rows={10} />}
        {ov.data && (
          <div className="overflow-hidden rounded-2xl border border-line bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-line bg-leaf-soft/60 text-sm text-slate">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Item</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Official rate</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">People pay</th>
                  <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Cheapest area</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {ov.data.map((r) => (
                  <tr key={r.product.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link to={`/?p=${r.product.id}`} className="group block">
                        <span className="font-display text-[17px] font-semibold group-hover:text-leaf group-hover:underline">
                          {r.product.name_bn}
                        </span>
                        <span className="block text-sm text-slate">{r.product.name}, per {r.product.unit}</span>
                      </Link>
                    </td>
                    <td className="hidden px-4 py-3 tabular text-slate sm:table-cell">
                      {taka(r.official_min)}–{taka(r.official_max)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="block font-display text-lg font-bold tabular">{taka(r.community_median)}</span>
                      <DiffTag pct={r.vs_official_pct} />
                    </td>
                    <td className="hidden px-4 py-3 md:table-cell">{r.cheapest_area || '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
