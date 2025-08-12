-- Fix missing columns in database tables
-- Run this in your Supabase SQL Editor to fix the collection submission issue

-- Update cards table to include AI-analyzed data and additional attributes
ALTER TABLE cards 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB,
ADD COLUMN IF NOT EXISTS rookie BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS autographed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS patch BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS jersey BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS numbered BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS parallel BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS insert BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS short_print BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS error BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS last_updated TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN IF NOT EXISTS source_upload_id UUID REFERENCES card_uploads(id);

-- Update card_uploads table to include missing columns used by AI processing
ALTER TABLE card_uploads 
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS ocr_text TEXT,
ADD COLUMN IF NOT EXISTS processing_metadata JSONB,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Add policies for authenticated users to create cards (needed for AI processing)
DROP POLICY IF EXISTS "Authenticated users can create cards" ON public.cards;
CREATE POLICY "Authenticated users can create cards"
    ON public.cards
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Add policies for authenticated users to update cards (needed for AI processing)  
DROP POLICY IF EXISTS "Authenticated users can update cards" ON public.cards;
CREATE POLICY "Authenticated users can update cards"
    ON public.cards
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_cards_sport_year ON cards(sport, year);
CREATE INDEX IF NOT EXISTS idx_cards_player ON cards(player_name);
CREATE INDEX IF NOT EXISTS idx_cards_brand_series ON cards(brand, series);
CREATE INDEX IF NOT EXISTS idx_cards_rookie ON cards(rookie);
CREATE INDEX IF NOT EXISTS idx_cards_autographed ON cards(autographed);
CREATE INDEX IF NOT EXISTS idx_card_uploads_user_id ON card_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_card_uploads_status ON card_uploads(status);

-- Verify the changes
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name IN ('cards', 'card_uploads')
AND column_name IN ('rookie', 'autographed', 'patch', 'confidence_score', 'ocr_text', 'processing_metadata')
ORDER BY table_name, column_name;
