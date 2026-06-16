import LegalPageLayout from './LegalPageLayout'
import { LEGAL_OPERATOR } from '../../constants/legalConfig'

export default function TermsPage() {
  const o = LEGAL_OPERATOR
  return (
    <LegalPageLayout title="Termini di servizio">
      <p><strong>Ultimo aggiornamento:</strong> maggio 2026</p>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">1. Oggetto</h2>
        <p>
          I presenti Termini regolano l’uso di LeadOS, piattaforma SaaS gestita da {o.name}. Registrandoti accetti
          questi Termini e l’Informativa privacy.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">2. Natura del servizio</h2>
        <p>
          LeadOS aiuta a gestire lead, preventivi e <strong className="text-slate-300">ricevute/preventivi in PDF</strong>.
          <strong className="text-slate-300"> Non è software di fatturazione elettronica</strong> né sostituisce obblighi
          fiscali, commercialista o consulenza legale. Sei responsabile della correttezza dei documenti emessi ai tuoi clienti.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">3. Account e piani</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Fornisci dati veritieri e mantieni riservate le credenziali.</li>
          <li>Piano Free: limiti di lead ed email come indicato in app.</li>
          <li>Piani a pagamento (Pro/Agency): rinnovo automatico tramite Stripe fino a disdetta dal portale pagamenti.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">4. Uso consentito</h2>
        <p>
          Vietato uso illecito, spam, violazione di diritti terzi, reverse engineering aggressivo o sovraccarico dei sistemi.
          Possiamo sospendere account in caso di abuso.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">5. Dati dei tuoi clienti</h2>
        <p>
          Per i dati personali dei lead/clienti che inserisci, agisci come titolare; ti impegni ad avere base giuridica
          (es. esecuzione contratto, consenso) prima di inviare email o PDF tramite LeadOS.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">6. Leo AI</h2>
        <p>
          I suggerimenti di Leo sono generati automaticamente e possono contenere errori. Non costituiscono parere
          professionale. Verifica sempre prima di inviare documenti o email ai clienti.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">7. Limitazione di responsabilità</h2>
        <p>
          Il servizio è fornito «come è». Nei limiti di legge, {o.name} non risponde di perdite indirette, mancati guadagni
          o sanzioni fiscali derivanti dall’uso dei documenti generati. La responsabilità massima è limitata alle somme
          pagate negli ultimi 12 mesi per l’abbonamento.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">8. Recesso (consumatori)</h2>
        <p>
          Se acquisti come consumatore, puoi esercitare il diritto di recesso entro 14 giorni salvo eccezioni di legge
          per servizi digitali già avviati con tuo consenso espresso. Per abbonamenti, la disdetta impedisce i rinnovi futuri.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">9. Legge applicabile e foro</h2>
        <p>
          Legge italiana. Foro competente del consumatore o, per professionisti, foro di [sede del titolare].
          Contatti: {o.email}.
        </p>
      </section>
    </LegalPageLayout>
  )
}
