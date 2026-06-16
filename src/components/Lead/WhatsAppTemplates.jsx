import { MessageCircle } from 'lucide-react'
import { WHATSAPP_TEMPLATES, whatsAppWithTemplate } from '../../utils/whatsappTemplates'

export default function WhatsAppTemplates({ lead, compact = false }) {
  if (!lead?.telefono?.trim()) return null

  return (
    <div className={compact ? 'flex flex-wrap gap-1' : 'space-y-2'}>
      {!compact && (
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Messaggi WhatsApp rapidi
        </p>
      )}
      <div className="flex flex-wrap gap-1.5">
        {WHATSAPP_TEMPLATES.map(tpl => {
          const href = whatsAppWithTemplate(lead, tpl.id)
          if (!href) return null
          return (
            <a
              key={tpl.id}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium
                         bg-green-950/40 text-green-400 border border-green-900/50 hover:bg-green-900/40"
            >
              <MessageCircle className="w-3 h-3" />
              {tpl.label}
            </a>
          )
        })}
      </div>
    </div>
  )
}
