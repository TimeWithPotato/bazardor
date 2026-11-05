export default function ProductPicker({ products, value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Choose an item"
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 md:mx-0 md:flex-wrap md:overflow-visible md:px-0">
      {products.map((p) => {
        const active = p.id === value
        return (
          <button key={p.id} role="radio" aria-checked={active} onClick={() => onChange(p.id)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-left transition-colors ${
              active ? 'border-leaf bg-leaf text-paper' : 'border-line bg-white hover:border-leaf/50'}`}>
            <span className="font-display text-[15px] font-semibold">{p.name_bn}</span>
            <span className={`ml-1.5 text-xs ${active ? 'text-paper/75' : 'text-slate'}`}>{p.name}</span>
          </button>
        )
      })}
    </div>
  )
}
