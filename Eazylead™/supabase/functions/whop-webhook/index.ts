import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const body = await req.json()
    
    // Whop invia l'evento (es. membership_activated)
    const eventType = body.action
    const data = body.data

    // Client di Supabase con i permessi di Admin per aggiornare i profili
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const email = data.user?.email
    const planName = data.plan?.name // Prende il nome del piano (es. "PRO")

    if (!email) throw new Error("Email non trovata nel payload")

    // Se l'utente ha attivato un abbonamento
    if (eventType === 'membership_activated') {
      let leadLimit = 15 // Default free
      let tier = 'FREE'

      if (planName === 'PRO') {
        leadLimit = 150 // O il limite che vuoi impostare per il Pro
        tier = 'PRO'
      } else if (planName?.includes('AGENCY')) {
        leadLimit = 999999 // Illimitato per le Agency
        tier = 'AGENCY'
      }

      const { error } = await supabaseAdmin
        .from('profiles') // Controlla se la tua tabella utenti si chiama 'profiles'
        .update({ 
          plan_tier: tier, 
          lead_limit: leadLimit 
        })
        .eq('email', email)

      if (error) throw error
    }

    // Se l'abbonamento scade o viene cancellato
    if (eventType === 'membership_deactivated') {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
          plan_tier: 'FREE', 
          lead_limit: 15 
        })
        .eq('email', email)

      if (error) throw error
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200,
      headers: { "Content-Type": "application/json" }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 400,
      headers: { "Content-Type": "application/json" }
    })
  }
})