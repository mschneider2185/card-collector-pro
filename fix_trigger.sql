-- Fix the incorrectly configured trigger
-- The trigger exists but is attached to the wrong table

-- 1. Drop the incorrectly configured trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

-- 2. Create the trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.users (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create the trigger on the correct table (auth.users)
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Verification
SELECT 'Trigger fixed and created successfully on auth.users' as status; 