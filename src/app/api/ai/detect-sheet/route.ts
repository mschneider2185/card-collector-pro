import { NextRequest } from 'next/server'
import { detectCardQuads } from '@/lib/llm-extraction'

export const runtime = 'edge'

/**
 * POST /api/ai/detect-sheet
 *
 * Accepts a sheet image as a data URL and returns bounding quadrilaterals
 * for each of the 9 card pockets. Fast detection-only call — no SSE needed.
 *
 * Body: { sheetDataUrl: string }
 * Response: DetectionResult JSON
 */
export async function POST(request: NextRequest) {
  try {
    const { sheetDataUrl } = (await request.json()) as { sheetDataUrl: string }

    if (!sheetDataUrl || !sheetDataUrl.startsWith('data:')) {
      return new Response(
        JSON.stringify({ error: 'sheetDataUrl is required and must be a data URL' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await detectCardQuads(sheetDataUrl)

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('detect-sheet error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
