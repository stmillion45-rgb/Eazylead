import { AlertTriangle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { usePlan } from '../../hooks/usePlan'

function getAlert(plan, status, currentPeriodEnd) {
  if (status === 'past_due') {
    return {
      message: 'Il pagamento del tuo abbonamento non è andato a buon fine. Aggiorna il metodo di pagamento per non perdere Pro/Agency e Leo.',
      cta: 'Rinnova abbonamento',
    }
  }

  if (status === 'canceled' && (plan === 'pro' || plan === 'agency')) {
    return {
      message: 'Il tuo abbonamento è stato annullato. Rinnovalo per continuare con lead illimitati, email e Leo.',
      cta: 'Riattiva piano',
    }
  }

  if (currentPeriodEnd && (plan === 'pro' || plan === 'agency')) {
    const end = new Date(currentPeriodEnd)
    if (end < new Date()) {
      return {
        message: 'Il periodo del tuo abbonamento è scaduto. Rinnova per continuare a usare le funzioni Pro/Agency.',
        cta: 'Vai al piano',
      }
    }
  }

  if (plan === 'free' && status === 'canceled') {
    return {
      message: 'Il tuo abbonamento non è più attivo. Sei tornato al piano Free con limiti ridotti.',
      cta: 'Riattiva Pro',
    }
  }

  return null
}

export default function SubscriptionBanner() {
  const navigate = useNavigate()
  const { plan, status, currentPeriodEnd, loading } = usePlan()

  if (loading) return null

  const alert = getAlert(plan, status, currentPeriodEnd)
  if (!alert) return null

  return (
    <div className="mx-4 sm:mx-6 mt-4 mb-0 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-800/50 bg-amber-950/30 px-4 py-3">
      <div className="flex items-start gap-2 min-w-0">
        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-amber-100/90 text-sm leading-snug">{alert.message}</p>
      </div>
      <button
        type="button"
        onClick={() => navigate('/billing')}
        className="btn-primary text-xs px-3 py-2 min-h-[36px] shrink-0"
      >
        {alert.cta}
      </button>
    </div>
  )
}
