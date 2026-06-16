import { useState, useEffect, createContext, useContext, useCallback } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

// ===================================================
// CONTEXT — Sistema Toast globale
// Permette di mostrare notifiche da qualsiasi componente
// ===================================================
const ToastContext = createContext(null)

export function useToast() {
  return useContext(ToastContext)
}

// Icone per variante
const ICONS = {
  success: <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
  error:   <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
  info:    <Info className="w-4 h-4 text-cyan-400 shrink-0" />,
}

// Stili per variante
const VARIANTS = {
  success: 'border-emerald-800 bg-slate-900',
  error:   'border-red-800 bg-slate-900',
  info:    'border-cyan-800 bg-slate-900',
}

// ===================================================
// COMPONENTE — Singolo Toast
// ===================================================
function ToastItem({ id, message, variant = 'info', onDismiss }) {
  useEffect(() => {
    // Auto-dismiss dopo 4 secondi
    const timer = setTimeout(() => onDismiss(id), 4000)
    return () => clearTimeout(timer)
  }, [id, onDismiss])

  return (
    <div
      className={`
        flex items-start gap-3 w-72 max-w-sm
        px-4 py-3 rounded-xl border shadow-xl
        animate-slide-up
        ${VARIANTS[variant]}
      `}
      role="alert"
    >
      {ICONS[variant]}
      <p className="flex-1 text-sm text-slate-200 leading-snug">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="text-slate-500 hover:text-slate-300 transition-colors ml-1 mt-0.5"
        aria-label="Chiudi notifica"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ===================================================
// PROVIDER — Wrappa l'app e fornisce addToast
// ===================================================
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // addToast({ message, variant }) — chiamabile da tutta l'app
  const addToast = useCallback(({ message, variant = 'info' }) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, variant }])
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}

      {/* Contenitore toast — angolo in basso a destra */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
        {toasts.map(toast => (
          <ToastItem
            key={toast.id}
            {...toast}
            onDismiss={dismiss}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
}
