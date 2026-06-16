import { Mail, MessageCircle } from 'lucide-react'
import { paymentReminderMailto, paymentReminderWhatsApp } from '../../utils/paymentReminder'
import { resolvePaymentStatus } from '../../utils/receiptPayment'

export default function PaymentReminderActions({ ricevuta, companyName }) {
  const status = resolvePaymentStatus(ricevuta)
  if (status === 'pagata') return null

  const lead = ricevuta.leads
  const wa = paymentReminderWhatsApp(lead, ricevuta, companyName)
  const mail = paymentReminderMailto(lead, ricevuta, companyName)

  if (!wa && !mail) return <span className="text-slate-600 text-[10px]">—</span>

  return (
    <div className="flex items-center justify-center gap-1">
      {mail && (
        <a
          href={mail}
          title="Sollecito via email"
          className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-slate-800"
        >
          <Mail className="w-3.5 h-3.5" />
        </a>
      )}
      {wa && (
        <a
          href={wa}
          target="_blank"
          rel="noopener noreferrer"
          title="Sollecito via WhatsApp"
          className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-slate-800"
        >
          <MessageCircle className="w-3.5 h-3.5" />
        </a>
      )}
    </div>
  )
}
