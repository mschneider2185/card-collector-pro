import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

interface Issue {
  type: string
  severity: 'error' | 'warning'
  message: string
  details?: unknown
}

/**
 * GET /api/admin/data-consistency?userId=xxx
 *
 * Runs validation queries to detect data mismatches across the collection,
 * set completion, and card membership systems.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'userId is required' }, { status: 400 })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)
  const issues: Issue[] = []

  // 1. user_cards with NULL card_id
  const { count: nullCardIdCount } = await supabase
    .from('user_cards')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .is('card_id', null)

  if (nullCardIdCount && nullCardIdCount > 0) {
    issues.push({
      type: 'orphaned_user_cards',
      severity: 'error',
      message: `${nullCardIdCount} user_cards with NULL card_id`,
    })
  }

  // 2. user_cards with checklist_id — verify all checklist_ids are valid
  const { data: linkedCards } = await supabase
    .from('user_cards')
    .select('id, checklist_id')
    .eq('user_id', userId)
    .not('checklist_id', 'is', null)

  if (linkedCards && linkedCards.length > 0) {
    const checklistIds = linkedCards.map(uc => uc.checklist_id).filter(Boolean) as string[]
    const { data: validChecklist } = await supabase
      .from('set_checklist')
      .select('id')
      .in('id', checklistIds)

    const validIds = new Set((validChecklist || []).map(sc => sc.id))
    const broken = linkedCards.filter(uc => uc.checklist_id && !validIds.has(uc.checklist_id))

    if (broken.length > 0) {
      issues.push({
        type: 'broken_checklist_links',
        severity: 'error',
        message: `${broken.length} user_cards with checklist_id pointing to non-existent set_checklist row`,
        details: broken,
      })
    }
  }

  // 3. Cards with images but no checklist_id (potential unlinked cards)
  const { data: unlinkedRichCards } = await supabase
    .from('user_cards')
    .select('id, card_id, card:cards(player_name, card_number, year, brand, sport, front_image_url)')
    .eq('user_id', userId)
    .is('checklist_id', null)
    .eq('match_rejected', false)

  type CardInfo = { player_name: string | null; card_number: string | null; year: number | null; brand: string | null; sport: string | null; front_image_url: string | null }

  const unlinkedWithImages = (unlinkedRichCards || []).filter((uc) => {
    const cardArr = uc.card as unknown as CardInfo[] | CardInfo | null
    const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
    return !!card?.front_image_url
  })

  if (unlinkedWithImages.length > 0) {
    issues.push({
      type: 'unlinked_rich_cards',
      severity: 'warning',
      message: `${unlinkedWithImages.length} cards with images but no set checklist link`,
      details: unlinkedWithImages.map((uc) => {
        const cardArr = uc.card as unknown as CardInfo[] | CardInfo | null
        const card = Array.isArray(cardArr) ? cardArr[0] : cardArr
        return { user_card_id: uc.id, card_id: uc.card_id, ...card }
      }),
    })
  }

  // 4. card_set_memberships count vs user_set_completion view per set
  const { data: viewCounts } = await supabase
    .from('user_set_completion')
    .select('set_id, set_name, cards_owned')
    .eq('user_id', userId)

  // Get all user's card_ids
  const { data: allUserCards } = await supabase
    .from('user_cards')
    .select('card_id')
    .eq('user_id', userId)

  const allCardIds = (allUserCards || []).map(uc => uc.card_id).filter(Boolean)

  if (allCardIds.length > 0) {
    const { data: membershipRows } = await supabase
      .from('card_set_memberships')
      .select('set_id, card_id')
      .in('card_id', allCardIds)

    const memberCountMap = new Map<string, number>()
    for (const m of membershipRows || []) {
      memberCountMap.set(m.set_id, (memberCountMap.get(m.set_id) || 0) + 1)
    }

    for (const vc of viewCounts || []) {
      const memberCount = memberCountMap.get(vc.set_id) || 0
      if (memberCount !== vc.cards_owned) {
        issues.push({
          type: 'count_mismatch',
          severity: 'warning',
          message: `Set "${vc.set_name}": view says ${vc.cards_owned} owned but membership count is ${memberCount}`,
          details: { set_id: vc.set_id, view_count: vc.cards_owned, membership_count: memberCount },
        })
      }
    }
  }

  // 5. Orphaned card_set_memberships (check a sample of memberships for valid set_ids)
  if (allCardIds.length > 0) {
    const { data: memberships } = await supabase
      .from('card_set_memberships')
      .select('card_id, set_id')
      .in('card_id', allCardIds)

    if (memberships && memberships.length > 0) {
      const setIds = [...new Set(memberships.map(m => m.set_id))]
      const { data: validSets } = await supabase
        .from('card_sets')
        .select('id')
        .in('id', setIds)

      const validSetIds = new Set((validSets || []).map(s => s.id))
      const orphaned = memberships.filter(m => !validSetIds.has(m.set_id))

      if (orphaned.length > 0) {
        issues.push({
          type: 'orphaned_memberships',
          severity: 'error',
          message: `${orphaned.length} card_set_memberships with non-existent set_id`,
          details: orphaned.slice(0, 20),
        })
      }
    }
  }

  return NextResponse.json({
    status: issues.length === 0 ? 'clean' : 'issues_found',
    total_issues: issues.length,
    errors: issues.filter(i => i.severity === 'error').length,
    warnings: issues.filter(i => i.severity === 'warning').length,
    issues,
  })
}
