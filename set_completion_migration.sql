-- =============================================================================
-- Set Completion Tracking Migration
-- Card Collector Pro — Supabase PostgreSQL
--
-- Adds: card_sets, card_set_memberships, user_set_completion (view)
-- Does NOT modify: users, cards, user_cards, card_uploads
--
-- RLS pattern (matches existing "cards" table pattern):
--   - Authenticated users can SELECT all rows (global catalog, not user-owned)
--   - No INSERT/UPDATE/DELETE policy for authenticated/anon roles
--   - Service role key (used by API routes) bypasses RLS and handles all writes
-- =============================================================================


-- =============================================================================
-- 1. card_sets
--    Master catalog of sets, subsets, and parallel/insert families.
--    A "subset" is any row where parent_set_id IS NOT NULL.
--    Examples:
--      Base set:  { name: "Series 1", brand: "Topps", year: 2020, sport: "Baseball",
--                   total_cards: 200, card_number_range: "1-200", subset_type: "base" }
--      Subset:    { name: "Series 1 Rookie Variations", ..., subset_type: "rookies",
--                   parent_set_id: <base set uuid> }
--      Insert:    { name: "Chrome Refractor", ..., subset_type: "inserts",
--                   parent_set_id: <base set uuid> }
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_sets (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Core identity
    name                TEXT        NOT NULL,
    brand               TEXT        NOT NULL,
    year                INTEGER     NOT NULL CHECK (year >= 1860 AND year <= 2100),
    sport               TEXT        NOT NULL,

    -- Card count — NULL is valid when the full checklist is not yet known
    total_cards         INTEGER     CHECK (total_cards IS NULL OR total_cards > 0),

    -- Human-readable range string, e.g. "1-200", "RC-1–RC-50", "NNO"
    card_number_range   TEXT,

    -- Categorisation of this set/subset
    -- Allowed values: 'base', 'rookies', 'inserts', 'parallels', 'autographs',
    --                 'relics', 'short_prints', 'variations', 'other'
    subset_type         TEXT        NOT NULL DEFAULT 'base'
                            CHECK (subset_type IN (
                                'base', 'rookies', 'inserts', 'parallels',
                                'autographs', 'relics', 'short_prints',
                                'variations', 'other'
                            )),

    -- Self-referencing FK: NULL = top-level set, non-NULL = subset of another set
    parent_set_id       UUID        REFERENCES public.card_sets(id) ON DELETE SET NULL,

    created_at          TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at          TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enforce uniqueness: same brand+name+year+sport+subset_type cannot be duplicated
-- (allows "Topps Series 1 2020 Baseball base" and "Topps Series 1 2020 Baseball inserts"
--  to coexist as separate rows, which is the correct model)
CREATE UNIQUE INDEX IF NOT EXISTS uidx_card_sets_identity
    ON public.card_sets (brand, name, year, sport, subset_type);

-- Index for filtering by parent (fetching all subsets of a given set)
CREATE INDEX IF NOT EXISTS idx_card_sets_parent_set_id
    ON public.card_sets (parent_set_id)
    WHERE parent_set_id IS NOT NULL;

-- Indexes for the most common filter axes
CREATE INDEX IF NOT EXISTS idx_card_sets_year   ON public.card_sets (year);
CREATE INDEX IF NOT EXISTS idx_card_sets_brand  ON public.card_sets (brand);
CREATE INDEX IF NOT EXISTS idx_card_sets_sport  ON public.card_sets (sport);

-- Keep updated_at current automatically
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_card_sets_updated_at ON public.card_sets;
CREATE TRIGGER trg_card_sets_updated_at
    BEFORE UPDATE ON public.card_sets
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();


-- =============================================================================
-- 2. card_set_memberships
--    Many-to-many join between cards and card_sets.
--    A single physical card can belong to multiple sets simultaneously:
--      - its parent base set (e.g. 2020 Topps Series 1)
--      - a subset it is part of (e.g. 2020 Topps Series 1 Rookie Variations)
--    The composite PK (card_id, set_id) prevents duplicate memberships.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.card_set_memberships (
    card_id     UUID    NOT NULL REFERENCES public.cards(id)     ON DELETE CASCADE,
    set_id      UUID    NOT NULL REFERENCES public.card_sets(id) ON DELETE CASCADE,

    -- Optional: the card's position number within this specific set/subset,
    -- which may differ from the card's global card_number on the cards table.
    -- E.g. an insert numbered "RC-12" within its insert set.
    set_card_number     TEXT,

    created_at  TIMESTAMP WITH TIME ZONE DEFAULT now(),

    PRIMARY KEY (card_id, set_id)
);

-- Index on set_id for efficient "give me all cards in set X" queries
-- (card_id is covered by the PK index in the leading position already)
CREATE INDEX IF NOT EXISTS idx_card_set_memberships_set_id
    ON public.card_set_memberships (set_id);

-- Index on card_id for efficient "which sets does card X belong to" queries
CREATE INDEX IF NOT EXISTS idx_card_set_memberships_card_id
    ON public.card_set_memberships (card_id);


-- =============================================================================
-- 3. Enable Row Level Security
-- =============================================================================

ALTER TABLE public.card_sets            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_set_memberships ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 4. RLS Policies
--
--    Pattern mirrors the existing "cards" table:
--      SELECT: any authenticated user (global catalog)
--      INSERT/UPDATE/DELETE: no policy for authenticated role
--                            (service role key bypasses RLS — used by API routes)
-- =============================================================================

-- card_sets: read access
DROP POLICY IF EXISTS "Authenticated read access to card_sets" ON public.card_sets;
CREATE POLICY "Authenticated read access to card_sets"
    ON public.card_sets
    FOR SELECT
    TO authenticated
    USING (true);

-- card_set_memberships: read access
DROP POLICY IF EXISTS "Authenticated read access to card_set_memberships"
    ON public.card_set_memberships;
CREATE POLICY "Authenticated read access to card_set_memberships"
    ON public.card_set_memberships
    FOR SELECT
    TO authenticated
    USING (true);


-- =============================================================================
-- 5. user_set_completion VIEW
--
--    Returns one row per (user_id, set_id) combination.
--    cards_owned = distinct cards the user owns that are members of this set.
--    A user who owns 3 copies of the same card still counts as owning 1 distinct
--    card for completion purposes (DISTINCT on card_id).
--    completion_percentage is NULL when total_cards is NULL (checklist unknown).
--
--    Security: this is a regular view (not SECURITY DEFINER), so it inherits
--    the caller's RLS context. user_cards already restricts to auth.uid() = user_id,
--    so each user naturally sees only their own rows.
-- =============================================================================

CREATE OR REPLACE VIEW public.user_set_completion AS
SELECT
    uc.user_id,
    cs.id                                               AS set_id,
    cs.name                                             AS set_name,
    cs.brand,
    cs.year,
    cs.sport,
    cs.subset_type,
    cs.parent_set_id,
    cs.card_number_range,
    cs.total_cards,
    COUNT(DISTINCT uc.card_id)::INTEGER                 AS cards_owned,
    CASE
        WHEN cs.total_cards IS NULL OR cs.total_cards = 0 THEN NULL
        ELSE ROUND(
            (COUNT(DISTINCT uc.card_id)::NUMERIC / cs.total_cards) * 100,
            2
        )
    END                                                 AS completion_percentage
FROM public.user_cards          uc
JOIN public.cards               c   ON c.id  = uc.card_id
JOIN public.card_set_memberships csm ON csm.card_id = c.id
JOIN public.card_sets           cs  ON cs.id = csm.set_id
GROUP BY
    uc.user_id,
    cs.id,
    cs.name,
    cs.brand,
    cs.year,
    cs.sport,
    cs.subset_type,
    cs.parent_set_id,
    cs.card_number_range,
    cs.total_cards;

-- Grant SELECT on the view to authenticated role (same as base tables)
GRANT SELECT ON public.user_set_completion TO authenticated;


-- =============================================================================
-- 6. Verification queries (review output after running migration)
-- =============================================================================

-- Confirm tables exist
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('card_sets', 'card_set_memberships')
ORDER BY table_name;

-- Confirm view exists
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'user_set_completion';

-- Confirm indexes
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('card_sets', 'card_set_memberships')
ORDER BY tablename, indexname;

-- Confirm RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('card_sets', 'card_set_memberships')
ORDER BY tablename, policyname;
