export const FREE_LEAD_LIMIT = 50
export const FREE_EMAIL_LIMIT = 10

export const LEO_BUDGET_PRO_EUR = 5
export const LEO_BUDGET_AGENCY_BASE_EUR = 15
export const LEO_BUDGET_AGENCY_EUR = 15
export const LEO_BUDGET_VIP_EUR = 100

export const PLAN_LABELS = {
  free:        'Free',
  pro:         'Pro',
  agency_base: 'Agency Base',
  agency:      'Agency Pro',
  vip:         'VIP',
}

export const PLAN_PRICES = {
  pro:         '20€/mese',
  agency_base: '45€/mese',
  agency:      '55€/mese',
  vip:         'A partire da 250€/mese',
}

export function leoBudgetForPlan(plan) {
  if (plan === 'pro')          return LEO_BUDGET_PRO_EUR
  if (plan === 'agency_base')  return LEO_BUDGET_AGENCY_BASE_EUR
  if (plan === 'agency')       return LEO_BUDGET_AGENCY_EUR
  if (plan === 'vip')          return LEO_BUDGET_VIP_EUR
  return null
}