import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smartSheetVisionExtraction } from '@/lib/llm-extraction'
import type { ProcessedBatchCard } from '@/types'

export const runtime = 'edge'

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 8192
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function toDataUrl(buffer: ArrayBuffer, mime: string): string {
  return `data:${mime};base64,${arrayBufferToBase64(buffer)}`
}

async function fetchSignedUrl(
  signedUrl: string,
  fallbackMime: string
): Promise<{ buffer: ArrayBuffer; mime: string }> {
  const res = await fetch(signedUrl)
  if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`)
  return {
    buffer: await res.arrayBuffer(),
    mime: res.headers.get('content-type') || fallbackMime
  }
}

async function storageUpload(
  supabaseUrl: string,
  serviceRoleKey: string,
  bucket: string,
  path: string,
  buffer: ArrayBuffer,
  mime: string
): Promise<string> {
  const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${serviceRoleKey}`,
      apikey: serviceRoleKey,
      'Content-Type': mime,
      'x-upsert': 'true'
    },
    body: buffer
  })
  if (!res.ok) throw new Error(`Failed to upload ${path}: ${res.status} ${res.statusText}`)
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`
}

export async function POST(request: NextRequest) {
  const { batchId, uploadId, sheetSignedUrl, imagePath, cropDataUrls } = await request.json() as {
    batchId: string
    uploadId: string
    sheetSignedUrl: string
    imagePath: string
    cropDataUrls?: string[]
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
      }

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
      const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
      const supabase = createClient(supabaseUrl, serviceRoleKey)

      try {
        if (!batchId || !uploadId || !sheetSignedUrl || !imagePath) {
          send({ status: 'failed', error: 'batchId, uploadId, sheetSignedUrl, and imagePath are required' })
          controller.close()
          return
        }

        await supabase
          .from('card_uploads')
          .update({ status: 'processing', processed_at: new Date().toISOString() })
          .eq('id', uploadId)

        send({ step: 'Checking image quality...' })

        const { buffer, mime } = await fetchSignedUrl(sheetSignedUrl, mimeFromPath(imagePath))
        const sheetDataUrl = toDataUrl(buffer, mime)

        send({ step: 'Extracting cards from grid...' })

        const sheetResult = await smartSheetVisionExtraction(sheetDataUrl, {
          model: 'gpt-4o',
          temperature: 0.1,
          maxTokens: 6000
        })

        if (!sheetResult.grid_detected) {
          await supabase
            .from('card_uploads')
            .update({
              status: 'failed',
              error_message: 'No recognizable 3×3 grid detected in image',
              completed_at: new Date().toISOString()
            })
            .eq('id', uploadId)

          send({ type: 'error', reason: 'no_grid_detected' })
          controller.close()
          return
        }

        // Upload per-card crop images if provided by the client
        const cropImageUrls: string[] = Array(9).fill('')
        if (Array.isArray(cropDataUrls) && cropDataUrls.length > 0) {
          for (let i = 0; i < 9; i++) {
            const dataUrl = cropDataUrls[i]
            if (!dataUrl || !dataUrl.startsWith('data:')) continue
            try {
              const [header, b64] = dataUrl.split(',')
              const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
              const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
              const binary = atob(b64)
              const bytes = new Uint8Array(binary.length)
              for (let j = 0; j < binary.length; j++) bytes[j] = binary.charCodeAt(j)
              cropImageUrls[i] = await storageUpload(
                supabaseUrl,
                serviceRoleKey,
                'card-images',
                `batch/${batchId}/pos${i}.${ext}`,
                bytes.buffer,
                mime
              )
            } catch (cropErr) {
              console.error(`Failed to upload crop for position ${i}:`, cropErr)
            }
          }
        }

        // Emit per-card progress events so the UI can populate slots incrementally
        for (const cardPos of sheetResult.cards) {
          send({ type: 'card_progress', position: cardPos.position, card: cardPos })
        }

        send({ step: 'Publishing sheet image...' })

        const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg'
        const sheetPublicUrl = await storageUpload(
          supabaseUrl,
          serviceRoleKey,
          'card-images',
          `batch/${batchId}/sheet.${ext}`,
          buffer,
          mime
        )

        send({ step: 'Saving card records...' })

        // Upsert each recognised card into the cards table
        const processedCards: ProcessedBatchCard[] = []

        for (const cardPos of sheetResult.cards) {
          if (!cardPos.card?.player_name) {
            processedCards.push({
              position: cardPos.position,
              card_id: null,
              needs_review: cardPos.needs_review
            })
            continue
          }

          const c = cardPos.card
          const parsedYear = c.year ? parseInt(c.year, 10) : null
          const cardData = {
            sport: c.sport ?? null,
            year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
            brand: c.card_brand ?? null,
            series: c.set_name ?? null,
            set_number: c.set_name ?? null,
            card_number: c.card_number ?? null,
            player_name: c.player_name ?? null,
            team: c.team_name ?? null,
            position: c.position ?? null,
            variation: '',
            image_url: cropImageUrls[cardPos.position] || sheetPublicUrl,
            front_image_url: cropImageUrls[cardPos.position] || sheetPublicUrl,
            confidence_score: c.confidence ?? 0.5,
            image_quality_score: c.image_quality?.score ?? null,
            ocr_text: c.raw_ocr_text ?? '',
            processing_metadata: {
              vision_model: 'gpt-4o',
              batch_id: batchId,
              sheet_position: cardPos.position,
              batch_confidence: cardPos.confidence
            },
            rookie: c.attributes?.rookie ?? false,
            autographed: c.attributes?.autographed ?? false,
            patch: c.attributes?.patch ?? false,
            source_upload_id: uploadId
          }

          // Dedup by (sport, year, brand, player_name, card_number)
          const { data: existing } = await supabase
            .from('cards')
            .select('id')
            .eq('sport', cardData.sport)
            .eq('year', cardData.year)
            .eq('brand', cardData.brand)
            .eq('player_name', cardData.player_name)
            .eq('card_number', cardData.card_number)
            .maybeSingle()

          let cardId: string | null = null

          if (existing) {
            await supabase
              .from('cards')
              .update({ ...cardData, last_updated: new Date().toISOString() })
              .eq('id', existing.id)
            cardId = existing.id
          } else {
            const { data: inserted } = await supabase
              .from('cards')
              .insert(cardData)
              .select('id')
              .single()
            cardId = inserted?.id ?? null
          }

          processedCards.push({
            position: cardPos.position,
            card_id: cardId,
            needs_review: cardPos.needs_review
          })
        }

        await supabase
          .from('card_uploads')
          .update({
            status: 'completed',
            extracted_data: sheetResult as unknown as Record<string, unknown>,
            processing_metadata: {
              vision_model: 'gpt-4o',
              batch_id: batchId,
              sheet_cards: processedCards.length,
              recognised_cards: processedCards.filter(p => p.card_id).length
            },
            completed_at: new Date().toISOString()
          })
          .eq('id', uploadId)

        send({ status: 'completed', cards: sheetResult.cards, processedCards })
      } catch (error) {
        console.error('Sheet processing error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'

        await supabase
          .from('card_uploads')
          .update({
            status: 'failed',
            error_message: message,
            completed_at: new Date().toISOString()
          })
          .eq('id', uploadId)

        send({ status: 'failed', error: message })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  })
}
