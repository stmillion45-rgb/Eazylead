import { useEffect, useState, useCallback } from 'react'
import { FileText, Download, RefreshCw, Send, Receipt } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth }  from '../../App'
import { useToast } from '../UI/Toast'
import { generateReceiptPDF } from '../PDF/pdfGenerator'
import { useProfile } from '../../hooks/useProfile'
import { bytesToBase64 } from '../../utils/base64'
import { downloadPdfBytes } from '../../utils/downloadPdf'
import { invokeEdgeFunction } from '../../utils/invokeFunction'
import Spinner from '../UI/Spinner'
import PaymentStatusPopover from './PaymentStatusPopover'
import PaymentReminderActions from './PaymentReminderActions'
import { resolvePaymentStatus } from '../../utils/receiptPayment'
import { downloadReceiptsCsv } from '../../utils/exportReceiptsCsv'
import { useAziendaId } from '../../hooks/useWorkspace'

function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function formatEur(val) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val || 0)
}

// ─────────────────────────────────────────────
// RICEVUTE VIEW
// Mostra SOLO le ricevute con email_inviata = true
// (inserite in DB solo dopo conferma Edge Function).
// ─────────────────────────────────────────────
export default function RicevuteView() {
  const { user }     = useAuth()
  const aziendaId    = useAziendaId()
  const { addToast } = useToast()
  const { profile, refresh } = useProfile()
  const companyName = profile?.nome_azienda?.trim() || 'LeadOS'

  const [ricevute, setRicevute]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [downloading, setDownloading] = useState(null)  // id in download
  const [resending, setResending]     = useState(null)   // id in reinvio

  const fetchRicevute = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const fullSelect = `
        id,
        storage_path,
        imponibile,
        iva,
        totale,
        created_at,
        payment_status,
        payment_date,
        due_date,
        leads ( id, nome, email, servizio, telefono )
      `

    const baseSelect = `
        id,
        storage_path,
        imponibile,
        iva,
        totale,
        created_at,
        leads ( id, nome, email, servizio, telefono )
      `

    let { data, error } = await supabase
      .from('receipts')
      .select(fullSelect)
      .eq('azienda_id', aziendaId)
      .eq('email_inviata', true)
      .order('created_at', { ascending: false })

    const missingCol = error && /column|payment_status|due_date|email_inviata/i.test(error.message)
    if (missingCol) {
      const fallback = await supabase
        .from('receipts')
        .select(baseSelect)
        .eq('azienda_id', aziendaId)
        .order('created_at', { ascending: false })
      data = fallback.data
      error = fallback.error
      if (!error && data) {
        data = data.map(r => ({
          ...r,
          payment_status: r.payment_status ?? 'non_pagata',
          payment_date: null,
          due_date: null,
        }))
      }
    }

    if (error) addToast({ message: `Errore caricamento: ${error.message}`, variant: 'error' })
    else setRicevute(data || [])
    setLoading(false)
  }, [user, addToast])

  useEffect(() => { fetchRicevute() }, [fetchRicevute])

  async function handlePaymentUpdate(id, fields) {
    const { error } = await supabase
      .from('receipts')
      .update(fields)
      .eq('id', id)
      .eq('azienda_id', aziendaId)
    if (error) {
      addToast({ message: error.message, variant: 'error' })
    } else {
      addToast({ message: 'Stato pagamento aggiornato', variant: 'success' })
      fetchRicevute()
    }
  }

  function pdfOptionsFor(ricevuta, company) {
    return {
      company,
      documentStato: 'INVIATO',
      paymentStatus: resolvePaymentStatus(ricevuta),
      dueDate: ricevuta.due_date,
    }
  }

  // ── Download PDF (rigenerato con profilo attuale + logo) ──
  async function handleDownload(ricevuta) {
    const lead = ricevuta.leads
    if (!lead) {
      addToast({ message: 'Lead non trovato per questa ricevuta.', variant: 'error' })
      return
    }

    setDownloading(ricevuta.id)
    try {
      const aliquotaIva = ricevuta.imponibile > 0
        ? Math.round((ricevuta.iva / ricevuta.imponibile) * 100)
        : 0

      const company = (await refresh()) ?? profile

      const { pdfBytes, filename, meta } = await generateReceiptPDF(
        {
          nome:     lead.nome,
          email:    lead.email,
          servizio: lead.servizio,
          prezzo:   ricevuta.imponibile,
          stato:    'concluso',
        },
        aliquotaIva,
        pdfOptionsFor(ricevuta, company),
      )

      downloadPdfBytes(pdfBytes, filename)

      if (company?.logo_url?.trim() && !meta.logoIncluso) {
        addToast({
          message: 'PDF scaricato, ma il logo non è stato incluso. Ricarica il logo in Impostazioni.',
          variant: 'info',
        })
      }
    } catch (err) {
      addToast({ message: err.message || 'Download fallito.', variant: 'error' })
    }
    setDownloading(null)
  }

  // ── Reinvia email (rigenera PDF + nuovo URL firmato + chiama Edge Function) ──
  async function handleResend(ricevuta) {
    const lead = ricevuta.leads
    if (!lead?.email) {
      addToast({ message: "Questo lead non ha un'email associata.", variant: 'error' })
      return
    }

    setResending(ricevuta.id)
    try {
      // 1. Ricava l'aliquota IVA dai dati salvati in DB.
      //    Evita il calcolo hardcoded /1.22 — regola tassativa IVA flessibile.
      //    Le aliquote reali italiane (22|10|5|4|0) sono interi, Math.round è sicuro.
      const aliquotaIva = ricevuta.imponibile > 0
        ? Math.round((ricevuta.iva / ricevuta.imponibile) * 100)
        : 0

      // 2. Rigenera PDF usando l'imponibile reale dal DB e l'aliquota corretta.
      //    generateReceiptPDF(lead, aliquotaIva): primo arg = dati lead con prezzo=imponibile,
      //    secondo arg = aliquota numerica (default 22 nella firma, qui passiamo il valore reale).
      const company = (await refresh()) ?? profile

      const { pdfBytes, filename, meta } = await generateReceiptPDF(
        {
          nome:     lead.nome,
          email:    lead.email,
          servizio: lead.servizio,
          prezzo:   ricevuta.imponibile,  // imponibile già salvato in DB, non totale/1.22
          stato:    'concluso',
        },
        aliquotaIva,
        pdfOptionsFor(ricevuta, company),
      )

      // 3. Re-upload del PDF (sovrascrive il file esistente nello stesso path).
      //    NOTA: richiede policy UPDATE attiva sul bucket 'ricevute' in Supabase
      //    (Panel → Storage → ricevute → Policies → aggiungere UPDATE oltre a INSERT).
      const { error: uploadError } = await supabase.storage
        .from('ricevute')
        .upload(ricevuta.storage_path, pdfBytes, {
          contentType: 'application/pdf',
          upsert: true,
        })
      if (uploadError) throw new Error(`Upload fallito: ${uploadError.message}`)

      // 4. Nuovo URL firmato (7 giorni)
      const { data: signedData, error: signedError } = await supabase.storage
        .from('ricevute')
        .createSignedUrl(ricevuta.storage_path, 60 * 60 * 24 * 7)
      if (signedError) throw new Error(`URL firmato fallito: ${signedError.message}`)

      // 5. Chiama Edge Function per il reinvio email
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

      // 6. Aggiorna il record in DB registrando il timestamp del reinvio riuscito.
      //    azienda_id: user.id è OBBLIGATORIO: senza questo campo la policy RLS
      //    della tabella receipts blocca l'UPDATE perché non riesce a verificare
      //    che la riga appartenga all'utente autenticato.
      const { error: updateError } = await supabase
        .from('receipts')
        .update({ created_at: new Date().toISOString() })
        .eq('id', ricevuta.id)
        .eq('azienda_id', aziendaId)         // RLS: il proprietario è l'unico autorizzato
      if (updateError) throw new Error(`Aggiornamento DB fallito: ${updateError.message}`)

      addToast({ message: `Email reinviata a ${lead.email}`, variant: 'success' })
      fetchRicevute()   // ricarica la lista per aggiornare il timestamp in tabella
    } catch (err) {
      addToast({ message: err.message, variant: 'error' })
    }
    setResending(null)
  }

  // ── Vista unificata (header sempre presente per il tour guidato) ──
  const isEmpty = !loading && ricevute.length === 0

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between mb-6" data-tour="ricevute-header">
        <p className="text-slate-500 text-sm">
          {loading
            ? 'Caricamento…'
            : isEmpty
              ? 'Storico delle ricevute inviate con successo'
              : `${ricevute.length} ricevut${ricevute.length === 1 ? 'a' : 'e'} inviate con successo`}
        </p>
        <div className="flex items-center gap-2">
          {!loading && ricevute.length > 0 && (
            <button
              type="button"
              onClick={() => {
                downloadReceiptsCsv(ricevute, `ricevute_${new Date().toISOString().slice(0, 10)}.csv`)
                addToast({ message: 'CSV esportato', variant: 'success' })
              }}
              className="btn-secondary text-xs min-h-[36px] gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Esporta CSV
            </button>
          )}
          <button
          onClick={fetchRicevute}
          disabled={loading}
          className="text-slate-500 hover:text-slate-300 transition-colors p-2 rounded-lg
                     hover:bg-slate-800 disabled:opacity-40"
          title="Aggiorna"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size="md" /></div>}

      {isEmpty && (
        <div className="card flex flex-col items-center justify-center py-24 text-center px-4">
          <div className="w-16 h-16 bg-slate-800/80 border border-slate-700 rounded-2xl
                          flex items-center justify-center mb-5">
            <Receipt className="w-8 h-8 text-slate-600" />
          </div>
          <p className="text-slate-200 font-semibold font-display text-lg mb-2">
            Nessuna ricevuta ancora
          </p>
          <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
            Le ricevute appaiono qui dopo che l&apos;email è stata inviata con successo dalla sezione Lead.
          </p>
          <div className="mt-6 flex items-center gap-2 text-slate-600 text-xs">
            <FileText className="w-3.5 h-3.5" />
            <span>Solo gli invii confermati dalla Edge Function vengono registrati</span>
          </div>
        </div>
      )}

      {!loading && ricevute.length > 0 && (
        <>
          {/* TABELLA DESKTOP */}
          <div className="card overflow-x-auto hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/50">
                  {['Cliente', 'Data Invio', 'Imponibile', 'IVA', 'Totale', 'Pagamento', 'Sollecito', 'PDF', 'Reinvia'].map(h => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider
                                           ${['Imponibile','IVA','Totale'].includes(h) ? 'text-right' : 'text-left'}
                                           ${['PDF','Reinvia','Sollecito'].includes(h) ? 'text-center w-20' : ''}
                                           ${h === 'Pagamento' ? 'text-center w-28' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ricevute.map((r, i) => (
                  <tr key={r.id}
                    className={`hover:bg-slate-800/30 transition-colors
                                ${i < ricevute.length - 1 ? 'border-b border-slate-800/60' : ''}`}>
                    <td className="px-5 py-4">
                      <p className="text-slate-200 font-medium text-sm">{r.leads?.nome ?? '—'}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{r.leads?.email ?? ''}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-slate-400 text-sm font-mono">{formatData(r.created_at)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-slate-300 text-sm font-mono">{formatEur(r.imponibile)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-slate-500 text-sm font-mono">{formatEur(r.iva)}</span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="text-emerald-400 font-mono font-semibold text-sm">{formatEur(r.totale)}</span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <PaymentStatusPopover ricevuta={r} onUpdate={handlePaymentUpdate} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <PaymentReminderActions ricevuta={r} companyName={companyName} />
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleDownload(r)} disabled={downloading === r.id}
                        className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300
                                   transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                        {downloading === r.id ? <Spinner size="sm" /> : <><Download className="w-3.5 h-3.5" />PDF</>}
                      </button>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button onClick={() => handleResend(r)} disabled={resending === r.id}
                        title="Reinvia email"
                        className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-200
                                   transition-colors font-medium disabled:opacity-40 disabled:cursor-not-allowed">
                        {resending === r.id ? <Spinner size="sm" /> : <><Send className="w-3.5 h-3.5" />Reinvia</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CARD MOBILE */}
          <div className="md:hidden space-y-3">
            {ricevute.map(r => (
              <div key={r.id} className="card p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-slate-200 font-medium text-sm truncate">{r.leads?.nome ?? '—'}</p>
                    <p className="text-slate-500 text-xs mt-0.5 truncate">{r.leads?.email ?? ''}</p>
                  </div>
                  <span className="text-emerald-400 font-mono font-semibold text-sm shrink-0">
                    {formatEur(r.totale)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <PaymentStatusPopover ricevuta={r} onUpdate={handlePaymentUpdate} />
                  <PaymentReminderActions ricevuta={r} companyName={companyName} />
                  <span className="text-xs text-slate-500 font-mono">{formatData(r.created_at)}</span>
                </div>
                <div className="flex items-center gap-3 pt-1 border-t border-slate-800">
                  <button onClick={() => handleDownload(r)} disabled={downloading === r.id}
                    className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors
                               text-xs font-medium disabled:opacity-40">
                    {downloading === r.id ? <Spinner size="sm" /> : <><Download className="w-3.5 h-3.5" />Scarica</>}
                  </button>
                  <button onClick={() => handleResend(r)} disabled={resending === r.id}
                    className="flex items-center gap-1.5 text-slate-500 hover:text-slate-200 transition-colors
                               text-xs font-medium disabled:opacity-40">
                    {resending === r.id ? <Spinner size="sm" /> : <><Send className="w-3.5 h-3.5" />Reinvia</>}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Totale cumulativo */}
          <div className="mt-4 flex items-center justify-between bg-slate-900 border border-slate-800
                          rounded-xl px-5 py-3.5">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <FileText className="w-4 h-4" />
              <span>{ricevute.length} ricevut{ricevute.length === 1 ? 'a' : 'e'} totali</span>
            </div>
            <span className="text-emerald-400 font-mono font-bold text-base">
              {formatEur(ricevute.reduce((s, r) => s + (r.totale || 0), 0))}
            </span>
          </div>
        </>
      )}
    </div>
  )
}
