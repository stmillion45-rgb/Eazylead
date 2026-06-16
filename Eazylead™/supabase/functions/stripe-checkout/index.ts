import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

function priceIdForPlan(plan: string): string | null {
  if (plan === 'pro') return Deno.env.get('PRICE_ID_PRO') ?? null
  if (plan === 'agency') return Deno.env.get('PRICE_ID_AGENCY') ?? null
  return null
}

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

    const { plan } = await req.json()
    const priceId = priceIdForPlan(plan)
    if (!priceId) return jsonResponse({ error: 'Piano non valido o PRICE_ID non configurato' }, 400)

    const appUrl = Deno.env.get('APP_URL') ?? 'http://localhost:5173'
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: sub } = await admin
      .from('subscriptions')
      .select('stripe_customer_id, stripe_subscription_id, plan, status')
      .eq('azienda_id', user.id)
      .maybeSingle()

    let customerId = sub?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin.from('subscriptions').upsert({
        azienda_id: user.id,
        stripe_customer_id: customerId,
        plan: 'free',
        status: 'active',
      }, { onConflict: 'azienda_id' })
    }

    // Upgrade/downgrade con prorazione (es. Pro → Agency) se abbonamento già attivo
    const canUpgrade = sub?.stripe_subscription_id
      && ['active', 'trialing', 'past_due'].includes(sub?.status ?? '')

    if (canUpgrade) {
      const existing = await stripe.subscriptions.retrieve(sub.stripe_subscription_id!)
      const itemId = existing.items.data[0]?.id
      if (!itemId) throw new Error('Abbonamento Stripe senza price item')

      const updated = await stripe.subscriptions.update(sub.stripe_subscription_id!, {
        items: [{ id: itemId, price: priceId }],
        proration_behavior: 'create_prorations',
        metadata: { supabase_user_id: user.id, plan },
      })

      await admin.from('subscriptions').update({
        plan,
        status: updated.status,
        current_period_end: new Date(updated.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }).eq('azienda_id', user.id)

      return jsonResponse({
        upgraded: true,
        plan,
        message: 'Piano aggiornato. Stripe applica l\'adeguamento proporzionale (credito Pro + differenza Agency).',
      })
    }

    // Primo abbonamento: Checkout classico
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${appUrl}/billing?success=true`,
      cancel_url: `${appUrl}/billing?canceled=true`,
      metadata: { supabase_user_id: user.id, plan },
    })

    return jsonResponse({ url: session.url })
  } catch (err) {
    console.error('[stripe-checkout]', err)
    return jsonResponse({ error: err.message }, 500)
  }
})
