import { Trash2, Send, X } from 'lucide-react'

// ===================================================
// COMPONENTE — BulkActions
// Toolbar contestuale visibile quando ci sono lead selezionati.
// Mostra contatore selezione + azioni: Invia Ricevute, Elimina.
//
// Props:
//   count           {number}  — numero lead selezionati
//   onSendReceipts  {fn}      — avvia flusso invio email bulk
//   onDelete        {fn}      — apre ConfirmDialog eliminazione
//   onClearSelection{fn}      — deseleziona tutti
//   sending         {boolean} — invio in corso (disabilita bottoni)
// ===================================================
export default function BulkActions({ count, onSendReceipts, onDelete, onClearSelection, sending }) {
  if (count === 0) return null

  return (
    <div className="flex items-center gap-3 flex-wrap animate-slide-up
                    bg-slate-900 border border-cyan-900/50 rounded-xl px-4 py-3 mb-4">

      {/* Contatore */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="w-6 h-6 rounded-md bg-cyan-500 text-slate-950 text-xs font-bold flex items-center justify-center shrink-0">
          {count}
        </span>
        <span className="text-slate-300 text-sm">
          lead {count === 1 ? 'selezionato' : 'selezionati'}
        </span>
      </div>

      {/* Azioni */}
      <div className="flex items-center gap-2">

        {/* Invia Ricevute */}
        <button
          onClick={onSendReceipts}
          disabled={sending}
          className="btn-primary text-xs px-3 py-2 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Genera PDF e invia ricevute via email"
        >
          <Send className="w-3.5 h-3.5" />
          {sending ? 'Invio…' : 'Invia Ricevute'}
        </button>

        {/* Elimina selezionati */}
        <button
          onClick={onDelete}
          disabled={sending}
          className="btn-danger text-xs px-3 py-2 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
          title="Elimina i lead selezionati"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Elimina
        </button>

        {/* Deseleziona */}
        <button
          onClick={onClearSelection}
          disabled={sending}
          className="text-slate-500 hover:text-slate-300 transition-colors p-2 min-h-[36px]"
          title="Annulla selezione"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
