import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, ArrowRight, FileSpreadsheet, CheckCircle, Users, TrendingUp, BadgeCheck, Sparkles } from 'lucide-react'
import { supabase }       from '../../supabaseClient'
import { useAuth }        from '../../App'
import { useToast }       from '../UI/Toast'
import { parseExcelFile } from '../Import/excelParser'
import { RevenueChart, StatoDonut } from './DashboardCharts'
import FollowUpSection from './FollowUpSection'
import LeoQuickActions from '../Leo/LeoQuickActions'
import { resolvePaymentStatus } from '../../utils/receiptPayment'
import { Wallet, AlertCircle } from 'lucide-react'
import { usePlan } from '../../hooks/usePlan'
import UpgradeModal from '../UI/UpgradeModal'
import { useAziendaId } from '../../hooks/useWorkspace'

// ─────────────────────────────────────────────
// STATS BAR
// ─────────────────────────────────────────────
function StatsBar({ refreshKey }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const [stats, setStats]     = useState({ totale: 0, fatturato: 0, conclusi: 0, nuovi: 0 })
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('leads')
      .select('stato, prezzo')
      .eq('azienda_id', aziendaId)

    if (!error && data) {
      const totale    = data.length
      const fatturato = data
        .filter(l => l.stato === 'concluso')
        .reduce((s, l) => s + (parseFloat(l.prezzo) || 0), 0)
      const conclusi  = data.filter(l => l.stato === 'concluso').length
      const nuovi     = data.filter(l => l.stato === 'nuovo').length
      const trattativa = data.filter(l => l.stato === 'in trattativa').length
      const valTratt  = data
        .filter(l => l.stato === 'in trattativa')
        .reduce((s, l) => s + (parseFloat(l.prezzo) || 0), 0)
      setStats({ totale, fatturato, conclusi, nuovi, trattativa, valTratt })
    }
    setLoading(false)
  }, [user, refreshKey])

  useEffect(() => { fetchStats() }, [fetchStats])

  function eur(v) {
    if (!v) return '€0'
    if (v >= 1000) return '€' + (v / 1000).toFixed(1).replace('.', ',') + 'k'
    return '€' + v.toFixed(0)
  }

  const cards = [
    {
      label:  'LEAD TOTALI',
      value:  loading ? '—' : stats.totale.toString(),
      sub:    loading ? '' : `+${stats.nuovi} nuovi`,
      accent: '#22d3ee',
      icon:   Users,
    },
    {
      label:  'FATTURATO',
      value:  loading ? '—' : eur(stats.fatturato),
      sub:    'lead conclusi (somma prezzi)',
      accent: '#34d399',
      icon:   TrendingUp,
    },
    {
      label:  'CONCLUSI',
      value:  loading ? '—' : stats.conclusi?.toString() ?? '0',
      sub:    loading ? '' : `${eur(stats.valTratt || 0)} in trattativa`,
      accent: '#818cf8',
      icon:   BadgeCheck,
    },
    {
      label:  'NUOVI',
      value:  loading ? '—' : stats.nuovi?.toString() ?? '0',
      sub:    'questo mese',
      accent: '#fb923c',
      icon:   Sparkles,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map(({ label, value, sub, accent, icon: Icon }) => (
        <div
          key={label}
          className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          style={{ borderTop: `2px solid ${accent}` }}
        >
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[11px] font-bold tracking-widest" style={{ color: accent }}>
                {label}
              </p>
              <Icon className="w-4 h-4 opacity-40" style={{ color: accent }} />
            </div>
            <p className="font-display font-bold text-3xl mb-1" style={{ color: accent }}>
              {value}
            </p>
            <p className="text-slate-500 text-xs">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentStats({ refreshKey }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const [stats, setStats] = useState({ daIncassare: 0, scadute: 0, incassatoMese: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('receipts')
        .select('totale, payment_status, due_date, payment_date, created_at')
        .eq('azienda_id', aziendaId)
        .eq('email_inviata', true)

      if (!cancelled && data) {
        let daIncassare = 0
        let scadute = 0
        let incassatoMese = 0
        const now = new Date()
        data.forEach(r => {
          const st = resolvePaymentStatus(r)
          if (st === 'non_pagata' || st === 'scaduta') daIncassare += parseFloat(r.totale) || 0
          if (st === 'scaduta') scadute += 1
          if (st === 'pagata') {
            const ref = r.payment_date || r.created_at
            if (ref) {
              const d = new Date(ref)
              if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
                incassatoMese += parseFloat(r.totale) || 0
              }
            }
          }
        })
        setStats({ daIncassare, scadute, incassatoMese })
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [user, refreshKey])

  function eur(v) {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0)
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8" data-tour="dashboard-payments">
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ borderTop: '2px solid #fbbf24' }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold tracking-widest text-amber-400">DA INCASSARE</p>
            <Wallet className="w-4 h-4 text-amber-400/40" />
          </div>
          <p className="font-display font-bold text-3xl text-amber-400 mb-1">{loading ? '—' : eur(stats.daIncassare)}</p>
          <p className="text-slate-500 text-xs">Ricevute non pagate</p>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden" style={{ borderTop: `2px solid ${stats.scadute > 0 ? '#f87171' : '#64748b'}` }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className={`text-[11px] font-bold tracking-widest ${stats.scadute > 0 ? 'text-red-400' : 'text-slate-500'}`}>SCADUTE</p>
            <AlertCircle className={`w-4 h-4 ${stats.scadute > 0 ? 'text-red-400/40' : 'text-slate-600'}`} />
          </div>
          <p className={`font-display font-bold text-3xl mb-1 ${stats.scadute > 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {loading ? '—' : stats.scadute}
          </p>
          <p className="text-slate-500 text-xs">Oltre la scadenza</p>
        </div>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden col-span-2 lg:col-span-1" style={{ borderTop: '2px solid #34d399' }}>
        <div className="p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[11px] font-bold tracking-widest text-emerald-400">INCASSATO (MESE)</p>
            <Wallet className="w-4 h-4 text-emerald-400/40" />
          </div>
          <p className="font-display font-bold text-3xl text-emerald-400 mb-1">
            {loading ? '—' : eur(stats.incassatoMese)}
          </p>
          <p className="text-slate-500 text-xs">Ricevute segnate pagate</p>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// BIG DROP ZONE
// ─────────────────────────────────────────────
function BigDropZone({ onImported }) {
  const { user }     = useAuth()
  const aziendaId    = useAziendaId()
  const { addToast } = useToast()
  const navigate     = useNavigate()
  const { canAddLead, usage, limits, isFree } = usePlan()

  const [dragging, setDragging]     = useState(false)
  const [phase, setPhase]           = useState('idle')
  const [records, setRecords]       = useState([])
  const [warnings, setWarnings]     = useState([])
  const [mappedColumns, setMappedColumns] = useState(null)
  const [parseError, setParseError] = useState(null)
  const [progress, setProgress]     = useState(0)
  const [importedCount, setImportedCount] = useState(0)
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  function reset() {
    setPhase('idle'); setRecords([]); setWarnings([])
    setMappedColumns(null)
    setParseError(null); setProgress(0); setImportedCount(0)
  }

  async function handleFile(file) {
    setParseError(null)
    setPhase('parsing')
    try {
      const { records: parsed, warnings: warns, mappedColumns: mapped } = await parseExcelFile(file)
      setRecords(parsed)
      setWarnings(warns)
      setMappedColumns(mapped)
      setPhase('confirm')
    } catch (err) {
      setParseError(err.message)
      setPhase('idle')
    }
  }

  function onDragOver(e)  { e.preventDefault(); setDragging(true)  }
  function onDragLeave(e) { e.preventDefault(); setDragging(false) }
  function onDrop(e) {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }
  function onFileInput(e) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    e.target.value = ''
  }

  async function handleImport() {
    if (!canAddLead || (isFree && usage.leads + records.length > limits.FREE_LEAD_LIMIT)) {
      setUpgradeOpen(true)
      return
    }
    setPhase('importing'); setProgress(0)
    const BATCH = 50
    let ok = 0, errs = 0
    const enriched = records.map(r => ({ ...r, azienda_id: aziendaId, stato: 'nuovo' }))
    const batches  = []
    for (let i = 0; i < enriched.length; i += BATCH) batches.push(enriched.slice(i, i + BATCH))

    for (let i = 0; i < batches.length; i++) {
      const { error } = await supabase.from('leads').insert(batches[i])
      error ? errs += batches[i].length : ok += batches[i].length
      setProgress(Math.round(((i + 1) / batches.length) * 100))
    }
    setImportedCount(ok)
    setPhase('done')
    addToast({ message: `${ok} lead importati con successo`, variant: 'success' })
    if (onImported) onImported()
  }

  // IDLE
  if (phase === 'idle') return (
    <div className="space-y-3">
      {parseError && (
        <div className="bg-red-950 border border-red-900 rounded-xl px-4 py-3">
          <p className="text-red-300 text-sm">{parseError}</p>
        </div>
      )}
      <label
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          flex flex-col items-center justify-center gap-5
          border-2 border-dashed rounded-2xl p-14 cursor-pointer
          transition-all duration-200
          ${dragging
            ? 'border-cyan-400 bg-cyan-950/20 scale-[1.01]'
            : 'border-cyan-900/50 bg-slate-900/30 hover:border-cyan-700/70 hover:bg-slate-900/60'
          }
        `}
      >
        <input type="file" accept=".xlsx,.xls,.csv" onChange={onFileInput} className="hidden" />

        <div className={`
          w-20 h-20 rounded-2xl border-2 flex items-center justify-center
          transition-colors duration-200
          ${dragging ? 'border-cyan-400 bg-cyan-950' : 'border-cyan-900/60 bg-slate-800/60'}
        `}>
          <Upload className={`w-9 h-9 ${dragging ? 'text-cyan-300' : 'text-cyan-700'}`} />
        </div>

        <div className="text-center space-y-1">
          <p className={`font-semibold text-xl ${dragging ? 'text-cyan-300' : 'text-slate-200'}`}>
            {dragging ? 'Rilascia il file qui' : 'Trascina il tuo file Excel'}
          </p>
          <p className="text-slate-500 text-sm">
            oppure{' '}
            <span className="text-cyan-400 underline underline-offset-2 cursor-pointer">
              clicca per sfogliare
            </span>
          </p>
          <p className="text-slate-600 text-xs pt-1">
            .xlsx · .xls · .csv &nbsp;·&nbsp; Max 10 MB
          </p>
        </div>

        <div className="flex flex-wrap gap-2 justify-center max-w-md pt-1">
          {['Nome / Cliente', 'Email', 'Telefono', 'Servizio', 'Prezzo'].map(c => (
            <span key={c} className="text-xs px-2.5 py-1 rounded-full bg-slate-800
                                     text-slate-500 border border-slate-700/80">
              {c}
            </span>
          ))}
        </div>
      </label>

      <p className="text-center text-slate-600 text-xs">
        Vuoi aggiungere un singolo contatto?{' '}
        <button
          onClick={() => navigate('/lead')}
          className="text-cyan-500 hover:text-cyan-400 transition-colors inline-flex items-center gap-1"
        >
          Vai a Lead <ArrowRight className="w-3 h-3" />
        </button>
      </p>
    </div>
  )

  // PARSING
  if (phase === 'parsing') return (
    <div className="flex flex-col items-center justify-center gap-4 py-24
                    border-2 border-dashed border-cyan-900/40 rounded-2xl">
      <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-cyan-400 animate-spin" />
      <p className="text-slate-400 text-sm">Analisi file in corso…</p>
    </div>
  )

  // CONFIRM
  if (phase === 'confirm') return (
  <>
    <div className="border border-slate-800 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
          <div>
            <p className="text-slate-200 font-medium text-sm">
              Trovati {records.length} contatti — conferma per importare
            </p>
            {mappedColumns && (
              <p className="text-slate-500 text-xs mt-1 flex flex-wrap gap-2">
                {[
                  ['nome', 'Nome'],
                  ['email', 'Email'],
                  ['telefono', 'Telefono'],
                  ['servizio', 'Servizio'],
                  ['prezzo', 'Prezzo'],
                ].map(([key, label]) => (
                  <span key={key} className={mappedColumns[key] ? 'text-emerald-400' : 'text-red-400/90'}>
                    {mappedColumns[key] ? '✓' : '✗'} {label}
                  </span>
                ))}
              </p>
            )}
            {warnings.length > 0 && (
              <p className="text-yellow-500 text-xs">{warnings.length} righe con avvisi</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="btn-secondary text-xs px-3 py-2 min-h-[36px]">
            Annulla
          </button>
          <button onClick={handleImport} className="btn-primary text-xs px-3 py-2 min-h-[36px]">
            <Upload className="w-3.5 h-3.5" />
            Conferma e importa
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-950/60 border-b border-slate-800">
              {['Nome', 'Email', 'Servizio', 'Prezzo'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-xs font-medium
                                       text-slate-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.slice(0, 5).map((r, i) => (
              <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                <td className="px-4 py-2.5 text-slate-200 font-medium">{r.nome}</td>
                <td className="px-4 py-2.5 text-slate-400">{r.email || '—'}</td>
                <td className="px-4 py-2.5 text-slate-300">{r.servizio}</td>
                <td className="px-4 py-2.5 text-emerald-400 font-mono">
                  {r.prezzo ? `€ ${Number(r.prezzo).toFixed(2)}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length > 5 && (
          <p className="text-slate-600 text-xs text-center py-2.5">
            … e altri {records.length - 5} lead non mostrati
          </p>
        )}
      </div>
    </div>
    <UpgradeModal isOpen={upgradeOpen} reason="leads" onClose={() => setUpgradeOpen(false)} />
  </>
  )

  // IMPORTING
  if (phase === 'importing') return (
    <div className="flex flex-col items-center gap-6 py-20
                    border-2 border-dashed border-cyan-900/40 rounded-2xl">
      <div className="w-10 h-10 rounded-full border-2 border-slate-700 border-t-cyan-400 animate-spin" />
      <div className="w-52 space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Importazione in corso…</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300"
               style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )

  // DONE
  return (
    <div className="flex flex-col items-center gap-4 py-20
                    border-2 border-dashed border-emerald-900/40 rounded-2xl">
      <CheckCircle className="w-14 h-14 text-emerald-400" />
      <div className="text-center">
        <p className="text-slate-100 font-semibold text-lg">Importazione completata</p>
        <p className="text-slate-500 text-sm mt-1">{importedCount} lead aggiunti con successo</p>
      </div>
      <button onClick={reset} className="btn-secondary text-sm mt-1">
        Importa un altro file
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────
// DASHBOARD VIEW
// ─────────────────────────────────────────────
function DashboardContent({ refreshKey, onRefresh }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const [leads, setLeads] = useState([])
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const [leadsRes, receiptsRes] = await Promise.all([
        supabase.from('leads').select('*').eq('azienda_id', aziendaId),
        supabase
          .from('receipts')
          .select('totale, payment_status, payment_date, due_date, created_at')
          .eq('azienda_id', aziendaId)
          .eq('email_inviata', true),
      ])
      if (!cancelled) {
        setLeads(leadsRes.data || [])
        setReceipts(receiptsRes.data || [])
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user, refreshKey])

  if (!loading && leads.length === 0) {
    return (
      <>
        <PaymentStats refreshKey={refreshKey} />
        <div className="flex flex-col items-center justify-center py-12 text-center px-4" data-tour="dashboard-import">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-300 font-medium text-lg mb-2">Nessun lead ancora</p>
          <p className="text-slate-500 text-sm mb-6 max-w-sm">
            Importa il tuo primo file Excel per iniziare a gestire clienti e ricevute.
          </p>
          <BigDropZone onImported={onRefresh} />
        </div>
      </>
    )
  }

  return (
    <>
      <StatsBar refreshKey={refreshKey} />
      <PaymentStats refreshKey={refreshKey} />
      <FollowUpSection refreshKey={refreshKey} />
      <LeoQuickActions />
      {leads.length > 0 && (
        <div className="grid lg:grid-cols-2 gap-4 mb-8">
          <RevenueChart leads={leads} receipts={receipts} />
          <StatoDonut leads={leads} />
        </div>
      )}
      <div data-tour="dashboard-import">
        <h2 className="text-slate-400 font-semibold text-xs uppercase tracking-widest mb-4">
          Importa Lead da Excel
        </h2>
        <BigDropZone onImported={onRefresh} />
      </div>
    </>
  )
}

export default function DashboardView() {
  const [refreshKey, setRefreshKey] = useState(0)
  const { isFree, usage, limits, refresh: refreshPlan } = usePlan()

  function handleImported() {
    setRefreshKey(k => k + 1)
    refreshPlan()
  }

  return (
    <div className="px-4 sm:px-6 py-6 space-y-8">
      {isFree && (
        <p className="text-slate-500 text-xs text-center">
          Piano Free: {usage.leads}/{limits.FREE_LEAD_LIMIT} lead · {usage.emailsThisMonth}/{limits.FREE_EMAIL_LIMIT} email questo mese
        </p>
      )}
      <DashboardContent refreshKey={refreshKey} onRefresh={handleImported} />
    </div>
  )
}
