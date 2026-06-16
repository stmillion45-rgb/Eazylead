/**
 * Dati del titolare del servizio (note legali / privacy).
 * Compila in .env prima della pubblicazione — vedi .env.example
 */
export const LEGAL_OPERATOR = {
  name: import.meta.env.VITE_LEGAL_OPERATOR_NAME?.trim() || '[Ragione sociale / Nome titolare]',
  address: import.meta.env.VITE_LEGAL_OPERATOR_ADDRESS?.trim() || '[Indirizzo sede legale]',
  vat: import.meta.env.VITE_LEGAL_OPERATOR_VAT?.trim() || '[Partita IVA]',
  email: import.meta.env.VITE_LEGAL_OPERATOR_EMAIL?.trim() || '[email@dominio.it]',
  pec: import.meta.env.VITE_LEGAL_OPERATOR_PEC?.trim() || '',
}

export const LEGAL_CONFIGURED = Boolean(
  import.meta.env.VITE_LEGAL_OPERATOR_NAME
  && import.meta.env.VITE_LEGAL_OPERATOR_EMAIL
  && import.meta.env.VITE_LEGAL_OPERATOR_VAT,
)

export const COOKIE_CONSENT_KEY = 'leados_cookie_consent_v1'
