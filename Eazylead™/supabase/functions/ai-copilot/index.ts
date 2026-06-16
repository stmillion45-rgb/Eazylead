// supabase/functions/ai-copilot/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { CORS_HEADERS, jsonResponse } from '../_shared/cors.ts'
import { LEO_SYSTEM_PROMPT, VALID_ACTIONS, type LeoAction } from '../_shared/leoSystemPrompt.ts'
import {
  budgetForPlan,
  calcCostEur,
  isLeoPlanAllowed,
  LEO_ESTIMATED_MAX_COST_EUR,
  startOfMonthISO,
} from '../_shared/leoBudget.ts'

function validateRequest(action: string, payload: unknown): string | null {
  if (!VALID_ACTIONS.includes(action as LeoAction)) return 'action_invalid'
  const p = payload as Record<string, unknown>
  if (!p || typeof p !== 'object') return 'payload_missing'

  switch (action) {
    case 'email':
      if (!p.nome || typeof p.nome !== 'string') return 'email_missing_nome'
      return null
    case 'followup':
      if (!Array.isArray(p.leads) || p.leads.length === 0) return 'followup_empty'
      return null
    case 'summary':
      if (!p.periodo) return 'summary_missing_periodo'
      return null
    case 'chat':
      if (!p.messaggio || typeof p.messaggio !== 'string') return 'chat_missing_message'
      return null
    default:
      return 'action_invalid'
  }
}

type AnthropicResult = {
  text: string
  inputTokens: number
  outputTokens: number
}

async function callAnthropic(action: string, payload: unknown): Promise<AnthropicResult> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) throw new Error('LEO_NOT_CONFIGURED')

  const model = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-20250514'
  const userContent = JSON.stringify({ action, payload })

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      system: LEO_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
  })

  if (!res.ok) {
    console.error('Anthropic API error', res.status, await res.text())
    throw new Error('LEO_API_ERROR')
  }

  const data = await res.json()
  const text = data.content?.find((b: { type: string; text?: string }) => b.type === 'text')?.text
  if (!text?.trim()) throw new Error('LEO_EMPTY_RESPONSE')

  return {
    text: text.trim(),
    inputTokens: data.usage?.input_tokens ?? 0,
    outputTokens: data.usage?.output_tokens ?? 0,
  }
}

async function getMonthlySpent(admin: ReturnType<typeof createClient>, userId: string): Promise<number> {
  const { data, error } = await admin
    .from('leo_usage')
    .select('cost_eur')
    .eq('azienda_id', userId)
    .gte('created_at', startOfMonthISO())

  if (error) {
    console.error('leo_usage sum error', error)
    return 0
  }

  return (data ?? []).reduce((s, r) => s + Number(r.cost_eur || 0), 0)
}

function formatEur(n: number): string {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n)
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
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) return jsonResponse({ error: 'Sessione non valida' }, 401)

    const body = await req.json()
    const action = body?.action
    const payload = body?.payload

    if (!action || typeof action !== 'string') {
      return jsonResponse({
        text: 'Non riesco a elaborare la richiesta — mancano i dati necessari. Riprova o contatta il supporto se il problema persiste.',
      })
    }

    const validationError = validateRequest(action, payload)
    if (validationError === 'action_invalid') {
      return jsonResponse({
        text: 'Questa funzione non è disponibile. Le funzioni disponibili sono: email, followup, summary, chat.',
      })
    }
    if (validationError) {
      return jsonResponse({
        text: 'Non riesco a elaborare la richiesta — mancano i dati necessari. Riprova o contatta il supporto se il problema persiste.',
      })
    }

    const { data: membership } = await admin
      .from('team_members')
      .select('owner_id')
      .eq('member_id', user.id)
      .maybeSingle()

    const workspaceId = membership?.owner_id ?? user.id

    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan, status')
      .eq('azienda_id', workspaceId)
      .maybeSingle()

    const plan = sub?.plan ?? 'free'
    const status = sub?.status ?? 'active'

    if (!isLeoPlanAllowed(plan) || !['active', 'trialing'].includes(status)) {
      return jsonResponse({
        error: 'Leo è disponibile solo con il piano Pro o Agency.',
        code: 'plan_required',
      }, 403)
    }

    const budgetEur = budgetForPlan(plan)!
    const spentEur = await getMonthlySpent(admin, workspaceId)
    const remainingEur = Math.max(0, budgetEur - spentEur)

    if (remainingEur < LEO_ESTIMATED_MAX_COST_EUR) {
      return jsonResponse({
        error: `Hai esaurito il credito Leo di questo mese (${formatEur(budgetEur)}). Si resetta il 1° del mese prossimo.`,
        code: 'budget_exceeded',
        budget_eur: budgetEur,
        spent_eur: spentEur,
        remaining_eur: remainingEur,
      }, 402)
    }

    const { text, inputTokens, outputTokens } = await callAnthropic(action, payload)
    const costEur = calcCostEur(inputTokens, outputTokens)

    await admin.from('leo_usage').insert({
      azienda_id: workspaceId,
      action,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_eur: costEur,
    }).then(({ error: insErr }) => {
      if (insErr) console.error('leo_usage insert failed', insErr)
    })

    const newSpent = spentEur + costEur

    return jsonResponse({
      text,
      usage: {
        cost_eur: costEur,
        spent_eur: newSpent,
        budget_eur: budgetEur,
        remaining_eur: Math.max(0, budgetEur - newSpent),
      },
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    if (msg === 'LEO_NOT_CONFIGURED') {
      return jsonResponse({
        error: 'Leo non è configurato. Aggiungi ANTHROPIC_API_KEY nei secret Supabase e rideploy ai-copilot.',
      }, 503)
    }
    console.error('ai-copilot error', err)
    return jsonResponse({
      text: 'Non riesco a elaborare la richiesta — mancano i dati necessari. Riprova o contatta il supporto se il problema persiste.',
    })
  }
})
