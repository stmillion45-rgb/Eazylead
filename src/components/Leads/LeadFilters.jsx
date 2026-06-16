import { Search, X } from 'lucide-react'

const STATI = [
  { value: 'tutti',         label: 'Tutti' },
  { value: 'nuovo',         label: 'Nuovo' },
  { value: 'contattato',    label: 'Contattato' },
  { value: 'in trattativa', label: 'Trattativa' },
  { value: 'concluso',      label: 'Concluso' },
  { value: 'perso',         label: 'Perso' },
]

// ===================================================
// COMPONENTE — LeadFilters
// Barra di ricerca + filtro per stato.
// Su mobile: filtri scorrevoli orizzontalmente senza
// scrollbar visibile (scroll-x-mobile utility class).
// ===================================================
export default function LeadFilters({ search, onSearch, statoFiltro, onStato }) {
  return (
    <div className="flex flex-col gap-3 mb-5">

      {/* Barra ricerca — full width su tutti i breakpoint */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Cerca per nome, email, servizio…"
          className="input-base pl-10 pr-9"
        />
        {search && (
          <button
            onClick={() => onSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500
                       hover:text-slate-300 transition-colors min-h-[44px] flex items-center"
            aria-label="Cancella ricerca"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Filtri stato — scorrevoli su mobile, flex-wrap su desktop */}
      <div className="scroll-x-mobile flex gap-1.5 sm:flex-wrap">
        {STATI.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onStato(value)}
            className={`
              px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap
              transition-all duration-150 shrink-0
              min-h-[36px]
              ${statoFiltro === value
                ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/20'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
              }
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
