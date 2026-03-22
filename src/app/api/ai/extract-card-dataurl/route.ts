import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smartCardVisionExtraction } from '@/lib/llm-extraction'

export const runtime = 'edge'

/**
 * Upload a data URL to Supabase Storage (card-images bucket, service role).
 * Returns the public URL.
 */
async function uploadDataUrlToStorage(
  supabaseUrl: string,
  serviceRoleKey: string,
  dataUrl: string,
  path: string
): Promise<string> {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)

  const url = `${supabaseUrl}/storage/v1/object/card-images/${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': mime,
      'x-upsert': 'true'
    },
    body: bytes.buffer
  })
  if (!res.ok) throw new Error(`Storage upload failed: ${res.status} ${res.statusText}`)
  return `${supabaseUrl}/storage/v1/object/public/card-images/${path}`
}

/**
 * POST /api/ai/extract-card-dataurl
 *
 * Accepts front (and optional back) card images as data URLs.
 * Runs smartCardVisionExtraction for maximum accuracy using both sides.
 * If cardId is provided, updates the cards table record in-place —
 * including uploading the back image to card-images and storing back_image_url.
 *
 * Body: { frontDataUrl: string, backDataUrl?: string | null, cardId?: string | null }
 * Response: CardExtractionResult
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    frontDataUrl?: string
    backDataUrl?: string | null
    cardId?: string | null
  }

  const { frontDataUrl, backDataUrl, cardId } = body

  if (!frontDataUrl || !frontDataUrl.startsWith('data:')) {
    return new Response(
      JSON.stringify({ error: 'frontDataUrl is required and must be a data URL' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const result = await smartCardVisionExtraction({
      frontDataUrl,
      backDataUrl: backDataUrl || null
    })

    if (cardId) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const supabase = createClient(supabaseUrl, serviceRoleKey)

      const c = result
      const parsedYear = c.year ? parseInt(c.year, 10) : null

      // Upload back image to card-images if provided
      let backImageUrl: string | null = null
      if (backDataUrl?.startsWith('data:')) {
        try {
          const ext = backDataUrl.startsWith('data:image/png') ? 'png' : 'jpg'
          backImageUrl = await uploadDataUrlToStorage(
            supabaseUrl,
            serviceRoleKey,
            backDataUrl,
            `card-backs/${cardId}.${ext}`
          )
        } catch (uploadErr) {
          console.error('Failed to upload back image:', uploadErr)
          // Non-fatal — proceed without back image URL
        }
      }

      const updatePayload: Record<string, unknown> = {
        sport: c.sport ?? null,
        year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
        brand: c.card_brand ?? null,
        series: c.set_name ?? null,
        set_number: c.set_name ?? null,
        card_number: c.card_number ?? null,
        player_name: c.player_name ?? null,
        team: c.team_name ?? null,
        position: c.position ?? null,
        confidence_score: c.confidence ?? null,
        ocr_text: c.raw_ocr_text ?? null,
        rookie: c.attributes?.rookie ?? false,
        autographed: c.attributes?.autographed ?? false,
        patch: c.attributes?.patch ?? false,
        last_updated: new Date().toISOString()
      }

      if (backImageUrl) {
        updatePayload.back_image_url = backImageUrl
      }

      await supabase
        .from('cards')
        .update(updatePayload)
        .eq('id', cardId)
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('extract-card-dataurl error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
