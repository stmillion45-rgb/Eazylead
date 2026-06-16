// Budget Leo (EUR/mese) — allineato a src/constants/plans.js
export const LEO_BUDGET_EUR: Record<string, number> = {
  pro:    5,
  agency: 20,
}

// Stima conservativa max costo per richiesta (blocco preventivo)
export const LEO_ESTIMATED_MAX_COST_EUR = 0.08

// Prezzi Anthropic Sonnet (USD / token) — aggiorna se cambi modello
const INPUT_USD_PER_TOKEN  = 3 / 1_000_000
const OUTPUT_USD_PER_TOKEN = 15 / 1_000_000
const USD_TO_EUR = 0.95

export function budgetForPlan(plan: string): number | null {
  return LEO_BUDGET_EUR[plan] ?? null
}

export function calcCostEur(inputTokens: number, outputTokens: number): number {
  const usd = inputTokens * INPUT_USD_PER_TOKEN + outputTokens * OUTPUT_USD_PER_TOKEN
  return Math.round(usd * USD_TO_EUR * 1_000_000) / 1_000_000
}

export function startOfMonthISO(): string {
  const d = new Date()
  d.setUTCDate(1)
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

export function isLeoPlanAllowed(plan: string): boolean {
  return plan === 'pro' || plan === 'agency'
}
