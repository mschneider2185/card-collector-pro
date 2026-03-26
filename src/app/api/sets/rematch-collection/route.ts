import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { matchCardToChecklist } from '@/lib/set-matching'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/sets/rematch-collection
 *
 * Retroactive matching job: finds all user_cards without a checklist_id,
 * attempts to match each against set_checklist, and updates matches.
 *
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = await request.json() as { userId?: string }

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Fetch unmatched user_cards with their card data
  const { data: unmatchedCards, error: fetchError } = await supabase
    .from('user_cards')
    .select('id, card_id, checklist_id, match_rejected, card:cards(player_name, card_number, year, brand, sport)')
    .eq('user_id', userId)
    .is('checklist_id', null)
    .eq('match_rejected', false)

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!unmatchedCards || unmatchedCards.length === 0) {
    return NextResponse.json({ total: 0, matched: 0, unmatched: 0 })
  }

  let matched = 0
  let unmatched = 0

  for (const uc of unmatchedCards) {
    const cardArr = uc.card as unknown as { player_name: string | null; card_number: string | null; year: number | null; brand: string | null }[] | null
    const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
    if (!card) {
      unmatched++
      continue
    }

    try {
      const result = await matchCardToChecklist(supabase, {
        year: card.year?.toString() ?? null,
        card_number: card.card_number,
        player_name: card.player_name,
        card_brand: card.brand,
      })

      if (result.auto_matched && result.checklist_id) {
        await supabase
          .from('user_cards')
          .update({ checklist_id: result.checklist_id })
          .eq('id', uc.id)
        matched++
      } else {
        unmatched++
      }
    } catch {
      unmatched++
    }
  }

  return NextResponse.json({
    total: unmatchedCards.length,
    matched,
    unmatched,
  })
}
