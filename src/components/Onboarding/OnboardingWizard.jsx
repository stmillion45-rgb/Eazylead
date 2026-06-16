import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Upload, Send, ChevronRight } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useProfile } from '../../hooks/useProfile'
import ImpostazioniView from '../Settings/ImpostazioniView'
import { APP_AUDIENCE } from '../../constants/branding'

const STEPS = [
  { id: 1, title: 'Profilo azienda', icon: Building2 },
  { id: 2, title: 'Importa lead', icon: Upload },
  { id: 3, title: 'Prima ricevuta', icon: Send },
]

export default function OnboardingWizard({ onDone }) {
  const { user } = useAuth()
  const { refresh } = useProfile()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)

  async function complete(skipped = false) {
    await supabase.from('profiles').upsert({
      id: user.id,
      onboarding_completed: true,
    })
    await refresh()
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800">
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-1">Benvenuto in LeadOS</p>
          <p className="text-slate-500 text-xs mb-2 leading-relaxed">{APP_AUDIENCE}</p>
          <h2 className="text-slate-100 font-display font-bold text-lg">
            {STEPS[step - 1].title}
          </h2>
          <div className="flex gap-2 mt-3">
            {STEPS.map(s => (
              <div
                key={s.id}
                className={`h-1 flex-1 rounded-full ${s.id <= step ? 'bg-cyan-500' : 'bg-slate-800'}`}
              />
            ))}
          </div>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-slate-400 text-sm">
                Inserisci i dati della tua azienda per personalizzare PDF e email.
              </p>
              <div className="max-h-[50vh] overflow-y-auto -mx-2 px-2">
                <ImpostazioniView embedded />
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-4 text-center py-4">
              <Upload className="w-12 h-12 text-cyan-500 mx-auto" />
              <p className="text-slate-400 text-sm">
                Carica il tuo primo file Excel dalla Dashboard o dalla sezione Lead.
              </p>
              <button
                onClick={() => { navigate('/dashboard'); complete(true) }}
                className="btn-primary w-full min-h-[44px]"
              >
                Vai all&apos;import
              </button>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-4 text-center py-4">
              <Send className="w-12 h-12 text-cyan-500 mx-auto" />
              <p className="text-slate-400 text-sm">
                Seleziona un lead con email e invia la prima ricevuta PDF.
              </p>
              <button
                onClick={() => { navigate('/lead'); complete(true) }}
                className="btn-primary w-full min-h-[44px]"
              >
                Vai ai Lead
              </button>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-800 flex justify-between gap-3">
          <button onClick={() => complete(true)} className="text-slate-500 text-sm hover:text-slate-300">
            Salta — lo farò dopo
          </button>
          {step < 3 ? (
            <button onClick={() => setStep(s => s + 1)} className="btn-primary min-h-[40px] gap-1">
              Avanti <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={() => complete()} className="btn-primary min-h-[40px]">
              Fine
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
