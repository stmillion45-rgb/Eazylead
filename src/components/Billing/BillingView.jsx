import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CreditCard } from 'lucide-react'
import { useToast } from '../UI/Toast'
import { usePlan } from '../../hooks/usePlan'
import { PLAN_LABELS } from '../../constants/plans'
import { normalizePlanId } from '../../hooks/useActivePlan'
import PricingSection from './PricingSection'
import Spinner from '../UI/Spinner'

const BADGE_CLASS = {
  free: 'bg-stone-800 text-stone-300 border-stone-700',
  pro: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  agency_base: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  agency: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  agency_pro: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  vip: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
}

function planLabel(plan) {
  if (plan === 'agency_pro') return 'Agency Pro'
  return PLAN_LABELS[plan] ?? PLAN_LABELS[normalizePlanId(plan)] ?? 'Free'
}

export default function BillingView() {
  const [params, setParams] = useSearchParams()
  const { addToast } = useToast()
  const { plan, status, currentPeriodEnd, loading, refresh } = usePlan()

  useEffect(() => {
    const success = params.get('success') === 'true'
    const canceled = params.get('canceled') === 'true'
    if (!success && !canceled) return

    if (success) {
      addToast({ message: 'Abbonamento attivato con successo', variant: 'success' })
      refresh()
    }

    if (canceled) {
      addToast({ message: 'Pagamento annullato', variant: 'info' })
    }

    setParams({}, { replace: true })
  }, [params, setParams, refresh, addToast])

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner size="md" />
      </div>
    )
  }

  const renewal = currentPeriodEnd
    ? new Date(currentPeriodEnd).toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="animate-fade-in bg-stone-950">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/10">
            <CreditCard className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-lg font-bold text-stone-100">Piano e fatturazione</h2>
            <p className="mt-1 text-sm text-stone-500">
              Piano attuale:{' '}
              <span className={`inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold ${BADGE_CLASS[plan] ?? BADGE_CLASS.free}`}>
                {planLabel(plan)}
              </span>
              {status !== 'active' && <span className="ml-2 text-amber-400">({status})</span>}
            </p>
            {renewal && plan !== 'free' && (
              <p className="mt-1 text-xs text-stone-600">Prossimo rinnovo: {renewal}</p>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-stone-800 bg-stone-900/70 p-4 text-sm leading-6 text-stone-400">
          <p>
            Gli abbonamenti a pagamento si rinnovano automaticamente fino a disdetta.
            Procedendo accetti i{' '}
            <Link to="/termini" className="text-cyan-400 hover:underline">
              Termini di servizio
            </Link>.
          </p>
          <p className="mt-2">
            I checkout PRO, AGENCY BASE e AGENCY PRO vengono gestiti su LaunchPass.
            Il piano VIP non prevede pagamento diretto e apre il canale di contatto configurato.
          </p>
        </div>
      </div>

      <PricingSection activePlanId={plan} activePlanLoading={loading} showHeader={false} className="pt-0" />
    </div>
  )
}
