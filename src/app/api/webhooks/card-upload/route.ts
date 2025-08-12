import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const webhook = await request.json()
    
    // Verify this is a card_uploads insert event
    if (webhook.type === 'INSERT' && webhook.table === 'card_uploads') {
      const { id, image_path } = webhook.record
      
      // Trigger the AI processing pipeline
      const processResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/ai/process-card`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: id,
          imagePath: image_path
        })
      })
      
      if (!processResponse.ok) {
        console.error('Failed to trigger AI processing:', await processResponse.text())
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}