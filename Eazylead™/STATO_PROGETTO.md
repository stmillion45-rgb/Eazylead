# LeadOS — Stato progetto (aggiornato)

## Completato (codice)

### Fase 1
- [x] Colonna Servizio troncata (80 caratteri + tooltip)
- [x] Profilo azienda (`/impostazioni`)
- [x] PDF personalizzato (nome, P.IVA, indirizzo, logo)
- [x] Stato PDF **INVIATO** in invio
- [x] Email con branding azienda + PDF allegato

### Fase 2 (app pronta; Stripe va configurato da te)
- [x] Pagina **Piano** (`/billing`)
- [x] Edge Functions: `send-email`, `stripe-checkout`, `stripe-portal`, `stripe-webhook`
- [x] Limiti piano Free (50 lead, 10 email/mese) + modale upgrade
- [x] Script deploy: `npm run deploy:functions`
- [x] Upgrade Pro↔Agency con **prorazione Stripe** (se abbonamento già attivo)

### Fase 3
- [x] Wizard onboarding (primo accesso)
- [x] Empty state dashboard (0 lead)
- [x] Anteprima import con mapping colonne ✓/✗
- [x] Export CSV (pagina Lead)
- [x] Grafici revenue + stati (dashboard)
- [x] Follow-up (`follow_up_at` + “In scadenza oggi”)

### Documentazione
- [x] `MANUTENZIONE.md` — come aggiornare il progetto
- [x] `STRIPE_SETUP.md` — Stripe sandbox passo-passo

### Fase 4
- [x] Upload logo da file (Supabase Storage bucket `logos`)

### Fase 5 — Leo AI Copilot
- [x] Edge Function `ai-copilot` (Anthropic)
- [x] Widget Leo (floating + pannello laterale)
- [x] Solo **Pro/Agency**; budget **5€/20€** al mese con tracciamento costi
- [ ] Secret `ANTHROPIC_API_KEY` + deploy function + SQL `leo_usage` — vedi **`LEO_SETUP.md`**

---

## Da fare da te (operativo)

### 1. Database Supabase
SQL Editor → esegui **una volta**:

**`supabase/setup_completo.sql`** (tutto in un file)

Oppure i file in `supabase/migrations/` in ordine (01, 02, **03 logos**).

### 2. Secret Supabase (Edge Functions)
| Secret | Note |
|--------|------|
| `RESEND_API_KEY` | Email ricevute |
| `STRIPE_SECRET_KEY` | `sk_test_...` dalla scheda |
| `PRICE_ID_PRO` | Da Stripe dopo creazione prodotto Pro |
| `PRICE_ID_AGENCY` | Da Stripe dopo prodotto Agency |
| `STRIPE_WEBHOOK_SECRET` | Dopo creazione webhook `whsec_...` |
| `APP_URL` | `http://localhost:5173` o dominio produzione |
| `ANTHROPIC_API_KEY` | Da console.anthropic.com — per Leo (copilota AI) |

### 3. Stripe Test mode
Vedi `STRIPE_SETUP.md` (prodotti, webhook, Customer Portal).

### 4. Deploy functions
```powershell
cd c:\Users\stmil\Desktop\leados
npx supabase login
npx supabase link --project-ref ciaklzqpfcbmegzckdkt
npm run deploy:functions
```

### 5. Test finali
- [x] Impostazioni → salva profilo + logo
- [x] Invia ricevuta → email con allegato PDF
- [x] Piano → checkout Pro (carta `4242 4242 4242 4242`)
- [x] Tabella `subscriptions` aggiornata dopo pagamento
- [x] Import Excel oltre 50 lead → modale upgrade (piano Free)
- [ ] Impostazioni → **Carica logo da file** (dopo migration bucket `logos`)

---

## Non in scope / futuro
- Recharts (grafici attuali in CSS)
- Piano Agency “multi-utente” (placeholder in UI)
