import { Link } from 'react-router-dom'
import { Zap } from 'lucide-react'
import LegalFooter from './LegalFooter'
import { LEGAL_CONFIGURED } from '../../constants/legalConfig'

export default function LegalPageLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-300">
      <header className="border-b border-slate-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <Link to="/login" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-slate-950" fill="currentColor" />
            </div>
            <span className="text-slate-100 font-display font-bold">LeadOS</span>
          </Link>
          <Link to="/login" className="text-cyan-400 text-sm hover:text-cyan-300">Accedi</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {!LEGAL_CONFIGURED && (
          <div className="mb-6 rounded-lg border border-amber-900/80 bg-amber-950/30 px-4 py-3 text-amber-200/90 text-sm">
            Avviso per il titolare: compila{' '}
            <code className="text-amber-100">VITE_LEGAL_OPERATOR_*</code> nel file{' '}
            <code className="text-amber-100">.env</code> prima della pubblicazione.
          </div>
        )}

        <h1 className="text-2xl font-display font-bold text-slate-100 mb-6">{title}</h1>
        <article className="prose-legal space-y-4 text-sm leading-relaxed text-slate-400">
          {children}
        </article>
      </main>

      <LegalFooter className="max-w-3xl mx-auto px-4 pb-10" />
    </div>
  )
}
