-- Check and fix authentication triggers
-- First, let's see what triggers actually exist

-- 1. Check all triggers in the database
SELECT 
    trigger_name,
    event_object_table,
    event_object_schema,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_name LIKE '%auth%' OR trigger_name LIKE '%user%';

-- 2. Check if the function exists
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'handle_new_user';

-- 3. Drop ALL existing triggers that might be interfering
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON public.users;

-- 4. Recreate the function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- Add error handling
    BEGIN
        INSERT INTO public.users (id)
        VALUES (NEW.id);
    EXCEPTION WHEN OTHERS THEN
        -- Log the error but don't fail the auth process
        RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    END;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 6. Verify the trigger was created
SELECT 
    trigger_name,
    event_object_table,
    event_object_schema
FROM information_schema.triggers 
WHERE trigger_name = 'on_auth_user_created'; 