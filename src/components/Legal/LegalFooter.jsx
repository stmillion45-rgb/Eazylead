import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/privacy', label: 'Privacy' },
  { to: '/termini', label: 'Termini' },
  { to: '/cookie', label: 'Cookie' },
  { to: '/note-legali', label: 'Note legali' },
]

export default function LegalFooter({ className = '' }) {
  return (
    <footer className={`border-t border-slate-800 pt-6 mt-8 ${className}`}>
      <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
        {LINKS.map(({ to, label }) => (
          <Link key={to} to={to} className="hover:text-cyan-400 transition-colors">
            {label}
          </Link>
        ))}
      </nav>
      <p className="text-slate-600 text-[11px] mt-3">
        © {new Date().getFullYear()} LeadOS — Documenti informativi. Non sostituiscono consulenza legale.
      </p>
    </footer>
  )
}
