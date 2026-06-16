import { whatsAppHref } from './phoneLinks'

function eur(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

export function buildPaymentReminderMessage(lead, ricevuta, companyName = 'La nostra azienda') {
  const nome = lead?.nome?.trim() || 'Cliente'
  const totale = eur(ricevuta?.totale)
  const servizio = lead?.servizio?.trim() || 'la prestazione'

  return (
    `Ciao ${nome}, ti scrivo per un cortese sollecito del pagamento di ${totale} ` +
    `relativo a ${servizio}. Se hai già provveduto, ignora pure questo messaggio. ` +
    `Grazie e buona giornata — ${companyName}.`
  )
}

export function paymentReminderMailto(lead, ricevuta, companyName) {
  if (!lead?.email?.trim()) return null
  const nome = lead.nome?.trim() || 'Cliente'
  const subject = `Sollecito pagamento — ${nome}`
  const body = buildPaymentReminderMessage(lead, ricevuta, companyName)
  return `mailto:${encodeURIComponent(lead.email.trim())}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

export function paymentReminderWhatsApp(lead, ricevuta, companyName) {
  if (!lead?.telefono?.trim()) return null
  return whatsAppHref(lead.telefono, buildPaymentReminderMessage(lead, ricevuta, companyName))
}
