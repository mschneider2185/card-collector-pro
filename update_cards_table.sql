-- Update cards table to include AI-analyzed data and additional attributes
-- Run this in your Supabase SQL Editor

-- Add missing columns for AI analysis and card attributes
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

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_cards_sport_year ON cards(sport, year);
CREATE INDEX IF NOT EXISTS idx_cards_player ON cards(player_name);
CREATE INDEX IF NOT EXISTS idx_cards_brand_series ON cards(brand, series);
CREATE INDEX IF NOT EXISTS idx_cards_rookie ON cards(rookie);
CREATE INDEX IF NOT EXISTS idx_cards_autographed ON cards(autographed); 