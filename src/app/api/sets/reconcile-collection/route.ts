import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/sets/reconcile-collection
 *
 * Finds hollow "clicked owned" user_cards (have checklist_id but linked card
 * has no image) and merges them with existing uploaded cards for the same
 * player/number/year/brand. Idempotent — safe to run multiple times.
 *
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = await request.json() as { userId?: string }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // Find hollow records: user_cards with checklist_id where card has no image
  const { data: hollowRecords, error: fetchErr } = await supabase
    .from('user_cards')
    .select('id, checklist_id, card_id, card:cards(id, player_name, card_number, year, brand, front_image_url, image_url)')
    .eq('user_id', userId)
    .not('checklist_id', 'is', null)

  if (fetchErr || !hollowRecords) {
    return NextResponse.json({ error: fetchErr?.message || 'Failed to fetch' }, { status: 500 })
  }

  // Filter to only hollow records (card has no image)
  const hollow = hollowRecords.filter((uc) => {
    const cardArr = uc.card as unknown as { front_image_url: string | null; image_url: string | null }[] | null
    const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
    return !card?.front_image_url && !card?.image_url
  })

  if (hollow.length === 0) {
    return NextResponse.json({ total_hollow: 0, merged: 0, remaining_hollow: 0 })
  }

  // Get all user's cards that DO have images (potential merge targets)
  const { data: richCards } = await supabase
    .from('user_cards')
    .select('id, card_id, checklist_id, card:cards(id, player_name, card_number, year, brand, front_image_url, image_url)')
    .eq('user_id', userId)
    .is('checklist_id', null)

  let merged = 0

  for (const hollowRec of hollow) {
    const hollowCardArr = hollowRec.card as unknown as { id: string; player_name: string | null; card_number: string | null; year: number | null; brand: string | null }[] | null
    const hollowCard = Array.isArray(hollowCardArr) ? hollowCardArr[0] : hollowCardArr
    if (!hollowCard) continue

    // Search for a matching rich card
    const match = (richCards || []).find((rc) => {
      const rcCardArr = rc.card as unknown as { id: string; player_name: string | null; card_number: string | null; year: number | null; brand: string | null; front_image_url: string | null; image_url: string | null }[] | null
      const rcCard = Array.isArray(rcCardArr) ? rcCardArr[0] : rcCardArr
      if (!rcCard?.front_image_url && !rcCard?.image_url) return false
      // Match on player + card_number + year + brand
      const nameMatch = hollowCard.player_name && rcCard.player_name &&
        hollowCard.player_name.toLowerCase() === rcCard.player_name.toLowerCase()
      const numMatch = hollowCard.card_number && rcCard.card_number &&
        hollowCard.card_number.replace(/^#/, '').trim() === rcCard.card_number.replace(/^#/, '').trim()
      const yearMatch = hollowCard.year === rcCard.year
      const brandMatch = hollowCard.brand && rcCard.brand &&
        hollowCard.brand.toLowerCase() === rcCard.brand.toLowerCase()
      return (nameMatch && numMatch) || (nameMatch && yearMatch && brandMatch)
    })

    if (match) {
      // Copy checklist_id to the rich card's user_cards row
      await supabase
        .from('user_cards')
        .update({ checklist_id: hollowRec.checklist_id })
        .eq('id', match.id)

      // Delete the hollow record
      await supabase.from('user_cards').delete().eq('id', hollowRec.id)

      // Also delete the hollow card record if nothing else references it
      const { count } = await supabase
        .from('user_cards')
        .select('id', { count: 'exact', head: true })
        .eq('card_id', hollowRec.card_id)
      if (count === 0) {
        await supabase.from('cards').delete().eq('id', hollowRec.card_id)
      }

      merged++
    }
  }

  return NextResponse.json({
    total_hollow: hollow.length,
    merged,
    remaining_hollow: hollow.length - merged,
  })
}
