import { supabase } from '../supabaseClient'

export const TEAM_INVITE_STORAGE_KEY = 'leados_team_invite'
export const TEAM_INVITE_SWITCH_KEY = 'leados_team_invite_switch'

const ACCEPT_ERROR_IT = {
  invalid_invite: 'Invito non valido o scaduto. Chiedi un nuovo link al titolare.',
  invalid_token: 'Link non valido.',
  email_mismatch: 'Devi accedere con la stessa email a cui è stato inviato l’invito.',
  owner_not_agency: 'Il team non è più attivo (piano Agency richiesto).',
  team_full: 'Il team ha raggiunto il numero massimo di collaboratori.',
  cannot_join_own_team: 'Non puoi usare il tuo invito sul tuo account.',
  not_authenticated: 'Accedi prima di accettare l’invito.',
}

export function normalizeInviteEmail(email) {
  return String(email || '').trim().toLowerCase()
}

export function inviteEmailsMatch(inviteEmail, userEmail) {
  const a = normalizeInviteEmail(inviteEmail)
  const b = normalizeInviteEmail(userEmail)
  return Boolean(a && b && a === b)
}

export function markTeamInviteSwitch(expectedEmail, previousEmail) {
  try {
    sessionStorage.setItem(
      TEAM_INVITE_SWITCH_KEY,
      JSON.stringify({
        expectedEmail: normalizeInviteEmail(expectedEmail),
        previousEmail: previousEmail ? String(previousEmail).trim() : '',
      }),
    )
  } catch {
    /* ignore */
  }
}

export function consumeTeamInviteSwitch() {
  try {
    const raw = sessionStorage.getItem(TEAM_INVITE_SWITCH_KEY)
    sessionStorage.removeItem(TEAM_INVITE_SWITCH_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export async function signOutForTeamInviteLogin(token, navigate) {
  const t = String(token || peekTeamInviteToken() || '').trim()
  if (t) storeTeamInviteToken(t)
  await supabase.auth.signOut()
  if (navigate && t) {
    navigate(`/login?token=${encodeURIComponent(t)}`, { replace: true })
    return
  }
  if (navigate) navigate('/login', { replace: true })
}

export function teamInviteErrorMessage(codeOrMsg, expectedEmail) {
  if (!codeOrMsg) return 'Impossibile completare l’invito.'
  if (codeOrMsg === 'email_mismatch' && expectedEmail) {
    return `L’invito è per ${expectedEmail}. Accedi con quell’account (non con un altro).`
  }
  if (ACCEPT_ERROR_IT[codeOrMsg]) return ACCEPT_ERROR_IT[codeOrMsg]
  if (typeof codeOrMsg === 'string' && codeOrMsg.includes('Could not find')) {
    return 'Funzione team non trovata su Supabase. Esegui la migration team_invite_fix.'
  }
  return codeOrMsg
}

/** URL univoco per accettare l’invito (registrazione o login) */
export function buildTeamInviteUrl(token) {
  const t = encodeURIComponent(String(token || '').trim())
  return `${window.location.origin}/join-team?token=${t}`
}

export function storeTeamInviteToken(token) {
  const t = String(token || '').trim()
  if (!t) return
  sessionStorage.setItem(TEAM_INVITE_STORAGE_KEY, t)
  try {
    localStorage.setItem(TEAM_INVITE_STORAGE_KEY, t)
  } catch {
    /* ignore */
  }
}

export function peekTeamInviteToken() {
  return (
    sessionStorage.getItem(TEAM_INVITE_STORAGE_KEY)
    || localStorage.getItem(TEAM_INVITE_STORAGE_KEY)
    || null
  )
}

export function clearTeamInviteToken() {
  sessionStorage.removeItem(TEAM_INVITE_STORAGE_KEY)
  try {
    localStorage.removeItem(TEAM_INVITE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function parseInviteTokenFromSearch(searchParams) {
  return (
    searchParams.get('token')
    || searchParams.get('team')
    || ''
  ).trim()
}

export async function fetchTeamInvitePreview(token) {
  const { data, error } = await supabase.rpc('get_team_invite_public', {
    p_token: String(token || '').trim(),
  })
  if (error) {
    return { ok: false, error: error.message }
  }
  return data ?? { ok: false, error: 'unknown' }
}

export async function acceptTeamInvite(token) {
  const t = String(token || peekTeamInviteToken() || '').trim()
  if (!t) return { ok: true, skipped: true }

  const { data, error } = await supabase.rpc('accept_team_invite', { p_token: t })

  if (error) {
    return { ok: false, error: error.message, code: 'rpc_error' }
  }

  const result = typeof data === 'string' ? JSON.parse(data) : data

  if (result?.ok) {
    clearTeamInviteToken()
  }

  return result ?? { ok: false, error: 'unknown' }
}

export async function acceptStoredTeamInvite() {
  return acceptTeamInvite(peekTeamInviteToken())
}
