import { useState } from 'react'
import { X, FileSpreadsheet, Upload, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import { useToast } from '../UI/Toast'
import { parseExcelFile } from './excelParser'
import DropZone from './DropZone'
import Spinner from '../UI/Spinner'
import { usePlan } from '../../hooks/usePlan'
import UpgradeModal from '../UI/UpgradeModal'

// Stati interni del flusso di import
const STEP = {
  UPLOAD:    'upload',    // selezione file
  PREVIEW:   'preview',  // anteprima dati parsati
  IMPORTING: 'importing',// inserimento in corso
  DONE:      'done',     // completato
}

// ===================================================
// COMPONENTE — ImportModal
// Modale multi-step per importazione lead da Excel/CSV.
//
// Step 1 — UPLOAD:    DropZone per selezionare il file
// Step 2 — PREVIEW:   mostra anteprima delle righe parsate,
//                     warnings colonne non mappate,
//                     bottone conferma import
// Step 3 — IMPORTING: progress bar + contatore
// Step 4 — DONE:      riepilogo successo/errori
//
// Props:
//   isOpen     {boolean}  — visibilità modale
//   onClose    {fn}       — chiude la modale
//   onImported {fn}       — callback dopo import avvenuto
// ===================================================
export default function ImportModal({ isOpen, onClose, onImported }) {
  const { user }       = useAuth()
  const aziendaId      = useAziendaId()
  const { addToast }   = useToast()

  const [step, setStep]           = useState(STEP.UPLOAD)
  const [records, setRecords]     = useState([])
  const [warnings, setWarnings]   = useState([])
  const [mappedColumns, setMappedColumns] = useState(null)
  const { canAddLead, usage, limits, isFree } = usePlan()
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [parseError, setParseError] = useState(null)
  const [progress, setProgress]   = useState(0)     // 0–100 durante import
  const [importResult, setImportResult] = useState({ ok: 0, errors: 0 })

  // Reset completo della modale
  function resetModal() {
    setStep(STEP.UPLOAD)
    setRecords([])
    setWarnings([])
    setMappedColumns(null)
    setParseError(null)
    setProgress(0)
    setImportResult({ ok: 0, errors: 0 })
  }

  function handleClose() {
    if (step === STEP.IMPORTING) return // blocca chiusura durante import
    resetModal()
    onClose()
  }

  // ===== STEP 1 → 2: parsing file =====
  async function handleFileSelected(file) {
    setParseError(null)
    try {
      const { records: parsed, warnings: warns, mappedColumns: mapped } = await parseExcelFile(file)
      setRecords(parsed)
      setWarnings(warns)
      setMappedColumns(mapped)
      setStep(STEP.PREVIEW)
    } catch (err) {
      setParseError(err.message)
    }
  }

  // ===== STEP 2 → 3 → 4: inserimento Supabase =====
  async function handleConfirmImport() {
    if (isFree && usage.leads + records.length > limits.FREE_LEAD_LIMIT) {
      setUpgradeOpen(true)
      return
    }
    if (!canAddLead) {
      setUpgradeOpen(true)
      return
    }
    setStep(STEP.IMPORTING)
    setProgress(0)

    const BATCH_SIZE = 50 // inserisce 50 righe per volta
    let okCount    = 0
    let errorCount = 0

    // Aggiunge azienda_id e stato default a ogni record
    const enriched = records.map(r => ({
      ...r,
      azienda_id: aziendaId,
      stato: 'nuovo',
    }))

    const batches = []
    for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
      batches.push(enriched.slice(i, i + BATCH_SIZE))
    }

    for (let i = 0; i < batches.length; i++) {
      const { error } = await supabase
        .from('leads')
        .insert(batches[i])

      if (error) {
        console.error(`Errore batch ${i + 1}:`, error.message)
        errorCount += batches[i].length
      } else {
        okCount += batches[i].length
      }

      // Aggiorna progress bar
      setProgress(Math.round(((i + 1) / batches.length) * 100))
    }

    setImportResult({ ok: okCount, errors: errorCount })
    setStep(STEP.DONE)

    if (okCount > 0) {
      addToast({
        message: `${okCount} lead importati con successo`,
        variant: 'success',
      })
      onImported() // aggiorna tabella + stats nel Dashboard
    }
  }

  if (!isOpen) return null

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={step !== STEP.IMPORTING ? handleClose : undefined}
      role="dialog"
      aria-modal="true"
      aria-label="Importa leads da Excel"
    >
      {/* Pannello modale */}
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl
                   w-full max-w-2xl mx-4 animate-slide-up overflow-hidden mb-0 sm:mb-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-cyan-950 border border-cyan-900 rounded-lg flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-slate-100 font-semibold font-display">
                Importa da Excel
              </h2>
              <p className="text-slate-500 text-xs">
                {step === STEP.UPLOAD    && 'Seleziona o trascina il tuo file'}
                {step === STEP.PREVIEW   && `${records.length} righe pronte — conferma per importare`}
                {step === STEP.IMPORTING && 'Importazione in corso…'}
                {step === STEP.DONE      && 'Importazione completata'}
              </p>
            </div>
          </div>
          {step !== STEP.IMPORTING && (
            <button
              onClick={handleClose}
              className="text-slate-500 hover:text-slate-300 transition-colors p-1"
              aria-label="Chiudi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Corpo modale — contenuto per step */}
        <div className="px-6 py-5">

          {/* ===== STEP 1: UPLOAD ===== */}
          {step === STEP.UPLOAD && (
            <div className="space-y-4">
              <DropZone onFile={handleFileSelected} disabled={false} />

              {parseError && (
                <div className="flex items-start gap-3 bg-red-950 border border-red-900 rounded-xl px-4 py-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{parseError}</p>
                </div>
              )}

              {/* Guida colonne riconosciute */}
              <div className="bg-slate-800/50 rounded-xl p-4">
                <p className="text-slate-400 text-xs font-medium mb-2 uppercase tracking-wider">
                  Colonne riconosciute automaticamente
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    ['Nome / Nominativo / Cliente', 'obbligatorio'],
                    ['Servizio / Prestazione / Prodotto', 'obbligatorio'],
                    ['Email / Mail', 'opzionale'],
                    ['Telefono / Cell', 'opzionale'],
                    ['Prezzo / Importo / Totale', 'opzionale'],
                  ].map(([label, type]) => (
                    <span
                      key={label}
                      className={`text-xs px-2 py-1 rounded-md font-mono ${
                        type === 'obbligatorio'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-900'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== STEP 2: PREVIEW ===== */}
          {step === STEP.PREVIEW && (
            <div className="space-y-4">

              <p className="text-slate-300 text-sm font-medium">
                Trovati {records.length} contatti
              </p>

              {mappedColumns && (
                <div className="flex flex-wrap gap-3 text-sm">
                  {[
                    ['nome', 'Nome'],
                    ['email', 'Email'],
                    ['telefono', 'Telefono'],
                    ['servizio', 'Servizio'],
                    ['prezzo', 'Prezzo'],
                  ].map(([key, label]) => (
                    <span
                      key={key}
                      className={mappedColumns[key] ? 'text-emerald-400' : 'text-red-400/90'}
                    >
                      {mappedColumns[key] ? '✓' : '✗'} {label}
                    </span>
                  ))}
                </div>
              )}

              {/* Warnings (righe saltate, campi mancanti) */}
              {warnings.length > 0 && (
                <div className="bg-yellow-950/50 border border-yellow-900/50 rounded-xl px-4 py-3 space-y-1">
                  <p className="text-yellow-400 text-xs font-semibold uppercase tracking-wider mb-1.5">
                    Avvisi ({warnings.length})
                  </p>
                  {warnings.map((w, i) => (
                    <p key={i} className="text-yellow-300/80 text-xs">{w}</p>
                  ))}
                </div>
              )}

              {/* Tabella anteprima — prime 10 righe */}
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-950/50 border-b border-slate-800">
                      {['Nome', 'Email', 'Telefono', 'Servizio', 'Prezzo'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.slice(0, 10).map((r, i) => (
                      <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-3 py-2 text-slate-200 font-medium whitespace-nowrap">{r.nome || '—'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{r.email || '—'}</td>
                        <td className="px-3 py-2 text-slate-400 whitespace-nowrap">{r.telefono || '—'}</td>
                        <td className="px-3 py-2 text-slate-300 whitespace-nowrap">{r.servizio || '—'}</td>
                        <td className="px-3 py-2 text-emerald-400 font-mono whitespace-nowrap">
                          {r.prezzo != null
                            ? new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(r.prezzo)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {records.length > 10 && (
                  <p className="text-slate-600 text-xs text-center py-2">
                    … e altre {records.length - 10} righe non mostrate
                  </p>
                )}
              </div>
            </div>
          )}

          {/* ===== STEP 3: IMPORTING ===== */}
          {step === STEP.IMPORTING && (
            <div className="flex flex-col items-center gap-6 py-6">
              <Spinner size="lg" />
              <div className="w-full space-y-2">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Importazione in corso…</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-2">
                  <div
                    className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-slate-500 text-xs text-center">
                  Non chiudere questa finestra
                </p>
              </div>
            </div>
          )}

          {/* ===== STEP 4: DONE ===== */}
          {step === STEP.DONE && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className={`w-14 h-14 rounded-2xl border flex items-center justify-center ${
                importResult.errors === 0
                  ? 'bg-emerald-950 border-emerald-900'
                  : 'bg-yellow-950 border-yellow-900'
              }`}>
                <CheckCircle className={`w-7 h-7 ${
                  importResult.errors === 0 ? 'text-emerald-400' : 'text-yellow-400'
                }`} />
              </div>
              <div>
                <p className="text-slate-100 font-semibold font-display text-lg mb-1">
                  Importazione completata
                </p>
                <p className="text-slate-400 text-sm">
                  {importResult.ok > 0 && (
                    <span className="text-emerald-400 font-medium">{importResult.ok} lead importati</span>
                  )}
                  {importResult.errors > 0 && (
                    <span className="text-red-400 font-medium ml-2">{importResult.errors} errori</span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer azioni */}
        {step !== STEP.IMPORTING && (
          <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3">
            {step === STEP.UPLOAD && (
              <button onClick={handleClose} className="btn-secondary min-h-[44px]">
                Annulla
              </button>
            )}

            {step === STEP.PREVIEW && (
              <>
                <button onClick={resetModal} className="btn-secondary min-h-[44px]">
                  Cambia file
                </button>
                <button onClick={handleConfirmImport} className="btn-primary min-h-[44px]">
                  <Upload className="w-4 h-4" />
                  Conferma e importa ({records.length})
                </button>
              </>
            )}

            {step === STEP.DONE && (
              <button onClick={handleClose} className="btn-primary min-h-[44px]">
                Chiudi
              </button>
            )}
          </div>
        )}
      </div>

      <UpgradeModal isOpen={upgradeOpen} reason="leads" onClose={() => setUpgradeOpen(false)} />
    </div>
  )
}
