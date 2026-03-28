import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { matchCardToChecklist } from '@/lib/set-matching'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * POST /api/sets/reconcile-collection
 *
 * Two-phase reconciliation. Idempotent — safe to run multiple times.
 *
 * Phase 1 — Hollow merge:
 *   Finds hollow "clicked owned" user_cards (have checklist_id but linked card
 *   has no image) and merges them with existing uploaded cards for the same
 *   player/number/year/brand. Never deletes the record with the image.
 *
 * Phase 2 — Unlinked rich card matching:
 *   Finds user_cards with images but no checklist_id and attempts to match
 *   them against set_checklist entries via fuzzy matching. If matched with
 *   confidence >= 85%, auto-links the checklist_id and creates
 *   card_set_memberships if missing.
 *
 * Body: { userId: string }
 */
export async function POST(request: NextRequest) {
  const { userId } = await request.json() as { userId?: string }
  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // ── Phase 1: Hollow merge ──────────────────────────────────────────────

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

  // Get all user's cards that DO have images but no checklist_id (potential merge targets)
  const { data: richCards } = await supabase
    .from('user_cards')
    .select('id, card_id, checklist_id, match_rejected, card:cards(id, player_name, card_number, year, brand, sport, front_image_url, image_url)')
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

  // ── Phase 2: Unlinked rich card matching ───────────────────────────────

  // Re-fetch unlinked cards (some may have been linked in Phase 1)
  const { data: unlinkedCards } = await supabase
    .from('user_cards')
    .select('id, card_id, match_rejected, card:cards(id, player_name, card_number, year, brand, sport, front_image_url, image_url)')
    .eq('user_id', userId)
    .is('checklist_id', null)

  let autoLinked = 0
  let flaggedForReview = 0

  for (const uc of unlinkedCards || []) {
    if (uc.match_rejected) continue

    const cardArr = uc.card as unknown as { id: string; player_name: string | null; card_number: string | null; year: number | null; brand: string | null; sport: string | null; front_image_url: string | null; image_url: string | null }[] | null
    const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
    if (!card) continue
    // Only match cards that have images (rich cards)
    if (!card.front_image_url && !card.image_url) continue

    const matchResult = await matchCardToChecklist(supabase, {
      year: card.year?.toString() ?? null,
      card_number: card.card_number,
      player_name: card.player_name,
      card_brand: card.brand,
    })

    if (matchResult.auto_matched && matchResult.checklist_id && matchResult.set_id) {
      // Auto-link: set checklist_id on user_card
      await supabase
        .from('user_cards')
        .update({ checklist_id: matchResult.checklist_id })
        .eq('id', uc.id)

      // Ensure card_set_memberships row exists
      await supabase
        .from('card_set_memberships')
        .upsert(
          { card_id: uc.card_id, set_id: matchResult.set_id, set_card_number: card.card_number },
          { onConflict: 'card_id,set_id' }
        )

      autoLinked++
    } else if (matchResult.requires_confirmation) {
      flaggedForReview++
    }
  }

  return NextResponse.json({
    phase1: {
      total_hollow: hollow.length,
      merged,
      remaining_hollow: hollow.length - merged,
    },
    phase2: {
      auto_linked: autoLinked,
      flagged_for_review: flaggedForReview,
    },
  })
}
