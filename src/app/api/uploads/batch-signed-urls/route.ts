import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * POST /api/uploads/batch-signed-urls
 *
 * Generates up to 9 pre-signed upload URLs for the card-uploads bucket in a single request.
 * Also creates a batchId UUID that groups all upload records from this scan session.
 *
 * Body: { count: number (1-9), userId: string }
 * Response: { batchId: string, urls: Array<{ position: number, path: string, signedUrl: string, token: string }> }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { count?: number; userId?: string }
  const { count = 1, userId } = body

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const clampedCount = Math.min(9, Math.max(1, Math.floor(count)))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const batchId = crypto.randomUUID()
  const timestamp = Date.now()
  const urls: Array<{ position: number; path: string; signedUrl: string; token: string }> = []

  for (let i = 0; i < clampedCount; i++) {
    const path = `${userId}/${batchId}/pos${i}_${timestamp}.jpg`

    const { data, error } = await supabase.storage
      .from('card-uploads')
      .createSignedUploadUrl(path)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    urls.push({
      position: i,
      path,
      signedUrl: data.signedUrl,
      token: data.token
    })
  }

  return NextResponse.json({ batchId, urls })
}
