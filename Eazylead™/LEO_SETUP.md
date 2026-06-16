# Leo (Anthropic) — configurazione LeadOS

Leo è il copilota AI integrato in LeadOS. Usa l’API **Anthropic** (Claude) tramite la Edge Function `ai-copilot`.

---

## 1. Crea account Anthropic

1. Vai su [console.anthropic.com](https://console.anthropic.com/)
2. **Sign up** con email (o Google)
3. Conferma l’email se richiesto
4. Accetta i termini d’uso

---

## 2. Aggiungi credito / piano

Anthropic è **a consumo** (pay-as-you-go):

1. Console → **Billing** (o **Plans & Billing**)
2. Aggiungi un **metodo di pagamento**
3. Imposta un **limite di spesa mensile** (consigliato per test: es. 5–10 €)

Per lo sviluppo e i test occasionali il costo è basso (centesimi per richiesta con Sonnet).

---

## 3. Genera la API key

1. Console → **API Keys** (menu laterale)
2. **Create Key**
3. Nome suggerito: `LeadOS Dev`
4. Copia la chiave — inizia con `sk-ant-api03-...`
5. **Salvala subito**: non la rivedi per intero

Non committare mai la chiave su Git. Non metterla nel `.env` Vite del frontend.

---

## 4. Secret su Supabase

Dashboard: [Edge Functions → Secrets](https://supabase.com/dashboard/project/ciaklzqpfcbmegzckdkt/settings/functions)

| Nome secret | Valore |
|-------------|--------|
| `ANTHROPIC_API_KEY` | `sk-ant-api03-...` (la chiave copiata) |

Opzionale (modello diverso):

| Nome | Valore esempio |
|------|----------------|
| `ANTHROPIC_MODEL` | `claude-sonnet-4-20250514` (default se omesso) |

Per risparmiare in test puoi usare un modello più leggero, se disponibile nel tuo account — verifica i modelli in [documentazione Anthropic](https://docs.anthropic.com/en/docs/about-claude/models).

---

## 5. Deploy Edge Function

Da PowerShell, nella cartella del progetto:

```powershell
cd c:\Users\stmil\Desktop\leados
npx supabase login
npx supabase link --project-ref ciaklzqpfcbmegzckdkt
npm run deploy:ai-copilot
```

Oppure tutte le functions:

```powershell
npm run deploy:functions
```

---

## 6. Test Leo in app

1. Avvia l’app: `npm run dev`
2. **Piano Free** → Leo bloccato (lucchetto), modale upgrade
3. **Piano Pro** → Leo attivo, barra credito **5€/mese**
4. **Piano Agency** → credito **20€/mese**
5. Dashboard → card Leo → Resoconto / Follow-up

---

## 7. SQL obbligatorio (tabella costi)

Supabase → SQL Editor → esegui:

`supabase/migrations/20250531000003_leo_usage.sql`

(o sezione finale di `setup_completo.sql`)

Senza questa tabella il conteggio budget non funziona.

---

## 8. Verifica log (se qualcosa non funziona)

Supabase Dashboard → **Edge Functions** → `ai-copilot` → **Logs**

| Sintomo | Causa probabile |
|---------|-----------------|
| 503 / Leo non configurato | Secret `ANTHROPIC_API_KEY` assente o deploy non fatto |
| 401 | Sessione scaduta — rifai login |
| Errore generico | Chiave revocata, credito esaurito, o modello non valido |

Dopo ogni modifica ai secret: **rideploy** `ai-copilot`.

---

## Costi indicativi (ordine di grandezza)

- Una richiesta Leo (email, resoconto, chat): tipicamente **frazioni di centesimo** con Sonnet
- Limita l’uso in produzione con i piani LeadOS (Pro/Agency) se in futuro vorrai mettere un cap mensile per utente

---

## Sicurezza

- `ANTHROPIC_API_KEY` **solo** nei Secret Supabase (Edge Functions)
- Mai nel codice React, mai in `.env` Vite
- Ruota la chiave da console Anthropic se pensi sia stata esposta
