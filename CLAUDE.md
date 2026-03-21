# Card Collector Pro - Claude Code Context

## Project Overview
Trading card collection platform. Next.js 15, Supabase, TypeScript, Tailwind CSS.
Live at: card-collector-pro.vercel.app

## Current State (March 2026)
- Supabase project: card-collector-pro-v2, project ref: gbsqgodoyuxsnaxnxjiq
- Database fully built and live
- Vercel deployment live and working, pointing to correct Supabase project
- Auth working: email/password + Google OAuth
- AI pipeline working: GPT-4o Vision (no Google Vision)
- Supabase MCP is connected in Cursor

## AI Pipeline - Architecture
Upload front image (+ optional back) → send both directly to GPT-4o Vision
in one API call → returns structured CardExtractionResult JSON →
confirmation form → save to user_cards table

No Google Vision. No separate OCR step. Just GPT-4o Vision doing everything.

## Key Files
- src/app/api/ai/process-card/route.ts — AI processing route
- src/app/upload/page.tsx — upload UI (stores storage paths in state, uses signed URLs for preview)
- src/app/auth/callback/route.ts — OAuth callback (uses @supabase/ssr, sets cookies on response)
- src/lib/llm-extraction.ts — GPT-4o Vision extraction (smartCardVisionExtraction)
- src/lib/supabase.ts — Supabase browser client (createBrowserClient from @supabase/ssr)
- src/types/index.ts — TypeScript types including CardExtractionResult
- storage_policies.sql — RLS policies for storage buckets

## Database Schema
Tables: users, cards, user_cards, card_uploads
Storage: card-uploads (private), card-images (public), avatars (public)
Auth: email/password + Google OAuth

## Important Implementation Notes
- Supabase client uses createBrowserClient (@supabase/ssr) — cookie-based sessions
- Auth callback uses createServerClient (@supabase/ssr) with cookies set on the response object
- card-uploads is private; use createSignedUrl for previews, never getPublicUrl
- card-images is public; service role writes to it from the API route after processing
- NEXT_PUBLIC_* env vars are baked at build time — env var changes require a new Vercel deployment

## Do Not
- Do not use Google Cloud Vision API
- Do not use Docker or Supabase Edge Functions
- Do not commit .env.local
- Do not install Supabase CLI via npm (it blocks global install)
- Do not use getPublicUrl on card-uploads bucket (it's private)
- Do not switch back to createClient from @supabase/supabase-js (breaks cookie-based auth)

## Environment Variables (all set in Vercel + .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://gbsqgodoyuxsnaxnxjiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
