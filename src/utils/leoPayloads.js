const ACTIVE_STATI = new Set(['nuovo', 'contattato', 'in trattativa'])

function daysSince(iso) {
  if (!iso) return 0
  const ms = Date.now() - new Date(iso).getTime()
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)))
}

function startOfWeek() {
  const d = new Date()
  const day = d.getDay()
  const diff = day === 0 ? 6 : day - 1
  d.setDate(d.getDate() - diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function endOfWeek() {
  const d = startOfWeek()
  d.setDate(d.getDate() + 6)
  d.setHours(23, 59, 59, 999)
  return d
}

function formatPeriodoIt(from, to) {
  const opts = { day: 'numeric', month: 'long', year: 'numeric' }
  const a = from.toLocaleDateString('it-IT', opts)
  const b = to.toLocaleDateString('it-IT', opts)
  return `${a} - ${b}`
}

function isInRange(iso, from, to) {
  const t = new Date(iso).getTime()
  return t >= from.getTime() && t <= to.getTime()
}

export function buildEmailPayload(lead, note = '') {
  return {
    nome: lead.nome,
    servizio: lead.servizio || '',
    prezzo: parseFloat(lead.prezzo) || 0,
    stato: lead.stato || 'nuovo',
    note: note.trim(),
  }
}

export function buildFollowupPayload(leads, minDays = 5) {
  const stale = leads
    .filter(l => ACTIVE_STATI.has(l.stato))
    .map(l => ({
      nome: l.nome,
      stato: l.stato,
      giorni_fermo: daysSince(l.created_at),
    }))
    .filter(l => l.giorni_fermo >= minDays)
    .sort((a, b) => b.giorni_fermo - a.giorni_fermo)
    .slice(0, 15)

  return { leads: stale }
}

export function buildSummaryPayload(leads, receipts) {
  const from = startOfWeek()
  const to = endOfWeek()

  const weekLeads = leads.filter(l => isInRange(l.created_at, from, to))
  const nuovi_lead = weekLeads.length
  const lead_conclusi = leads.filter(l => l.stato === 'concluso' && isInRange(l.created_at, from, to)).length
  const lead_persi = leads.filter(l => l.stato === 'perso' && isInRange(l.created_at, from, to)).length
  const revenue = leads
    .filter(l => l.stato === 'concluso' && isInRange(l.created_at, from, to))
    .reduce((s, l) => s + (parseFloat(l.prezzo) || 0), 0)
  const ricevute_inviate = (receipts || []).filter(r =>
    r.email_inviata && isInRange(r.created_at, from, to)
  ).length
  const lead_fermi = buildFollowupPayload(leads).leads.length

  return {
    periodo: formatPeriodoIt(from, to),
    nuovi_lead,
    lead_conclusi,
    lead_persi,
    revenue: Math.round(revenue),
    ricevute_inviate,
    lead_fermi,
  }
}

export function buildChatPayload(message, leads, receipts, profile) {
  const slimLeads = (leads || []).slice(0, 100).map(l => ({
    nome: l.nome,
    email: l.email,
    servizio: l.servizio,
    prezzo: parseFloat(l.prezzo) || 0,
    stato: l.stato,
    created_at: l.created_at,
  }))

  const slimReceipts = (receipts || []).slice(0, 50).map(r => ({
    totale: parseFloat(r.totale) || 0,
    created_at: r.created_at,
    email_inviata: r.email_inviata,
    lead_id: r.lead_id,
  }))

  return {
    messaggio: message.trim(),
    dati: {
      leads: slimLeads,
      ricevute: slimReceipts,
      profilo: profile ? { nome_azienda: profile.nome_azienda } : null,
    },
  }
}
