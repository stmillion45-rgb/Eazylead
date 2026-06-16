/** Fine giornata locale per confronto date follow-up */
export function endOfToday() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

export function isFollowUpDueToday(followUpAt) {
  if (!followUpAt) return false
  const d = new Date(followUpAt)
  const now = new Date()
  return (
    d.getFullYear() === now.getFullYear()
    && d.getMonth() === now.getMonth()
    && d.getDate() === now.getDate()
  )
}

export function applyQuickFilter(leads, quickFilter) {
  if (!quickFilter || quickFilter === 'tutti') return leads
  if (quickFilter === 'oggi') {
    return leads.filter(l => isFollowUpDueToday(l.follow_up_at))
  }
  if (quickFilter === 'senza_email') {
    return leads.filter(l => !l.email?.trim())
  }
  if (quickFilter === 'preferiti') {
    return leads.filter(l => l.preferito === true)
  }
  if (quickFilter === 'non_pagati') {
    return leads.filter(l => l.stato !== 'concluso' && l.stato !== 'perso')
  }
  return leads
}

export function formatLeadCopyText(lead) {
  return [
    `Nome: ${lead.nome ?? ''}`,
    `Email: ${lead.email ?? '—'}`,
    `Telefono: ${lead.telefono ?? '—'}`,
    `Servizio: ${lead.servizio ?? ''}`,
    `Prezzo: €${lead.prezzo ?? 0}`,
    `Stato: ${lead.stato ?? ''}`,
  ].join('\n')
}
