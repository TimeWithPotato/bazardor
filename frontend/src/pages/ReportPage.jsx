import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, store } from '../api'
import { taka } from '../hooks'
import { ErrorNote, StatusBadge } from '../components/States'

const field = 'mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-[16px] focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/30'

export default function ReportPage({ products, areas }) {
  const [params] = useSearchParams()
  const [user, setUser] = useState(() => store.get('bazardor_user'))
  const [nickname, setNickname] = useState('')
  const [form, setForm] = useState({
    product_id: Number(params.get('p')) || '',
    area_id: store.get('bazardor_area') || '',
    price: '',
    vendor_location: '',
  })
  const [official, setOfficial] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  // Refresh the saved user so the trust score is current
  useEffect(() => {
    if (!user) return
    api.getUser(user.id).then(save).catch(() => { setUser(null); store.set('bazardor_user', null) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Show the official range as a hint for the chosen item
  useEffect(() => {
    setOfficial(null)
    if (form.product_id) api.standardPrice(form.product_id).then(setOfficial).catch(() => {})
  }, [form.product_id])

  const product = useMemo(() => products.find((p) => p.id === Number(form.product_id)), [products, form.product_id])

  function save(u) { setUser(u); store.set('bazardor_user', u) }
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function join(e) {
    e.preventDefault()
    setError(null); setBusy(true)
    try { save(await api.createUser(nickname)) } catch (err) { setError(err) } finally { setBusy(false) }
  }

  async function submit(e) {
    e.preventDefault()
    setError(null); setResult(null)
    const price = Number(form.price)
    if (!form.product_id || !form.area_id) return setError(new Error('Choose an item and an area.'))
    if (!price || price <= 0) return setError(new Error('Enter a price greater than 0.'))
    setBusy(true)
    try {
      const r = await api.submit({
        user_id: user.id,
        product_id: Number(form.product_id),
        area_id: Number(form.area_id),
        price,
        vendor_location: form.vendor_location,
      })
      setResult(r)
      save({ ...user, trust_score: r.trust_score })
      store.set('bazardor_area', Number(form.area_id))
      setForm((f) => ({ ...f, price: '' }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-[2rem] font-bold leading-tight md:text-4xl">Report a price</h1>
      <p className="mt-2 text-[17px] text-slate">
        Tell us what you paid or saw today. Reports that look wrong are held back, so ranges stay honest.
      </p>

      {!user ? (
        <form onSubmit={join} className="mt-8 rounded-2xl border border-line bg-white p-5">
          <label htmlFor="nick" className="font-semibold">Pick a nickname to start reporting</label>
          <p className="text-sm text-slate">It's shown next to your reports. No phone number or email needed.</p>
          <div className="mt-3 flex gap-2">
            <input id="nick" className={field + ' mt-0'} value={nickname} maxLength={40}
              onChange={(e) => setNickname(e.target.value)} placeholder="e.g. Arif" autoComplete="nickname" />
            <button disabled={busy} className="shrink-0 rounded-lg bg-leaf px-5 font-semibold text-paper hover:bg-leaf-dark disabled:opacity-60">
              Continue
            </button>
          </div>
          {error && <div className="mt-3"><ErrorNote error={error} /></div>}
        </form>
      ) : (
        <>
          <div className="mt-6 flex items-center justify-between rounded-xl bg-leaf-soft px-4 py-3 text-[15px]">
            <span>Reporting as <strong>{user.nickname}</strong></span>
            <span title="Goes up when your reports are accepted, down when they're flagged or rejected">
              Trust score <strong className="tabular">{user.trust_score}</strong>/100
            </span>
          </div>

          <form onSubmit={submit} noValidate className="mt-6 space-y-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="font-medium">Item</span>
                <select className={field} value={form.product_id} onChange={set('product_id')} required>
                  <option value="">Choose an item</option>
                  {products.map((p) => <option key={p.id} value={p.id}>{p.name_bn} ({p.name})</option>)}
                </select>
              </label>
              <label className="block">
                <span className="font-medium">Area</span>
                <select className={field} value={form.area_id} onChange={set('area_id')} required>
                  <option value="">Choose an area</option>
                  {areas.map((a) => <option key={a.id} value={a.id}>{a.name_bn} ({a.name})</option>)}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="font-medium">Price in taka{product ? ` per ${product.unit}` : ''}</span>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 mt-0.5 -translate-y-1/2 font-display text-lg text-slate">৳</span>
                <input className={field + ' pl-8 font-display text-xl tabular'} type="number" inputMode="decimal"
                  min="1" step="0.5" value={form.price} onChange={set('price')} placeholder="0" required />
              </div>
              {official && (
                <span className="mt-1 block text-sm text-slate">
                  Official rate today: {taka(official.min_price)}–{taka(official.max_price)}
                </span>
              )}
            </label>

            <label className="block">
              <span className="font-medium">Shop or market <span className="font-normal text-slate">(optional)</span></span>
              <input className={field} value={form.vendor_location} onChange={set('vendor_location')}
                maxLength={80} placeholder="e.g. Mirpur 1 kacha bazar" />
            </label>

            {error && <ErrorNote error={error} />}

            <button disabled={busy}
              className="w-full rounded-full bg-leaf px-6 py-3.5 text-[17px] font-semibold text-paper hover:bg-leaf-dark disabled:opacity-60">
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </form>

          {result && <ResultCard result={result} />}
        </>
      )}
    </div>
  )
}

function ResultCard({ result }) {
  const s = result.submission
  const tone = { accepted: 'border-moss/40', flagged: 'border-turmeric', rejected: 'border-chili/40' }[s.status]
  const next = {
    accepted: 'It now counts toward the price range for this area.',
    flagged: "It's saved but won't count until it's reviewed or other shoppers report similar prices.",
    rejected: "It's too far from the official rate to be real. Check the amount and unit, then send it again.",
  }[s.status]
  return (
    <div role="status" className={`mt-6 rounded-2xl border-2 bg-white p-5 ${tone}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-display text-lg font-semibold">
          {s.product_name_bn}, {s.area_name}: <span className="tabular">{taka(s.price)}</span>
        </p>
        <StatusBadge status={s.status} />
      </div>
      <p className="mt-2 font-medium">{s.reason}</p>
      <p className="mt-1 text-[15px] text-slate">{next}</p>
      {result.z_score != null && (
        <p className="mt-2 text-sm text-slate">Outlier score {result.z_score} (flagged above 3.5)</p>
      )}
      <Link to={`/?p=${s.product_id}`} className="mt-3 inline-block font-semibold text-leaf underline underline-offset-2">
        Compare {s.product_name.toLowerCase()} prices
      </Link>
    </div>
  )
}
