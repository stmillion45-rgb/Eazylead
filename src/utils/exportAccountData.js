import { supabase } from '../supabaseClient'

/** Esportazione portabilità dati (GDPR) — JSON dell’account workspace. */
export async function exportAccountData(workspaceId, userEmail) {
  const [profileRes, leadsRes, receiptsRes, quotesRes, subRes, notesRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', workspaceId).maybeSingle(),
    supabase.from('leads').select('*').eq('azienda_id', workspaceId),
    supabase.from('receipts').select('*').eq('azienda_id', workspaceId),
    supabase.from('quotes').select('*').eq('azienda_id', workspaceId),
    supabase.from('subscriptions').select('plan, status, current_period_end').eq('azienda_id', workspaceId).maybeSingle(),
    supabase.from('lead_notes').select('*').eq('azienda_id', workspaceId),
  ])

  const payload = {
    exported_at: new Date().toISOString(),
    account_email: userEmail,
    workspace_id: workspaceId,
    profile: profileRes.data,
    subscription: subRes.data,
    leads: leadsRes.data ?? [],
    receipts: receiptsRes.data ?? [],
    quotes: quotesRes.data ?? [],
    lead_notes: notesRes.data ?? [],
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `leados-export-${workspaceId.slice(0, 8)}-${Date.now()}.json`
  a.click()
  URL.revokeObjectURL(url)
}
