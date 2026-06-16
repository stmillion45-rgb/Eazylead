import { useState, useEffect, useCallback } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown, Users, RefreshCw } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { useToast } from '../UI/Toast'
import LeadFilters from './LeadFilters'
import LeadRow from './LeadRow'
import BulkActions from './BulkActions'
import ConfirmDialog from '../UI/ConfirmDialog'
import Spinner from '../UI/Spinner'

// Colonne ordinabili della tabella desktop
const COLUMNS = [
  { key: 'nome',       label: 'Nome',     sortable: true  },
  { key: 'email',      label: 'Email',    sortable: false },
  { key: 'servizio',   label: 'Servizio', sortable: true  },
  { key: 'prezzo',     label: 'Prezzo',   sortable: true  },
  { key: 'stato',      label: 'Stato',    sortable: true  },
  { key: 'created_at', label: 'Data',     sortable: true  },
]

// ===================================================
// COMPONENTE — LeadsTable
// Tabella leads completa con:
//   - Fetch dati da Supabase (filtrati per azienda_id)
//   - Ricerca full-text locale (nome, email, servizio)
//   - Filtro per stato
//   - Ordinamento per colonna
//   - Selezione multipla (checkbox)
//   - Bulk delete con ConfirmDialog
//   - Slot per Bulk Send (prop onSendReceipts — attivato nel Modulo email)
//
// Props:
//   onStatsRefresh  {fn}  — callback per aggiornare StatsBar dopo modifiche
//   onImportClick   {fn}  — apre il pannello import Excel
//   onSendReceipts  {fn}  — avvia flusso invio email (implementato più avanti)
// ===================================================
export default function LeadsTable({ onStatsRefresh, onImportClick, onSendReceipts }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { addToast } = useToast()

  // --- Dati ---
  const [leads, setLeads]         = useState([])
  const [loading, setLoading]     = useState(true)

  // --- Filtri ---
  const [search, setSearch]           = useState('')
  const [statoFiltro, setStatoFiltro] = useState('tutti')

  // --- Ordinamento ---
  const [sortKey, setSortKey]     = useState('created_at')
  const [sortDir, setSortDir]     = useState('desc') // 'asc' | 'desc'

  // --- Selezione ---
  const [selected, setSelected]   = useState(new Set())

  // --- UI state ---
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [sending, setSending]             = useState(false)

  // Carica leads all'avvio e ad ogni refresh
  const fetchLeads = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('azienda_id', aziendaId)
      .order(sortKey, { ascending: sortDir === 'asc' })

    if (error) {
      addToast({ message: `Errore caricamento leads: ${error.message}`, variant: 'error' })
    } else {
      setLeads(data || [])
    }

    setLoading(false)
  }, [user, sortKey, sortDir])

  useEffect(() => {
    fetchLeads()
  }, [fetchLeads])

  // Dopo ogni aggiornamento (stato lead cambiato, import, delete)
  // aggiorna sia la tabella che le stats
  function handleDataChanged() {
    fetchLeads()
    if (onStatsRefresh) onStatsRefresh()
  }

  // ===== FILTRO LOCALE =====
  // Il filtro viene applicato lato client sui dati già scaricati
  // (efficiente per volumi tipici di piccole imprese e attività locali)
  const filtered = leads.filter(lead => {
    const matchStato = statoFiltro === 'tutti' || lead.stato === statoFiltro
    const q = search.toLowerCase().trim()
    const matchSearch = !q || [lead.nome, lead.email, lead.servizio]
      .some(field => field?.toLowerCase().includes(q))
    return matchStato && matchSearch
  })

  // ===== ORDINAMENTO =====
  function handleSort(key) {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setSelected(new Set()) // reset selezione al cambio sort
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc'
      ? <ChevronUp   className="w-3 h-3 text-cyan-400" />
      : <ChevronDown className="w-3 h-3 text-cyan-400" />
  }

  // ===== SELEZIONE =====
  const allFilteredIds  = filtered.map(l => l.id)
  const allSelected     = allFilteredIds.length > 0 && allFilteredIds.every(id => selected.has(id))
  const someSelected    = allFilteredIds.some(id => selected.has(id))

  function toggleSelectAll() {
    if (allSelected) {
      // Deseleziona tutti i filtrati
      setSelected(prev => {
        const next = new Set(prev)
        allFilteredIds.forEach(id => next.delete(id))
        return next
      })
    } else {
      // Seleziona tutti i filtrati
      setSelected(prev => new Set([...prev, ...allFilteredIds]))
    }
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // I lead effettivamente selezionati (intersezione con filtered per sicurezza UI)
  const selectedInView = allFilteredIds.filter(id => selected.has(id))

  // ===== BULK DELETE =====
  async function handleBulkDelete() {
    setDeleting(true)
    setConfirmDelete(false)

    const idsToDelete = selectedInView

    const { error } = await supabase
      .from('leads')
      .delete()
      .in('id', idsToDelete)
      .eq('azienda_id', aziendaId) // doppia sicurezza oltre RLS

    if (error) {
      addToast({ message: `Errore eliminazione: ${error.message}`, variant: 'error' })
    } else {
      // Pulisci selezione e aggiorna dati
      setSelected(prev => {
        const next = new Set(prev)
        idsToDelete.forEach(id => next.delete(id))
        return next
      })
      addToast({
        message: `${idsToDelete.length} lead eliminati con successo`,
        variant: 'success',
      })
      handleDataChanged()
    }

    setDeleting(false)
  }

  // ===== BULK SEND (delegato al componente padre/Modulo email) =====
  function handleSendReceipts() {
    if (!onSendReceipts) {
      addToast({ message: 'Funzione email disponibile nel prossimo aggiornamento', variant: 'info' })
      return
    }
    const leadsSelezionati = leads.filter(l => selectedInView.includes(l.id))
    onSendReceipts(leadsSelezionati, () => {
      setSelected(new Set())
      handleDataChanged()
    })
  }

  // ===== RENDER =====
  return (
    <div className="animate-fade-in">

      {/* Filtri */}
      <LeadFilters
        search={search}
        onSearch={setSearch}
        statoFiltro={statoFiltro}
        onStato={v => { setStatoFiltro(v); setSelected(new Set()) }}
      />

      {/* Toolbar bulk actions (visibile solo con selezione attiva) */}
      <BulkActions
        count={selectedInView.length}
        onSendReceipts={handleSendReceipts}
        onDelete={() => setConfirmDelete(true)}
        onClearSelection={() => setSelected(new Set())}
        sending={sending}
      />

      {/* ===== TABELLA DESKTOP ===== */}
      <div className="card overflow-hidden">

        {/* Header tabella + contatore risultati */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <span className="text-slate-500 text-xs">
            {loading ? 'Caricamento…' : `${filtered.length} lead${filtered.length !== 1 ? 's' : ''}`}
            {search || statoFiltro !== 'tutti' ? ` su ${leads.length} totali` : ''}
          </span>
          <button
            onClick={handleDataChanged}
            disabled={loading}
            className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded disabled:opacity-40"
            title="Aggiorna"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Spinner caricamento */}
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="md" />
          </div>
        )}

        {/* Stato vuoto */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm mb-1">
              {leads.length === 0 ? 'Nessun lead ancora' : 'Nessun risultato'}
            </p>
            <p className="text-slate-600 text-xs">
              {leads.length === 0
                ? 'Importa un file Excel per iniziare'
                : 'Prova a modificare i filtri di ricerca'}
            </p>
          </div>
        )}

        {/* Tabella (solo desktop md+) */}
        {!loading && filtered.length > 0 && (
          <table className="hidden md:table w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {/* Checkbox seleziona tutto */}
                <th className="pl-4 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer
                               focus:ring-cyan-500 focus:ring-offset-slate-950"
                    aria-label="Seleziona tutti"
                  />
                </th>

                {/* Intestazioni colonne */}
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className={`
                      px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider
                      ${col.key === 'prezzo' ? 'text-right' : ''}
                      ${col.sortable ? 'cursor-pointer hover:text-slate-300 select-none' : ''}
                    `}
                  >
                    <span className="inline-flex items-center gap-1">
                      {col.label}
                      {col.sortable && <SortIcon colKey={col.key} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  selected={selected.has(lead.id)}
                  onSelect={toggleSelect}
                  onUpdated={handleDataChanged}
                />
              ))}
            </tbody>
          </table>
        )}

        {/* Card view mobile (md:hidden — gestito dentro LeadRow) */}
        {!loading && filtered.length > 0 && (
          <div className="md:hidden p-3">
            {filtered.map(lead => (
              <LeadRow
                key={lead.id}
                lead={lead}
                selected={selected.has(lead.id)}
                onSelect={toggleSelect}
                onUpdated={handleDataChanged}
              />
            ))}
          </div>
        )}
      </div>

      {/* ConfirmDialog bulk delete */}
      <ConfirmDialog
        isOpen={confirmDelete}
        title="Elimina lead selezionati"
        message={`Stai per eliminare ${selectedInView.length} contatt${selectedInView.length === 1 ? 'o' : 'i'}. Questa azione è irreversibile.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel={deleting ? 'Eliminazione…' : 'Elimina'}
      />
    </div>
  )
}
