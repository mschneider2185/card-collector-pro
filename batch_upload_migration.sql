-- Batch Upload Migration
-- Run this in the Supabase SQL Editor to enable batch scanning support.
-- Safe to run multiple times (uses IF NOT EXISTS / ALTER ... IF NOT EXISTS pattern).

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add batch_id column to card_uploads
--    Groups all 9 upload records from a single sheet-scan session so the
--    entire batch can be reviewed or deleted together.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.card_uploads
  ADD COLUMN IF NOT EXISTS batch_id UUID;

-- Index speeds up "fetch all records for this batch" queries
CREATE INDEX IF NOT EXISTS card_uploads_batch_id_idx ON public.card_uploads (batch_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add back_image_path column (may already exist in live DB from prior work)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.card_uploads
  ADD COLUMN IF NOT EXISTS back_image_path TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Add processing columns (may already exist in live DB)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.card_uploads
  ADD COLUMN IF NOT EXISTS confidence_score DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS ocr_text TEXT,
  ADD COLUMN IF NOT EXISTS processing_metadata JSONB,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verify RLS policies cover batch inserts
--    The existing "Users can insert their own uploads" policy uses
--    (user_id = auth.uid()) which covers batch inserts automatically —
--    no additional policy needed.
--    Run the SELECT below to confirm the policy exists.
-- ─────────────────────────────────────────────────────────────────────────────
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'card_uploads'
ORDER BY policyname;
