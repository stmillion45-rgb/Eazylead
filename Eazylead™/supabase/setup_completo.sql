-- LeadOS — setup database completo (esegui UNA volta in Supabase SQL Editor)
-- Ordine: profiles → subscriptions → colonne extra → trigger nuovi utenti

-- ── PROFILES (Fase 1) ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                   UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_azienda         TEXT,
  piva                 TEXT,
  indirizzo            TEXT,
  logo_url             TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── SUBSCRIPTIONS (Fase 2) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan                   TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','agency')),
  status                 TEXT DEFAULT 'active',
  current_period_end     TIMESTAMPTZ,
  created_at             TIMESTAMPTZ DEFAULT now(),
  updated_at             TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_azienda_id_key ON public.subscriptions(azienda_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscription" ON public.subscriptions;
CREATE POLICY "select_own_subscription" ON public.subscriptions FOR SELECT USING (auth.uid() = azienda_id);

-- ── FASE 3 ─────────────────────────────────────────────────────────────────
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS follow_up_at TIMESTAMPTZ;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- ── TRIGGER profilo per nuovi utenti ─────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, onboarding_completed)
  VALUES (NEW.id, false)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── STORAGE LOGO (bucket pubblico) ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "logos_insert_own" ON storage.objects;
CREATE POLICY "logos_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "logos_update_own" ON storage.objects;
CREATE POLICY "logos_update_own"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "logos_delete_own" ON storage.objects;
CREATE POLICY "logos_delete_own"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'logos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ── LEO USAGE (costi AI per utente) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.leo_usage (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action         TEXT NOT NULL,
  input_tokens   INT NOT NULL DEFAULT 0,
  output_tokens  INT NOT NULL DEFAULT 0,
  cost_eur       NUMERIC(10, 6) NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leo_usage_azienda_month
  ON public.leo_usage (azienda_id, created_at DESC);

ALTER TABLE public.leo_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_leo_usage" ON public.leo_usage;
CREATE POLICY "select_own_leo_usage"
  ON public.leo_usage FOR SELECT
  USING (auth.uid() = azienda_id);

-- ── LOGO SHAPE (profilo) ─────────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS logo_shape TEXT DEFAULT 'square'
  CHECK (logo_shape IN ('square', 'round', 'oval'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS codice_fiscale TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS regime_fiscale TEXT DEFAULT 'ordinario'
  CHECK (regime_fiscale IN ('ordinario', 'forfettario', 'esente'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pdf_theme TEXT DEFAULT 'classic'
  CHECK (pdf_theme IN ('classic', 'emerald', 'violet', 'navy', 'slate'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS iban TEXT;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS product_tour_completed BOOLEAN DEFAULT false;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_aliquota_iva NUMERIC(5,2) DEFAULT 22;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS preferito BOOLEAN DEFAULT false;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS concluso_at TIMESTAMPTZ;

-- ── FEATURE SEMPLICI (pagamento, note, preventivi) ───────────────────────────
ALTER TABLE public.receipts
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'non_pagata'
    CHECK (payment_status IN ('non_pagata', 'pagata', 'scaduta')),
  ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_inviata BOOLEAN DEFAULT false;

DROP POLICY IF EXISTS "update_own_receipts" ON public.receipts;
CREATE POLICY "update_own_receipts"
  ON public.receipts FOR UPDATE
  USING (auth.uid() = azienda_id);

CREATE TABLE IF NOT EXISTS public.lead_notes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  azienda_id  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contenuto   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notes" ON public.lead_notes;
CREATE POLICY "select_own_notes" ON public.lead_notes FOR SELECT USING (auth.uid() = azienda_id);
DROP POLICY IF EXISTS "insert_own_notes" ON public.lead_notes;
CREATE POLICY "insert_own_notes" ON public.lead_notes FOR INSERT WITH CHECK (auth.uid() = azienda_id);
DROP POLICY IF EXISTS "delete_own_notes" ON public.lead_notes;
CREATE POLICY "delete_own_notes" ON public.lead_notes FOR DELETE USING (auth.uid() = azienda_id);

CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id         UUID REFERENCES public.leads(id) ON DELETE SET NULL,
  numero          TEXT NOT NULL,
  descrizione     TEXT,
  importo         NUMERIC(10,2),
  iva_percentuale NUMERIC(5,2) DEFAULT 22,
  stato           TEXT DEFAULT 'bozza'
    CHECK (stato IN ('bozza', 'inviato', 'accettato', 'rifiutato')),
  valid_until     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_quotes" ON public.quotes;
CREATE POLICY "select_own_quotes" ON public.quotes FOR SELECT USING (auth.uid() = azienda_id);
DROP POLICY IF EXISTS "insert_own_quotes" ON public.quotes;
CREATE POLICY "insert_own_quotes" ON public.quotes FOR INSERT WITH CHECK (auth.uid() = azienda_id);
DROP POLICY IF EXISTS "update_own_quotes" ON public.quotes;
CREATE POLICY "update_own_quotes" ON public.quotes FOR UPDATE USING (auth.uid() = azienda_id);
DROP POLICY IF EXISTS "delete_own_quotes" ON public.quotes;
CREATE POLICY "delete_own_quotes" ON public.quotes FOR DELETE USING (auth.uid() = azienda_id);

-- ── TEAM (Agency multi-utente) — vedi anche migrations/20250531000011_team_members.sql ──
-- Esegui l'intero file 20250531000011_team_members.sql per RLS workspace e funzioni invito.
