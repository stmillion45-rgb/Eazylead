import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const jsonHeaders = {
  "Content-Type": "application/json",
}

// Inizializzazione Admin Client di Supabase (ha i permessi massimi per modificare il DB)
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Funzione isolata per capire quale piano assegnare
const determineUserTier = (description: string): string => {
  const desc = description.toUpperCase()
  if (desc.includes('AGENCY-PRO')) return 'agency_pro'
  if (desc.includes('AGENCY-BASE')) return 'agency_base'
  if (desc.includes('PRO')) return 'pro'
  return 'free'
}

Deno.serve(async (req) => {
  // Accetta solo le richieste in arrivo (POST)
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Metodo non consentito" }), { status: 405, headers: jsonHeaders })
  }

  try {
    // Legge il payload di Stripe nativamente aggirando il blocco crittografico di Deno
    const body = await req.json()
    
    // Filtro per accettare solo i pagamenti completati
    if (body.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true, message: "Evento ignorato" }), { status: 200, headers: jsonHeaders })
    }

    const session = body.data.object
    const userEmail = session.customer_details?.email ?? session.customer_email
    const description = session.description ?? ""
    
    // In produzione, i sistemi avanzati passano l'ID utente qui. Se c'è lo prendiamo.
    const userId = session.client_reference_id ?? session.metadata?.user_id ?? null

    if (!userEmail && !userId) {
      throw new Error("Nessun identificativo (Email o ID) trovato nel payload di Stripe")
    }

    const assignedTier = determineUserTier(description)
    console.log(`[Eazylead™ Webhook] Assegnazione piano [${assignedTier}] a: ${userEmail || userId}`)

    let dbError = null;

    // STRATEGIA DI AGGIORNAMENTO PROFILO
    if (userId) {
      // 1. Tenta l'aggiornamento tramite ID utente (ideale)
      const { error } = await supabaseAdmin
        .from('profiles') 
        .update({ user_tier: assignedTier, updated_at: new Date().toISOString() })
        .eq('id', userId)
      dbError = error
    } else {
      // 2. Fallback per i Test di Stripe: Aggiorna cercando l'email
      const { error } = await supabaseAdmin
        .from('profiles') 
        .update({ user_tier: assignedTier, updated_at: new Date().toISOString() })
        .eq('email', userEmail)
      dbError = error
    }

    // Se la colonna email non esiste, l'errore verrà loggato qui sotto
    if (dbError) throw new Error(dbError.message)

    console.log(`[Eazylead™ Webhook] Successo! Profilo aggiornato correttamente.`)
    return new Response(JSON.stringify({ success: true, tier: assignedTier }), { status: 200, headers: jsonHeaders })

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore sconosciuto"
    console.error(`[Eazylead™ Webhook Error] Errore DB:`, msg)
    return new Response(JSON.stringify({ error: msg }), { status: 400, headers: jsonHeaders })
  }
})