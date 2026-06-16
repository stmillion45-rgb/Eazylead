import { AlertTriangle, X } from 'lucide-react'

// ===================================================
// COMPONENTE — ConfirmDialog
// Modale di conferma per azioni irreversibili (es. bulk delete)
//
// Props:
//   isOpen    {boolean}  — controlla visibilità
//   title     {string}   — titolo modale
//   message   {string}   — messaggio descrittivo
//   onConfirm {function} — callback al click "Conferma"
//   onCancel  {function} — callback al click "Annulla" o chiusura
//   danger    {boolean}  — se true, bottone conferma è rosso (default: true)
// ===================================================
export default function ConfirmDialog({
  isOpen,
  title = 'Conferma azione',
  message,
  onConfirm,
  onCancel,
  danger = true,
  confirmLabel = 'Conferma',
  cancelLabel = 'Annulla',
}) {
  if (!isOpen) return null

  return (
    // Backdrop semitrasparente
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
    >
      {/* Pannello modale — stoppa il click dal propagarsi al backdrop */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950 border border-red-900 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <h2
              id="confirm-title"
              className="text-slate-100 font-semibold text-base font-display"
            >
              {title}
            </h2>
          </div>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition-colors mt-1"
            aria-label="Chiudi"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messaggio */}
        {message && (
          <p className="text-slate-400 text-sm leading-relaxed mb-6 pl-13">
            {message}
          </p>
        )}

        {/* Azioni */}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="btn-secondary min-h-[44px]"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={danger ? 'btn-danger min-h-[44px]' : 'btn-primary min-h-[44px]'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
