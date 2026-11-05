// Thin wrapper around fetch. Every API call in the app goes through here,
// so errors are handled in one place.

const BASE = import.meta.env.VITE_API_URL || ''

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(BASE + path, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    })
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    // FastAPI sends {detail: "..."} or, for validation errors, {detail: [{msg}]}
    const d = data?.detail
    const msg = Array.isArray(d) ? d.map((e) => e.msg.replace('Value error, ', '')).join('. ') : d
    throw new Error(msg || `Request failed (${res.status})`)
  }
  return data
}

const qs = (params) => new URLSearchParams(
  Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
).toString()

export const api = {
  products: () => request('/api/products'),
  areas: () => request('/api/areas'),
  standardPrice: (productId) => request(`/api/products/standard-price?${qs({ product_id: productId })}`),
  feed: (productId, days = 7) => request(`/api/prices/feed?${qs({ product_id: productId, days })}`),
  trend: (productId, days = 7) => request(`/api/prices/trend?${qs({ product_id: productId, days })}`),
  recent: (params = {}) => request(`/api/prices/recent?${qs(params)}`),
  overview: () => request('/api/market/overview'),
  createUser: (nickname) => request('/api/users', { method: 'POST', body: JSON.stringify({ nickname }) }),
  getUser: (id) => request(`/api/users/${id}`),
  submit: (body) => request('/api/prices/submit', { method: 'POST', body: JSON.stringify(body) }),
}

// Safe localStorage helpers (can throw in private mode)
export const store = {
  get(key) { try { return JSON.parse(localStorage.getItem(key)) } catch { return null } },
  set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)) } catch { /* ignore */ } },
}
