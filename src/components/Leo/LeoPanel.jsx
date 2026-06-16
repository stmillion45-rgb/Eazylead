import { useState, useEffect, useCallback } from 'react'
import { Sparkles, X, Copy, Send, CalendarRange, ListChecks, Mail, Lock } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { useProfile } from '../../hooks/useProfile'
import { usePlan } from '../../hooks/usePlan'
import { useLeo } from '../../hooks/useLeo'
import { useLeoContext } from './LeoContext'
import {
  buildChatPayload,
  buildEmailPayload,
  buildFollowupPayload,
  buildSummaryPayload,
} from '../../utils/leoPayloads'
import { formatLeoEur } from '../../utils/formatLeoEur'
import { useToast } from '../UI/Toast'
import UpgradeModal from '../UI/UpgradeModal'
import Spinner from '../UI/Spinner'

function LeoBudgetBar({ spent, budget, remaining }) {
  const pct = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0
  return (
    <div className="px-4 py-2 border-b border-slate-800 shrink-0 bg-slate-950/40">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-slate-500">Credito Leo questo mese</span>
        <span className="text-violet-300 font-medium">{formatLeoEur(remaining)} rimasti</span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-slate-600 text-[10px] mt-1">
        Usati {formatLeoEur(spent)} su {formatLeoEur(budget)} — reset il 1° del mese
      </p>
    </div>
  )
}

export default function LeoPanel() {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { profile } = useProfile()
  const { open, closeLeo, pending, clearPending } = useLeoContext()
  const {
    canUseLeo,
    leoActive,
    leoBudgetEur,
    usage,
    leoRemainingEur,
    refresh: refreshPlan,
    isFree,
  } = usePlan()
  const { ask, loading, result, error, reset } = useLeo(refreshPlan)
  const { addToast } = useToast()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [upgradeReason, setUpgradeReason] = useState('leo')

  const [chatInput, setChatInput] = useState('')
  const [dataLoading, setDataLoading] = useState(false)
  const [leads, setLeads] = useState([])
  const [receipts, setReceipts] = useState([])

  const fetchData = useCallback(async () => {
    if (!user) return
    setDataLoading(true)
    const [leadsRes, receiptsRes] = await Promise.all([
      supabase.from('leads').select('*').eq('azienda_id', aziendaId),
      supabase.from('receipts').select('totale, created_at, email_inviata, lead_id').eq('azienda_id', aziendaId),
    ])
    setLeads(leadsRes.data || [])
    setReceipts(receiptsRes.data || [])
    setDataLoading(false)
  }, [user, aziendaId])

  useEffect(() => {
    if (open) {
      if (isFree) {
        setUpgradeReason('leo')
        setUpgradeOpen(true)
        closeLeo()
        return
      }
      fetchData()
    }
  }, [open, fetchData, isFree, closeLeo])

  useEffect(() => {
    if (!open || !pending || isFree) return

    async function runPending() {
      const { action, payload, label } = pending

      if (action !== 'email' && dataLoading) return

      if (!canUseLeo) {
        clearPending()
        setUpgradeReason('leo_budget')
        setUpgradeOpen(true)
        return
      }

      if (action === 'followup' && !payload?.leads?.length) {
        clearPending()
        addToast({ message: 'Nessun lead fermo da analizzare (min. 5 giorni)', variant: 'info' })
        return
      }

      clearPending()
      const { error: askError, code } = await ask(action, payload)
      if (askError) {
        if (code === 'plan_required') {
          setUpgradeReason('leo')
          setUpgradeOpen(true)
        } else if (code === 'budget_exceeded') {
          setUpgradeReason('leo_budget')
          setUpgradeOpen(true)
        } else {
          addToast({ message: askError, variant: 'error' })
        }
      } else if (label) {
        addToast({ message: label, variant: 'success' })
      }
    }

    runPending()
  }, [open, pending, dataLoading, ask, clearPending, addToast, canUseLeo, isFree])

  if (!open) {
    return (
      <UpgradeModal
        isOpen={upgradeOpen}
        reason={upgradeReason}
        onClose={() => setUpgradeOpen(false)}
      />
    )
  }

  async function runAction(action, payloadBuilder) {
    if (!canUseLeo) {
      setUpgradeReason('leo_budget')
      setUpgradeOpen(true)
      return
    }
    reset()
    const payload = payloadBuilder()
    if (action === 'followup' && !payload.leads?.length) {
      addToast({ message: 'Nessun lead fermo da analizzare (min. 5 giorni)', variant: 'info' })
      return
    }
    const { error: askError, code } = await ask(action, payload)
    if (code === 'budget_exceeded') {
      setUpgradeReason('leo_budget')
      setUpgradeOpen(true)
    } else if (askError) {
      addToast({ message: askError, variant: 'error' })
    }
  }

  async function handleChat(e) {
    e.preventDefault()
    const msg = chatInput.trim()
    if (!msg || loading) return
    if (!canUseLeo) {
      setUpgradeReason('leo_budget')
      setUpgradeOpen(true)
      return
    }
    reset()
    setChatInput('')
    const { error: askError, code } = await ask('chat', buildChatPayload(msg, leads, receipts, profile))
    if (code === 'budget_exceeded') {
      setUpgradeReason('leo_budget')
      setUpgradeOpen(true)
    } else if (askError) {
      addToast({ message: askError, variant: 'error' })
    }
  }

  function handleCopy() {
    if (!result) return
    navigator.clipboard.writeText(result)
    addToast({ message: 'Copiato negli appunti', variant: 'success' })
  }

  return (
    <>
      <div className="fixed inset-0 bg-slate-950/60 z-40" onClick={closeLeo} />
      <aside className="fixed right-0 top-0 h-full w-full max-w-md z-50 bg-slate-900 border-l border-slate-800 flex flex-col shadow-2xl animate-slide-up">
        <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-950 border border-violet-800 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <p className="text-slate-100 font-semibold text-sm">Leo</p>
              <p className="text-slate-500 text-xs">Copilota LeadOS · solo Pro/Agency</p>
              <p className="text-slate-600 text-[10px] mt-0.5 max-w-[220px] leading-snug">
                Suggerimenti automatici, non parere legale/fiscale. I dati dei lead possono essere elaborati da Anthropic (USA).
              </p>
            </div>
          </div>
          <button onClick={closeLeo} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </header>

        {leoActive && leoBudgetEur != null && (
          <LeoBudgetBar
            spent={usage.leoSpentEur}
            budget={leoBudgetEur}
            remaining={leoRemainingEur}
          />
        )}

        <div className="px-4 py-3 border-b border-slate-800 flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            disabled={loading || dataLoading || !canUseLeo}
            onClick={() => runAction('summary', () => buildSummaryPayload(leads, receipts))}
            className="btn-secondary text-xs px-2.5 py-1.5 min-h-0 gap-1 disabled:opacity-50"
          >
            <CalendarRange className="w-3.5 h-3.5" />
            Resoconto settimanale
          </button>
          <button
            type="button"
            disabled={loading || dataLoading || !canUseLeo}
            onClick={() => runAction('followup', () => buildFollowupPayload(leads))}
            className="btn-secondary text-xs px-2.5 py-1.5 min-h-0 gap-1 disabled:opacity-50"
          >
            <ListChecks className="w-3.5 h-3.5" />
            Suggerimenti follow-up
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {(loading || dataLoading) && (
            <div className="flex justify-center py-12">
              <Spinner size="md" />
            </div>
          )}

          {!loading && !dataLoading && error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {!loading && !dataLoading && result && (
            <div className="space-y-3">
              <pre className="text-slate-200 text-sm whitespace-pre-wrap font-sans leading-relaxed bg-slate-950/50 rounded-xl p-4 border border-slate-800">
                {result}
              </pre>
              <button onClick={handleCopy} className="btn-secondary text-xs px-3 py-2 min-h-0 gap-1">
                <Copy className="w-3.5 h-3.5" />
                Copia testo
              </button>
            </div>
          )}

          {!loading && !dataLoading && !result && !error && (
            <p className="text-slate-500 text-sm text-center py-8">
              {canUseLeo
                ? 'Chiedi qualcosa sui tuoi lead, oppure usa i pulsanti sopra.'
                : 'Credito Leo esaurito per questo mese.'}
            </p>
          )}
        </div>

        <form onSubmit={handleChat} className="p-4 border-t border-slate-800 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              placeholder={canUseLeo ? 'Es. Qual è il mio servizio più redditizio?' : 'Credito esaurito'}
              className="input-base flex-1 text-sm"
              disabled={loading || dataLoading || !canUseLeo}
            />
            <button
              type="submit"
              disabled={loading || dataLoading || !chatInput.trim() || !canUseLeo}
              className="btn-primary px-3 min-h-[44px] disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </aside>

      <UpgradeModal
        isOpen={upgradeOpen}
        reason={upgradeReason}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  )
}

export function LeoFab() {
  const { openLeo } = useLeoContext()
  const { canUseLeo, isFree, leoActive, leoRemainingEur } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  function handleClick() {
    if (isFree || !leoActive) {
      setUpgradeOpen(true)
      return
    }
    openLeo()
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        data-tour="leo-fab"
        className={`fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          canUseLeo
            ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-violet-900/40'
            : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700'
        }`}
        title={canUseLeo ? 'Apri Leo' : isFree ? 'Leo — solo piano Pro' : 'Credito Leo esaurito'}
      >
        {isFree ? <Lock className="w-5 h-5" /> : <Sparkles className="w-6 h-6" />}
      </button>
      {!canUseLeo && leoActive && leoRemainingEur != null && leoRemainingEur < 0.02 && (
        <span className="fixed bottom-[4.5rem] right-6 z-30 text-[10px] text-slate-500 bg-slate-900 px-2 py-1 rounded border border-slate-800">
          Credito Leo esaurito
        </span>
      )}
      <UpgradeModal
        isOpen={upgradeOpen}
        reason={isFree ? 'leo' : 'leo_budget'}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  )
}

export function useLeoActions() {
  const { openLeo } = useLeoContext()
  const { canUseLeo, isFree } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  function draftEmail(lead, note = '') {
    if (isFree || !canUseLeo) {
      setUpgradeOpen(true)
      return { upgradeModal: true }
    }
    openLeo({
      action: 'email',
      payload: buildEmailPayload(lead, note),
      label: 'Bozza email generata',
    })
    return { upgradeModal: false }
  }

  return { draftEmail, openLeo, upgradeOpen, setUpgradeOpen, isFree, canUseLeo }
}

export function LeoEmailButton({ lead, className = '' }) {
  const { draftEmail, upgradeOpen, setUpgradeOpen, isFree, canUseLeo } = useLeoActions()

  if (!isFree && !canUseLeo) return null

  return (
    <>
      <button
        type="button"
        onClick={() => draftEmail(lead)}
        className={`btn-secondary text-xs px-2 py-1.5 min-h-0 gap-1 ${className}`}
      >
        {isFree ? <Lock className="w-3.5 h-3.5" /> : <Mail className="w-3.5 h-3.5" />}
        {isFree ? 'Leo Pro' : 'Bozza email'}
      </button>
      <UpgradeModal
        isOpen={upgradeOpen}
        reason={isFree ? 'leo' : 'leo_budget'}
        onClose={() => setUpgradeOpen(false)}
      />
    </>
  )
}
