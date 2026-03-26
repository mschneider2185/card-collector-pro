import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/sets/confirm-match
 *
 * Confirm or reject a suggested set checklist match.
 *
 * Body: { user_card_id: string, checklist_id: string, confirmed: boolean }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    user_card_id?: string
    checklist_id?: string
    confirmed?: boolean
  }

  const { user_card_id, checklist_id, confirmed } = body

  if (!user_card_id || !checklist_id || confirmed === undefined) {
    return NextResponse.json(
      { error: 'user_card_id, checklist_id, and confirmed are required' },
      { status: 400 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  if (confirmed) {
    const { error } = await supabase
      .from('user_cards')
      .update({ checklist_id, match_rejected: false })
      .eq('id', user_card_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  } else {
    const { error } = await supabase
      .from('user_cards')
      .update({ match_rejected: true })
      .eq('id', user_card_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  return NextResponse.json({ success: true })
}
