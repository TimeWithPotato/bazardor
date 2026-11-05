import { useState } from 'react'
import { api } from '../api'
import { taka, timeAgo, useAsync } from '../hooks'
import { ErrorNote, Skeleton, StatusBadge } from '../components/States'

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'rejected', label: 'Rejected' },
]

export default function FeedPage({ products }) {
  const [status, setStatus] = useState('')
  const [productId, setProductId] = useState('')
  const feed = useAsync(() => api.recent({ status, product_id: productId, limit: 50 }), [status, productId])

  return (
    <div>
      <h1 className="font-display text-[2rem] font-bold leading-tight md:text-4xl">Live reports</h1>
      <p className="mt-2 max-w-xl text-[17px] text-slate">
        Every report, including the ones our filter held back, with the reason why.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div role="radiogroup" aria-label="Filter by status" className="flex rounded-full border border-line bg-white p-1">
          {FILTERS.map((f) => (
            <button key={f.value} role="radio" aria-checked={status === f.value} onClick={() => setStatus(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
                status === f.value ? 'bg-ink text-paper' : 'text-slate hover:text-ink'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select aria-label="Filter by item" value={productId} onChange={(e) => setProductId(e.target.value)}
          className="rounded-full border border-line bg-white px-4 py-2 text-sm">
          <option value="">All items</option>
          {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="mt-6">
        {feed.error && <ErrorNote error={feed.error} onRetry={feed.reload} />}
        {feed.loading && <Skeleton rows={8} />}
        {feed.data && !feed.loading && (
          feed.data.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line p-6 text-center text-slate">
              No reports match these filters.
            </p>
          ) : (
            <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
              {feed.data.map((s) => (
                <li key={s.id} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[1fr_8rem_6rem]">
                  <div className="min-w-0">
                    <p className="font-display text-[17px] font-semibold leading-tight">
                      {s.product_name_bn} <span className="font-body text-sm font-normal text-slate">{s.product_name}</span>
                    </p>
                    <p className="truncate text-sm text-slate">
                      {s.vendor_location || s.area_name}, by {s.reporter}, {timeAgo(s.created_at)}
                    </p>
                    {s.status !== 'accepted' && <p className="mt-0.5 text-sm text-ink/80">{s.reason}</p>}
                  </div>
                  <p className="text-right font-display text-xl font-bold tabular sm:order-none">
                    {taka(s.price)}<span className="font-body text-xs font-normal text-slate">/{s.unit}</span>
                  </p>
                  <div className="col-start-2 text-right sm:col-start-auto"><StatusBadge status={s.status} /></div>
                </li>
              ))}
            </ul>
          )
        )}
      </div>
    </div>
  )
}
