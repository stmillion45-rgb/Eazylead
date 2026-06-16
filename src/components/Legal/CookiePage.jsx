import LegalPageLayout from './LegalPageLayout'
import { LEGAL_OPERATOR } from '../../constants/legalConfig'

export default function CookiePage() {
  const o = LEGAL_OPERATOR
  return (
    <LegalPageLayout title="Informativa cookie">
      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">1. Cosa sono i cookie</h2>
        <p>
          I cookie sono piccoli file salvati sul dispositivo. LeadOS usa anche tecnologie simili (localStorage) per
          sessione, preferenze e consenso cookie.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">2. Cookie tecnici (necessari)</h2>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>Supabase Auth</strong> — mantiene la sessione di login (essenziale).</li>
          <li><strong>leados_cookie_consent</strong> — memorizza la scelta sul banner cookie.</li>
          <li><strong>leados_team_invite</strong> — conserva il token invito team durante registrazione/accesso.</li>
        </ul>
        <p className="mt-2">Non richiedono consenso perché necessari al funzionamento.</p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">3. Cookie / servizi facoltativi</h2>
        <p>
          Se accetti dal banner, carichiamo i <strong className="text-slate-300">font Google Fonts</strong> (Syne, DM Sans)
          da server Google; in quel caso Google può trattare il tuo IP secondo la propria policy.
        </p>
      </section>

      <section>
        <h2 className="text-slate-200 font-semibold text-base mb-2">4. Come gestire le preferenze</h2>
        <p>
          Puoi rifiutare i font facoltativi dal banner iniziale (l’app userà font di sistema). Puoi cancellare i cookie
          dal browser. Per domande: {o.email}.
        </p>
      </section>
    </LegalPageLayout>
  )
}
