import { useState, useEffect, useCallback } from 'react'
import { Users, Link2, Trash2, Mail, Copy, Check } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useWorkspace } from '../../hooks/useWorkspace'
import { usePlan } from '../../hooks/usePlan'
import { useToast } from '../UI/Toast'
import Spinner from '../UI/Spinner'
import { AGENCY_MAX_TEAM_MEMBERS } from '../../constants/team'
import { buildTeamInviteUrl } from '../../utils/teamInvite'
import { invokeEdgeFunction } from '../../utils/invokeFunction'
import { useProfile } from '../../hooks/useProfile'

function inviteErrorMessage(code) {
  const map = {
    agency_required: 'Il multi-utente è disponibile solo con il piano Agency attivo.',
    team_full: `Hai raggiunto il limite di ${AGENCY_MAX_TEAM_MEMBERS} collaboratori.`,
    invalid_email: 'Inserisci un’email valida.',
    not_authenticated: 'Sessione scaduta. Accedi di nuovo.',
  }
  return map[code] || 'Impossibile creare l’invito. Riprova.'
}

export default function TeamView() {
  const { user } = useAuth()
  const { isOwner } = useWorkspace()
  const { plan, status } = usePlan()
  const { profile } = useProfile()
  const { addToast } = useToast()

  const [members, setMembers] = useState([])
  const [invites, setInvites] = useState([])
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [lastLink, setLastLink] = useState(null)
  const [copied, setCopied] = useState(false)

  const agencyActive = plan === 'agency' && ['active', 'trialing'].includes(status)

  const load = useCallback(async () => {
    if (!user || !isOwner) return
    setLoading(true)
    const [memRes, invRes] = await Promise.all([
      supabase
        .from('team_members')
        .select('id, member_id, role, created_at')
        .eq('owner_id', user.id)
        .order('created_at'),
      supabase
        .from('team_invites')
        .select('id, email, token, expires_at, created_at')
        .eq('owner_id', user.id)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }),
    ])
    setMembers(memRes.data ?? [])
    setInvites(invRes.data ?? [])
    setLoading(false)
  }, [user, isOwner])

  useEffect(() => {
    load()
  }, [load])

  async function handleInvite(e) {
    e.preventDefault()
    if (!email.trim()) return
    setCreating(true)
    setLastLink(null)
    const { data, error } = await supabase.rpc('create_team_invite', {
      p_email: email.trim().toLowerCase(),
    })
    setCreating(false)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
      return
    }
    if (!data?.ok) {
      addToast({ message: inviteErrorMessage(data?.error), variant: 'error' })
      return
    }
    const link = buildTeamInviteUrl(data.token)
    setLastLink(link)
    setEmail('')

    const ownerName = profile?.nome_azienda?.trim() || 'LeadOS'
    const { error: mailError } = await invokeEdgeFunction('send-email', {
      docType: 'team_invite',
      to: data.email,
      inviteToken: data.token,
      ownerName,
      company: {
        nome_azienda: profile?.nome_azienda,
        piva: profile?.piva,
        indirizzo: profile?.indirizzo,
      },
    })

    if (mailError) {
      addToast({
        message: `Invito creato. Email non inviata: ${mailError}. Usa «Copia» per inviare il link manualmente.`,
        variant: 'info',
      })
    } else {
      addToast({ message: `Invito creato e email inviata a ${data.email}`, variant: 'success' })
    }
    load()
  }

  async function removeMember(memberId) {
    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('owner_id', user.id)
      .eq('member_id', memberId)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
      return
    }
    addToast({ message: 'Collaboratore rimosso', variant: 'success' })
    load()
  }

  async function revokeInvite(id) {
    const { error } = await supabase.from('team_invites').delete().eq('id', id)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
      return
    }
    load()
  }

  function copyLink() {
    if (!lastLink) return
    navigator.clipboard.writeText(lastLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!isOwner) {
    return (
      <div className="p-6 max-w-lg">
        <p className="text-slate-400 text-sm">
          Solo il titolare dell&apos;account può gestire il team.
        </p>
      </div>
    )
  }

  if (!agencyActive) {
    return (
      <div className="p-6 max-w-lg">
        <h2 className="text-slate-100 font-display font-bold text-lg mb-2">Team</h2>
        <p className="text-slate-400 text-sm mb-4">
          Invita fino a {AGENCY_MAX_TEAM_MEMBERS} collaboratori sullo stesso workspace (lead, ricevute, preventivi).
          Richiede il piano <strong className="text-slate-300">Agency</strong>.
        </p>
        <a href="/billing" className="btn-primary text-sm inline-flex min-h-[40px]">
          Vedi piani
        </a>
      </div>
    )
  }

  const slotsUsed = members.length

  return (
    <div className="p-4 sm:p-6 max-w-2xl animate-fade-in">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-violet-950 border border-violet-900 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-slate-100 font-display font-bold text-lg">Team</h2>
          <p className="text-slate-500 text-sm">
            {slotsUsed}/{AGENCY_MAX_TEAM_MEMBERS} collaboratori · stessi dati aziendali
          </p>
        </div>
      </div>

      <form onSubmit={handleInvite} className="card p-5 mb-6 space-y-3">
        <label className="block text-xs font-medium text-slate-400 uppercase tracking-wider">
          Invita collaboratore
        </label>
        <p className="text-slate-500 text-xs">
          Invieremo un&apos;email con il link all&apos;indirizzo indicato. Il collaboratore deve registrarsi o accedere con la stessa email.
        </p>
        <div className="flex gap-2 flex-col sm:flex-row">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="collaboratore@esempio.it"
              className="input-base pl-10"
              disabled={slotsUsed >= AGENCY_MAX_TEAM_MEMBERS}
            />
          </div>
          <button
            type="submit"
            disabled={creating || slotsUsed >= AGENCY_MAX_TEAM_MEMBERS}
            className="btn-primary text-sm min-h-[44px] shrink-0 disabled:opacity-50"
          >
            {creating ? <Spinner size="sm" /> : 'Crea invito'}
          </button>
        </div>
        {lastLink && (
          <div className="flex items-center gap-2 p-3 bg-slate-950 rounded-lg border border-slate-800">
            <Link2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-slate-400 text-xs truncate flex-1 font-mono">{lastLink}</p>
            <button type="button" onClick={copyLink} className="btn-secondary text-xs min-h-[32px] px-2 gap-1">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiato' : 'Copia'}
            </button>
          </div>
        )}
      </form>

      {loading ? (
        <div className="flex justify-center py-12"><Spinner size="md" /></div>
      ) : (
        <>
          {members.length > 0 && (
            <div className="card overflow-hidden mb-6">
              <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                Collaboratori attivi
              </p>
              <ul className="divide-y divide-slate-800">
                {members.map(m => (
                  <li key={m.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div>
                      <p className="text-slate-300 text-sm">Collaboratore</p>
                      <p className="text-slate-600 text-xs">
                        Dal {new Date(m.created_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeMember(m.member_id)}
                      className="text-slate-500 hover:text-red-400 p-1"
                      title="Rimuovi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {invites.length > 0 && (
            <div className="card overflow-hidden">
              <p className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest border-b border-slate-800">
                Inviti in sospeso
              </p>
              <ul className="divide-y divide-slate-800">
                {invites.map(inv => (
                  <li key={inv.id} className="flex items-center justify-between px-4 py-3 gap-2">
                    <div className="min-w-0">
                      <p className="text-slate-300 text-sm truncate">{inv.email}</p>
                      <p className="text-slate-600 text-xs">
                        Scade {new Date(inv.expires_at).toLocaleDateString('it-IT')}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const link = buildTeamInviteUrl(inv.token)
                          navigator.clipboard.writeText(link)
                          addToast({ message: 'Link copiato', variant: 'success' })
                        }}
                        className="btn-secondary text-xs min-h-[32px] px-2"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeInvite(inv.id)}
                        className="text-slate-500 hover:text-red-400 p-2"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {members.length === 0 && invites.length === 0 && (
            <p className="text-slate-500 text-sm text-center py-8">Nessun collaboratore ancora.</p>
          )}
        </>
      )}
    </div>
  )
}
