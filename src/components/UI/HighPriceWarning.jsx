import { AlertTriangle } from 'lucide-react'
import { HIGH_PRICE_THRESHOLD } from '../../utils/receiptValidation'

export function HighPriceWarning({ prezzo, className = '' }) {
  const n = parseFloat(prezzo)
  if (Number.isNaN(n) || n < HIGH_PRICE_THRESHOLD) return null

  return (
    <div className={`flex items-start gap-2 rounded-xl border border-amber-800/50 bg-amber-950/30 px-3 py-2.5 ${className}`}>
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
      <p className="text-amber-200/90 text-xs leading-snug">
        Importo elevato ({n.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })}).
        Verifica che sia corretto prima di emettere la ricevuta fiscale.
      </p>
    </div>
  )
}
