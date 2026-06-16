import { whatsAppHref } from './phoneLinks'

export const WHATSAPP_TEMPLATES = [
  {
    id: 'followup',
    label: 'Follow-up',
    build: (lead) => {
      const nome = lead?.nome?.trim() || 'cliente'
      const s = lead?.servizio?.trim()
      return s
        ? `Ciao ${nome}, ti scrivo per un aggiornamento su ${s}. Quando possiamo sentirci?`
        : `Ciao ${nome}, ti scrivo per un aggiornamento. Quando possiamo sentirci?`
    },
  },
  {
    id: 'preventivo',
    label: 'Preventivo',
    build: (lead) => {
      const nome = lead?.nome?.trim() || 'cliente'
      return `Ciao ${nome}, ti invio il preventivo come concordato. Fammi sapere se va bene per te.`
    },
  },
  {
    id: 'ringraziamento',
    label: 'Ringraziamento',
    build: (lead) => {
      const nome = lead?.nome?.trim() || 'cliente'
      return `Ciao ${nome}, grazie per la collaborazione! È stato un piacere lavorare con te.`
    },
  },
  {
    id: 'ricevuta',
    label: 'Ricevuta inviata',
    build: (lead) => {
      const nome = lead?.nome?.trim() || 'cliente'
      return `Ciao ${nome}, ti ho inviato la ricevuta via email. Controlla anche in spam. Fammi sapere se la ricevi.`
    },
  },
]

export function whatsAppWithTemplate(lead, templateId) {
  const tpl = WHATSAPP_TEMPLATES.find(t => t.id === templateId)
  if (!tpl || !lead?.telefono?.trim()) return null
  return whatsAppHref(lead.telefono, tpl.build(lead))
}
