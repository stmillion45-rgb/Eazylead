# LeadOS — Guida manutenzione e aggiornamenti

Questa guida spiega come modificare, aggiornare e pubblicare LeadOS dopo ogni intervento sul codice.

---

## 1. Struttura del progetto

| Cartella / file | Cosa contiene |
|-----------------|---------------|
| `src/` | App React (UI, pagine, hook) |
| `src/App.jsx` | Route, sidebar, layout autenticato |
| `src/hooks/` | Logica riusabile (`useProfile`, `usePlan`) |
| `src/components/PDF/pdfGenerator.js` | Generazione ricevute PDF |
| `supabase/functions/` | Edge Functions (email, Stripe) |
| `supabase/migrations/` | SQL da eseguire su Supabase |
| `.env` | Chiavi **solo client**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

**Mai** mettere in `.env` Vite: `STRIPE_SECRET_KEY`, `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 2. Sviluppo locale (ogni modifica UI)

```powershell
cd c:\Users\stmil\Desktop\leados
npm install
npm run dev
```

Apri l’URL indicato (di solito `http://localhost:5173`). Le modifiche ai file in `src/` si vedono al salvataggio (hot reload).

Build di produzione (controllo errori):

```powershell
npm run build
npm run preview
```

---

## 3. Modifiche solo frontend (React)

**Esempi:** testi, colori, nuova colonna tabella, logica filtri.

1. Modifica i file in `src/`
2. `npm run dev` → verifica nel browser
3. `npm run build` prima di pubblicare
4. Carica la cartella `dist/` sul tuo hosting (Netlify, Vercel, ecc.) **oppure** rifai deploy come fai oggi

**Route nuove:** aggiungi in `App.jsx`:
- voce in `NAV` (sidebar)
- titolo in `titles`
- componente in `views`
- `<Route path="..." />` nel router

---

## 4. Modifiche database (Supabase SQL)

**Esempi:** nuove colonne, tabelle, policy RLS.

1. Scrivi lo SQL in `supabase/migrations/` (nuovo file con data nel nome)
2. Supabase Dashboard → **SQL Editor** → incolla ed **Esegui**
3. Solo dopo SQL ok: aggiorna il codice React che usa quelle colonne

Migrazioni (esegui **in ordine** in SQL Editor):

1. `supabase/migrations/20250531000000_phase2_phase3.sql` — subscriptions, follow-up, onboarding
2. `supabase/migrations/20250531000001_profiles_complete.sql` — profiles + trigger nuovi utenti

Guida Stripe: `STRIPE_SETUP.md`

---

## 5. Edge Functions (email, Stripe)

**File attuali:**
- `send-email` — invio ricevute via Resend
- `stripe-checkout` — pagamento Pro/Agency
- `stripe-portal` — gestione abbonamento
- `stripe-webhook` — eventi Stripe → DB

### Deploy dopo ogni modifica a una function

Su Windows il comando `supabase` da solo **non funziona** se non l’hai installato globalmente. Usa **`npx`** (CLI già in `devDependencies`) oppure gli script npm:

```powershell
cd c:\Users\stmil\Desktop\leados
npx supabase login
npx supabase link --project-ref ciaklzqpfcbmegzckdkt

# Opzione A — script npm (consigliata)
npm run deploy:send-email
npm run deploy:stripe
# oppure tutte insieme:
npm run deploy:functions

# Opzione B — comandi singoli
npx supabase functions deploy send-email --project-ref ciaklzqpfcbmegzckdkt
npx supabase functions deploy stripe-checkout --project-ref ciaklzqpfcbmegzckdkt
npx supabase functions deploy stripe-portal --project-ref ciaklzqpfcbmegzckdkt
npx supabase functions deploy stripe-webhook --project-ref ciaklzqpfcbmegzckdkt
```

**Non usare** `npm supabase ...` (errore "Unknown command"). È `npx supabase` o `npm run deploy:...`.

### Secret obbligatori (Dashboard → Project Settings → Edge Functions → Secrets)

| Secret | Uso |
|--------|-----|
| `RESEND_API_KEY` | `send-email` |
| `STRIPE_SECRET_KEY` | checkout, portal, webhook |
| `STRIPE_WEBHOOK_SECRET` | solo `stripe-webhook` |
| `PRICE_ID_PRO` | prezzo Stripe piano Pro |
| `PRICE_ID_AGENCY` | prezzo Stripe piano Agency |
| `APP_URL` | URL pubblico app (es. `https://tuodominio.it` o `http://localhost:5173` in test) |

Supabase fornisce automaticamente `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` alle functions.

### Webhook Stripe

1. Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://ciaklzqpfcbmegzckdkt.supabase.co/functions/v1/stripe-webhook`
3. Eventi: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
4. Copia il **Signing secret** → secret `STRIPE_WEBHOOK_SECRET` su Supabase

---

## 6. Stripe — attivare i pagamenti

1. Account [stripe.com](https://stripe.com) (modalità test per provare)
2. Crea prodotti **Pro** (19€/mese) e **Agency** (49€/mese) → copia i **Price ID**
3. Inserisci i secret su Supabase (tabella sopra)
4. Deploy delle 3 function Stripe
5. Nell’app: **Piano** (`/billing`) → “Passa a Pro”

Piano **Free** non è su Stripe: è il default in tabella `subscriptions` (assente riga = free).

---

## 7. PDF e email ricevute

| Cosa modifichi | File |
|----------------|------|
| Layout PDF | `src/components/PDF/pdfGenerator.js` |
| Template email HTML | `supabase/functions/send-email/index.ts` → poi **deploy send-email** |
| Flusso invio | `src/components/Email/SendReceiptsModal.jsx` |

Dopo modifica PDF: solo `npm run dev` / build.  
Dopo modifica email: **deploy send-email** obbligatorio.

Il PDF in email è **allegato** (base64) + link Storage: logo e dati azienda vengono da **Impostazioni** (`profiles`).

---

## 8. Profilo azienda e logo

- UI: `src/components/Settings/ImpostazioniView.jsx`
- Upload: `src/utils/uploadLogo.js` → bucket Supabase **`logos`** (pubblico)
- Dati: tabella `profiles` su Supabase
- Logo nel PDF/email: URL pubblico (upload o link manuale)

**Prima volta (SQL):** esegui `supabase/migrations/20250531000002_storage_logos.sql`  
(o la sezione finale di `setup_completo.sql`).

Path file: `{user_id}/logo.{png|jpg|webp}` — max 2 MB.

---

## 9. Piani e limiti Free

- Costanti: `src/constants/plans.js` (50 lead, 10 email/mese)
- Hook: `src/hooks/usePlan.js`
- UI upgrade: `src/components/UI/UpgradeModal.jsx`
- Pagina piani: `src/components/Billing/BillingView.jsx`

Per cambiare i limiti: modifica `FREE_LEAD_LIMIT` / `FREE_EMAIL_LIMIT` e la logica in `usePlan.js`.

---

## 10. Checklist rapida “ho finito una modifica”

- [ ] `npm run build` senza errori
- [ ] Se ho toccato SQL → eseguito su Supabase produzione
- [ ] Se ho toccato `supabase/functions/*` → deploy della function
- [ ] Se ho aggiunto secret → configurati in Supabase
- [ ] Test manuale del flusso cambiato (login, lead, PDF, email, billing)

---

## 11. Problemi comuni

| Sintomo | Soluzione |
|---------|-----------|
| Email vecchio template LeadOS | Redeploy `send-email` |
| Checkout non parte | Secret Stripe + `PRICE_ID_*` + deploy `stripe-checkout` |
| Piano non si aggiorna | Webhook Stripe + `STRIPE_WEBHOOK_SECRET` |
| Logo in app sì, in email no | Redeploy `send-email`; controllare allegato PDF |
| Errore colonna DB | Eseguire migration SQL mancante |
| CORS logo | URL logo pubblico e diretto |

---

## 12. Leo — copilota AI

- System prompt: `supabase/functions/_shared/leoSystemPrompt.ts`
- Edge Function: `supabase/functions/ai-copilot/index.ts`
- UI: `src/components/Leo/` (pannello + pulsante floating)
- Payload builders: `src/utils/leoPayloads.js`

**Secret Supabase (obbligatorio):**
```
ANTHROPIC_API_KEY=sk-ant-...
```
Opzionale: `ANTHROPIC_MODEL` (default `claude-sonnet-4-20250514`)

**Deploy:**
```powershell
npm run deploy:ai-copilot
```

**Azioni disponibili:** `email`, `followup`, `summary`, `chat`

**Accesso e budget (mensile, reset il 1°):**

| Piano | Leo | Credito max/mese |
|-------|-----|------------------|
| Free | ❌ | — |
| Pro | ✅ | 5 € |
| Agency | ✅ | 20 € |

Il blocco è **lato server** in `ai-copilot` (tabella `leo_usage`). Costo calcolato dai token Anthropic.

Per cambiare i budget: `src/constants/plans.js` e `supabase/functions/_shared/leoBudget.ts` (allineati).

| Dove in app | Cosa fa |
|-------------|---------|
| Pulsante viola (basso a destra) | Apre Leo — chat libera |
| Dashboard → card Leo | Resoconto settimanale / follow-up |
| Lead → 1 selezionato → Bozza email | Genera email per il lead |

---

*Aggiorna questo file quando aggiungi moduli o secret nuovi.*
