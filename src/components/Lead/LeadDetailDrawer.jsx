import { useState, useEffect, useCallback } from 'react'
import { X, StickyNote, Trash2, Copy, UserPlus, FileText, Star } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { useToast } from '../UI/Toast'
import ContactActions from './ContactActions'
import WhatsAppTemplates from './WhatsAppTemplates'
import Spinner from '../UI/Spinner'
import { formatLeadCopyText } from '../../utils/leadQuickFilters'

const MAX_NOTE = 500

function formatNoteDate(iso) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatEur(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

export default function LeadDetailDrawer({ lead, onClose, onNotesChanged, onLeadDuplicated }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { addToast } = useToast()
  const [notes, setNotes] = useState([])
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [duplicating, setDuplicating] = useState(false)

  const fetchNotes = useCallback(async () => {
    if (!user || !lead?.id) return
    setLoading(true)
    const [notesRes, receiptsRes] = await Promise.all([
      supabase
        .from('lead_notes')
        .select('id, contenuto, created_at')
        .eq('lead_id', lead.id)
        .eq('azienda_id', aziendaId)
        .order('created_at', { ascending: false }),
      supabase
        .from('receipts')
        .select('id, totale, imponibile, created_at')
        .eq('lead_id', lead.id)
        .eq('azienda_id', aziendaId)
        .order('created_at', { ascending: false })
        .limit(8),
    ])

    if (notesRes.error) {
      addToast({
        message: notesRes.error.message.includes('lead_notes')
          ? 'Tabella note mancante: esegui la migration feature_semplici'
          : notesRes.error.message,
        variant: 'error',
      })
    } else {
      setNotes(notesRes.data || [])
    }
    setReceipts(receiptsRes.error ? [] : (receiptsRes.data || []))
    setLoading(false)
  }, [user, lead?.id, addToast])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  if (!lead) return null

  async function handleAdd(e) {
    e?.preventDefault()
    const contenuto = text.trim()
    if (!contenuto) return
    setSaving(true)
    const { error } = await supabase.from('lead_notes').insert({
      lead_id: lead.id,
      azienda_id: aziendaId,
      contenuto,
    })
    if (error) {
      addToast({ message: error.message, variant: 'error' })
    } else {
      setText('')
      addToast({ message: 'Nota aggiunta', variant: 'success' })
      fetchNotes()
      onNotesChanged?.()
    }
    setSaving(false)
  }

  async function handleDelete(id) {
    setDeletingId(id)
    const { error } = await supabase
      .from('lead_notes')
      .delete()
      .eq('id', id)
      .eq('azienda_id', aziendaId)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
    } else {
      addToast({ message: 'Nota eliminata', variant: 'success' })
      fetchNotes()
      onNotesChanged?.()
    }
    setConfirmDelete(null)
    setDeletingId(null)
  }

  async function handleCopyCard() {
    try {
      await navigator.clipboard.writeText(formatLeadCopyText(lead))
      addToast({ message: 'Scheda lead copiata', variant: 'success' })
    } catch {
      addToast({ message: 'Copia non riuscita', variant: 'error' })
    }
  }

  async function handleDuplicate() {
    setDuplicating(true)
    const { error } = await supabase.from('leads').insert({
      azienda_id: aziendaId,
      nome: `${lead.nome} (copia)`,
      email: lead.email,
      telefono: lead.telefono,
      servizio: lead.servizio,
      prezzo: lead.prezzo ?? 0,
      stato: 'nuovo',
      follow_up_at: lead.follow_up_at,
    })
    if (error) {
      addToast({ message: error.message, variant: 'error' })
    } else {
      addToast({ message: 'Lead duplicato', variant: 'success' })
      onLeadDuplicated?.()
    }
    setDuplicating(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-md h-full bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-800 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              {lead.preferito && <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />}
              <h2 className="text-slate-100 font-semibold font-display truncate">{lead.nome}</h2>
            </div>
            <p className="text-slate-500 text-xs truncate mt-0.5">{lead.servizio}</p>
            <p className="text-emerald-400 font-mono text-sm mt-1">{formatEur(lead.prezzo)}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <ContactActions lead={lead} size="md" />
              <button type="button" onClick={handleCopyCard} className="btn-secondary text-xs min-h-[36px] px-2">
                <Copy className="w-3.5 h-3.5" />
                Copia
              </button>
              <button
                type="button"
                onClick={handleDuplicate}
                disabled={duplicating}
                className="btn-secondary text-xs min-h-[36px] px-2 disabled:opacity-50"
              >
                <UserPlus className="w-3.5 h-3.5" />
                {duplicating ? '…' : 'Duplica'}
              </button>
            </div>
            <div className="mt-3">
              <WhatsAppTemplates lead={lead} />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 p-1 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {receipts.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-2">
                <FileText className="w-3.5 h-3.5" />
                Ricevute inviate
              </div>
              <ul className="space-y-1.5">
                {receipts.map(r => (
                  <li key={r.id} className="flex justify-between text-sm bg-slate-800/40 rounded-lg px-3 py-2">
                    <span className="text-slate-500 font-mono text-xs">
                      {new Date(r.created_at).toLocaleDateString('it-IT')}
                    </span>
                    <span className="text-emerald-400 font-mono">{formatEur(r.totale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider mb-2">
              <StickyNote className="w-3.5 h-3.5" />
              Note interne (solo per te)
            </div>

            {loading && (
              <div className="flex justify-center py-8"><Spinner size="sm" /></div>
            )}

            {!loading && notes.length === 0 && (
              <p className="text-slate-600 text-sm">Nessuna nota ancora.</p>
            )}

            {!loading && notes.map(note => (
              <div key={note.id} className="bg-slate-800/50 border border-slate-700 rounded-xl p-3 mb-2">
                <p className="text-slate-200 text-sm whitespace-pre-wrap break-words">{note.contenuto}</p>
                <div className="flex items-center justify-between mt-2 gap-2">
                  <span className="text-slate-600 text-xs font-mono">{formatNoteDate(note.created_at)}</span>
                  {confirmDelete === note.id ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDelete(note.id)}
                        disabled={deletingId === note.id}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Conferma
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs text-slate-500 hover:text-slate-300"
                      >
                        Annulla
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(note.id)}
                      className="text-slate-600 hover:text-red-400 p-1"
                      title="Elimina nota"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleAdd} className="px-5 py-4 border-t border-slate-800 shrink-0 space-y-2">
          <textarea
            value={text}
            onChange={e => setText(e.target.value.slice(0, MAX_NOTE))}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd(e)
            }}
            placeholder="Aggiungi una nota… (Ctrl+Enter per inviare)"
            rows={3}
            className="input-base resize-none text-sm"
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-600 text-xs">{text.length}/{MAX_NOTE}</span>
            <button type="submit" disabled={saving || !text.trim()} className="btn-primary text-xs min-h-[36px] disabled:opacity-50">
              {saving ? 'Salvataggio…' : 'Aggiungi nota'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
