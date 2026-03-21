# Card Collector Pro - Claude Code Context

## Vision & Strategy
See VISION.md for the full product vision, phase roadmap, and agent team structure.

## Project Overview
Trading card collection platform. Next.js 15, Supabase, TypeScript, Tailwind CSS.
Live at: card-collector-pro.vercel.app

## Current State (March 2026)
- Supabase project: card-collector-pro-v2, project ref: gbsqgodoyuxsnaxnxjiq
- Database fully built and live
- Vercel deployment live and working (Hobby plan)
- Auth working: email/password + Google OAuth
- AI pipeline working: GPT-4o Vision via Edge Runtime SSE streaming
- Supabase MCP is connected in Cursor

## AI Pipeline - Architecture
Upload front image (+ optional back) → client creates upload record in card_uploads →
client passes storage paths + pre-signed preview URLs to Edge Route →
Edge Route streams SSE events (step-by-step status) back to client →
verifyCardMatch (GPT-4o) confirms front/back are same card →
smartCardVisionExtraction (GPT-4o Vision) returns structured CardExtractionResult JSON →
publish images to card-images bucket → upsert cards table →
client reads stream and auto-populates confirmation form → save to user_cards table

No Google Vision. No separate OCR step. Just GPT-4o Vision doing everything.

## Why Edge Runtime + SSE Streaming
Vercel Hobby plan caps Node.js serverless functions at ~10s. GPT-4o Vision calls
take 15-30s total. Edge Runtime allows streaming up to 300s on Hobby.
The route streams SSE events so the client sees live step updates instead of a spinner.

## Key Files
- src/app/api/ai/process-card/route.ts — AI processing Edge route (SSE streaming)
- src/app/api/ai/process-card/[uploadId]/route.ts — Status polling endpoint (kept for reference)
- src/app/upload/page.tsx — upload UI; reads SSE stream for live status; passes signed URLs to API
- src/app/auth/callback/route.ts — OAuth callback (uses @supabase/ssr, sets cookies on response)
- src/lib/llm-extraction.ts — GPT-4o Vision extraction (smartCardVisionExtraction + verifyCardMatch)
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
- process-card route uses `export const runtime = 'edge'` — must use Web APIs not Node.js Buffer
- Edge Runtime: @supabase/supabase-js storage .download() and raw sign endpoint both fail with 400.
  Workaround: client passes pre-signed URLs (already created for preview) to the Edge function,
  which fetches them with native fetch (no auth headers needed — token is in the URL)
- Image upload to card-images uses raw fetch POST to Supabase Storage REST API
- AuthButton uses getSession() (fast, reads cookie) not getUser() (slow network call) for initial load

## Do Not
- Do not use Google Cloud Vision API
- Do not use Docker or Supabase Edge Functions
- Do not commit .env.local
- Do not install Supabase CLI via npm (it blocks global install)
- Do not use getPublicUrl on card-uploads bucket (it's private)
- Do not switch back to createClient from @supabase/supabase-js (breaks cookie-based auth)
- Do not use Node.js Buffer in the process-card Edge route (use ArrayBuffer/Uint8Array/btoa)
- Do not use @supabase/supabase-js storage .download() in Edge Runtime (returns 400/Bucket not found)
- Do not use waitUntil() or after() for background processing — neither executes reliably on Vercel Hobby

## Environment Variables (all set in Vercel + .env.local)
NEXT_PUBLIC_SUPABASE_URL=https://gbsqgodoyuxsnaxnxjiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
OPENAI_API_KEY
