// Spinner — Overlay di caricamento globale
// Usato durante operazioni async e ripristino sessione
export default function Spinner({ overlay = false, size = 'md' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3',
  }

  const spinner = (
    <div
      className={`
        ${sizes[size]}
        rounded-full
        border-slate-700
        border-t-cyan-400
        animate-spin
      `}
      role="status"
      aria-label="Caricamento in corso"
    />
  )

  if (overlay) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm">
        {spinner}
      </div>
    )
  }

  return spinner
}
