import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405)

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return jsonResponse({ error: 'Non autenticato' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseUser = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Sessione non valida' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('azienda_id', user.id)
      .maybeSingle()

    if (!sub?.stripe_customer_id) {
      return jsonResponse({ error: 'Nessun abbonamento Stripe attivo' }, 400)
    }

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const portal = await stripe.billingPortal.sessions.create({
      customer: sub.stripe_customer_id,
      return_url: `${appUrl}/billing`,
    })

    return jsonResponse({ url: portal.url })
  } catch (err) {
    console.error('[stripe-portal]', err)
    return jsonResponse({ error: err.message }, 500)
  }
})
