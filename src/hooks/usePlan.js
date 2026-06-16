import { useState, useEffect, useCallback } from 'react'

import { supabase } from '../supabaseClient'

import { useAuth } from '../App'
import { useWorkspace } from './useWorkspace'

import { FREE_LEAD_LIMIT, FREE_EMAIL_LIMIT, leoBudgetForPlan } from '../constants/plans'



function startOfMonthISO() {

  const d = new Date()

  d.setDate(1)

  d.setHours(0, 0, 0, 0)

  return d.toISOString()

}



export function usePlan() {

  const { user } = useAuth()
  const { workspaceId, isOwner } = useWorkspace()

  const [subscription, setSubscription] = useState(null)

  const [usage, setUsage] = useState({ leads: 0, emailsThisMonth: 0, leoSpentEur: 0 })

  const [loading, setLoading] = useState(true)



  const refresh = useCallback(async () => {

    if (!user || !workspaceId) {

      setSubscription(null)

      setUsage({ leads: 0, emailsThisMonth: 0, leoSpentEur: 0 })

      setLoading(false)

      return

    }



    setLoading(true)



    const monthStart = startOfMonthISO()



    const [subRes, leadsRes, receiptsRes, leoRes] = await Promise.all([

      supabase

        .from('subscriptions')

        .select('plan, status, current_period_end')

        .eq('azienda_id', workspaceId)

        .maybeSingle(),

      supabase

        .from('leads')

        .select('id', { count: 'exact', head: true })

        .eq('azienda_id', workspaceId),

      supabase

        .from('receipts')

        .select('id', { count: 'exact', head: true })

        .eq('azienda_id', workspaceId)

        .eq('email_inviata', true)

        .gte('created_at', monthStart),

      supabase

        .from('leo_usage')

        .select('cost_eur')

        .eq('azienda_id', workspaceId)

        .gte('created_at', monthStart),

    ])



    if (!subRes.error) setSubscription(subRes.data)

    else setSubscription(null)



    const leoSpentEur = (leoRes.data ?? []).reduce(

      (s, r) => s + (parseFloat(r.cost_eur) || 0),

      0,

    )



    setUsage({

      leads: leadsRes.count ?? 0,

      emailsThisMonth: receiptsRes.count ?? 0,

      leoSpentEur,

    })

    setLoading(false)

  }, [user, workspaceId])



  useEffect(() => {

    refresh()

  }, [refresh])



  const plan = subscription?.plan ?? 'free'

  const status = subscription?.status ?? 'active'

  const isFree = plan === 'free'

  const isPaid = plan === 'pro' || plan === 'agency'

  const leoBudgetEur = leoBudgetForPlan(plan)

  const leoActive = isPaid && ['active', 'trialing'].includes(status)

  const leoRemainingEur = leoBudgetEur != null

    ? Math.max(0, leoBudgetEur - usage.leoSpentEur)

    : null

  const canUseLeo = leoActive && leoRemainingEur != null && leoRemainingEur >= 0.02

  const isAgency = plan === 'agency'
  const canManageTeam = isAgency && isOwner && ['active', 'trialing'].includes(status)



  const canAddLead = !isFree || usage.leads < FREE_LEAD_LIMIT

  const canSendEmail = !isFree || usage.emailsThisMonth < FREE_EMAIL_LIMIT

  const leadsRemaining = isFree ? Math.max(0, FREE_LEAD_LIMIT - usage.leads) : null

  const emailsRemaining = isFree ? Math.max(0, FREE_EMAIL_LIMIT - usage.emailsThisMonth) : null



  return {

    subscription,

    plan,

    status,

    currentPeriodEnd: subscription?.current_period_end,

    loading,

    usage,

    isFree,

    isPaid,

    canAddLead,

    canSendEmail,

    leadsRemaining,

    emailsRemaining,

    leoBudgetEur,

    leoRemainingEur,

    leoActive,

    canUseLeo,

    isAgency,

    canManageTeam,

    refresh,

    limits: { FREE_LEAD_LIMIT, FREE_EMAIL_LIMIT },

  }

}


