# Card Collector Pro - Setup Guide

## Environment Configuration

To fix the authentication errors, you need to configure your Supabase environment variables.

### Step 1: Create Environment File

Create a `.env.local` file in the `card-collector-pro/` directory with the following content:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Optional: Service role key for admin operations
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Optional: OpenAI API key for future AI features
OPENAI_API_KEY=your_openai_api_key_here
```

### Step 2: Get Your Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Once your project is created, go to Settings > API
3. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Step 3: Configure Authentication

In your Supabase project:

1. Go to Authentication > Settings
2. Add your domain to "Site URL" (e.g., `http://localhost:3000` for development)
3. Add redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `http://localhost:3001/auth/callback` (if using port 3001)

### Step 4: Set Up Database Tables and Triggers

**This is crucial to fix the "Database error saving new user" issue!**

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `database_setup.sql` into the SQL editor
4. Click "Run" to execute the script

This will create:
- All required database tables (`users`, `cards`, `user_cards`, `card_uploads`)
- The trigger that automatically creates a user profile when someone signs up
- Row Level Security (RLS) policies for data protection

### Step 5: Create Storage Buckets

In your Supabase dashboard, go to Storage and create these buckets:

1. **card-uploads** (Public)
   - Set to public access
   - Used for user uploads before processing

2. **card-images** (Public)
   - Set to public access
   - Used for verified card images

3. **avatars** (Public read, user write)
   - Set to public read access
   - Used for user profile pictures

### Step 6: Restart Development Server

After creating the `.env.local` file and setting up the database, restart your development server:

```bash
npm run dev
```

## Troubleshooting

### Common Issues

1. **"Invalid login credentials" error**: This usually means the Supabase environment variables are not configured correctly.

2. **"400 Bad Request" error**: Check that your Supabase project URL and anon key are correct.

3. **"Database error saving new user" error**: This means the database tables and triggers haven't been set up. Run the `database_setup.sql` script in your Supabase SQL Editor.

4. **"Missing Supabase environment variables" console error**: Create the `.env.local` file as described above.

### Verification

To verify your setup is working:

1. Check the browser console for any Supabase-related errors
2. Try signing up with a new email address
3. Check that you receive a confirmation email (if email confirmation is enabled)
4. After signup, you should be automatically logged in without any database errors

## Next Steps

Once authentication is working:

1. Test the signup and signin functionality
2. Upload some sample cards to test the collection features
3. Explore the card browsing and search features

For more details, see the main project documentation. 