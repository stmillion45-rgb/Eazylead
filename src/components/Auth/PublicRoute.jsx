import { useEffect, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import Spinner from '../UI/Spinner'
import {
  fetchTeamInvitePreview,
  inviteEmailsMatch,
  markTeamInviteSwitch,
  parseInviteTokenFromSearch,
  storeTeamInviteToken,
} from '../../utils/teamInvite'

/** Login/registrazione: se c’è un invito team e l’utente è loggato con email sbagliata, esci e mostra il form. */
export default function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  const [searchParams] = useSearchParams()
  const inviteToken = parseInviteTokenFromSearch(searchParams)
  const [ready, setReady] = useState(!inviteToken)

  useEffect(() => {
    if (loading) return

    if (!inviteToken) {
      setReady(true)
      return
    }

    let cancelled = false

    async function gate() {
      if (!user) {
        if (!cancelled) setReady(true)
        return
      }

      const preview = await fetchTeamInvitePreview(inviteToken)
      if (cancelled) return

      if (preview?.ok && preview.email && !inviteEmailsMatch(preview.email, user.email)) {
        storeTeamInviteToken(inviteToken)
        markTeamInviteSwitch(preview.email, user.email)
        await supabase.auth.signOut()
        if (!cancelled) setReady(true)
        return
      }

      if (!cancelled) setReady(true)
    }

    gate()
    return () => { cancelled = true }
  }, [loading, user, inviteToken])

  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (user) return <Navigate to="/dashboard" replace />

  return children
}
