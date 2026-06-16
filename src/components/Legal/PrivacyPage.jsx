import LegalPageLayout from './LegalPageLayout'
import { LEGAL_OPERATOR } from '../../constants/legalConfig'

export default function PrivacyPage() {
  const o = LEGAL_OPERATOR
  return (
    <LegalPageLayout title="Informativa sulla privacy">
      <p><strong>Ultimo aggiornamento:</strong> maggio 2026</p>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">1. Titolare del trattamento</h2>
        <p>
          {o.name} — {o.address}<br />
          P.IVA {o.vat} — Email: {o.email}
          {o.pec ? <> — PEC: {o.pec}</> : null}
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">2. Cosa fa LeadOS</h2>
        <p>
          LeadOS è un software gestionale (SaaS) per lead, preventivi e ricevute. Per i dati dei tuoi clienti
          (nomi, email, importi) <strong className="text-slate-300">tu sei titolare del trattamento</strong>;
          {o.name} agisce come <strong className="text-slate-300">responsabile del trattamento</strong> per
          l’infrastruttura e i servizi descritti sotto.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">3. Dati che trattiamo</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Account: email, password (hash), data registrazione, consensi.</li>
          <li>Profilo azienda: ragione sociale, P.IVA, indirizzo, IBAN, logo.</li>
          <li>Lead, note, preventivi, ricevute e PDF archiviati.</li>
          <li>Dati di utilizzo e log tecnici (Supabase).</li>
          <li>Pagamenti: gestiti da Stripe (non conserviamo numeri di carta).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">4. Finalità e base giuridica</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li>Erogazione del servizio — esecuzione del contratto (art. 6.1.b GDPR).</li>
          <li>Email transazionali (ricevute, inviti team) — contratto / legittimo interesse.</li>
          <li>Assistenza Leo (AI) — contratto; vedi sezione 5.</li>
          <li>Adempimenti fiscali del titolare — obbligo di legge ove applicabile.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">5. Leo (intelligenza artificiale)</h2>
        <p>
          La funzione Leo invia a <strong className="text-slate-300">Anthropic</strong> (USA) testi derivati dai tuoi lead
          (nome, email, servizio, importi) per generare suggerimenti. Non sostituisce un commercialista o un avvocato.
          Puoi limitare l’uso non inserendo dati sensibili nei lead. I dati non vengono usati per addestrare modelli pubblici
          secondo le condizioni del fornitore API.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">6. Responsabili del trattamento (sub-responsabili)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase</strong> — database, autenticazione, storage (UE/USA secondo configurazione progetto).</li>
          <li><strong>Stripe</strong> — pagamenti abbonamento.</li>
          <li><strong>Resend</strong> — invio email transazionali.</li>
          <li><strong>Anthropic</strong> — elaborazione richieste Leo.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">7. Conservazione</h2>
        <p>
          I dati restano finché l’account è attivo. Dopo eliminazione account, cancelliamo i dati applicativi
          entro tempi tecnici ragionevoli (salvo obblighi di legge).
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">8. I tuoi diritti (GDPR)</h2>
        <p>
          Accesso, rettifica, cancellazione, limitazione, portabilità, opposizione, reclamo al Garante (
          <a href="https://www.garanteprivacy.it" className="text-cyan-400 hover:underline" target="_blank" rel="noreferrer">
            garanteprivacy.it
          </a>
          ). In app: <strong className="text-slate-300">Impostazioni → Privacy e account</strong> per esportare o eliminare i dati.
          Per richieste: {o.email}.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">9. Sicurezza</h2>
        <p>
          Connessioni cifrate (HTTPS), Row Level Security su database, accesso ai file PDF tramite URL firmati.
        </p>
      </section>
    </LegalPageLayout>
  )
}
