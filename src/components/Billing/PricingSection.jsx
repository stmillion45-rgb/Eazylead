import { useState } from 'react'
import { Check, CreditCard, MessageCircle, ShieldCheck, Sparkles } from 'lucide-react'
import {
  STANDARD_PLANS,
  VIP_PLAN,
  annualPriceFor,
  annualMonthlyEquivalent,
  formatEuro,
} from '../../constants/pricingPlans'
import { normalizePlanId, useActivePlan } from '../../hooks/useActivePlan'

const BILLING_OPTIONS = [
  { id: 'monthly', label: 'Mensile' },
  { id: 'annual', label: 'Annuale', helper: '2 mesi gratis' },
]

function BillingToggle({ billing, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-lg border border-stone-700 bg-stone-900 p-1">
      {BILLING_OPTIONS.map((option) => {
        const active = billing === option.id

        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.id)}
            className={[
              'min-h-[44px] rounded-md px-3 text-sm font-semibold transition-colors',
              active
                ? 'bg-cyan-500 text-stone-950'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100',
            ].join(' ')}
          >
            <span className="block">{option.label}</span>
            {option.helper && (
              <span
                className={[
                  'mt-0.5 block text-[11px] font-medium',
                  active ? 'text-stone-900' : 'text-emerald-400',
                ].join(' ')}
              >
                {option.helper}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

function PlanPrice({ plan, billing }) {
  const isAnnual = billing === 'annual'
  const monthlyPrice = isAnnual ? annualMonthlyEquivalent(plan.priceMonthly) : plan.priceMonthly

  return (
    <div className="space-y-1">
      {isAnnual && (
        <p className="text-xs text-stone-500 line-through">
          {formatEuro(plan.priceMonthly)} EUR / mese
        </p>
      )}
      <p className="font-mono text-3xl font-bold text-stone-50">
        {formatEuro(monthlyPrice)} EUR
      </p>
      <p className="text-sm text-stone-500">
        {isAnnual
          ? `${formatEuro(annualPriceFor(plan.priceMonthly))} EUR fatturati annualmente`
          : 'al mese'}
      </p>
    </div>
  )
}

function CurrentPlanButton() {
  return (
    <button
      type="button"
      disabled
      className="inline-flex min-h-[44px] w-full items-center justify-center rounded-md border border-stone-700 bg-stone-900 px-4 text-sm font-semibold text-stone-500"
    >
      Il tuo piano attuale
    </button>
  )
}

function StandardPlanCard({ plan, billing, isCurrent }) {
  return (
    <article
      className={[
        'flex h-full flex-col rounded-lg border bg-stone-900/70 p-5 shadow-sm shadow-black/20',
        plan.popular
          ? 'border-cyan-500/70 ring-1 ring-cyan-500/30'
          : plan.anchor
            ? 'border-emerald-500/40'
            : 'border-stone-700',
      ].join(' ')}
    >
      <div className="mb-5 flex min-h-[28px] items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {plan.eyebrow && (
            <span className="inline-flex items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-1 text-xs font-semibold text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" />
              {plan.eyebrow}
            </span>
          )}
          {plan.badge && (
            <span className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
              {plan.badge}
            </span>
          )}
        </div>
        {isCurrent && <Check className="h-5 w-5 shrink-0 text-cyan-400" aria-label="Piano attuale" />}
      </div>

      <div className="space-y-2">
        <h3 className="font-display text-xl font-bold text-stone-50">{plan.name}</h3>
        <p className="min-h-[44px] text-sm leading-6 text-stone-400">{plan.tagline}</p>
      </div>

      <div className="my-6">
        <PlanPrice plan={plan} billing={billing} />
      </div>

      {plan.trial && (
        <p className="mb-4 rounded-md border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300">
          {plan.trial}
        </p>
      )}

      <ul className="mb-6 flex-1 space-y-3 text-sm leading-6 text-stone-300">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {isCurrent ? (
        <CurrentPlanButton />
      ) : (
        <a
          href={plan.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-4 text-center text-sm font-bold text-stone-950 transition-colors hover:bg-cyan-400"
        >
          <CreditCard className="h-4 w-4" />
          {plan.ctaLabel}
        </a>
      )}
    </article>
  )
}

function VipCard({ plan, isCurrent }) {
  return (
    <article className="rounded-lg border border-emerald-500/60 bg-stone-900 p-5 shadow-sm shadow-emerald-950/30 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="mb-4 inline-flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            {plan.eyebrow}
          </div>
          <h3 className="font-display text-2xl font-bold text-stone-50">{plan.name}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-400">{plan.tagline}</p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-stone-300 sm:grid-cols-2">
            {plan.features.map((feature) => (
              <li key={feature} className="flex gap-2">
                <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-500" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 lg:min-w-[260px] lg:text-right">
          <div>
            <p className="text-sm font-medium text-stone-500">A partire da</p>
            <p className="font-mono text-3xl font-bold text-stone-50">
              {formatEuro(plan.priceFrom, { minimumFractionDigits: 0 })} EUR
            </p>
            <p className="mt-1 text-sm text-stone-500">al mese, su progetto</p>
          </div>

          {isCurrent ? (
            <CurrentPlanButton />
          ) : (
            <a
              href={plan.contactHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-md border border-emerald-500 bg-emerald-500/10 px-4 text-center text-sm font-bold text-emerald-300 transition-colors hover:bg-emerald-500/20"
            >
              <MessageCircle className="h-4 w-4" />
              {plan.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function PricingSection({
  activePlanId,
  activePlanLoading,
  showHeader = true,
  className = '',
}) {
  const [billing, setBilling] = useState('monthly')
  const activePlan = useActivePlan()
  const currentPlanId = normalizePlanId(activePlanId) ?? activePlan.planId
  const isLoadingPlan = activePlanLoading ?? activePlan.loading

  return (
    <section className={['bg-stone-950 px-4 py-10 sm:px-6 sm:py-14', className].join(' ')}>
      <div className="mx-auto max-w-6xl">
        {showHeader && (
          <header className="mb-8 space-y-5 sm:mb-10">
            <div className="max-w-3xl space-y-3">
              <p className="text-sm font-semibold text-cyan-400">Eazylead pricing</p>
              <h2 className="font-display text-3xl font-bold text-stone-50 sm:text-4xl">
                Piani chiari per lead generation, automazioni e community privata.
              </h2>
              <p className="text-base leading-7 text-stone-400">
                Confronta i pacchetti, scegli il piano corretto e completa l'acquisto su LaunchPass.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <BillingToggle billing={billing} onChange={setBilling} />
              <p className="text-sm text-stone-500">
                {isLoadingPlan ? 'Controllo piano attivo...' : 'Sconto annuale equivalente a 2 mesi gratis.'}
              </p>
            </div>
          </header>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          {STANDARD_PLANS.map((plan) => (
            <StandardPlanCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isCurrent={currentPlanId === plan.id}
            />
          ))}
        </div>

        <div className="my-8 flex items-center gap-3">
          <div className="h-px flex-1 bg-stone-800" />
          <span className="text-sm font-semibold text-stone-500">Enterprise</span>
          <div className="h-px flex-1 bg-stone-800" />
        </div>

        <VipCard plan={VIP_PLAN} isCurrent={currentPlanId === VIP_PLAN.id} />
      </div>
    </section>
  )
}
