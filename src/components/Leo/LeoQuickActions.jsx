import { useState, useCallback } from 'react'
import { Sparkles, CalendarRange, ListChecks, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { usePlan } from '../../hooks/usePlan'
import { useLeoContext } from './LeoContext'
import { buildFollowupPayload, buildSummaryPayload } from '../../utils/leoPayloads'
import { formatLeoEur } from '../../utils/formatLeoEur'
import { useToast } from '../UI/Toast'
import UpgradeModal from '../UI/UpgradeModal'

export default function LeoQuickActions() {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { openLeo } = useLeoContext()
  const { isFree, canUseLeo, leoBudgetEur, leoRemainingEur, usage, plan } = usePlan()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const loadAndOpen = useCallback(async (action) => {
    if (!user) return
    if (isFree) {
      setUpgradeOpen(true)
      return
    }
    if (!canUseLeo) {
      setUpgradeOpen(true)
      return
    }

    setBusy(action)
    const [leadsRes, receiptsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('azienda_id', aziendaId),
      supabase.from('receipts').select('totale, created_at, email_inviata, lead_id').eq('azienda_id', aziendaId),
    ])
    const leads = leadsRes.data || []
    const receipts = receiptsRes.data || []

    if (action === 'summary') {
      openLeo({ action: 'summary', payload: buildSummaryPayload(leads, receipts) })
    } else {
      const payload = buildFollowupPayload(leads)
      if (!payload.leads.length) {
        addToast({ message: 'Nessun lead fermo da analizzare (min. 5 giorni)', variant: 'info' })
        setBusy(null)
        return
      }
      openLeo({ action: 'followup', payload })
    }
    setBusy(null)
  }, [user, openLeo, addToast, isFree, canUseLeo])

  if (isFree) {
    return (
      <>
        <div className="card p-5 mb-8 border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 mb-3">
            <Lock className="w-5 h-5 text-slate-500" />
            <h3 className="text-slate-300 font-semibold text-sm">Leo — copilota AI</h3>
          </div>
          <p className="text-slate-500 text-xs mb-4">
            Bozze email, resoconti e suggerimenti follow-up. Disponibile con il piano Pro (5€ credito/mese) o Agency (20€).
          </p>
          <button
            type="button"
            onClick={() => navigate('/billing')}
            className="btn-primary text-xs px-4 py-2 min-h-[36px]"
          >
            Passa a Pro
          </button>
        </div>
        <UpgradeModal isOpen={upgradeOpen} reason="leo" onClose={() => setUpgradeOpen(false)} />
      </>
    )
  }

  return (
    <>
      <div className="card p-5 mb-8 border-violet-900/30 bg-violet-950/10">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-violet-400" />
            <h3 className="text-slate-200 font-semibold text-sm">Leo — copilota AI</h3>
          </div>
          {leoBudgetEur != null && (
            <span className="text-violet-300 text-xs font-medium">
              {formatLeoEur(leoRemainingEur)} / {formatLeoEur(leoBudgetEur)}
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs mb-4">
          Piano {plan === 'agency' ? 'Agency' : 'Pro'}: credito Leo {formatLeoEur(leoBudgetEur)}/mese
          {usage.leoSpentEur > 0 && ` · usati ${formatLeoEur(usage.leoSpentEur)}`}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!!busy || !canUseLeo}
            onClick={() => loadAndOpen('summary')}
            className="btn-secondary text-xs px-3 py-2 min-h-[36px] gap-1.5 disabled:opacity-50"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            {busy === 'summary' ? 'Caricamento…' : 'Resoconto settimanale'}
          </button>
          <button
            type="button"
            disabled={!!busy || !canUseLeo}
            onClick={() => loadAndOpen('followup')}
            className="btn-secondary text-xs px-3 py-2 min-h-[36px] gap-1.5 disabled:opacity-50"
          >
            <ListChecks className="w-3.5 h-3.5" />
            {busy === 'followup' ? 'Caricamento…' : 'Suggerimenti follow-up'}
          </button>
        </div>
        {!canUseLeo && (
          <p className="text-amber-400/90 text-xs mt-3">
            Credito Leo esaurito questo mese. Si resetta il 1° del mese prossimo.
            {plan === 'pro' && ' Con Agency hai 20€ di credito.'}
          </p>
        )}
      </div>
      <UpgradeModal
        isOpen={upgradeOpen}
        reason={canUseLeo ? 'leo' : 'leo_budget'}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  )
}
