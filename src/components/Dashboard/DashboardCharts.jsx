// Grafici client-side senza librerie extra (ultimi 6 mesi + stati lead)

import { buildMonthlyRevenue } from '../../utils/revenueMetrics'



const STATI = ['nuovo', 'contattato', 'in trattativa', 'concluso', 'perso']

const STATO_COLORS = {

  nuovo: '#94a3b8',

  contattato: '#38bdf8',

  'in trattativa': '#818cf8',

  concluso: '#34d399',

  perso: '#f87171',

}



const CHART_BAR_AREA_PX = 128



export function RevenueChart({ leads, receipts = [] }) {

  const revenue = buildMonthlyRevenue(leads, receipts)

  const max = Math.max(...revenue.map(r => r.sum), 1)

  const hasAny = revenue.some(r => r.sum > 0)



  return (

    <div className="card p-5" data-tour="dashboard-revenue-chart">

      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">

        Fatturato mensile

      </p>

      <p className="text-slate-600 text-[11px] mb-4">

        Ricevute pagate per mese; se non ce ne sono, lead in stato Concluso con prezzo impostato.

      </p>

      <div className="flex items-end gap-2 h-36">

        {revenue.map(r => {

          const barPx = r.sum > 0 ? Math.max(4, Math.round((r.sum / max) * CHART_BAR_AREA_PX)) : 0

          return (

            <div key={r.key} className="flex-1 h-full flex flex-col items-center justify-end gap-1 min-w-0">

              {r.sum > 0 && (

                <span className="text-slate-500 text-[9px] font-mono tabular-nums">

                  €{r.sum >= 1000 ? `${(r.sum / 1000).toFixed(1)}k` : Math.round(r.sum)}

                </span>

              )}

              <div

                className="w-full bg-cyan-500/80 rounded-t transition-all duration-300"

                style={{ height: `${barPx}px` }}

                title={`${r.label}: €${r.sum.toFixed(2)}`}

              />

              <span className="text-slate-600 text-[10px]">{r.label}</span>

            </div>

          )

        })}

      </div>

      {!hasAny && (

        <p className="text-slate-600 text-xs mt-3 border-t border-slate-800 pt-3">

          Il grafico si aggiorna quando segni un lead come <strong className="text-slate-400">Concluso</strong> con un prezzo

          oppure una ricevuta come <strong className="text-slate-400">Pagata</strong>.

        </p>

      )}

    </div>

  )

}



export function StatoDonut({ leads }) {

  const counts = STATI.map(s => ({

    stato: s,

    n: leads.filter(l => l.stato === s).length,

  }))

  const total = counts.reduce((a, c) => a + c.n, 0) || 1



  return (

    <div className="card p-5">

      <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-4">

        Distribuzione stati

      </p>

      <div className="space-y-2">

        {counts.map(({ stato, n }) => (

          <div key={stato}>

            <div className="flex justify-between text-xs mb-1">

              <span className="text-slate-400 capitalize">{stato}</span>

              <span className="text-slate-500">{n} ({Math.round((n / total) * 100)}%)</span>

            </div>

            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

              <div

                className="h-full rounded-full"

                style={{

                  width: `${(n / total) * 100}%`,

                  backgroundColor: STATO_COLORS[stato],

                }}

              />

            </div>

          </div>

        ))}

      </div>

    </div>

  )

}

