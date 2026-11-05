import { NavLink, Route, Routes } from 'react-router-dom'
import { api } from './api'
import { useAsync } from './hooks'
import ComparePage from './pages/ComparePage'
import ReportPage from './pages/ReportPage'
import FeedPage from './pages/FeedPage'
import OverviewPage from './pages/OverviewPage'
import { ErrorNote } from './components/States'

const NAV = [
  { to: '/', label: 'Compare areas', short: 'Compare', icon: 'M4 6h10M4 12h16M4 18h7' },
  { to: '/report', label: 'Report a price', short: 'Report', icon: 'M12 5v14M5 12h14' },
  { to: '/feed', label: 'Live reports', short: 'Live', icon: 'M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0M12 12h.01' },
  { to: '/overview', label: 'All items', short: 'All items', icon: 'M4 5h16v14H4zM4 10h16M10 10v9' },
]

function Icon({ d }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  )
}

export default function App() {
  // Catalog data is small and used on every page, so load it once here.
  const catalog = useAsync(() => Promise.all([api.products(), api.areas()]), [])
  const [products, areas] = catalog.data || [[], []]

  return (
    <div className="min-h-screen pb-20 md:pb-0">
      <header className="border-b border-line bg-paper/90 backdrop-blur sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="flex items-baseline gap-2 shrink-0">
            <span className="font-display text-2xl font-extrabold tracking-tight text-leaf">বাজার দর</span>
            <span className="font-display text-sm font-semibold text-slate">BazarDor</span>
          </NavLink>
          <nav className="ml-auto hidden md:flex gap-1" aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-[15px] font-medium transition-colors ${
                    isActive ? 'bg-leaf text-paper' : 'text-ink hover:bg-leaf-soft'}`}>
                {n.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        {catalog.error ? (
          <ErrorNote error={catalog.error} onRetry={catalog.reload} />
        ) : (
          <Routes>
            <Route path="/" element={<ComparePage products={products} loading={catalog.loading} />} />
            <Route path="/report" element={<ReportPage products={products} areas={areas} />} />
            <Route path="/feed" element={<FeedPage products={products} />} />
            <Route path="/overview" element={<OverviewPage />} />
          </Routes>
        )}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-sm text-slate">
        Official ranges are sample TCB data for this demo. Community prices come from shoppers' reports from the last 7 days.
      </footer>

      {/* Mobile tab bar */}
      <nav aria-label="Main"
        className="md:hidden fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-line bg-paper">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-2 text-xs font-medium ${isActive ? 'text-leaf' : 'text-slate'}`}>
            <Icon d={n.icon} />
            {n.short}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
