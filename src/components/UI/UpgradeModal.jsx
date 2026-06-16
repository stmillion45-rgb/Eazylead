import { useNavigate } from 'react-router-dom'
import { X, Zap } from 'lucide-react'

export default function UpgradeModal({ isOpen, onClose, reason }) {
  const navigate = useNavigate()
  if (!isOpen) return null

  const messages = {
    leads: 'Hai raggiunto il limite di 50 lead del piano Free.',
    emails: 'Hai raggiunto il limite di 10 email al mese del piano Free.',
    leo: 'Leo, il copilota AI, è disponibile solo con il piano Pro o Agency.',
    leo_budget: 'Hai esaurito il credito Leo di questo mese. Si resetta il 1° del mese prossimo.',
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <div className="w-10 h-10 bg-cyan-950 border border-cyan-900 rounded-xl flex items-center justify-center">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <h3 className="text-slate-100 font-display font-bold text-lg mb-2">Passa a Pro</h3>
        <p className="text-slate-400 text-sm mb-6">
          {messages[reason] ?? 'Sblocca più lead e invii email illimitati.'}
        </p>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 min-h-[44px]">Chiudi</button>
          <button
            onClick={() => { onClose(); navigate('/billing') }}
            className="btn-primary flex-1 min-h-[44px]"
          >
            Vedi piani
          </button>
        </div>
      </div>
    </div>
  )
}
