# Stripe Sandbox — configurazione LeadOS

Usa sempre la **modalità Test** su Stripe (interruttore "Test mode" attivo in Dashboard).

---

## 1. Crea i prodotti su Stripe (Price ID)

1. Vai su [dashboard.stripe.com/test/products](https://dashboard.stripe.com/test/products)
2. **+ Aggiungi prodotto** → due prodotti ricorrenti mensili:

| Piano  | Nome (es.) | Prezzo      | Copia dopo il salvataggio |
|--------|------------|-------------|---------------------------|
| Pro    | LeadOS Pro | 19,00 €/mese | `price_xxxxxxxx` (sotto il prezzo) |
| Agency | LeadOS Agency | 49,00 €/mese | `price_xxxxxxxx` |

3. Per ogni prodotto: apri il **prezzo** (Price) → copia l’ID che inizia con `price_...`

Il piano **Free** non si crea su Stripe (resta solo in app/DB).

---

## 2. Secret su Supabase (Edge Functions)

Dashboard: [Project Settings → Edge Functions → Secrets](https://supabase.com/dashboard/project/ciaklzqpfcbmegzckdkt/settings/functions)

Aggiungi **una riga per secret** (nome esatto):

| Nome secret | Valore (dalla tua scheda / Stripe) |
|-------------|-------------------------------------|
| `STRIPE_SECRET_KEY` | `sk_test_...` (chiave **segreta** test — NON la `pk_test`) |
| `PRICE_ID_PRO` | `price_...` del piano Pro |
| `PRICE_ID_AGENCY` | `price_...` del piano Agency |
| `APP_URL` | URL dell’app: `http://localhost:5173` in locale, oppure `https://tuodominio.it` in produzione |
| `RESEND_API_KEY` | già usata da `send-email` (se non c’è ancora, incollala) |

**Non serve** mettere `pk_test` su Supabase per il flusso attuale (checkout avviene lato server).

Dopo ogni modifica ai secret: **rideploy** le functions (vedi sotto).

---

## 3. Webhook Stripe → Supabase

1. [Stripe → Developers → Webhooks (Test mode)](https://dashboard.stripe.com/test/webhooks)
2. **Add endpoint**
3. **Endpoint URL:**

   ```
   https://ciaklzqpfcbmegzckdkt.supabase.co/functions/v1/stripe-webhook
   ```

4. Eventi da selezionare:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`

5. Crea → copia **Signing secret** (`whsec_...`)
6. Su Supabase Secrets aggiungi:

   | Nome | Valore |
   |------|--------|
   | `STRIPE_WEBHOOK_SECRET` | `whsec_...` |

---

## 4. SQL database (se non fatto)

Supabase → **SQL Editor** → esegui il file:

`supabase/migrations/20250531000000_phase2_phase3.sql`

(tabella `subscriptions`, follow-up, onboarding)

---

## 5. Deploy Edge Functions

```powershell
cd c:\Users\stmil\Desktop\leados
npx supabase login
npx supabase link --project-ref ciaklzqpfcbmegzckdkt
npm run deploy:functions
```

---

## 6. Customer Portal (gestione abbonamento)

Stripe Test → [Settings → Billing → Customer portal](https://dashboard.stripe.com/test/settings/billing/portal)

- Attiva il portale
- Consenti cancellazione / aggiornamento metodo di pagamento

Così il pulsante **Gestisci abbonamento** in `/billing` funziona.

---

## 7. Upgrade Pro → Agency (prorazione)

Se l’utente ha già un abbonamento attivo e passa a un piano superiore, LeadOS usa
`subscription.update` con **prorazione Stripe** (non la formula fissa 49€−19€).

Stripe calcola credito e differenza in base ai giorni restanti del periodo.
Serve aver fatto almeno un checkout Pro prima (così esiste `stripe_subscription_id` in DB).

Dopo aver modificato `stripe-checkout`, rideploy:

```powershell
npm run deploy:stripe
```

## 8. Test in app

1. `npm run dev` → login
2. Menu **Piano** (`/billing`)
3. **Passa a Pro** → pagina Stripe Checkout (carta test: `4242 4242 4242 4242`, data futura, CVC qualsiasi)
4. Dopo pagamento → redirect `.../billing?success=true`
5. Verifica in Supabase → Table Editor → `subscriptions` → riga con `plan = pro`

---

## 8. Carte di test Stripe

| Carta | Esito |
|-------|--------|
| `4242 4242 4242 4242` | Pagamento ok |
| `4000 0000 0000 0002` | Rifiutata |

[Altre carte test](https://docs.stripe.com/testing)

---

## Sicurezza

- `sk_test` e `whsec_` **solo** in Supabase Secrets, mai in `.env` Vite né su GitHub.
- La `pk_test` non serve nel codice LeadOS attuale.
- Non committare il file `SCHEDA TECNICA` con chiavi in repository pubblici.
