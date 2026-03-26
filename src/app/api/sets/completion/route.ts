import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/sets/completion?setId=xxx&userId=xxx
 *
 * Returns completion stats for a user against a specific set checklist.
 * Joins set_checklist with user_cards (via checklist_id) to determine
 * which cards are owned vs missing.
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

  // Fetch the set metadata
  const { data: set, error: setError } = await supabase
    .from('card_sets')
    .select('*')
    .eq('id', setId)
    .single()

  if (setError || !set) {
    return NextResponse.json({ error: 'Set not found' }, { status: 404 })
  }

  // Fetch the full checklist for this set
  const { data: checklist, error: checklistError } = await supabase
    .from('set_checklist')
    .select('*')
    .eq('set_id', setId)
    .order('card_number', { ascending: true })

  if (checklistError || !checklist) {
    return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
  }

  // Fetch user's owned cards linked to this set's checklist
  const { data: ownedCards } = await supabase
    .from('user_cards')
    .select('checklist_id')
    .eq('user_id', userId)
    .not('checklist_id', 'is', null)

  const ownedChecklistIds = new Set(
    (ownedCards || []).map((uc) => uc.checklist_id)
  )

  // Build annotated checklist with owned status
  const annotatedChecklist = checklist.map((card) => ({
    ...card,
    owned: ownedChecklistIds.has(card.id),
  }))

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
