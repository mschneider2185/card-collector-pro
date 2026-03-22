import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smartCardVisionExtraction } from '@/lib/llm-extraction'

export const runtime = 'edge'

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

      await supabase
        .from('cards')
        .update({
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
        })
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
