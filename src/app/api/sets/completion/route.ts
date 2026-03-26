import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/sets/completion?setId=xxx&userId=xxx
 *
 * Returns completion stats for a user against a specific set checklist.
 * Joins set_checklist with user_cards (via checklist_id) to determine
 * which cards are owned vs missing. Also returns has_image to distinguish
 * fully scanned cards from hollow "clicked owned" records.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const setId = searchParams.get('setId')
  const userId = searchParams.get('userId')

  if (!setId || !userId) {
    return NextResponse.json(
      { error: 'setId and userId are required' },
      { status: 400 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: set, error: setError } = await supabase
    .from('card_sets')
    .select('*')
    .eq('id', setId)
    .single()

  if (setError || !set) {
    return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  }

  const { data: checklist, error: checklistError } = await supabase
    .from('set_checklist')
    .select('*')
    .eq('set_id', setId)
    .order('card_number', { ascending: true })

  if (checklistError || !checklist) {
    return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
  }

  // Fetch user's owned cards linked to this set's checklist, including image info
  const { data: ownedCards } = await supabase
    .from('user_cards')
    .select('checklist_id, card:cards(front_image_url, image_url)')
    .eq('user_id', userId)
    .not('checklist_id', 'is', null)

  // Build a map: checklist_id → { owned: true, has_image: bool }
  const ownershipMap = new Map<string, { owned: boolean; has_image: boolean }>()
  for (const uc of ownedCards || []) {
    const cardArr = uc.card as unknown as { front_image_url: string | null; image_url: string | null }[] | null
    const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
    const hasImage = !!(card?.front_image_url || card?.image_url)
    const existing = ownershipMap.get(uc.checklist_id)
    // If any linked user_card has an image, mark has_image true
    if (!existing || hasImage) {
      ownershipMap.set(uc.checklist_id, { owned: true, has_image: hasImage || (existing?.has_image ?? false) })
    }
  }

  const annotatedChecklist = checklist.map((card) => {
    const ownership = ownershipMap.get(card.id)
    return {
      ...card,
      owned: !!ownership,
      has_image: ownership?.has_image ?? false,
    }
  })

  const total = checklist.length
  const owned = annotatedChecklist.filter((c) => c.owned).length
  const completion_percentage = total > 0
    ? Math.round((owned / total) * 10000) / 100
    : 0

  return NextResponse.json({
    set,
    total,
    owned,
    completion_percentage,
    checklist: annotatedChecklist,
  })
}
