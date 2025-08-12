-- Create Users Table (if missing)
-- This is likely the missing piece causing the "Database error saving new user" issue

CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policy
CREATE POLICY IF NOT EXISTS "Users can read their own profile"
    ON public.users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Verify the table was created
SELECT 'Users table created/verified successfully' as status; 