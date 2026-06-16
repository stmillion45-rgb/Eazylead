import LegalPageLayout from './LegalPageLayout'
import { LEGAL_OPERATOR } from '../../constants/legalConfig'

export default function ImprintPage() {
  const o = LEGAL_OPERATOR
  return (
    <LegalPageLayout title="Note legali">
      <p className="text-slate-500 text-xs mb-4">Ai sensi del D.Lgs. 70/2003 (commercio elettronico)</p>

      <section className="space-y-2">
        <p><strong className="text-slate-200">Titolare del sito / del servizio</strong><br />{o.name}</p>
        <p><strong className="text-slate-200">Sede</strong><br />{o.address}</p>
        <p><strong className="text-slate-200">Partita IVA</strong><br />{o.vat}</p>
        <p><strong className="text-slate-200">Email</strong><br />
          <a href={`mailto:${o.email}`} className="text-cyan-400 hover:underline">{o.email}</a>
        </p>
        {o.pec && (
          <p><strong className="text-slate-200">PEC</strong><br />{o.pec}</p>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-slate-200 font-semibold text-base mb-2">Informazioni sul servizio</h2>
        <p>
          LeadOS — software gestionale online per lead, preventivi e ricevute.
          Prezzi e funzionalità sono indicati nella sezione Piano dell’applicazione.
        </p>
      </section>
    </LegalPageLayout>
  )
}
