import { resolvePaymentStatus } from './receiptPayment'

export function last6Months() {
  const out = []
  const now = new Date()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString('it-IT', { month: 'short' }),
      year: d.getFullYear(),
      month: d.getMonth(),
    })
  }
  return out
}

/** Mese in cui attribuire il fatturato di un lead concluso */
export function leadClosedMonth(lead) {
  const ref = lead.concluso_at || lead.updated_at || lead.created_at
  if (!ref) return null
  const d = new Date(ref)
  return { year: d.getFullYear(), month: d.getMonth() }
}

function receiptPaidMonth(receipt) {
  const ref = receipt.payment_date || receipt.created_at
  if (!ref) return null
  const d = new Date(ref)
  return { year: d.getFullYear(), month: d.getMonth() }
}

/**
 * Fatturato per mese: priorità ricevute pagate, altrimenti lead conclusi con prezzo.
 */
export function buildMonthlyRevenue(leads = [], receipts = []) {
  const months = last6Months()

  return months.map(m => {
    let fromReceipts = 0
    ;(receipts || []).forEach(r => {
      if (resolvePaymentStatus(r) !== 'pagata') return
      const pm = receiptPaidMonth(r)
      if (pm && pm.year === m.year && pm.month === m.month) {
        fromReceipts += parseFloat(r.totale) || 0
      }
    })

    let fromLeads = 0
    ;(leads || []).forEach(l => {
      if (l.stato !== 'concluso') return
      const lm = leadClosedMonth(l)
      if (!lm || lm.year !== m.year || lm.month !== m.month) return
      fromLeads += parseFloat(l.prezzo) || 0
    })

    // Evita doppio conteggio: se ci sono ricevute pagate nel mese, usa solo quelle
    const sum = fromReceipts > 0 ? fromReceipts : fromLeads
    return { ...m, sum, fromReceipts, fromLeads }
  })
}
