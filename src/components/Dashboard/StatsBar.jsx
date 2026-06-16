import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'

// ===================================================
// COMPONENTE — StatsBar
// 4 card con bordo superiore colorato, valore grande,
// label descrittiva. Stile identico al mockup.
// ===================================================
export default function StatsBar({ refreshKey }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const [stats, setStats]   = useState({ totale: 0, fatturato: 0, trattativa: 0, persi: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    fetchStats()
  }, [user, refreshKey])

  async function fetchStats() {
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('stato, prezzo')
      .eq('azienda_id', aziendaId)

    if (!error && data) {
      const totale     = data.length
      const fatturato  = data.filter(l => l.stato === 'concluso')
                             .reduce((s, l) => s + (parseFloat(l.prezzo) || 0), 0)
      const trattativa = data.filter(l => l.stato === 'in trattativa').length
      const valTratt   = data.filter(l => l.stato === 'in trattativa')
                             .reduce((s, l) => s + (parseFloat(l.prezzo) || 0), 0)
      const persi      = data.filter(l => l.stato === 'perso').length
      const nuovi      = data.filter(l => l.stato === 'nuovo').length
      setStats({ totale, fatturato, trattativa, valTratt, persi, nuovi })
    }
    setLoading(false)
  }

  function eur(v) {
    if (v >= 1000) return '€' + (v / 1000).toFixed(1).replace('.', ',') + 'k'
    return '€' + v.toFixed(0)
  }

  const cards = [
    {
      id:       'totale',
      label:    'LEAD TOTALI',
      value:    loading ? '—' : stats.totale.toString(),
      sub:      loading ? '' : `+${stats.nuovi} questo mese`,
      accent:   '#22d3ee',   // cyan
    },
    {
      id:       'fatturato',
      label:    'FATTURATO',
      value:    loading ? '—' : eur(stats.fatturato),
      sub:      'lead conclusi',
      accent:   '#34d399',   // emerald
    },
    {
      id:       'trattativa',
      label:    'IN TRATTATIVA',
      value:    loading ? '—' : stats.trattativa?.toString() ?? '0',
      sub:      loading ? '' : `${eur(stats.valTratt || 0)} potenziali`,
      accent:   '#fb923c',   // orange
    },
    {
      id:       'persi',
      label:    'PERSI',
      value:    loading ? '—' : stats.persi?.toString() ?? '0',
      sub:      'questo trimestre',
      accent:   '#f87171',   // red
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map(({ id, label, value, sub, accent }) => (
        <div
          key={id}
          className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          style={{ borderTop: `2px solid ${accent}` }}
        >
          <div className="p-5">
            <p className="text-xs font-semibold tracking-widest mb-3"
               style={{ color: accent }}>
              {label}
            </p>
            <p className="font-display font-bold text-3xl mb-1"
               style={{ color: accent }}>
              {value}
            </p>
            <p className="text-slate-500 text-xs">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
