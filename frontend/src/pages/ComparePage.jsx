import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { taka, useAsync } from '../hooks'
import PriceRuler from '../components/PriceRuler'
import ProductPicker from '../components/ProductPicker'
import Sparkline from '../components/Sparkline'
import { ErrorNote, Skeleton } from '../components/States'

export default function ComparePage({ products, loading }) {
  const [params, setParams] = useSearchParams()
  const productId = Number(params.get('p')) || products[0]?.id
  const choose = (id) => setParams({ p: id }, { replace: true })

  const feed = useAsync(() => (productId ? api.feed(productId) : Promise.resolve(null)), [productId])
  const trend = useAsync(() => (productId ? api.trend(productId) : Promise.resolve(null)), [productId])

  const f = feed.data
  const cheapest = f?.areas[0]
  const dearest = f?.areas[f.areas.length - 1]
  const saving = cheapest && dearest ? dearest.median_price - cheapest.median_price : 0

  return (
    <div>
      <h1 className="max-w-2xl font-display text-[2rem] font-bold leading-[1.1] tracking-tight md:text-5xl">
        Where is it cheapest in Dhaka today?
      </h1>
      <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-slate">
        Prices reported by shoppers in each area, checked against the government's TCB rate.
      </p>

      <div className="mt-6">
        {loading ? <Skeleton rows={1} /> : <ProductPicker products={products} value={productId} onChange={choose} />}
      </div>

      {feed.error && <div className="mt-6"><ErrorNote error={feed.error} onRetry={feed.reload} /></div>}

      {(feed.loading || loading) && !feed.error && <div className="mt-8"><Skeleton rows={7} /></div>}

      {f && !feed.loading && (
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
          <section aria-labelledby="ruler-title" className="min-w-0">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="ruler-title" className="font-display text-2xl font-bold">
                  {f.product.name_bn} <span className="text-lg font-semibold text-slate">{f.product.name}</span>
                </h2>
                {f.official && (
                  <p className="text-[15px] text-slate">
                    Official rate {taka(f.official.min_price)}–{taka(f.official.max_price)} per {f.product.unit}
                  </p>
                )}
              </div>
            </div>
            {cheapest && (
              <div className="mb-6 lg:hidden"><BestPlace {...{ cheapest, dearest, saving, unit: f.product.unit }} /></div>
            )}
            {f.areas.length ? (
              <PriceRuler feed={f} />
            ) : (
              <div className="rounded-xl border border-dashed border-line p-6 text-center">
                <p className="font-medium">No accepted reports for this item in the last 7 days.</p>
                <Link to={`/report?p=${f.product.id}`} className="mt-2 inline-block font-semibold text-leaf underline">
                  Report the first price
                </Link>
              </div>
            )}
          </section>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            {cheapest && <div className="hidden lg:block"><BestPlace {...{ cheapest, dearest, saving, unit: f.product.unit }} /></div>}

            <div className="rounded-2xl border border-line bg-white p-5">
              <h3 className="font-display text-lg font-semibold">Last 7 days across Dhaka</h3>
              <p className="mb-3 text-sm text-slate">Median of accepted reports. Shaded: official range.</p>
              {trend.data ? <Sparkline points={trend.data} official={f.official} /> : <Skeleton rows={1} />}
            </div>

            <Link to={`/report?p=${f.product.id}`}
              className="flex w-full items-center justify-center rounded-full border-2 border-leaf px-5 py-3 font-semibold text-leaf hover:bg-leaf hover:text-paper transition-colors">
              Report today's {f.product.name.toLowerCase()} price
            </Link>
          </aside>
        </div>
      )}
    </div>
  )
}

function BestPlace({ cheapest, dearest, saving, unit }) {
  return (
    <div className="rounded-2xl bg-leaf p-5 text-paper">
      <p className="text-sm text-paper/80">Best place to buy</p>
      <p className="mt-1 font-display text-3xl font-bold leading-tight">{cheapest.area_name_bn}</p>
      <p className="text-paper/80">{cheapest.area_name}</p>
      <p className="mt-4 font-display text-4xl font-extrabold tabular text-turmeric">
        {taka(cheapest.median_price)}
        <span className="ml-1 font-body text-base font-medium text-paper/80">/{unit}</span>
      </p>
      {saving > 0 && (
        <p className="mt-2 text-sm text-paper/90">
          {taka(saving)} less per {unit} than {dearest.area_name}
        </p>
      )}
    </div>
  )
}
