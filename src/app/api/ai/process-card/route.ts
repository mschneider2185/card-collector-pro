import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smartCardVisionExtraction, verifyCardMatch } from '@/lib/llm-extraction'

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

// Fetch an image from a pre-signed URL (no auth needed — token is in the URL)
async function fetchSignedUrl(signedUrl: string, fallbackMime: string): Promise<{ buffer: ArrayBuffer; mime: string }> {
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
  const { uploadId, imagePath, backImagePath, frontSignedUrl, backSignedUrl } = await request.json()

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
        if (!uploadId || !imagePath) {
          send({ status: 'failed', error: 'Upload ID and image path are required' })
          controller.close()
          return
        }

        await supabase
          .from('card_uploads')
          .update({ status: 'processing', processed_at: new Date().toISOString() })
          .eq('id', uploadId)

        send({ step: 'Downloading images...' })

        const front = await fetchSignedUrl(frontSignedUrl, mimeFromPath(imagePath))
        const frontDataUrl = toDataUrl(front.buffer, front.mime)

        let backDataUrl: string | null = null
        let back: { buffer: ArrayBuffer; mime: string } | null = null

        if (backImagePath && backSignedUrl) {
          back = await fetchSignedUrl(backSignedUrl, mimeFromPath(backImagePath))
          backDataUrl = toDataUrl(back.buffer, back.mime)

          send({ step: 'Verifying front and back match...' })

          const verification = await verifyCardMatch(frontDataUrl, backDataUrl)
          if (!verification.isMatch && verification.confidence >= 0.8) {
            await supabase
              .from('card_uploads')
              .update({
                status: 'failed',
                error_message: `Front and back images appear to be different cards: ${verification.reasoning}`,
                completed_at: new Date().toISOString()
              })
              .eq('id', uploadId)
            send({
              status: 'failed',
              error: `Front and back images appear to be different cards: ${verification.reasoning}`
            })
            controller.close()
            return
          }
        }

        send({ step: 'Extracting card details...' })

        const extractedData = await smartCardVisionExtraction(
          { frontDataUrl, backDataUrl },
          { model: 'gpt-4o', temperature: 0.1, maxTokens: 1500 }
        )

        send({ step: 'Publishing images...' })

        const frontExt = front.mime.includes('png') ? 'png' : front.mime.includes('webp') ? 'webp' : 'jpg'
        const frontPublicUrl = await storageUpload(
          supabaseUrl, serviceRoleKey, 'card-images', `${uploadId}/front.${frontExt}`, front.buffer, front.mime
        )

        let backPublicUrl: string | null = null
        if (back) {
          const backExt = back.mime.includes('png') ? 'png' : back.mime.includes('webp') ? 'webp' : 'jpg'
          backPublicUrl = await storageUpload(
            supabaseUrl, serviceRoleKey, 'card-images', `${uploadId}/back.${backExt}`, back.buffer, back.mime
          )
        }

        const ocrText = extractedData.raw_ocr_text || ''

        await supabase
          .from('card_uploads')
          .update({
            status: 'completed',
            extracted_data: extractedData,
            confidence_score: extractedData.confidence ?? 0.5,
            ocr_text: ocrText,
            back_image_path: backImagePath ?? null,
            processing_metadata: {
              vision_model: 'gpt-4o',
              validation: extractedData.validation,
              has_back_image: !!backImagePath,
              source_paths: { front: imagePath, back: backImagePath ?? null }
            },
            completed_at: new Date().toISOString()
          })
          .eq('id', uploadId)

        const parsedYear = extractedData.year ? parseInt(extractedData.year, 10) : null
        const cardData = {
          sport: extractedData.sport,
          year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
          brand: extractedData.card_brand,
          series: extractedData.set_name,
          set_number: extractedData.set_name,
          card_number: extractedData.card_number,
          player_name: extractedData.player_name,
          team: extractedData.team_name,
          position: extractedData.position,
          variation: '',
          image_url: frontPublicUrl,
          front_image_url: frontPublicUrl,
          back_image_url: backPublicUrl,
          confidence_score: extractedData.confidence ?? 0.5,
          ocr_text: ocrText,
          processing_metadata: {
            vision_model: 'gpt-4o',
            validation: extractedData.validation,
            has_back_image: !!backImagePath
          },
          rookie: extractedData.attributes?.rookie ?? false,
          autographed: extractedData.attributes?.autographed ?? false,
          patch: extractedData.attributes?.patch ?? false,
          source_upload_id: uploadId
        }

        const { data: existingCard } = await supabase
          .from('cards')
          .select('id')
          .eq('sport', cardData.sport)
          .eq('year', cardData.year)
          .eq('brand', cardData.brand)
          .eq('player_name', cardData.player_name)
          .eq('card_number', cardData.card_number)
          .maybeSingle()

        if (existingCard) {
          await supabase
            .from('cards')
            .update({ ...cardData, last_updated: new Date().toISOString() })
            .eq('id', existingCard.id)
        } else {
          await supabase.from('cards').insert(cardData)
        }

        send({ status: 'completed', extractedData })
      } catch (error) {
        console.error('Edge processing error:', error)
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
      'Connection': 'keep-alive'
    }
  })
}
