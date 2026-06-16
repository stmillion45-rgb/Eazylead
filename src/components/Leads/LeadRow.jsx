import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../App'
import { useAziendaId } from '../../hooks/useWorkspace'
import ServizioText from '../UI/ServizioText'

// Mappa stato → classe badge CSS (definite in index.css)
const BADGE_MAP = {
  'nuovo':         'badge-nuovo',
  'contattato':    'badge-contattato',
  'in trattativa': 'badge-trattativa',
  'concluso':      'badge-concluso',
  'perso':         'badge-perso',
}

const STATI_OPTIONS = ['nuovo', 'contattato', 'in trattativa', 'concluso', 'perso']

// Formatta data italiana
function formatData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  })
}

// Formatta prezzo
function formatPrezzo(val) {
  if (!val && val !== 0) return '—'
  return new Intl.NumberFormat('it-IT', {
    style: 'currency', currency: 'EUR'
  }).format(val)
}

// ===================================================
// COMPONENTE — LeadRow
// Riga della tabella leads (desktop) + Card espandibile (mobile)
//
// Props:
//   lead       {object}  — dati del lead
//   selected   {boolean} — checkbox selezionato
//   onSelect   {fn}      — toggle selezione
//   onUpdated  {fn}      — callback dopo aggiornamento stato (rinfresca tabella)
// ===================================================
export default function LeadRow({ lead, selected, onSelect, onUpdated }) {
  const { user } = useAuth()
  const aziendaId = useAziendaId()
  const [expanded, setExpanded] = useState(false) // solo mobile card
  const [updatingStato, setUpdatingStato] = useState(false)

  // Aggiorna stato lead direttamente dalla riga
  async function handleStatoChange(nuovoStato) {
    setUpdatingStato(true)
    const { error } = await supabase
      .from('leads')
      .update({ stato: nuovoStato })
      .eq('id', lead.id)
      .eq('azienda_id', aziendaId) // doppia sicurezza oltre RLS

    if (!error && onUpdated) onUpdated()
    setUpdatingStato(false)
  }

  const badgeClass = BADGE_MAP[lead.stato] || 'badge-nuovo'

  // ===== VISTA DESKTOP (riga tabella) =====
  const desktopRow = (
    <tr className="hidden md:table-row border-b border-slate-800 hover:bg-slate-800/40 transition-colors group">

      {/* Checkbox */}
      <td className="pl-4 pr-2 py-3 w-10">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(lead.id)}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer
                     focus:ring-cyan-500 focus:ring-offset-slate-950"
          aria-label={`Seleziona ${lead.nome}`}
        />
      </td>

      {/* Nome */}
      <td className="px-3 py-3">
        <span className="text-slate-200 font-medium text-sm">{lead.nome}</span>
      </td>

      {/* Email */}
      <td className="px-3 py-3">
        <span className="text-slate-400 text-sm">
          {lead.email ? (
            <a href={`mailto:${lead.email}`} className="hover:text-cyan-400 transition-colors">
              {lead.email}
            </a>
          ) : '—'}
        </span>
      </td>

      {/* Servizio */}
      <td className="px-3 py-3 max-w-[12rem]">
        <ServizioText servizio={lead.servizio} className="text-slate-300 text-sm block truncate" />
      </td>

      {/* Prezzo */}
      <td className="px-3 py-3 text-right">
        <span className="text-emerald-400 font-mono text-sm font-medium">
          {formatPrezzo(lead.prezzo)}
        </span>
      </td>

      {/* Stato — dropdown inline */}
      <td className="px-3 py-3">
        <select
          value={lead.stato}
          onChange={e => handleStatoChange(e.target.value)}
          disabled={updatingStato}
          className={`
            ${badgeClass} cursor-pointer border-0 bg-transparent text-xs font-medium
            focus:outline-none focus:ring-1 focus:ring-cyan-500 rounded-md px-2 py-0.5
            disabled:opacity-50
          `}
          aria-label={`Stato di ${lead.nome}`}
        >
          {STATI_OPTIONS.map(s => (
            <option key={s} value={s} className="bg-slate-900 text-slate-200">
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </td>

      {/* Data */}
      <td className="px-3 py-3 pr-4">
        <span className="text-slate-500 text-xs font-mono">{formatData(lead.created_at)}</span>
      </td>
    </tr>
  )

  // ===== VISTA MOBILE (card espandibile) =====
  const mobileCard = (
    <div className="md:hidden card mb-2 overflow-hidden">
      {/* Header card — sempre visibile */}
      <div
        className="flex items-center gap-3 p-4 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Checkbox — stoppa propagazione per non espandere/collassare */}
        <div onClick={e => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onSelect(lead.id)}
            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-cyan-500 cursor-pointer"
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-slate-200 font-medium text-sm truncate">{lead.nome}</p>
          <p className="text-slate-500 text-xs truncate">{lead.email || '—'}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-emerald-400 font-mono text-sm">{formatPrezzo(lead.prezzo)}</span>
          {expanded
            ? <ChevronUp className="w-4 h-4 text-slate-500" />
            : <ChevronDown className="w-4 h-4 text-slate-500" />
          }
        </div>
      </div>

      {/* Dettagli espansi */}
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-800 space-y-3 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 pt-3">
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Servizio</p>
              <ServizioText servizio={lead.servizio} as="p" className="text-slate-300 text-sm break-words" />
            </div>
            <div>
              <p className="text-slate-500 text-xs mb-0.5">Data</p>
              <p className="text-slate-300 text-sm font-mono">{formatData(lead.created_at)}</p>
            </div>
          </div>

          {/* Cambio stato mobile */}
          <div>
            <p className="text-slate-500 text-xs mb-1.5">Stato</p>
            <select
              value={lead.stato}
              onChange={e => handleStatoChange(e.target.value)}
              disabled={updatingStato}
              className="input-base text-sm py-2"
            >
              {STATI_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <>
      {desktopRow}
      {mobileCard}
    </>
  )
}
