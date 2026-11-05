import { useCallback, useEffect, useState } from 'react'

// Runs an async loader and tracks {data, error, loading}. `deps` re-run it.
export function useAsync(loader, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true })

  const run = useCallback(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    loader()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(run, [run])
  return { ...state, reload: run }
}

export const taka = (n) => (n == null ? '–' : `৳${Number(n).toLocaleString('en-IN', { maximumFractionDigits: 1 })}`)

export function timeAgo(iso) {
  // API returns UTC timestamps without a timezone suffix
  const then = new Date(iso.endsWith('Z') ? iso : iso + 'Z').getTime()
  const mins = Math.round((Date.now() - then) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} h ago`
  const days = Math.round(hrs / 24)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
