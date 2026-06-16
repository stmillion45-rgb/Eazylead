import { Mail, Phone, MessageCircle } from 'lucide-react'
import { telHref, whatsAppHref, whatsAppFollowUpMessage } from '../../utils/phoneLinks'

export default function ContactActions({ lead, size = 'sm' }) {
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
  const btnClass = 'p-1.5 rounded-lg transition-colors disabled:opacity-30'

  const wa = lead?.telefono ? whatsAppHref(lead.telefono, whatsAppFollowUpMessage(lead)) : null
  const tel = lead?.telefono ? telHref(lead.telefono) : null

  return (
    <div className="flex items-center gap-0.5">
      {lead?.email ? (
        <a
          href={`mailto:${lead.email}`}
          title="Email"
          className={`${btnClass} text-slate-500 hover:text-cyan-400 hover:bg-slate-800`}
        >
          <Mail className={iconClass} />
        </a>
      ) : (
        <span className={`${btnClass} text-slate-700 cursor-not-allowed`} title="Nessuna email">
          <Mail className={iconClass} />
        </span>
      )}
      {tel ? (
        <a
          href={tel}
          title="Chiama"
          className={`${btnClass} text-slate-500 hover:text-emerald-400 hover:bg-slate-800`}
        >
          <Phone className={iconClass} />
        </a>
      ) : (
        <span className={`${btnClass} text-slate-700 cursor-not-allowed`} title="Nessun telefono">
          <Phone className={iconClass} />
        </span>
      )}
      {wa ? (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp"
          className={`${btnClass} text-slate-500 hover:text-green-400 hover:bg-slate-800`}
        >
          <MessageCircle className={iconClass} />
        </a>
      ) : (
        <span className={`${btnClass} text-slate-700 cursor-not-allowed`} title="Nessun WhatsApp">
          <MessageCircle className={iconClass} />
        </span>
      )}
    </div>
  )
}
