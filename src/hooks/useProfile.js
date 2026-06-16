import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../App'
import { useWorkspace } from './useWorkspace'

import { isProfileLegalForReceipt } from '../utils/receiptValidation'

export function isCompanyProfileComplete(profile) {
  return isProfileLegalForReceipt(profile)
}

const PROFILE_FIELDS = 'nome_azienda, piva, indirizzo, codice_fiscale, regime_fiscale, pdf_theme, logo_url, logo_shape, iban, default_aliquota_iva, onboarding_completed, product_tour_completed'

export function useProfile() {
  const { user } = useAuth()
  const { workspaceId, isTeamMember } = useWorkspace()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = useCallback(async () => {
    if (!user || !workspaceId) {
      setProfile(null)
      setLoading(false)
      return null
    }
    setLoading(true)
    let { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_FIELDS)
      .eq('id', workspaceId)
      .maybeSingle()

    // Crea riga profilo se manca (utenti registrati prima del trigger SQL)
    if (!error && !data) {
      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .upsert({ id: user.id, onboarding_completed: false, logo_shape: 'square', regime_fiscale: 'ordinario', pdf_theme: 'classic' })
        .select(PROFILE_FIELDS)
        .single()
      if (!insertErr) data = created
    }

    if (!error) setProfile(data)
    setLoading(false)
    return error ? null : data
  }, [user, workspaceId])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  async function saveProfile(fields) {
    if (!user) return { error: new Error('Utente non autenticato') }
    if (isTeamMember) return { error: new Error('Solo il titolare può modificare il profilo azienda') }

    const { error } = await supabase.from('profiles').upsert({
      id: workspaceId,
      nome_azienda: fields.nome_azienda?.trim() || null,
      piva:         fields.piva?.trim() || null,
      indirizzo:    fields.indirizzo?.trim() || null,
      codice_fiscale: fields.codice_fiscale?.trim() || null,
      regime_fiscale: fields.regime_fiscale || 'ordinario',
      pdf_theme:    fields.pdf_theme || 'classic',
      logo_url:     fields.logo_url?.trim() || null,
      logo_shape:   fields.logo_shape || 'square',
      iban:         fields.iban?.trim() || null,
      default_aliquota_iva: fields.default_aliquota_iva != null
        ? Number(fields.default_aliquota_iva)
        : 22,
    })

    if (!error) await fetchProfile()
    return { error }
  }

  return {
    profile,
    loading,
    saveProfile,
    refresh: fetchProfile,
    isConfigured: isCompanyProfileComplete(profile),
    isTeamMember,
    canEditProfile: !isTeamMember,
  }
}
