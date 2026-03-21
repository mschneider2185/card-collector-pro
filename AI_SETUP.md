# AI Processing Setup Guide

Card Collector Pro uses GPT-4o Vision for all card recognition — one API call handles
both image reading and structured data extraction. No Google Vision needed.

## Required API Key

### OpenAI API Key
```
OPENAI_API_KEY=your_openai_api_key_here
```

**How to get it:**
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Go to API Keys → Create a new API key
4. Add it to your `.env.local` file and to Vercel environment variables

## Full Environment Configuration

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://gbsqgodoyuxsnaxnxjiq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# AI Processing (Required for card recognition)
OPENAI_API_KEY=your_openai_api_key_here
```

## AI Pipeline Architecture

Single-stage pipeline — no separate OCR step.

1. User uploads front image (+ optional back) to private `card-uploads` bucket
2. API route downloads images using service role key
3. Both images sent to **GPT-4o Vision** in one API call
4. Returns structured `CardExtractionResult` JSON (player, team, year, brand, attributes, etc.)
5. Images re-uploaded to public `card-images` bucket
6. Card record written to `cards` table, user confirms/edits, saved to `user_cards`

## Without an OpenAI Key

The app will fail AI processing and show an error. Manual card entry form is available
as a fallback — all other features (collection management, browsing, auth) work normally.

## Cost Estimate

- **GPT-4o**: ~$0.005–0.01 per card processed (front + back images)
- 100 cards/month ≈ $0.50–$1.00

## Troubleshooting

### "AI processing failed"
- Verify `OPENAI_API_KEY` is set in Vercel environment variables
- After updating env vars in Vercel, trigger a new deployment (NEXT_PUBLIC_* vars are baked at build time)
- Check Vercel function logs for the specific error

### Processing times out
- GPT-4o Vision typically responds in 3–8 seconds
- Vercel serverless function limit is 60 seconds — well within range
