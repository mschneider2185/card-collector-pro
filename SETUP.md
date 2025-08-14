# Card Collector Pro - Setup Guide

## Quick Start Environment Configuration

This guide will get you up and running with the fully functional Card Collector Pro application.

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

### Step 4: Set Up Database Schema

**CRITICAL**: This creates the complete database schema with all tables, triggers, and security policies.

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the entire contents of `database_setup.sql` into the SQL editor
4. Click "Run" to execute the script

This creates:
- **Core Tables**: `users`, `cards`, `user_cards`, `card_uploads` with comprehensive metadata
- **Automatic Triggers**: User profile creation on signup with fallback handling
- **Row Level Security**: Complete RLS policies for data protection
- **Optimized Indexes**: For search performance and filtering
- **Storage Buckets**: Properly configured with access policies

### Step 5: Configure Storage Buckets

In your Supabase dashboard, go to Storage and create these buckets:

1. **card-uploads** (Private)
   - Set to private access with user-only policies
   - Used for user uploads during AI processing
   - Organized by user_id/upload_id.jpg structure

2. **card-images** (Public)
   - Set to public read access
   - Used for verified card images in master database
   - Organized by sport/year/card_id.jpg structure

3. **avatars** (Public read, authenticated write)
   - Set to public read access
   - Users can only write their own avatars
   - Used for user profile pictures

### Step 6: Restart Development Server

After creating the `.env.local` file and setting up the database, restart your development server:

```bash
npm run dev
```

## Advanced Features Setup

### AI Processing (Optional)
For real AI card recognition instead of mock data:
1. Add `OPENAI_API_KEY` to `.env.local` for LLM data extraction
2. Add `GOOGLE_CLOUD_VISION_API_KEY` for enhanced OCR accuracy
3. See `AI_SETUP.md` for detailed instructions

**Note**: The app works perfectly without AI keys - it provides user-friendly fallback messages.

### Mobile Camera Features
The mobile camera integration works out-of-the-box:
- Full-screen camera interface with card guides
- Front/back camera switching
- High-quality image capture (1920x1080)
- Touch-optimized controls for mobile devices

## Troubleshooting

### Common Issues

1. **"Invalid login credentials"**: Check Supabase environment variables in `.env.local`
2. **"400 Bad Request"**: Verify your Supabase project URL and anon key are correct
3. **"Database error saving new user"**: Run `database_setup.sql` in Supabase SQL Editor
4. **"Missing environment variables"**: Create `.env.local` file with required Supabase credentials
5. **Camera not working on mobile**: Check browser permissions and use HTTPS in production

### Verification

To verify your setup is working:

1. Check the browser console for any Supabase-related errors
2. Try signing up with a new email address
3. Check that you receive a confirmation email (if email confirmation is enabled)
4. After signup, you should be automatically logged in without any database errors

## Testing Your Setup

### Basic Functionality Test
1. **Authentication**: Test signup/signin with email and Google OAuth
2. **Mobile Camera**: Try the camera interface on mobile device
3. **Card Upload**: Upload card images (front/back) using drag-drop or camera
4. **AI Processing**: Test with and without AI keys configured
5. **Collection Management**: Add cards to collection and test editing features
6. **Card Database**: Search and browse the master card database

### Production Deployment
- The app is production-ready with comprehensive error handling
- All features work offline-first with graceful degradation
- Mobile camera requires HTTPS in production environments
- Consider setting up monitoring for AI API usage and costs

## Current Feature Status
✅ **Production Ready**: Authentication, Collection Management, Card Database  
✅ **Mobile Optimized**: Camera integration, responsive design  
✅ **AI Enhanced**: OCR + LLM processing with fallbacks  
✅ **Professional UI**: Glassmorphism design, animations, empty states 