import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

const PLAN_ALIASES = {
  agency: 'agency_pro',
}

export function normalizePlanId(planId) {
  if (!planId) return null
  return PLAN_ALIASES[planId] ?? planId
}

export function useActivePlan() {
  const [planId, setPlanId] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)

      const { data: { user } = {} } = await supabase.auth.getUser()

      if (!user) {
        if (!cancelled) {
          setPlanId(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .maybeSingle()

      if (!cancelled) {
        setPlanId(error ? null : normalizePlanId(data?.subscription_tier))
        setLoading(false)
      }
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  return { planId, loading }
}
