export const ANNUAL_DISCOUNT_MONTHS_FREE = 2

export const PLAN_IDS = {
  PRO: 'pro',
  AGENCY_BASE: 'agency_base',
  AGENCY_PRO: 'agency_pro',
  VIP: 'vip',
}

export const LAUNCHPASS_LINKS = {
  [PLAN_IDS.PRO]: 'https://www.launchpass.com/eazylead-community/piano-pro',
  [PLAN_IDS.AGENCY_BASE]: 'https://www.launchpass.com/eazylead-community/piano-agency-base',
  [PLAN_IDS.AGENCY_PRO]: 'https://www.launchpass.com/eazylead-community/piano-agency-pro',
}

export const VIP_CONTACT_HREF = 'https://discord.gg/eazylead'

export const STANDARD_PLANS = [
  {
    id: PLAN_IDS.PRO,
    name: 'PRO',
    eyebrow: 'Consigliato',
    badge: 'Piu popolare',
    tagline: 'Per venditori e founder che vogliono aumentare subito il volume lead.',
    priceMonthly: 21.34,
    href: LAUNCHPASS_LINKS[PLAN_IDS.PRO],
    ctaLabel: 'Acquista PRO',
    popular: true,
    trial: '7 giorni di prova gratuita tramite LaunchPass / Stripe',
    features: [
      '70 lead inclusi',
      'Accesso completo alle automazioni',
      'Ruolo Discord dedicato colore Blu',
      'Ideale per iniziare con una pipeline costante',
    ],
  },
  {
    id: PLAN_IDS.AGENCY_BASE,
    name: 'AGENCY BASE',
    tagline: 'Il piano operativo per agenzie che gestiscono piu clienti.',
    priceMonthly: 45.62,
    href: LAUNCHPASS_LINKS[PLAN_IDS.AGENCY_BASE],
    ctaLabel: 'Acquista Agency Base',
    features: [
      '300 lead inclusi',
      'Reportistica avanzata',
      'Fatturazione automatizzata',
      'Pensato per team e workflow multi-cliente',
    ],
  },
  {
    id: PLAN_IDS.AGENCY_PRO,
    name: 'AGENCY PRO',
    eyebrow: 'Ancoraggio',
    tagline: 'Il riferimento premium per far scalare volumi e priorita operative.',
    priceMonthly: 54.89,
    href: LAUNCHPASS_LINKS[PLAN_IDS.AGENCY_PRO],
    ctaLabel: 'Acquista Agency Pro',
    anchor: true,
    features: [
      'Tutto Agency Base',
      'Margine extra per estrazioni e automazioni',
      'Priorita sul supporto',
      'Per agenzie con necessita avanzate',
    ],
  },
]

export const VIP_PLAN = {
  id: PLAN_IDS.VIP,
  name: 'VIP Enterprise',
  eyebrow: 'Su misura',
  tagline: 'Per aziende che vogliono setup dedicato, onboarding diretto e limiti personalizzati.',
  priceFrom: 250,
  contactHref: VIP_CONTACT_HREF,
  ctaLabel: 'Clicca qui per contattarci',
  isContactOnly: true,
  features: [
    'Prezzo a partire da 250 euro',
    'Setup e onboarding dedicati',
    'Limiti personalizzati in base al volume',
    'Canale di contatto diretto su Discord',
  ],
}

export const PRICING_PLANS = [...STANDARD_PLANS, VIP_PLAN]

export function annualPriceFor(priceMonthly) {
  const monthsBilled = 12 - ANNUAL_DISCOUNT_MONTHS_FREE
  return roundCurrency(priceMonthly * monthsBilled)
}

export function annualMonthlyEquivalent(priceMonthly) {
  return roundCurrency(annualPriceFor(priceMonthly) / 12)
}

export function formatEuro(value, options = {}) {
  return value.toLocaleString('it-IT', {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  })
}

function roundCurrency(value) {
  return Math.round(value * 100) / 100
}
