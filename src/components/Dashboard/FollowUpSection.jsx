import { useEffect, useState, useCallback } from 'react'
import { CalendarClock, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'

export default function FollowUpSection({ refreshKey }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const navigate = useNavigate()
  const [due, setDue] = useState([])

  const fetchDue = useCallback(async () => {
    if (!user) return
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const { data } = await supabase
      .from('leads')
      .select('id, nome, email, stato, follow_up_at')
      .eq('azienda_id', aziendaId)
      .not('follow_up_at', 'is', null)
      .lte('follow_up_at', endOfDay.toISOString())
      .order('follow_up_at', { ascending: true })
      .limit(8)

    setDue(data || [])
  }, [user, refreshKey])

  useEffect(() => { fetchDue() }, [fetchDue])

  async function markContattato(lead) {
    await supabase.from('leads').update({ stato: 'contattato' }).eq('id', lead.id).eq('azienda_id', aziendaId)
    fetchDue()
  }

  async function postpone(lead) {
    const d = new Date()
    d.setDate(d.getDate() + 3)
    await supabase.from('leads').update({ follow_up_at: d.toISOString() }).eq('id', lead.id).eq('azienda_id', aziendaId)
    fetchDue()
  }

  if (due.length === 0) return null

  return (
    <div className="card p-5 mb-8 border-amber-900/40 bg-amber-950/20">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-amber-400" />
        <h3 className="text-slate-200 font-semibold text-sm">In scadenza oggi</h3>
      </div>
      <ul className="space-y-2">
        {due.map(lead => (
          <li key={lead.id} className="flex flex-wrap items-center gap-2 justify-between py-2 border-b border-slate-800/60 last:border-0">
            <div>
              <p className="text-slate-200 text-sm font-medium">{lead.nome}</p>
              <p className="text-slate-500 text-xs capitalize">{lead.stato}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markContattato(lead)} className="btn-secondary text-xs px-2 py-1.5 min-h-0">
                Segna contattato
              </button>
              <button onClick={() => postpone(lead)} className="btn-secondary text-xs px-2 py-1.5 min-h-0">
                +3 giorni
              </button>
            </div>
          </li>
        ))}
      </ul>
      <button onClick={() => navigate('/lead')} className="text-cyan-400 text-xs mt-3 inline-flex items-center gap-1 hover:underline">
        Vai ai lead <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  )
}
