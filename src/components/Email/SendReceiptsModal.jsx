import { useState, useEffect, useMemo, useCallback } from 'react'
import { X, Send, CheckCircle, XCircle, Loader, FileText, AlertTriangle, Eye, ImageIcon } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { useToast } from '../UI/Toast'
import { generateReceiptPDF } from '../PDF/pdfGenerator'
import { useProfile } from '../../hooks/useProfile'
import { invokeEdgeFunction } from '../../utils/invokeFunction'
import { usePlan } from '../../hooks/usePlan'
import { bytesToBase64 } from '../../utils/base64'
import { Link } from 'react-router-dom'
import UpgradeModal from '../UI/UpgradeModal'
import { HighPriceWarning } from '../UI/HighPriceWarning'
import { validateReceiptSend, leadsWithHighPrice } from '../../utils/receiptValidation'
import { defaultDueDate } from '../../utils/receiptPayment'
import { loadLogoForPdf } from '../../utils/loadLogoForPdf'
import { openPdfBytes } from '../../utils/downloadPdf'

// ─────────────────────────────────────────────
// COSTANTI — fuori da ogni componente
// ─────────────────────────────────────────────
const STATUS = {
  PENDING:    'pending',
  PROCESSING: 'processing',
  DONE:       'done',
  ERROR:      'error',
}

const IVA_OPTIONS = [
  { label: '22% — Ordinaria',          value: 22 },
  { label: '10% — Ridotta',            value: 10 },
  { label: '5%  — Speciale',           value: 5  },
  { label: '4%  — Minima',             value: 4  },
  { label: '0%  — Esente / Forfettario', value: 0 },
]

// ─────────────────────────────────────────────
// HELPER COMPONENTS — fuori da ogni componente padre
// ─────────────────────────────────────────────
function StatusIcon({ status }) {
  if (status === STATUS.PENDING)    return <div className="w-4 h-4 rounded-full border border-slate-600" />
  if (status === STATUS.PROCESSING) return <Loader className="w-4 h-4 text-cyan-400 animate-spin" />
  if (status === STATUS.DONE)       return <CheckCircle className="w-4 h-4 text-emerald-400" />
  if (status === STATUS.ERROR)      return <XCircle className="w-4 h-4 text-red-400" />
  return null
}

// ===================================================
// COMPONENTE — SendReceiptsModal
// Flusso bulk in 3 fasi:
//   CONFIRM → mostra lista lead + selettore IVA + bottone avvia
//   RUNNING → progress lead per lead
//   DONE    → riepilogo ok/errori
//
// Per ogni lead:
//   1. Genera PDF con jsPDF (client-side) — aliquota IVA dinamica
//   2. Carica PDF su Supabase Storage (bucket: ricevute)
//   3. Chiama Edge Function send-email con URL firmato
//   4. Inserisce record in receipts SOLO dopo conferma email inviata
// ===================================================
export default function SendReceiptsModal({ leads, onClose, onDone }) {
  const { user }     = useAuth()
  const aziendaId    = useAziendaId()
  const { addToast } = useToast()
  const { profile, isConfigured, loading: profileLoading, refresh } = useProfile()
  const { canSendEmail } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)

  const [phase, setPhase]         = useState('confirm')
  const [aliquotaIva, setAliquotaIva] = useState(22)   // ← IVA selezionabile
  const [items, setItems]         = useState(
    leads.map(l => ({ ...l, _status: STATUS.PENDING, _error: null }))
  )
  const [summary, setSummary]     = useState({ ok: 0, errors: 0 })
  const [previewing, setPreviewing] = useState(false)
  const [logoStatus, setLogoStatus] = useState('none') // none | loading | ok | fail

  const validation = useMemo(
    () => validateReceiptSend(profile, leads),
    [profile, leads],
  )
  const highPriceLeads = useMemo(() => leadsWithHighPrice(leads), [leads])

  useEffect(() => {
    if (profile?.regime_fiscale === 'forfettario' || profile?.regime_fiscale === 'esente') {
      setAliquotaIva(0)
    } else if (profile?.default_aliquota_iva != null) {
      setAliquotaIva(Number(profile.default_aliquota_iva))
    }
  }, [profile?.regime_fiscale, profile?.default_aliquota_iva])

  useEffect(() => {
    const url = profile?.logo_url?.trim()
    if (!url) {
      setLogoStatus('none')
      return
    }
    let cancelled = false
    setLogoStatus('loading')
    loadLogoForPdf(url, profile.logo_shape || 'square').then(result => {
      if (!cancelled) setLogoStatus(result ? 'ok' : 'fail')
    })
    return () => { cancelled = true }
  }, [profile?.logo_url, profile?.logo_shape])

  const setItemStatus = useCallback((id, status, error = null) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, _status: status, _error: error } : item
    ))
  }, [])

  // ===================================================
  // ELABORAZIONE SINGOLO LEAD
  // ===================================================
  async function processLead(lead, company) {
    setItemStatus(lead.id, STATUS.PROCESSING)

    try {
      // STEP 1 — Genera PDF con aliquota IVA selezionata dall'utente
      const { pdfBytes, filename, meta } = await generateReceiptPDF(lead, aliquotaIva, {
        company,
        documentStato: 'INVIATO',
      })

      // STEP 2 — Upload PDF su Supabase Storage
      const storagePath = `${aziendaId}/${lead.id}/${filename}`
      const { error: uploadError } = await supabase.storage
        .from('ricevute')
        .upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })

      if (uploadError) throw new Error(`Upload PDF fallito: ${uploadError.message}`)

      // STEP 3 — URL firmato (valido 7 giorni) per il link nell'email
      const { data: signedData, error: signedError } = await supabase.storage
        .from('ricevute')
        .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

      if (signedError) throw new Error(`URL firmato fallito: ${signedError.message}`)

      // STEP 4 — Email obbligatoria per tracciare la ricevuta
      if (!lead.email) {
        throw new Error(`Nessuna email per ${lead.nome}: ricevuta non registrata.`)
      }

      const { error: fnError } = await invokeEdgeFunction('send-email', {
          leadId:      lead.id,
          to:          lead.email,
          nome:        lead.nome,
          servizio:    lead.servizio,
          totale:      meta.totale,
          imponibile:  meta.imponibile,
          iva:         meta.iva,
          aliquotaIva: meta.aliquotaIva,
          receiptUrl:  signedData.signedUrl,
          numRicevuta: meta.numRicevuta,
          company,
          pdfBase64:   bytesToBase64(pdfBytes),
          pdfFilename: filename,
      })

      if (fnError) throw new Error(fnError)

      // STEP 5 — INSERT in receipts SOLO dopo conferma Edge Function
      // meta.imponibile/iva/totale sono calcolati dinamicamente da pdfGenerator
      const { error: receiptError } = await supabase.from('receipts').insert({
        azienda_id:    aziendaId,
        lead_id:       lead.id,
        storage_path:  storagePath,
        imponibile:    meta.imponibile,
        iva:           meta.iva,
        totale:        meta.totale,
        email_inviata: true,
        payment_status: 'non_pagata',
        due_date:       defaultDueDate(30),
      })

      if (receiptError) throw new Error(`Salvataggio ricevuta fallito: ${receiptError.message}`)

      setItemStatus(lead.id, STATUS.DONE)
      return { ok: true }

    } catch (err) {
      setItemStatus(lead.id, STATUS.ERROR, err.message)
      return { ok: false, error: err.message }
    }
  }

  // ===================================================
  // AVVIA ELABORAZIONE BULK (sequenziale)
  // ===================================================
  async function handleStart() {
    if (!canSendEmail) {
      setUpgradeOpen(true)
      return
    }

    const fresh = (await refresh()) ?? profile
    const check = validateReceiptSend(fresh, leads)
    if (!check.ok) {
      addToast({
        message: 'Completa i dati mancanti prima di inviare le ricevute',
        variant: 'error',
      })
      return
    }

    setPhase('running')
    let ok = 0, errors = 0

    const company = fresh ?? profile

    for (const lead of leads) {
      const result = await processLead(lead, company)
      if (result.ok) ok++
      else errors++
    }

    setSummary({ ok, errors })
    setPhase('done')

    if (ok > 0) addToast({
      message: `${ok} ricevut${ok === 1 ? 'a inviata' : 'e inviate'} con successo`,
      variant: 'success',
    })
    if (errors > 0) addToast({
      message: `${errors} invio/i falliti — controlla i dettagli`,
      variant: 'error',
    })

    if (onDone) onDone()
  }

  async function handlePreview() {
    if (!leads.length) return
    setPreviewing(true)
    try {
      const fresh = (await refresh()) ?? profile
      const { pdfBytes, meta } = await generateReceiptPDF(leads[0], aliquotaIva, {
        company: fresh,
        documentStato: 'BOZZA',
      })
      openPdfBytes(pdfBytes)
      if (fresh?.logo_url?.trim() && !meta.logoIncluso) {
        addToast({
          message: 'Anteprima generata, ma il logo non è incluso. Ricarica il logo in Impostazioni.',
          variant: 'info',
        })
      }
    } catch (err) {
      addToast({ message: err.message || 'Anteprima non disponibile.', variant: 'error' })
    }
    setPreviewing(false)
  }

  const processed   = items.filter(i => i._status === STATUS.DONE || i._status === STATUS.ERROR).length
  const progressPct = leads.length > 0 ? Math.round((processed / leads.length) * 100) : 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={phase !== 'running' ? onClose : undefined}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl
                   w-full max-w-lg mx-4 animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-950 border border-cyan-900 rounded-lg flex items-center justify-center">
              <Send className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-slate-100 font-semibold font-display">Invia Ricevute</h2>
              <p className="text-slate-500 text-xs">
                {phase === 'confirm' && `${leads.length} lead selezionati`}
                {phase === 'running' && `Elaborazione ${processed}/${leads.length}…`}
                {phase === 'done'    && 'Elaborazione completata'}
              </p>
            </div>
          </div>
          {phase !== 'running' && (
            <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors p-1" aria-label="Chiudi">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">

          {!validation.ok && phase === 'confirm' && (
            <div className="rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3 space-y-2">
              <p className="text-red-300 text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Dati mancanti — completa prima di inviare
              </p>
              <ul className="text-red-200/90 text-xs space-y-1 list-disc list-inside">
                {validation.missing.map((m, i) => (
                  <li key={`${m.field}-${i}`}>
                    {m.scope === 'lead' && m.leadRef ? `${m.leadRef}: ` : ''}
                    {m.label}
                    {m.scope === 'company' && (
                      <> — <Link to="/impostazioni" className="text-cyan-400 hover:underline" onClick={onClose}>Impostazioni</Link></>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {highPriceLeads.length > 0 && phase === 'confirm' && (
            <HighPriceWarning
              prezzo={Math.max(...highPriceLeads.map(l => parseFloat(l.prezzo)))}
            />
          )}

          {phase === 'confirm' && profile?.logo_url?.trim() && (
            <div className={`rounded-xl border px-4 py-3 flex items-start gap-2 text-xs ${
              logoStatus === 'ok'
                ? 'border-emerald-900/50 bg-emerald-950/30 text-emerald-300'
                : logoStatus === 'fail'
                  ? 'border-amber-900/50 bg-amber-950/30 text-amber-300'
                  : 'border-slate-700 bg-slate-800/40 text-slate-400'
            }`}>
              <ImageIcon className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                {logoStatus === 'loading' && <p>Verifica logo in corso…</p>}
                {logoStatus === 'ok' && <p>Logo incluso nel PDF ✓</p>}
                {logoStatus === 'fail' && (
                  <p>
                    Logo configurato ma non caricabile nel PDF.{' '}
                    <Link to="/impostazioni" className="text-cyan-400 hover:underline" onClick={onClose}>
                      Ricarica in Impostazioni
                    </Link>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Selettore aliquota IVA — solo in fase confirm */}
          {phase === 'confirm' && (
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
                Aliquota IVA
              </label>
              <select
                value={aliquotaIva}
                onChange={e => setAliquotaIva(Number(e.target.value))}
                className="input-base"
              >
                {IVA_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-slate-900 text-slate-200">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Avviso regime forfettario */}
          {profile?.regime_fiscale === 'forfettario' && phase === 'confirm' && (
            <p className="text-slate-500 text-xs">
              Regime forfettario: IVA impostata a 0% con dicitura legale automatica nel PDF.
            </p>
          )}

          {/* Progress bar */}
          {phase === 'running' && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-500">
                <span>Progresso</span>
                <span>{progressPct}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-1.5">
                <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-500"
                     style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Lista lead con status */}
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl">
                <StatusIcon status={item._status} />
                <div className="flex-1 min-w-0">
                  <p className="text-slate-200 text-sm font-medium truncate">{item.nome}</p>
                  <p className="text-slate-500 text-xs truncate">
                    {item.email || 'Nessuna email'} · {item.servizio}
                  </p>
                  {item._error && (
                    <p className="text-red-400 text-xs mt-0.5 truncate">{item._error}</p>
                  )}
                </div>
                <div className="shrink-0">
                  <FileText className={`w-4 h-4 ${
                    item._status === STATUS.DONE  ? 'text-emerald-400' :
                    item._status === STATUS.ERROR ? 'text-red-400' :
                    'text-slate-600'
                  }`} />
                </div>
              </div>
            ))}
          </div>

          {/* Riepilogo finale */}
          {phase === 'done' && (
            <div className="flex items-center gap-4 p-4 bg-slate-800/50 rounded-xl">
              {summary.ok > 0 && (
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 font-medium text-sm">{summary.ok} completati</span>
                </div>
              )}
              {summary.errors > 0 && (
                <div className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 font-medium text-sm">{summary.errors} errori</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer azioni */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
          {phase === 'confirm' && (
            <>
              <button onClick={onClose} className="btn-secondary min-h-[44px]">Annulla</button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={profileLoading || previewing || !validation.ok}
                className="btn-secondary min-h-[44px] disabled:opacity-50"
              >
                <Eye className="w-4 h-4" />
                {previewing ? 'Generazione…' : 'Anteprima PDF'}
              </button>
              <button
                onClick={handleStart}
                disabled={profileLoading || !validation.ok}
                className="btn-primary min-h-[44px] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {profileLoading ? 'Caricamento profilo…' : validation.ok ? 'Avvia invio' : 'Dati incompleti'}
              </button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={onClose} className="btn-primary min-h-[44px]">Chiudi</button>
          )}
          {phase === 'running' && (
            <div className="text-slate-500 text-sm flex items-center gap-2 min-h-[44px]">
              <Loader className="w-4 h-4 animate-spin" />
              Non chiudere questa finestra…
            </div>
          )}
        </div>
      </div>

      <UpgradeModal
        isOpen={upgradeOpen}
        reason="emails"
        onClose={() => setUpgradeOpen(false)}
      />
    </div>
  )
}
