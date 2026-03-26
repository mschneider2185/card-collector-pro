# Card Collector Pro

An AI-powered trading card collection platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Upload photos of your cards and GPT-4o Vision automatically identifies the player, year, brand, set, and special attributes.

Live at: **card-collector-pro.vercel.app**

## Features

- **AI Card Recognition**: GPT-4o Vision extracts all card details from front and back images via live SSE streaming
- **Set Completion Tracker**: Search for any trading card set, view the full checklist, and track your progress (powered by Firecrawl + TCDB)
- **Auto Set Matching**: Uploaded cards are automatically matched to set checklists with fuzzy matching (pg_trgm)
- **Mobile Camera Integration**: Native camera access with card frame guides for optimal capture
- **Collection Management**: Full CRUD with inline editing, condition tracking, trade status, and notes
- **Card Database**: Search and browse the master card database with advanced filtering
- **Special Attribute Detection**: Automatic rookie card, autograph, and patch recognition
- **Multi-Provider Auth**: Email/password and Google OAuth

## Tech Stack

- **Frontend**: Next.js 15 App Router, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Storage) with Row-Level Security
- **AI/ML**: OpenAI GPT-4o Vision (card recognition), Firecrawl (set checklist scraping)
- **Deployment**: Vercel Hobby (Edge Runtime for long-running AI calls)

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase project
- OpenAI API key

### 1. Install dependencies

```bash
npm install
```

### 2. Create `.env.local`

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
FIRECRAWL_API_KEY=your_firecrawl_api_key
```

Get your Supabase credentials from: **Supabase Dashboard → Settings → API**

`SUPABASE_SERVICE_ROLE_KEY` is required — the AI route uses it to write processed images to the `card-images` bucket.

### 3. Set up the database

Run `database_setup.sql` in your **Supabase SQL Editor**. This creates all tables, triggers, RLS policies, and indexes.

Tables: `users`, `cards`, `user_cards`, `card_uploads`, `card_sets`, `set_checklist`

### 4. Create storage buckets

In **Supabase Dashboard → Storage**, create three buckets:

| Bucket | Access | Purpose |
|---|---|---|
| `card-uploads` | Private | User uploads during AI processing |
| `card-images` | Public | Processed card images |
| `avatars` | Public | User profile pictures |

Then run `storage_policies.sql` in the SQL Editor to apply RLS policies.

### 5. Configure authentication

In **Supabase Dashboard → Authentication → Settings**:
- Set Site URL to `http://localhost:3000`
- Add redirect URLs: `http://localhost:3000/auth/callback` and your production URL

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
src/
├── app/
│   ├── api/ai/process-card/  # Edge route — SSE streaming AI pipeline
│   ├── auth/                 # Auth pages + OAuth callback
│   ├── cards/                # Card database browsing
│   ├── collection/           # User collection management
│   ├── sets/                 # Set completion tracker + detail views
│   └── upload/               # Card upload + AI processing UI
├── components/               # Reusable React components
├── lib/                      # Supabase client, GPT-4o extraction
└── types/                    # TypeScript types (CardExtractionResult etc.)
```

## Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run lint     # Run ESLint
```

## Deployment

Deployed on Vercel. Push to `main` triggers a production deployment.

**Important**: `NEXT_PUBLIC_*` env vars are baked at build time — changing them in Vercel requires triggering a new deployment (Vercel does not redeploy automatically on env var changes alone).

See `CLAUDE.md` for AI pipeline architecture and development guidelines.

## License

Private and proprietary.
