/** Normalizza numero per link tel: / wa.me (solo cifre, prefisso IT se manca) */
export function normalizePhone(raw) {
  if (!raw?.trim()) return null
  let digits = raw.replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('00')) digits = digits.slice(2)
  if (digits.startsWith('0') && digits.length >= 9 && digits.length <= 11) {
    digits = `39${digits.slice(1)}`
  } else if (!digits.startsWith('39') && digits.length >= 9 && digits.length <= 10) {
    digits = `39${digits}`
  }
  return digits
}

export function telHref(raw) {
  const n = normalizePhone(raw)
  return n ? `tel:+${n}` : null
}

export function whatsAppHref(raw, message = '') {
  const n = normalizePhone(raw)
  if (!n) return null
  const text = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${n}${text}`
}

export function whatsAppFollowUpMessage(lead) {
  const nome = lead?.nome?.trim() || 'cliente'
  const servizio = lead?.servizio?.trim()
  if (servizio) {
    return `Ciao ${nome}, ti scrivo riguardo a ${servizio}.`
  }
  return `Ciao ${nome}, ti scrivo per un aggiornamento.`
}
