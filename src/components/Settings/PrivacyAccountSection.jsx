import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, Download, Trash2 } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useWorkspace } from '../../hooks/useWorkspace'
import { useToast } from '../UI/Toast'
import { invokeEdgeFunction } from '../../utils/invokeFunction'
import { exportAccountData } from '../../utils/exportAccountData'
import Spinner from '../UI/Spinner'

export default function PrivacyAccountSection() {
  const { user } = useAuth()
  const { workspaceId, isTeamMember } = useWorkspace()
  const { addToast } = useToast()
  const navigate = useNavigate()
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState('')

  if (isTeamMember) {
    return (
      <section className="card p-5 mt-6 border-slate-800">
        <h3 className="text-slate-200 font-display font-bold text-sm mb-2">Privacy e account</h3>
        <p className="text-slate-500 text-sm">
          Sei collaboratore di un team. Per esportare o eliminare i dati del workspace contatta il titolare.
          Puoi uscire dal team chiedendo al titolare di rimuoverti.
        </p>
      </section>
    )
  }

  async function handleExport() {
    setExporting(true)
    try {
      await exportAccountData(workspaceId, user.email)
      addToast({ message: 'Export scaricato', variant: 'success' })
    } catch (err) {
      addToast({ message: err.message || 'Export non riuscito', variant: 'error' })
    }
    setExporting(false)
  }

  async function handleDelete() {
    if (confirmDelete !== 'ELIMINA') {
      addToast({ message: 'Scrivi ELIMINA per confermare', variant: 'error' })
      return
    }
    setDeleting(true)
    const { error } = await invokeEdgeFunction('delete-account', {})
    setDeleting(false)
    if (error) {
      addToast({ message: error, variant: 'error' })
      return
    }
    await supabase.auth.signOut()
    addToast({ message: 'Account eliminato', variant: 'success' })
    navigate('/login', { replace: true })
  }

  return (
    <section className="card p-5 mt-6 border-slate-800" id="privacy-account">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
          <Shield className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-slate-200 font-display font-bold text-sm">Privacy e account (GDPR)</h3>
          <p className="text-slate-500 text-xs mt-1">
            Esporta i tuoi dati o richiedi l&apos;eliminazione definitiva dell&apos;account.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <button
          type="button"
          onClick={handleExport}
          disabled={exporting}
          className="btn-secondary min-h-[44px] disabled:opacity-50"
        >
          {exporting ? <Spinner size="sm" /> : <Download className="w-4 h-4" />}
          Scarica i miei dati (JSON)
        </button>
      </div>

      <div className="border-t border-slate-800 pt-4">
        <p className="text-red-300/90 text-xs font-medium mb-2">Zona pericolosa</p>
        <p className="text-slate-500 text-xs mb-3">
          Elimina account, lead, ricevute e profilo. Irreversibile. Rimuovi prima i collaboratori dal team.
        </p>
        <input
          type="text"
          value={confirmDelete}
          onChange={(e) => setConfirmDelete(e.target.value)}
          placeholder='Scrivi ELIMINA per confermare'
          className="input-base mb-3 max-w-xs"
        />
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-950 border border-red-900 text-red-300 text-sm min-h-[44px] hover:bg-red-900/80 disabled:opacity-50"
        >
          {deleting ? <Spinner size="sm" /> : <Trash2 className="w-4 h-4" />}
          Elimina account definitivamente
        </button>
      </div>
    </section>
  )
}
