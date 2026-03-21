import { NextRequest, NextResponse, after } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { smartCardVisionExtraction, verifyCardMatch } from '@/lib/llm-extraction'

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function mimeFromPath(path: string): string {
  const lower = path.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.webp')) return 'image/webp'
  if (lower.endsWith('.gif')) return 'image/gif'
  return 'image/jpeg'
}

function bufferToDataUrl(buffer: Buffer, mime: string): string {
  return `data:${mime};base64,${buffer.toString('base64')}`
}

async function downloadFromCardUploads(
  storagePath: string
): Promise<{ buffer: Buffer; mime: string }> {
  const { data, error } = await supabaseServiceRole.storage
    .from('card-uploads')
    .download(storagePath)
  if (error || !data) {
    throw new Error(`Failed to download image: ${error?.message || 'unknown error'}`)
  }
  const buffer = Buffer.from(await data.arrayBuffer())
  const mime =
    data.type && data.type !== '' && data.type !== 'application/octet-stream'
      ? data.type
      : mimeFromPath(storagePath)
  return { buffer, mime }
}

async function publishToCardImages(
  uploadId: string,
  role: 'front' | 'back',
  buffer: Buffer,
  mime: string
): Promise<string> {
  const ext = mime.includes('png')
    ? 'png'
    : mime.includes('webp')
      ? 'webp'
      : mime.includes('gif')
        ? 'gif'
        : 'jpg'
  const destPath = `${uploadId}/${role}.${ext}`
  const { error } = await supabaseServiceRole.storage.from('card-images').upload(destPath, buffer, {
    contentType: mime,
    upsert: true
  })
  if (error) {
    throw new Error(`Failed to publish ${role} image: ${error.message}`)
  }
  const { data } = supabaseServiceRole.storage.from('card-images').getPublicUrl(destPath)
  return data.publicUrl
}

async function processCardAsync(
  uploadId: string,
  imagePath: string,
  backImagePath: string | null
): Promise<void> {
  try {
    const frontFile = await downloadFromCardUploads(imagePath)
    const frontDataUrl = bufferToDataUrl(frontFile.buffer, frontFile.mime)

    let backDataUrl: string | null = null
    let backFile: { buffer: Buffer; mime: string } | null = null

    if (backImagePath) {
      backFile = await downloadFromCardUploads(backImagePath)
      backDataUrl = bufferToDataUrl(backFile.buffer, backFile.mime)

      // Verify front and back belong to the same card
      const verification = await verifyCardMatch(frontDataUrl, backDataUrl)
      if (!verification.isMatch && verification.confidence >= 0.8) {
        await supabaseServiceRole
          .from('card_uploads')
          .update({
            status: 'failed',
            error_message: `Front and back images appear to be different cards (${Math.round(verification.confidence * 100)}% confidence): ${verification.reasoning}`,
            completed_at: new Date().toISOString()
          })
          .eq('id', uploadId)
        return
      }

      // Store verification result in metadata even if we continue
      await supabaseServiceRole
        .from('card_uploads')
        .update({ processing_metadata: { verification } })
        .eq('id', uploadId)
    }

    const extractedData = await smartCardVisionExtraction(
      { frontDataUrl, backDataUrl },
      { model: 'gpt-4o', temperature: 0.1, maxTokens: 1500 }
    )

    const frontPublicUrl = await publishToCardImages(
      uploadId,
      'front',
      frontFile.buffer,
      frontFile.mime
    )
    let backPublicUrl: string | null = null
    if (backFile) {
      backPublicUrl = await publishToCardImages(uploadId, 'back', backFile.buffer, backFile.mime)
    }

    const ocrText = extractedData.raw_ocr_text || ''

    await supabaseServiceRole
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
        has_back_image: !!backImagePath,
        source_paths: { front: imagePath, back: backImagePath ?? null }
      },
      rookie: extractedData.attributes?.rookie ?? false,
      autographed: extractedData.attributes?.autographed ?? false,
      patch: extractedData.attributes?.patch ?? false,
      source_upload_id: uploadId
    }

    const { data: existingCard } = await supabaseServiceRole
      .from('cards')
      .select('id')
      .eq('sport', cardData.sport)
      .eq('year', cardData.year)
      .eq('brand', cardData.brand)
      .eq('player_name', cardData.player_name)
      .eq('card_number', cardData.card_number)
      .maybeSingle()

    if (existingCard) {
      await supabaseServiceRole
        .from('cards')
        .update({ ...cardData, last_updated: new Date().toISOString() })
        .eq('id', existingCard.id)
    } else {
      await supabaseServiceRole.from('cards').insert(cardData)
    }
  } catch (error) {
    console.error('Async card processing error:', error)
    await supabaseServiceRole
      .from('card_uploads')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
        completed_at: new Date().toISOString()
      })
      .eq('id', uploadId)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { uploadId, imagePath, backImagePath } = await request.json()

    if (!uploadId || !imagePath) {
      return NextResponse.json(
        { error: 'Upload ID and image path are required' },
        { status: 400 }
      )
    }

    await supabaseServiceRole
      .from('card_uploads')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString()
      })
      .eq('id', uploadId)

    // Kick off processing in the background — response returns immediately
    after(processCardAsync(uploadId, imagePath, backImagePath ?? null))

    return NextResponse.json({ success: true, uploadId, status: 'processing' })
  } catch (error) {
    console.error('API error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: 'Failed to start card processing', details: message },
      { status: 500 }
    )
  }
}
