import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ uploadId: string }> }
) {
  const supabaseServiceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { uploadId } = await params

  const { data, error } = await supabaseServiceRole
    .from('card_uploads')
    .select('id, status, extracted_data, confidence_score, ocr_text, processing_metadata, error_message, completed_at')
    .eq('id', uploadId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Upload not found' }, { status: 404 })
  }

  return NextResponse.json({
    uploadId: data.id,
    status: data.status,
    extractedData: data.extracted_data ?? null,
    confidence: data.confidence_score ?? null,
    ocrText: data.ocr_text ?? null,
    processingMetadata: data.processing_metadata ?? null,
    errorMessage: data.error_message ?? null,
    completedAt: data.completed_at ?? null
  })
}
