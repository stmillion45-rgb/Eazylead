import { useState } from 'react'

const COLUMNS = [
  { id: 'nuovo',         label: 'Nuovo',         accent: 'border-slate-600' },
  { id: 'contattato',    label: 'Contattato',    accent: 'border-blue-700' },
  { id: 'in trattativa', label: 'In trattativa', accent: 'border-amber-700' },
  { id: 'concluso',      label: 'Concluso',      accent: 'border-emerald-700' },
  { id: 'perso',         label: 'Perso',         accent: 'border-red-800' },
]

function initials(nome) {
  return (nome || '?').split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('')
}

function formatPrezzo(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

export default function LeadKanban({ leads, onStatoChange, onOpenLead, noteCounts = {} }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)

  function leadsInCol(stato) {
    return leads.filter(l => l.stato === stato)
  }

  function handleDrop(stato) {
    if (!dragId) return
    const lead = leads.find(l => l.id === dragId)
    if (lead && lead.stato !== stato) onStatoChange(lead, stato)
    setDragId(null)
    setOverCol(null)
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 min-h-[420px]">
      {COLUMNS.map(col => {
        const items = leadsInCol(col.id)
        const isOver = overCol === col.id
        return (
          <div
            key={col.id}
            className={`shrink-0 w-56 flex flex-col rounded-xl border bg-slate-900/50 transition-colors
              ${isOver ? 'border-cyan-600 bg-cyan-950/20' : `border-slate-800 ${col.accent}`}`}
            onDragOver={e => { e.preventDefault(); setOverCol(col.id) }}
            onDragLeave={() => setOverCol(c => (c === col.id ? null : c))}
            onDrop={e => { e.preventDefault(); handleDrop(col.id) }}
          >
            <div className="px-3 py-2.5 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{col.label}</span>
              <span className="text-xs text-slate-600 font-mono">{items.length}</span>
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto max-h-[70vh]">
              {items.map(lead => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={() => setDragId(lead.id)}
                  onDragEnd={() => { setDragId(null); setOverCol(null) }}
                  onClick={() => onOpenLead?.(lead)}
                  className={`bg-slate-800/80 border border-slate-700 rounded-lg p-3 cursor-grab active:cursor-grabbing
                    hover:border-slate-600 transition-all ${dragId === lead.id ? 'opacity-50 scale-95' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300 shrink-0">
                      {initials(lead.nome)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-slate-200 text-sm font-medium truncate">{lead.nome}</p>
                      <p className="text-slate-500 text-xs truncate">{lead.servizio}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-emerald-400 font-mono text-xs">{formatPrezzo(lead.prezzo)}</span>
                    {noteCounts[lead.id] > 0 && (
                      <span className="text-[10px] text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded">
                        {noteCounts[lead.id]} note
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {items.length === 0 && (
                <p className="text-slate-700 text-xs text-center py-6">Trascina qui</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
