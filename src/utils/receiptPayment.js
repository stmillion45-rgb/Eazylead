export const PAYMENT_LABELS = {
  pagata:      'Pagata',
  non_pagata:  'Non pagata',
  scaduta:     'Scaduta',
}

export const PAYMENT_BADGE = {
  pagata:     'bg-emerald-900/60 text-emerald-300 border-emerald-800',
  non_pagata: 'bg-amber-900/60 text-amber-300 border-amber-800',
  scaduta:    'bg-red-900/60 text-red-300 border-red-800',
}

/** Stato effettivo (scadenza calcolata client-side) */
export function resolvePaymentStatus(receipt) {
  if (!receipt) return 'non_pagata'
  if (receipt.payment_status === 'pagata') return 'pagata'
  if (receipt.due_date) {
    const due = new Date(receipt.due_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)
    if (due < today) return 'scaduta'
  }
  return receipt.payment_status || 'non_pagata'
}

export function defaultDueDate(days = 30) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

export function formatDueDate(iso) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}
