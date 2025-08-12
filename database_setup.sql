-- Card Collector Pro Database Setup
-- Run this script in your Supabase SQL Editor

-- ========================================
-- 1. CREATE TABLES
-- ========================================

-- Users table (extended profiles)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Cards table (canonical master database)
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sport TEXT,
    year INTEGER,
    brand TEXT,
    series TEXT,
    set_number TEXT,
    card_number TEXT,
    player_name TEXT,
    team TEXT,
    position TEXT,
    variation TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User cards table (individual collection entries)
CREATE TABLE IF NOT EXISTS public.user_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
    quantity INTEGER DEFAULT 1,
    condition TEXT,
    is_for_trade BOOLEAN DEFAULT false,
    notes TEXT,
    acquired_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Card uploads table (raw uploads for processing)
CREATE TABLE IF NOT EXISTS public.card_uploads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    image_path TEXT,
    status TEXT DEFAULT 'pending',
    extracted_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- 2. CREATE TRIGGER FOR NEW USERS
-- ========================================

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.card_uploads ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 4. CREATE RLS POLICIES
-- ========================================

-- Users table policies
CREATE POLICY "Users can read their own profile"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.users
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Cards table policies (public read access)
CREATE POLICY "Authenticated read access to cards"
    ON public.cards
    FOR SELECT
    TO authenticated
    USING (true);

-- User cards table policies
CREATE POLICY "Users can read their own cards"
    ON public.user_cards
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cards"
    ON public.user_cards
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cards"
    ON public.user_cards
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cards"
    ON public.user_cards
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Card uploads table policies
CREATE POLICY "Users can view their own uploads"
    ON public.card_uploads
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own uploads"
    ON public.card_uploads
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own uploads"
    ON public.card_uploads
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own uploads"
    ON public.card_uploads
    FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- ========================================
-- 5. CREATE STORAGE BUCKETS (if needed)
-- ========================================

-- Note: Storage buckets need to be created manually in the Supabase dashboard
-- or via the Supabase CLI. The buckets needed are:
-- - card-uploads (private)
-- - card-images (public)
-- - avatars (public read, user write)

-- ========================================
-- 6. VERIFICATION QUERIES
-- ========================================

-- Check if tables were created successfully
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'cards', 'user_cards', 'card_uploads')
ORDER BY table_name;

-- Check if trigger was created
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created';

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 