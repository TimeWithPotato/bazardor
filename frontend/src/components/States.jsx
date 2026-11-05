export function ErrorNote({ error, onRetry }) {
  return (
    <div role="alert" className="rounded-xl border border-chili/30 bg-chili-soft px-4 py-3 text-chili">
      <p className="font-medium">{error.message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 text-sm font-semibold underline underline-offset-2">
          Try again
        </button>
      )}
    </div>
  )
}

export function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-line/60" />
      ))}
    </div>
  )
}

const STATUS = {
  accepted: { label: 'Accepted', cls: 'bg-moss-soft text-moss' },
  flagged: { label: 'Flagged', cls: 'bg-turmeric-soft text-[#8a5d00]' },
  rejected: { label: 'Rejected', cls: 'bg-chili-soft text-chili' },
}

export function StatusBadge({ status }) {
  const s = STATUS[status]
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${s.cls}`}>{s.label}</span>
}

export function DiffTag({ pct }) {
  if (pct == null) return null
  const up = pct > 0
  const flat = Math.abs(pct) < 1
  const cls = flat ? 'text-slate' : up ? 'text-chili' : 'text-moss'
  return (
    <span className={`tabular text-sm font-semibold ${cls}`}
      title="Median compared with the middle of the official range">
      {flat ? 'at official' : `${up ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`}
    </span>
  )
}
