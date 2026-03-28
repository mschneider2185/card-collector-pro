import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { batchExtractCroppedCards } from '@/lib/llm-extraction'
import type { ProcessedBatchCard } from '@/types'

export const runtime = 'edge'

type CardSetSubsetType = 'base' | 'rookies' | 'inserts' | 'parallels' | 'autographs' | 'relics' | 'short_prints' | 'variations' | 'other'

function inferSubsetType(
  setName: string,
  attributes?: { rookie?: boolean; autographed?: boolean; patch?: boolean }
): CardSetSubsetType {
  const lower = setName.toLowerCase()
  if (attributes?.autographed) return 'autographs'
  if (attributes?.patch) return 'relics'
  if (lower.includes('refractor') || lower.includes('parallel') || lower.includes('prizm')) return 'parallels'
  if (lower.includes('insert')) return 'inserts'
  if (lower.includes('rookie variation')) return 'rookies'
  return 'base'
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

/**
 * POST /api/ai/process-batch
 *
 * Accepts pre-cropped card images (data URLs) from the client-side perspective warp.
 * Sends them all in one GPT-4o call, then upserts each card into the DB.
 * Streams SSE events for progress.
 *
 * Body: { croppedDataUrls: (string|null)[], batchId: string, userId: string, imagePaths?: string[] }
 */
export async function POST(request: NextRequest) {
  const { croppedDataUrls, batchId, userId, imagePaths } = (await request.json()) as {
    croppedDataUrls: (string | null)[]
    batchId: string
    userId: string
    imagePaths?: string[]
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
        if (!batchId || !userId || !Array.isArray(croppedDataUrls)) {
          send({ status: 'failed', error: 'batchId, userId, and croppedDataUrls are required' })
          controller.close()
          return
        }

        send({ step: 'Extracting card details from cropped images...' })

        const sheetResult = await batchExtractCroppedCards(croppedDataUrls, {
          model: 'gpt-4o',
          temperature: 0.1,
          maxTokens: 5000
        })

        // Emit per-card progress so the UI can populate slots incrementally
        for (const cardPos of sheetResult.cards) {
          send({ type: 'card_progress', position: cardPos.position, card: cardPos })
        }

        send({ step: 'Uploading cropped images...' })

        // Upload cropped card images to card-images bucket
        const cropImageUrls: string[] = Array(9).fill('')
        for (let i = 0; i < 9; i++) {
          const dataUrl = croppedDataUrls[i]
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

        send({ step: 'Saving card records...' })

        // Upsert each recognised card into the cards table
        const processedCards: ProcessedBatchCard[] = []

        // Create a single upload record for the batch
        const { data: uploadRecord } = await supabase
          .from('card_uploads')
          .insert({
            user_id: userId,
            image_path: imagePaths?.[0] ?? `batch/${batchId}/sheet`,
            status: 'processing',
            processing_metadata: { batch_id: batchId, pipeline: 'two-phase' },
            processed_at: new Date().toISOString()
          })
          .select('id')
          .single()

        const uploadRecordId = uploadRecord?.id ?? null

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
            image_url: cropImageUrls[cardPos.position] || null,
            front_image_url: cropImageUrls[cardPos.position] || null,
            confidence_score: c.confidence ?? 0.5,
            image_quality_score: c.image_quality?.score ?? null,
            ocr_text: c.raw_ocr_text ?? '',
            processing_metadata: {
              vision_model: 'gpt-4o',
              batch_id: batchId,
              sheet_position: cardPos.position,
              batch_confidence: cardPos.confidence,
              pipeline: 'two-phase'
            },
            rookie: c.attributes?.rookie ?? false,
            autographed: c.attributes?.autographed ?? false,
            patch: c.attributes?.patch ?? false,
            source_upload_id: uploadRecordId
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

          // Upsert set catalog entry + membership link
          if (cardId && c.set_name && c.card_brand && parsedYear && c.sport) {
            const subsetType = inferSubsetType(c.set_name, c.attributes)
            const { data: setRow } = await supabase
              .from('card_sets')
              .upsert(
                {
                  name: c.set_name,
                  brand: c.card_brand,
                  year: parsedYear,
                  sport: c.sport,
                  subset_type: subsetType
                },
                { onConflict: 'brand,name,year,sport,subset_type', ignoreDuplicates: false }
              )
              .select('id')
              .single()

            if (setRow?.id) {
              await supabase
                .from('card_set_memberships')
                .upsert(
                  {
                    card_id: cardId,
                    set_id: setRow.id,
                    set_card_number: c.card_number ?? null
                  },
                  { onConflict: 'card_id,set_id', ignoreDuplicates: true }
                )
            }
          }

          processedCards.push({
            position: cardPos.position,
            card_id: cardId,
            needs_review: cardPos.needs_review
          })
        }

        // Update upload record as completed
        if (uploadRecordId) {
          await supabase
            .from('card_uploads')
            .update({
              status: 'completed',
              extracted_data: sheetResult as unknown as Record<string, unknown>,
              processing_metadata: {
                vision_model: 'gpt-4o',
                batch_id: batchId,
                pipeline: 'two-phase',
                sheet_cards: processedCards.length,
                recognised_cards: processedCards.filter(p => p.card_id).length
              },
              completed_at: new Date().toISOString()
            })
            .eq('id', uploadRecordId)
        }

        send({
          status: 'completed',
          result: sheetResult,
          cards: sheetResult.cards,
          processedCards
        })
      } catch (error) {
        console.error('Batch processing error:', error)
        const message = error instanceof Error ? error.message : 'Unknown error'
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
