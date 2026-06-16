import { useState } from 'react'
import { Link } from 'react-router-dom'
import { COOKIE_CONSENT_KEY } from '../../constants/legalConfig'
import { loadOptionalFonts } from '../../utils/loadFonts'

export default function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(COOKIE_CONSENT_KEY))

  if (!visible) return null

  function accept() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    loadOptionalFonts()
    setVisible(false)
  }

  function reject() {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'essential')
    setVisible(false)
  }

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-[100] p-4 pointer-events-none"
      role="dialog"
      aria-label="Preferenze cookie"
    >
      <div className="max-w-lg mx-auto pointer-events-auto card p-4 shadow-xl border-slate-700">
        <p className="text-slate-300 text-sm leading-relaxed mb-3">
          Usiamo cookie tecnici per il login. Con il tuo consenso carichiamo anche i font da Google.
          Leggi la{' '}
          <Link to="/cookie" className="text-cyan-400 hover:underline">informativa cookie</Link>.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={accept} className="btn-primary text-sm min-h-[40px] px-4">
            Accetta
          </button>
          <button type="button" onClick={reject} className="btn-secondary text-sm min-h-[40px] px-4">
            Solo necessari
          </button>
        </div>
      </div>
    </div>
  )
}
