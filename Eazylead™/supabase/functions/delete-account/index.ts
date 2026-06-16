import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders(req) })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405, req)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autenticato' }, 401, req)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Sessione non valida' }, 401, req)

    const admin = createClient(supabaseUrl, serviceKey)
    const uid = user.id

    const { data: ownedTeams } = await admin
      .from('team_members')
      .select('member_id')
      .eq('owner_id', uid)

    if ((ownedTeams?.length ?? 0) > 0) {
      return jsonResponse({
        error: 'Rimuovi i collaboratori dal team prima di eliminare l’account.',
      }, 400, req)
    }

    await admin.from('team_members').delete().eq('member_id', uid)
    await admin.from('team_invites').delete().eq('owner_id', uid)
    await admin.from('receipts').delete().eq('azienda_id', uid)
    await admin.from('quotes').delete().eq('azienda_id', uid)
    await admin.from('leads').delete().eq('azienda_id', uid)
    await admin.from('leo_usage').delete().eq('azienda_id', uid)
    await admin.from('subscriptions').delete().eq('azienda_id', uid)
    await admin.from('profiles').delete().eq('id', uid)

    const { error: delAuth } = await admin.auth.admin.deleteUser(uid)
    if (delAuth) {
      return jsonResponse({ error: delAuth.message }, 500, req)
    }

    return jsonResponse({ success: true }, 200, req)
  } catch (err) {
    console.error('[delete-account]', err)
    return jsonResponse({ error: err?.message ?? 'Errore eliminazione account' }, 500, req)
  }
})
