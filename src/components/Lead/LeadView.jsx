import { useState, useEffect, useCallback } from 'react'
import {
  Upload, UserPlus, Search, X, ChevronDown, ChevronUp,
  ChevronsUpDown, Trash2, Send, Users, RefreshCw, Download,
  LayoutGrid, Table2, StickyNote, Star,
} from 'lucide-react'
import { supabase }   from '../../supabaseClient'
import { useAuth }    from '../../App'
import { useToast }   from '../UI/Toast'
import ConfirmDialog  from '../UI/ConfirmDialog'
import ImportModal    from '../Import/ImportModal'
import SendReceiptsModal from '../Email/SendReceiptsModal'
import Spinner        from '../UI/Spinner'
import ServizioText from '../UI/ServizioText'
import { usePlan } from '../../hooks/usePlan'
import UpgradeModal from '../UI/UpgradeModal'
import { LeoEmailButton } from '../Leo/LeoPanel'
import { downloadLeadsCsv } from '../../utils/exportLeadsCsv'
import { HighPriceWarning } from '../UI/HighPriceWarning'
import ContactActions from './ContactActions'
import LeadDetailDrawer from './LeadDetailDrawer'
import LeadKanban from './LeadKanban'
import { applyQuickFilter } from '../../utils/leadQuickFilters'
import { useAziendaId } from '../../hooks/useWorkspace'

const VIEW_MODE_KEY = 'leados_lead_view'

const QUICK_FILTERS = [
  { value: 'tutti',       label: 'Tutti' },
  { value: 'oggi',        label: 'Contatto oggi' },
  { value: 'preferiti',   label: 'Preferiti' },
  { value: 'senza_email', label: 'Senza email' },
]

// ─────────────────────────────────────────────
// COSTANTI
// ─────────────────────────────────────────────
const STATI_FILTRO = [
  { value: 'tutti',         label: 'Tutti'      },
  { value: 'nuovo',         label: 'Nuovo'      },
  { value: 'contattato',    label: 'Contattato' },
  { value: 'in trattativa', label: 'Trattativa' },
  { value: 'concluso',      label: 'Concluso'   },
  { value: 'perso',         label: 'Perso'      },
]

const STATI_SELECT = ['nuovo', 'contattato', 'in trattativa', 'concluso', 'perso']

// Badge colorati per stato
const BADGE = {
  'nuovo':         'bg-slate-700/80 text-slate-300 border-slate-600',
  'contattato':    'bg-blue-900/60 text-blue-300 border-blue-800',
  'in trattativa': 'bg-amber-900/60 text-amber-300 border-amber-800',
  'concluso':      'bg-emerald-900/60 text-emerald-300 border-emerald-800',
  'perso':         'bg-red-900/60 text-red-300 border-red-800',
}

function StatoBadge({ stato }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${BADGE[stato] ?? BADGE['nuovo']}`}>
      {stato.charAt(0).toUpperCase() + stato.slice(1)}
    </span>
  )
}

function formatPrezzo(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
}

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ─────────────────────────────────────────────
// FIELD — dichiarato FUORI per evitare il bug di focus
// (se fosse dentro AddLeadModal verrebbe ricreato
//  ad ogni render, smontando l'input e perdendo il cursore)
// ─────────────────────────────────────────────
function Field({ label, field, type = 'text', placeholder, required, value, onChange, error }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
        {label} {required && <span className="text-cyan-400">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(field, e.target.value)}
        placeholder={placeholder}
        className={`input-base ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}`}
      />
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────
// ADD LEAD MODAL
// ─────────────────────────────────────────────
function AddLeadModal({ isOpen, onClose, onAdded, onUpgrade }) {
  const { user }     = useAuth()
  const aziendaId    = useAziendaId()
  const { addToast } = useToast()
  const { canAddLead } = usePlan()

  const empty = { nome: '', email: '', telefono: '', servizio: '', prezzo: '', stato: 'nuovo', follow_up_at: '' }
  const [form, setForm]       = useState(empty)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors]   = useState({})

  if (!isOpen) return null

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
    if (errors[field]) setErrors(e => ({ ...e, [field]: null }))
  }

  function validate() {
    const e = {}
    if (!form.nome.trim())     e.nome     = 'Il nome è obbligatorio'
    if (!form.servizio.trim()) e.servizio = 'Il servizio è obbligatorio'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      e.email = 'Email non valida'
    if (form.prezzo && isNaN(parseFloat(form.prezzo)))
      e.prezzo = 'Inserisci un numero valido'
    return e
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canAddLead) { onUpgrade('leads'); return }
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setLoading(true)
    const { error } = await supabase.from('leads').insert({
      azienda_id: aziendaId,
      nome:       form.nome.trim(),
      email:      form.email.trim() || null,
      telefono:   form.telefono.trim() || null,
      servizio:   form.servizio.trim(),
      prezzo:     form.prezzo ? parseFloat(form.prezzo) : 0,
      stato:      form.stato,
      follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
    })
    if (error) {
      const msg = error.message?.includes('lead_limit_reached')
        ? 'Limite di 50 lead raggiunto (piano Free). Passa a Pro per continuare.'
        : `Errore: ${error.message}`
      addToast({ message: msg, variant: 'error' })
    } else {
      addToast({ message: `Lead "${form.nome}" aggiunto`, variant: 'success' })
      setForm(empty)
      onAdded()
    }
    setLoading(false)
  }

  function handleClose() { setForm(empty); setErrors({}); onClose() }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={handleClose}
      role="dialog" aria-modal="true"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-950 border border-cyan-900 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-slate-100 font-semibold font-display">Nuovo Lead</h2>
              <p className="text-slate-500 text-xs">Aggiungi un contatto manualmente</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <Field label="Nome / Azienda" field="nome"     required placeholder="Es. Mario Rossi"
                 value={form.nome}     onChange={set} error={errors.nome} />
          <Field label="Servizio"       field="servizio" required placeholder="Es. Sviluppo Web"
                 value={form.servizio} onChange={set} error={errors.servizio} />

          <div className="grid grid-cols-2 gap-3">
            <Field label="Email"    field="email"    type="email" placeholder="mario@esempio.it"
                   value={form.email}    onChange={set} error={errors.email} />
            <Field label="Telefono" field="telefono" type="tel"   placeholder="+39 333 000000"
                   value={form.telefono} onChange={set} error={errors.telefono} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Prezzo (€)
              </label>
              <input
                type="number" min="0" step="0.01"
                value={form.prezzo}
                onChange={e => set('prezzo', e.target.value)}
                placeholder="0.00"
                className={`input-base ${errors.prezzo ? 'border-red-500' : ''}`}
              />
              {errors.prezzo && <p className="text-red-400 text-xs mt-1">{errors.prezzo}</p>}
              <HighPriceWarning prezzo={form.prezzo} className="mt-2" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Stato
              </label>
              <select value={form.stato} onChange={e => set('stato', e.target.value)} className="input-base">
                {STATI_SELECT.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <Field label="Prossimo contatto" field="follow_up_at" type="datetime-local"
                 value={form.follow_up_at} onChange={set} />

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1 justify-center">
              Annulla
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {loading ? <Spinner size="sm" /> : <><UserPlus className="w-4 h-4" />Aggiungi</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// LEADS TABLE
// ─────────────────────────────────────────────
const COLUMNS = [
  { key: 'nome',       label: 'Nome / Azienda', sortable: true  },
  { key: 'contatti',   label: 'Contatti',       sortable: false },
  { key: 'email',      label: 'Email',          sortable: false },
  { key: 'servizio',   label: 'Servizio',       sortable: true  },
  { key: 'prezzo',     label: 'Prezzo',         sortable: true  },
  { key: 'stato',      label: 'Stato',          sortable: true  },
  { key: 'follow_up_at', label: 'Prossimo contatto', sortable: true },
  { key: 'created_at', label: 'Data',           sortable: true  },
]

function LeadsTable({ refreshKey, onStatsRefresh, onSendReceipts, onUpgrade, viewMode, onViewModeChange, onOpenLead }) {
  const { user }     = useAuth()
  const aziendaId    = useAziendaId()
  const { addToast } = useToast()
  const { isFree, usage, limits } = usePlan()

  const [leads, setLeads]         = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [statoFiltro, setStatoFiltro] = useState('tutti')
  const [quickFilter, setQuickFilter] = useState('tutti')
  const [sortKey, setSortKey]     = useState('created_at')
  const [sortDir, setSortDir]     = useState('desc')
  const [selected, setSelected]   = useState(new Set())
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [noteCounts, setNoteCounts] = useState({})

  const fetchNoteCounts = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('lead_notes')
      .select('lead_id')
      .eq('azienda_id', aziendaId)
    const counts = {}
    ;(data || []).forEach(row => {
      counts[row.lead_id] = (counts[row.lead_id] || 0) + 1
    })
    setNoteCounts(counts)
  }, [user])

  const fetchLeads = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leads').select('*').eq('azienda_id', aziendaId)
      .order(sortKey, { ascending: sortDir === 'asc' })
    if (error) addToast({ message: `Errore: ${error.message}`, variant: 'error' })
    else setLeads(data || [])
    setLoading(false)
  }, [user, sortKey, sortDir])

  useEffect(() => { fetchLeads(); fetchNoteCounts() }, [fetchLeads, fetchNoteCounts, refreshKey])

  function handleDataChanged() {
    fetchLeads()
    fetchNoteCounts()
    if (onStatsRefresh) onStatsRefresh()
  }

  const filtered = applyQuickFilter(
    leads.filter(l => {
      const matchStato = statoFiltro === 'tutti' || l.stato === statoFiltro
      const q = search.toLowerCase().trim()
      const matchSearch = !q || [l.nome, l.email, l.servizio, l.telefono].some(f => f?.toLowerCase().includes(q))
      return matchStato && matchSearch
    }),
    quickFilter,
  )

  function handleSort(key) {
    if (!COLUMNS.find(c => c.key === key)?.sortable) return
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setSelected(new Set())
  }

  function SortIcon({ colKey }) {
    if (sortKey !== colKey) return <ChevronsUpDown className="w-3 h-3 text-slate-600" />
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-cyan-400" />
      : <ChevronDown className="w-3 h-3 text-cyan-400" />
  }

  const allIds      = filtered.map(l => l.id)
  const allSelected = allIds.length > 0 && allIds.every(id => selected.has(id))
  const someSelected = allIds.some(id => selected.has(id))

  function toggleAll() {
    if (allSelected) setSelected(prev => { const n = new Set(prev); allIds.forEach(id => n.delete(id)); return n })
    else setSelected(prev => new Set([...prev, ...allIds]))
  }
  function toggleOne(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const selectedInView = allIds.filter(id => selected.has(id))

  async function handleBulkDelete() {
    setDeleting(true); setConfirmDelete(false)
    const { error } = await supabase.from('leads').delete()
      .in('id', selectedInView).eq('azienda_id', aziendaId)
    if (error) addToast({ message: `Errore eliminazione: ${error.message}`, variant: 'error' })
    else {
      setSelected(prev => { const n = new Set(prev); selectedInView.forEach(id => n.delete(id)); return n })
      addToast({ message: `${selectedInView.length} lead eliminati`, variant: 'success' })
      handleDataChanged()
    }
    setDeleting(false)
  }

  async function handleStatoChange(lead, nuovoStato) {
    const patch = { stato: nuovoStato }
    if (nuovoStato === 'concluso') {
      patch.concluso_at = new Date().toISOString()
    }
    const { error } = await supabase
      .from('leads')
      .update(patch)
      .eq('id', lead.id)
      .eq('azienda_id', aziendaId)
    if (error && error.message.includes('concluso_at')) {
      await supabase.from('leads').update({ stato: nuovoStato }).eq('id', lead.id).eq('azienda_id', aziendaId)
    }
    handleDataChanged()
  }

  async function handleTogglePreferito(lead) {
    const next = !lead.preferito
    const { error } = await supabase
      .from('leads')
      .update({ preferito: next })
      .eq('id', lead.id)
      .eq('azienda_id', aziendaId)
    if (error) {
      if (error.message.includes('preferito')) {
        addToast({ message: 'Esegui la migration more_features su Supabase', variant: 'error' })
      } else {
        addToast({ message: error.message, variant: 'error' })
      }
      return
    }
    handleDataChanged()
  }

  async function handleFollowUpChange(lead, value) {
    const { error } = await supabase.from('leads').update({
      follow_up_at: value ? new Date(value).toISOString() : null,
    }).eq('id', lead.id).eq('azienda_id', aziendaId)
    if (error) {
      addToast({
        message: error.message.includes('follow_up_at')
          ? 'Colonna follow_up_at mancante: esegui supabase/setup_completo.sql'
          : error.message,
        variant: 'error',
      })
      return
    }
    handleDataChanged()
  }

  function handleExportCsv() {
    downloadLeadsCsv(filtered, `leads_${new Date().toISOString().slice(0, 10)}.csv`)
    addToast({ message: `${filtered.length} lead esportati`, variant: 'success' })
  }

  function handleSendReceipts() {
    if (!onSendReceipts) return
    const leadsSelezionati = leads.filter(l => selectedInView.includes(l.id))
    onSendReceipts(leadsSelezionati, () => { setSelected(new Set()); handleDataChanged() })
  }

  return (
    <div>
      {isFree && (
        <p className="text-slate-500 text-xs mb-3">
          Piano Free: {usage.leads}/{limits.FREE_LEAD_LIMIT} lead · {usage.emailsThisMonth}/{limits.FREE_EMAIL_LIMIT} email questo mese
        </p>
      )}
      {/* Filtri */}
      <div className="flex flex-col gap-3 mb-5">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text" value={search}
            onChange={e => { setSearch(e.target.value); setSelected(new Set()) }}
            placeholder="Cerca per nome, email, servizio…"
            className="input-base pl-10 pr-9"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none" data-tour="lead-filters">
          {QUICK_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => { setQuickFilter(value); setSelected(new Set()) }}
              className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] shrink-0 transition-all ${
                quickFilter === value
                  ? 'bg-violet-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {value === 'preferiti' && <Star className="w-3 h-3 inline mr-1 -mt-0.5" />}
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none flex-1">
            {STATI_FILTRO.map(({ value, label }) => (
              <button key={value} onClick={() => { setStatoFiltro(value); setSelected(new Set()) }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap min-h-[36px] shrink-0
                           transition-all duration-150
                           ${statoFiltro === value
                             ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm shadow-cyan-500/20'
                             : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700'
                           }`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 shrink-0" data-tour="lead-views">
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`p-2 rounded-lg min-h-[36px] transition-colors ${viewMode === 'table' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
              title="Vista tabella"
            >
              <Table2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              data-tour="lead-kanban-btn"
              onClick={() => onViewModeChange('kanban')}
              className={`p-2 rounded-lg min-h-[36px] transition-colors ${viewMode === 'kanban' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' : 'text-slate-500 hover:text-slate-300 border border-transparent'}`}
              title="Vista kanban"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {selectedInView.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap bg-slate-900 border border-cyan-900/50
                        rounded-xl px-4 py-3 mb-4 animate-slide-up">
          <span className="w-6 h-6 rounded-md bg-cyan-500 text-slate-950 text-xs font-bold
                           flex items-center justify-center shrink-0">
            {selectedInView.length}
          </span>
          <span className="text-slate-300 text-sm flex-1">
            lead {selectedInView.length === 1 ? 'selezionato' : 'selezionati'}
          </span>
          <button onClick={handleSendReceipts}
            className="btn-primary text-xs px-3 py-2 min-h-[36px]">
            <Send className="w-3.5 h-3.5" />Invia Ricevute
          </button>
          {selectedInView.length === 1 && (
            <LeoEmailButton lead={leads.find(l => l.id === selectedInView[0])} />
          )}
          <button onClick={() => setConfirmDelete(true)} disabled={deleting}
            className="btn-danger text-xs px-3 py-2 min-h-[36px] disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" />Elimina
          </button>
          <button onClick={() => setSelected(new Set())}
            className="text-slate-500 hover:text-slate-300 transition-colors p-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Card */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 gap-2">
          <span className="text-slate-500 text-xs">
            {loading ? 'Caricamento…' : `${filtered.length} lead${filtered.length !== 1 ? 's' : ''}`}
            {(search || statoFiltro !== 'tutti') ? ` su ${leads.length} totali` : ''}
          </span>
          <div className="flex items-center gap-1">
            {filtered.length > 0 && (
              <button onClick={handleExportCsv} className="btn-secondary text-xs px-2 py-1.5 min-h-0 gap-1">
                <Download className="w-3.5 h-3.5" />
                Esporta CSV
              </button>
            )}
            <button onClick={handleDataChanged} disabled={loading}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1 rounded disabled:opacity-40">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading && <div className="flex justify-center py-12"><Spinner size="md" /></div>}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
              <Users className="w-6 h-6 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium text-sm mb-1">
              {leads.length === 0 ? 'Nessun lead ancora' : 'Nessun risultato'}
            </p>
            <p className="text-slate-600 text-xs">
              {leads.length === 0 ? 'Usa "+ Nuovo Lead" o importa un Excel' : 'Prova altri filtri'}
            </p>
          </div>
        )}

        {!loading && filtered.length > 0 && viewMode === 'kanban' && (
          <div className="p-4">
            <LeadKanban
              leads={filtered}
              noteCounts={noteCounts}
              onStatoChange={handleStatoChange}
              onOpenLead={onOpenLead}
            />
          </div>
        )}

        {/* Tabella desktop */}
        {!loading && filtered.length > 0 && viewMode === 'table' && (
          <table className="hidden md:table w-full">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                <th className="pl-4 pr-2 py-3 w-10">
                  <input type="checkbox" checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer" />
                </th>
                {COLUMNS.map(col => (
                  <th key={col.key} onClick={() => handleSort(col.key)}
                    className={`px-3 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider
                               ${col.key === 'prezzo' ? 'text-right' : ''}
                               ${col.sortable ? 'cursor-pointer hover:text-slate-300 select-none' : ''}`}>
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
                <tr key={lead.id}
                  className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                  <td className="pl-4 pr-2 py-3 w-10">
                    <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)}
                      className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleTogglePreferito(lead)}
                        className={`p-0.5 rounded transition-colors ${
                          lead.preferito ? 'text-amber-400' : 'text-slate-600 hover:text-amber-500'
                        }`}
                        title={lead.preferito ? 'Rimuovi dai preferiti' : 'Aggiungi ai preferiti'}
                      >
                        <Star className={`w-4 h-4 ${lead.preferito ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenLead?.(lead)}
                        className="text-slate-200 font-medium text-sm hover:text-cyan-400 transition-colors text-left flex items-center gap-1.5 min-w-0"
                      >
                        <span className="truncate">{lead.nome}</span>
                        {noteCounts[lead.id] > 0 && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] text-violet-400 bg-violet-950/50 px-1.5 py-0.5 rounded shrink-0">
                            <StickyNote className="w-3 h-3" />
                            {noteCounts[lead.id]}
                          </span>
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <ContactActions lead={lead} />
                  </td>
                  <td className="px-3 py-3">
                    {lead.email
                      ? <a href={`mailto:${lead.email}`} className="text-slate-400 text-sm hover:text-cyan-400 transition-colors">{lead.email}</a>
                      : <span className="text-slate-600 text-sm">—</span>}
                  </td>
                  <td className="px-3 py-3 max-w-[12rem]">
                    <ServizioText
                      servizio={lead.servizio}
                      className="text-slate-300 text-sm block truncate"
                    />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <span className="text-emerald-400 font-mono text-sm font-medium">
                      {formatPrezzo(lead.prezzo)}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <select
                      value={lead.stato}
                      onChange={e => handleStatoChange(lead, e.target.value)}
                      className={`text-xs font-medium cursor-pointer border rounded-md px-2 py-0.5
                        focus:outline-none focus:ring-1 focus:ring-cyan-500 ${BADGE[lead.stato] ?? BADGE.nuovo}`}
                    >
                      {STATI_SELECT.map(s => (
                        <option key={s} value={s} className="bg-slate-900 text-slate-200">
                          {s.charAt(0).toUpperCase() + s.slice(1)}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <input
                      type="date"
                      value={lead.follow_up_at ? lead.follow_up_at.slice(0, 10) : ''}
                      onChange={e => handleFollowUpChange(lead, e.target.value)}
                      className="input-base text-xs py-1.5 w-[9.5rem]"
                    />
                  </td>
                  <td className="px-3 py-3 pr-4">
                    <span className="text-slate-500 text-xs font-mono">{formatData(lead.created_at)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Card mobile */}
        {!loading && filtered.length > 0 && viewMode === 'table' && (
          <div className="md:hidden divide-y divide-slate-800/60">
            {filtered.map(lead => (
              <div key={lead.id} className="flex items-center gap-3 px-4 py-3">
                <input type="checkbox" checked={selected.has(lead.id)} onChange={() => toggleOne(lead.id)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer shrink-0" />
                <div className="flex-1 min-w-0">
                  <button type="button" onClick={() => onOpenLead?.(lead)} className="text-left w-full">
                    <p className="text-slate-200 font-medium text-sm truncate">{lead.nome}</p>
                  </button>
                  <ServizioText
                    servizio={lead.servizio}
                    as="p"
                    className="text-slate-500 text-xs truncate"
                  />
                  <div className="mt-1.5"><ContactActions lead={lead} /></div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-emerald-400 font-mono text-sm">{formatPrezzo(lead.prezzo)}</p>
                  <StatoBadge stato={lead.stato} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={confirmDelete}
        title="Elimina lead selezionati"
        message={`Stai per eliminare ${selectedInView.length} contatt${selectedInView.length === 1 ? 'o' : 'i'}. Azione irreversibile.`}
        onConfirm={handleBulkDelete}
        onCancel={() => setConfirmDelete(false)}
        confirmLabel={deleting ? 'Eliminazione…' : 'Elimina'}
      />
    </div>
  )
}

// ─────────────────────────────────────────────
// LEAD VIEW (root della sezione)
// ─────────────────────────────────────────────
export default function LeadView() {
  const [refreshKey, setRefreshKey]         = useState(0)
  const [showImport, setShowImport]         = useState(false)
  const [showAddLead, setShowAddLead]       = useState(false)
  const [receiptsLeads, setReceiptsLeads]   = useState(null)
  const [onReceiptsDone, setOnReceiptsDone] = useState(null)
  const [upgradeReason, setUpgradeReason]   = useState(null)
  const [detailLead, setDetailLead]         = useState(null)
  const [viewMode, setViewMode]             = useState(() => localStorage.getItem(VIEW_MODE_KEY) || 'table')
  const { canSendEmail, refresh: refreshPlan } = usePlan()

  useEffect(() => {
    const raw = sessionStorage.getItem('leados_send_receipt')
    if (!raw) return
    try {
      const lead = JSON.parse(raw)
      sessionStorage.removeItem('leados_send_receipt')
      if (lead?.email) {
        setReceiptsLeads([lead])
      }
    } catch { /* ignore */ }
  }, [])

  function setViewModePersist(mode) {
    setViewMode(mode)
    localStorage.setItem(VIEW_MODE_KEY, mode)
  }

  function triggerRefresh() {
    setRefreshKey(k => k + 1)
    refreshPlan()
  }

  function handleSendReceipts(leadsSelezionati, doneCb) {
    if (!canSendEmail) {
      setUpgradeReason('emails')
      return
    }
    setReceiptsLeads(leadsSelezionati)
    setOnReceiptsDone(() => doneCb)
  }
  function handleReceiptsClose() { setReceiptsLeads(null); setOnReceiptsDone(null) }
  function handleReceiptsDone() {
    if (onReceiptsDone) onReceiptsDone()
    setReceiptsLeads(null); setOnReceiptsDone(null); triggerRefresh()
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-2" data-tour="lead-actions">
        <p className="text-slate-500 text-sm">Cerca, filtra e gestisci i tuoi contatti</p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowImport(true)}
            className="btn-secondary text-xs px-3 py-2 min-h-[36px] gap-1.5">
            <Upload className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Importa Excel</span>
          </button>
          <button onClick={() => setShowAddLead(true)}
            className="btn-primary text-xs px-3 py-2 min-h-[36px] gap-1.5">
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">+ Nuovo Lead</span>
            <span className="sm:hidden">+</span>
          </button>
        </div>
      </div>
      <p className="text-slate-600 text-xs mb-4" data-tour="lead-contacts">
        <span className="text-slate-500">Contatti</span> — email, chiamata e WhatsApp in tabella.
        Clic sul nome per scheda completa (note, template WA, duplica). Stella = preferito.
      </p>

      <LeadsTable
        refreshKey={refreshKey}
        onStatsRefresh={triggerRefresh}
        onSendReceipts={handleSendReceipts}
        onUpgrade={setUpgradeReason}
        viewMode={viewMode}
        onViewModeChange={setViewModePersist}
        onOpenLead={setDetailLead}
      />

      {detailLead && (
        <LeadDetailDrawer
          lead={detailLead}
          onClose={() => setDetailLead(null)}
          onNotesChanged={triggerRefresh}
          onLeadDuplicated={triggerRefresh}
        />
      )}

      <ImportModal
        isOpen={showImport}
        onClose={() => setShowImport(false)}
        onImported={() => { setShowImport(false); triggerRefresh() }}
      />
      <AddLeadModal
        isOpen={showAddLead}
        onClose={() => setShowAddLead(false)}
        onAdded={() => { setShowAddLead(false); triggerRefresh() }}
        onUpgrade={setUpgradeReason}
      />
      <UpgradeModal
        isOpen={!!upgradeReason}
        reason={upgradeReason}
        onClose={() => setUpgradeReason(null)}
      />
      {receiptsLeads && (
        <SendReceiptsModal
          leads={receiptsLeads}
          onClose={handleReceiptsClose}
          onDone={handleReceiptsDone}
        />
      )}
    </div>
  )
}
