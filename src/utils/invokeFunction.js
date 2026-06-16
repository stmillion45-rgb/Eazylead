import { supabase } from '../supabaseClient'

const DEFAULT_BY_FN = {
  'ai-copilot': 'Leo non è disponibile. Configura ANTHROPIC_API_KEY su Supabase, esegui la migration leo_usage e rideploy ai-copilot.',
  'send-email': 'Invio email non riuscito. Controlla la connessione e riprova.',
  'delete-account': 'Eliminazione account non riuscita. Riprova o contattaci.',
  'stripe-checkout': 'Checkout non disponibile al momento. Riprova tra poco.',
  'stripe-portal': 'Portale pagamenti non disponibile. Riprova tra poco.',
}

export async function friendlyFunctionError(error, fnName) {
  if (!error) return 'Operazione non riuscita. Riprova.'

  const raw = error.message || ''

  if (
    raw.includes('Failed to fetch')
    || raw.includes('NetworkError')
    || error.name === 'FunctionsFetchError'
  ) {
    return 'Connessione assente o server non raggiungibile. Controlla la rete e riprova.'
  }

  if (error.context && typeof error.context.json === 'function') {
    try {
      const body = await error.context.json()
      if (body?.error) return body.error
      if (body?.text) return body.text
    } catch {
      // body non JSON
    }
  }

  if (raw.includes('non-2xx')) {
    return DEFAULT_BY_FN[fnName] || 'Servizio temporaneamente non disponibile. Riprova tra poco.'
  }

  if (raw.includes('JWT') || raw.includes('401')) {
    return 'Sessione scaduta. Esci e accedi di nuovo.'
  }

  return raw || 'Operazione non riuscita. Riprova.'
}

export async function invokeEdgeFunction(fnName, body = {}) {
  const { data, error } = await supabase.functions.invoke(fnName, { body })

  if (error) {
    const message = await friendlyFunctionError(error, fnName)
    return { data: null, error: message, rawError: error }
  }

  if (data?.error) {
    return { data, error: data.error, code: data.code ?? null }
  }

  return { data, error: null, code: null }
}
