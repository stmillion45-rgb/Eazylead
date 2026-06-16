import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Plus, RefreshCw, Download, Send, ArrowRight,
} from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useToast } from '../UI/Toast'
import { useProfile } from '../../hooks/useProfile'
import { generateQuotePDF } from '../PDF/pdfGenerator'
import { downloadPdfBytes } from '../../utils/downloadPdf'
import { bytesToBase64 } from '../../utils/base64'
import { invokeEdgeFunction } from '../../utils/invokeFunction'
import Spinner from '../UI/Spinner'
import { useAziendaId } from '../../hooks/useWorkspace'

const IVA_OPTIONS = [22, 10, 5, 4, 0]

const STATO_BADGE = {
  bozza:     'bg-slate-700/80 text-slate-300 border-slate-600',
  inviato:   'bg-blue-900/60 text-blue-300 border-blue-800',
  accettato: 'bg-emerald-900/60 text-emerald-300 border-emerald-800',
  rifiutato: 'bg-red-900/60 text-red-300 border-red-800',
}

function formatEur(v) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(v || 0)
}

function formatDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function quoteNumber() {
  const y = new Date().getFullYear()
  return `PREV-${y}-${String(Date.now()).slice(-5)}`
}

function NewQuoteModal({ isOpen, onClose, leads, onCreated }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { addToast } = useToast()
  const { profile } = useProfile()
  const [leadId, setLeadId] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [importo, setImporto] = useState('')
  const [iva, setIva] = useState(22)
  const [validUntil, setValidUntil] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isOpen) return
    const d = new Date()
    d.setDate(d.getDate() + 30)
    setValidUntil(d.toISOString().slice(0, 10))
    if (profile?.regime_fiscale === 'forfettario' || profile?.regime_fiscale === 'esente') {
      setIva(0)
    } else if (profile?.default_aliquota_iva != null) {
      setIva(Number(profile.default_aliquota_iva))
    }
  }, [isOpen, profile?.regime_fiscale, profile?.default_aliquota_iva])

  if (!isOpen) return null

  async function handleSubmit(e) {
    e.preventDefault()
    if (!descrizione.trim() || !importo) {
      addToast({ message: 'Descrizione e importo obbligatori', variant: 'error' })
      return
    }
    setSaving(true)
    const numero = quoteNumber()
    const { data, error } = await supabase.from('quotes').insert({
      azienda_id: aziendaId,
      lead_id: leadId || null,
      numero,
      descrizione: descrizione.trim(),
      importo: parseFloat(importo),
      iva_percentuale: iva,
      valid_until: validUntil ? new Date(validUntil).toISOString() : null,
      stato: 'bozza',
    }).select('*, leads(nome, email, servizio, telefono)').single()

    if (error) {
      addToast({
        message: error.message.includes('quotes')
          ? 'Tabella preventivi mancante: esegui la migration'
          : error.message,
        variant: 'error',
      })
    } else {
      addToast({ message: `Preventivo ${numero} creato`, variant: 'success' })
      onCreated(data)
      onClose()
    }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md mx-4 p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <h2 className="text-slate-100 font-display font-semibold text-lg">Nuovo preventivo</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase">Cliente (lead)</label>
            <select value={leadId} onChange={e => setLeadId(e.target.value)} className="input-base">
              <option value="">— Manuale / senza lead —</option>
              {leads.map(l => (
                <option key={l.id} value={l.id} className="bg-slate-900">{l.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase">Descrizione *</label>
            <textarea value={descrizione} onChange={e => setDescrizione(e.target.value)} className="input-base resize-none" rows={2} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase">Importo (€) *</label>
              <input type="number" min="0" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} className="input-base" required />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 uppercase">IVA %</label>
              <select value={iva} onChange={e => setIva(Number(e.target.value))} className="input-base">
                {IVA_OPTIONS.map(v => <option key={v} value={v} className="bg-slate-900">{v}%</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1.5 uppercase">Valido fino al</label>
            <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input-base" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Annulla</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center disabled:opacity-50">
              {saving ? 'Salvataggio…' : 'Crea preventivo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PreventiviView() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const { addToast } = useToast()
  const { profile, refresh } = useProfile()
  const [quotes, setQuotes] = useState([])
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const fetchAll = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [qRes, lRes] = await Promise.all([
      supabase.from('quotes').select('*, leads(nome, email, servizio, telefono, prezzo)').eq('azienda_id', aziendaId).order('created_at', { ascending: false }),
      supabase.from('leads').select('id, nome, email, servizio, telefono, prezzo').eq('azienda_id', aziendaId).order('nome'),
    ])
    if (qRes.error) addToast({ message: qRes.error.message, variant: 'error' })
    else setQuotes(qRes.data || [])
    if (!lRes.error) setLeads(lRes.data || [])
    setLoading(false)
  }, [user, addToast])

  useEffect(() => { fetchAll() }, [fetchAll])

  async function buildQuotePdf(quote) {
    const lead = quote.leads || {
      nome: 'Cliente',
      email: null,
      servizio: quote.descrizione,
      telefono: null,
      prezzo: quote.importo,
    }
    const company = (await refresh()) ?? profile
    return generateQuotePDF(
      { ...lead, servizio: quote.descrizione || lead.servizio, prezzo: quote.importo },
      Number(quote.iva_percentuale) || 22,
      {
        company,
        documentNumber: quote.numero,
        documentStato: quote.stato.toUpperCase(),
        validUntil: quote.valid_until,
      },
    )
  }

  async function handleDownload(quote) {
    setBusyId(quote.id)
    try {
      const { pdfBytes, filename } = await buildQuotePdf(quote)
      downloadPdfBytes(pdfBytes, filename)
    } catch (err) {
      addToast({ message: err.message, variant: 'error' })
    }
    setBusyId(null)
  }

  async function handleSendEmail(quote) {
    const lead = quote.leads
    if (!lead?.email) {
      addToast({ message: 'Associa un lead con email per inviare il preventivo', variant: 'error' })
      return
    }
    setBusyId(quote.id)
    try {
      const company = (await refresh()) ?? profile
      const { pdfBytes, filename, meta } = await buildQuotePdf(quote)
      const storagePath = `${aziendaId}/quotes/${quote.id}/${filename}`
      const { error: upErr } = await supabase.storage.from('ricevute').upload(storagePath, pdfBytes, { contentType: 'application/pdf', upsert: true })
      if (upErr) throw new Error(upErr.message)

      const { data: signed, error: signErr } = await supabase.storage.from('ricevute').createSignedUrl(storagePath, 60 * 60 * 24 * 7)
      if (signErr) throw new Error(signErr.message)

      const { error: fnErr } = await invokeEdgeFunction('send-email', {
        leadId: lead.id,
        quoteId: quote.id,
        to: lead.email,
        nome: lead.nome,
        servizio: quote.descrizione,
        totale: meta.totale,
        imponibile: meta.imponibile,
        iva: meta.iva,
        aliquotaIva: meta.aliquotaIva,
        receiptUrl: signed.signedUrl,
        numRicevuta: quote.numero,
        company,
        pdfBase64: bytesToBase64(pdfBytes),
        pdfFilename: filename,
        docType: 'quote',
      })
      if (fnErr) throw new Error(fnErr)

      await supabase.from('quotes').update({ stato: 'inviato' }).eq('id', quote.id).eq('azienda_id', aziendaId)
      addToast({ message: `Preventivo inviato a ${lead.email}`, variant: 'success' })
      fetchAll()
    } catch (err) {
      addToast({ message: err.message, variant: 'error' })
    }
    setBusyId(null)
  }

  async function handleStato(quote, stato) {
    const { error } = await supabase.from('quotes').update({ stato }).eq('id', quote.id).eq('azienda_id', aziendaId)
    if (error) addToast({ message: error.message, variant: 'error' })
    else {
      addToast({ message: 'Stato aggiornato', variant: 'success' })
      fetchAll()
    }
  }

  return (
    <div className="px-4 sm:px-6 py-6">
      <div className="flex items-center justify-between gap-3 mb-6" data-tour="preventivi-header">
        <p className="text-slate-500 text-sm">Preventivi PDF — invio via email (Resend)</p>
        <div className="flex items-center gap-2">
          <button onClick={fetchAll} disabled={loading} className="p-2 text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-800">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowNew(true)} className="btn-primary text-xs min-h-[36px]">
            <Plus className="w-4 h-4" /> Nuovo
          </button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-20"><Spinner size="md" /></div>}

      {!loading && quotes.length === 0 && (
        <div className="card flex flex-col items-center py-20 text-center">
          <FileText className="w-10 h-10 text-slate-600 mb-3" />
          <p className="text-slate-300 font-medium">Nessun preventivo</p>
          <p className="text-slate-600 text-sm mt-1">Crea il primo preventivo e invialo via email al cliente.</p>
        </div>
      )}

      {!loading && quotes.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/50">
                {['Numero', 'Cliente', 'Importo', 'Stato', 'Validità', 'Azioni'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => (
                <tr key={q.id} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                  <td className="px-4 py-3 font-mono text-sm text-cyan-400">{q.numero}</td>
                  <td className="px-4 py-3 text-sm text-slate-200">{q.leads?.nome ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-mono text-emerald-400">{formatEur(q.importo)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={q.stato}
                      onChange={e => handleStato(q, e.target.value)}
                      className={`text-xs border rounded-md px-2 py-0.5 ${STATO_BADGE[q.stato]}`}
                    >
                      {Object.keys(STATO_BADGE).map(s => (
                        <option key={s} value={s} className="bg-slate-900 capitalize">{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 font-mono">{formatDate(q.valid_until)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => handleDownload(q)} disabled={busyId === q.id} className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 disabled:opacity-40">
                        {busyId === q.id ? <Spinner size="sm" /> : <Download className="w-3.5 h-3.5" />} PDF
                      </button>
                      <button onClick={() => handleSendEmail(q)} disabled={busyId === q.id} className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 disabled:opacity-40">
                        <Send className="w-3.5 h-3.5" /> Email
                      </button>
                      {q.stato === 'accettato' && q.leads && (
                        <button
                          onClick={() => {
                            sessionStorage.setItem('leados_send_receipt', JSON.stringify({
                              ...q.leads,
                              servizio: q.descrizione,
                              prezzo: q.importo,
                            }))
                            navigate('/lead')
                          }}
                          className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                        >
                          <ArrowRight className="w-3.5 h-3.5" /> Ricevuta
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <NewQuoteModal isOpen={showNew} onClose={() => setShowNew(false)} leads={leads} onCreated={() => fetchAll()} />
    </div>
  )
}
