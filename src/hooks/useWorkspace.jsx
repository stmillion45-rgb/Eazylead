import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'

const WorkspaceContext = createContext(null)

export function WorkspaceProvider({ children }) {
  const { user } = useAuth()
  const [workspaceId, setWorkspaceId] = useState(user?.id ?? null)
  const [isTeamMember, setIsTeamMember] = useState(false)
  const [ownerEmail, setOwnerEmail] = useState(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) {
      setWorkspaceId(null)
      setIsTeamMember(false)
      setOwnerEmail(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data: membership } = await supabase
      .from('team_members')
      .select('owner_id')
      .eq('member_id', user.id)
      .maybeSingle()

    const wid = membership?.owner_id ?? user.id
    setWorkspaceId(wid)
    setIsTeamMember(!!membership?.owner_id && membership.owner_id !== user.id)

    if (membership?.owner_id && membership.owner_id !== user.id) {
      const { data: ownerRow } = await supabase
        .from('profiles')
        .select('nome_azienda')
        .eq('id', membership.owner_id)
        .maybeSingle()
      setOwnerEmail(ownerRow?.nome_azienda || 'Workspace condiviso')
    } else {
      setOwnerEmail(null)
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const isOwner = !!user && workspaceId === user.id

  return (
    <WorkspaceContext.Provider
      value={{
        workspaceId: workspaceId ?? user?.id ?? null,
        isOwner,
        isTeamMember,
        ownerLabel: ownerEmail,
        loading,
        refresh,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider')
  }
  return ctx
}

/** ID da usare per azienda_id su lead, ricevute, preventivi */
export function useAziendaId() {
  const { workspaceId } = useWorkspace()
  return workspaceId
}
