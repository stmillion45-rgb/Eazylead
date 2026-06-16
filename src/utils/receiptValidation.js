export const HIGH_PRICE_THRESHOLD = 2000

export const REGIME_OPTIONS = [
  { id: 'ordinario',    label: 'Ordinario (IVA)' },
  { id: 'forfettario',  label: 'Forfettario (no IVA)' },
  { id: 'esente',       label: 'Esente IVA' },
]

export function isHighPrice(prezzo) {
  const n = parseFloat(prezzo)
  return !Number.isNaN(n) && n >= HIGH_PRICE_THRESHOLD
}

export function isProfileLegalForReceipt(company) {
  if (!company) return false
  return Boolean(
    company.nome_azienda?.trim()
    && company.piva?.trim()
    && company.indirizzo?.trim(),
  )
}

export function getLegalFooter(company, aliquotaIva) {
  const regime = company?.regime_fiscale || 'ordinario'

  if (regime === 'forfettario') {
    return 'Operazione effettuata ai sensi dell\'art. 1, commi 54-89, della Legge n. 190/2014 (regime forfettario). IVA non applicabile ai sensi dell\'art. 1, comma 67, L. 190/2014.'
  }
  if (regime === 'esente' || aliquotaIva === 0) {
    return 'Operazione esente da IVA ai sensi dell\'art. 10 del DPR 633/72, come indicato nel presente documento.'
  }
  return 'Documento emesso ai fini fiscali ai sensi del DPR 633/72. Imposta di valore aggiunta assolta come indicato.'
}

export function getDocumentTitle(company) {
  return isProfileLegalForReceipt(company) ? 'RICEVUTA FISCALE' : 'RICEVUTA'
}

/** Campi obbligatori prima dell'invio email/PDF fiscale */
export function validateReceiptSend(company, leads) {
  const missing = []

  const companyFields = [
    { key: 'nome_azienda', label: 'Nome azienda' },
    { key: 'piva',         label: 'Partita IVA' },
    { key: 'indirizzo',    label: 'Indirizzo sede legale' },
  ]

  for (const { key, label } of companyFields) {
    if (!company?.[key]?.trim()) {
      missing.push({
        scope: 'company',
        field: key,
        label,
        hint: 'Vai in Impostazioni e completa il profilo azienda',
      })
    }
  }

  const piva = company?.piva?.replace(/\s/g, '') ?? ''
  if (piva && !/^(\d{11}|IT\d{11})$/i.test(piva)) {
    missing.push({
      scope: 'company',
      field: 'piva',
      label: 'Partita IVA (formato non valido — 11 cifre)',
      hint: 'Impostazioni → Partita IVA',
    })
  }

  for (const lead of leads) {
    const ref = lead.nome?.trim() || 'Lead senza nome'
    if (!lead.nome?.trim()) {
      missing.push({ scope: 'lead', field: 'nome', label: 'Nome cliente', leadRef: ref, hint: 'Modifica il lead' })
    }
    if (!lead.servizio?.trim()) {
      missing.push({ scope: 'lead', field: 'servizio', label: 'Descrizione servizio', leadRef: ref, hint: 'Modifica il lead' })
    }
    if (!lead.email?.trim()) {
      missing.push({ scope: 'lead', field: 'email', label: 'Email cliente', leadRef: ref, hint: 'Serve per inviare la ricevuta' })
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email.trim())) {
      missing.push({ scope: 'lead', field: 'email', label: 'Email valida', leadRef: ref, hint: 'Correggi l\'email del lead' })
    }
    const prezzo = parseFloat(lead.prezzo)
    if (!prezzo || prezzo <= 0) {
      missing.push({ scope: 'lead', field: 'prezzo', label: 'Importo maggiore di zero', leadRef: ref, hint: 'Inserisci il prezzo del servizio' })
    }
  }

  return { ok: missing.length === 0, missing }
}

export function leadsWithHighPrice(leads) {
  return leads.filter(l => isHighPrice(l.prezzo))
}
