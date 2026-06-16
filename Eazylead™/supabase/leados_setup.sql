-- =============================================
-- LEADOS — Script SQL Completo
-- Esegui su:
-- https://supabase.com/dashboard/project/ciaklzqpfcbmegzckdkt
-- → SQL Editor → New Query → Incolla → Run
-- =============================================


-- =============================================
-- TABELLA LEADS
-- =============================================
CREATE TABLE IF NOT EXISTS public.leads (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome         TEXT NOT NULL,
  email        TEXT,
  telefono     TEXT,
  servizio     TEXT NOT NULL,
  prezzo       NUMERIC(10,2) DEFAULT 0.00,
  stato        TEXT DEFAULT 'nuovo'
               CHECK (stato IN ('nuovo','contattato','in trattativa','concluso','perso')),
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_azienda_id ON public.leads(azienda_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at  ON public.leads(created_at);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_leads" ON public.leads;
CREATE POLICY "select_own_leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = azienda_id);

DROP POLICY IF EXISTS "insert_own_leads" ON public.leads;
CREATE POLICY "insert_own_leads"
  ON public.leads FOR INSERT
  WITH CHECK (auth.uid() = azienda_id);

DROP POLICY IF EXISTS "update_own_leads" ON public.leads;
CREATE POLICY "update_own_leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = azienda_id);

DROP POLICY IF EXISTS "delete_own_leads" ON public.leads;
CREATE POLICY "delete_own_leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = azienda_id);


-- =============================================
-- TABELLA RECEIPTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.receipts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  azienda_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lead_id      UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  imponibile   NUMERIC(10,2) NOT NULL,
  iva          NUMERIC(10,2) NOT NULL,
  totale       NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_receipts_azienda_id ON public.receipts(azienda_id);
CREATE INDEX IF NOT EXISTS idx_receipts_lead_id    ON public.receipts(lead_id);

ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_receipts" ON public.receipts;
CREATE POLICY "select_own_receipts"
  ON public.receipts FOR SELECT
  USING (auth.uid() = azienda_id);

DROP POLICY IF EXISTS "insert_own_receipts" ON public.receipts;
CREATE POLICY "insert_own_receipts"
  ON public.receipts FOR INSERT
  WITH CHECK (auth.uid() = azienda_id);

DROP POLICY IF EXISTS "delete_own_receipts" ON public.receipts;
CREATE POLICY "delete_own_receipts"
  ON public.receipts FOR DELETE
  USING (auth.uid() = azienda_id);


-- =============================================
-- STORAGE BUCKET (ricevute) — privato
-- =============================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('ricevute', 'ricevute', false)
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "storage_select_own" ON storage.objects;
CREATE POLICY "storage_select_own"
  ON storage.objects FOR SELECT
  USING (auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "storage_insert_own" ON storage.objects;
CREATE POLICY "storage_insert_own"
  ON storage.objects FOR INSERT
  WITH CHECK (auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "storage_delete_own" ON storage.objects;
CREATE POLICY "storage_delete_own"
  ON storage.objects FOR DELETE
  USING (auth.uid()::text = (storage.foldername(name))[1]);
