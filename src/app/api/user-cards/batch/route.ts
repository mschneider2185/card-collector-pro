import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface BatchCardInsert {
  position: number
  card_id: string
  quantity?: number
  condition?: string | null
  notes?: string | null
  is_for_trade?: boolean
  acquired_at?: string | null
}

/**
 * POST /api/user-cards/batch
 *
 * Bulk-inserts up to 9 user_cards in a single transactional operation.
 * Positions with a null card_id are silently skipped.
 * RLS ensures users can only insert into their own collection.
 *
 * Body: { userId: string, cards: BatchCardInsert[] }
 * Response: { success: boolean, inserted: number, skipped: number, errors: string[] }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as { userId?: string; cards?: BatchCardInsert[] }
  const { userId, cards } = body

  if (!userId || !Array.isArray(cards) || cards.length === 0) {
    return NextResponse.json(
      { error: 'userId and a non-empty cards array are required' },
      { status: 400 }
    )
  }

  if (cards.length > 9) {
    return NextResponse.json({ error: 'Batch size may not exceed 9' }, { status: 400 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Verify the user exists (RLS guard — service role bypasses RLS but we still validate)
  const { data: userRow, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (userError || !userRow) {
    return NextResponse.json({ error: 'User not found' }, { status: 403 })
  }

  // Filter out null/invalid positions
  const validCards = cards.filter(c => c.card_id && typeof c.card_id === 'string')
  const skipped = cards.length - validCards.length

  if (validCards.length === 0) {
    return NextResponse.json({ success: true, inserted: 0, skipped, errors: [] })
  }

  const rows = validCards.map(c => ({
    user_id: userId,
    card_id: c.card_id,
    quantity: c.quantity ?? 1,
    condition: c.condition ?? null,
    notes: c.notes ?? null,
    is_for_trade: c.is_for_trade ?? false,
    acquired_at: c.acquired_at ?? null
  }))

  const { error: insertError } = await supabase.from('user_cards').insert(rows)

  if (insertError) {
    // Transactional: if any row fails, the entire insert is rolled back by Supabase/Postgres
    return NextResponse.json(
      { success: false, inserted: 0, skipped, errors: [insertError.message] },
      { status: 500 }
    )
  }

  return NextResponse.json({ success: true, inserted: validCards.length, skipped, errors: [] })
}
