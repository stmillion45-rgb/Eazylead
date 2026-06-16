import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2023-10-16',
})

function planFromPriceId(priceId: string): string {
  if (priceId === Deno.env.get('PRICE_ID_PRO')) return 'pro'
  if (priceId === Deno.env.get('PRICE_ID_AGENCY')) return 'agency'
  return 'free'
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  if (!webhookSecret) {
    return new Response('Webhook secret missing', { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) return new Response('No signature', { status: 400 })

  const body = await req.text()
  let event: Stripe.Event

  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.supabase_user_id
        if (!userId || !session.subscription) break

        const subscription = await stripe.subscriptions.retrieve(String(session.subscription))
        const priceId = subscription.items.data[0]?.price?.id ?? ''
        const plan = session.metadata?.plan ?? planFromPriceId(priceId)

        await admin.from('subscriptions').upsert({
          azienda_id: userId,
          stripe_customer_id: String(session.customer),
          stripe_subscription_id: subscription.id,
          plan,
          status: subscription.status,
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'azienda_id' })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = String(subscription.customer)
        const priceId = subscription.items.data[0]?.price?.id ?? ''
        const plan = planFromPriceId(priceId)

        const { data: rows } = await admin
          .from('subscriptions')
          .select('azienda_id')
          .eq('stripe_customer_id', customerId)
          .limit(1)

        if (rows?.[0]) {
          await admin.from('subscriptions').update({
            stripe_subscription_id: subscription.id,
            plan: subscription.status === 'active' ? plan : 'free',
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          }).eq('azienda_id', rows[0].azienda_id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = String(subscription.customer)
        await admin.from('subscriptions').update({
          plan: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = String(invoice.customer)
        await admin.from('subscriptions').update({
          status: 'past_due',
          updated_at: new Date().toISOString(),
        }).eq('stripe_customer_id', customerId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[stripe-webhook]', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
