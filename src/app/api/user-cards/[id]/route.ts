import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { UserCardUpdateData } from '@/types'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabaseServiceRole = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const { id } = await params
    const body = await request.json()
    const { quantity, condition, notes, is_for_trade, acquired_at, user_id } = body

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Verify that the user owns this card
    const { data: userCard, error: fetchError } = await supabaseServiceRole
      .from('user_cards')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !userCard) {
      console.error('Error fetching user card:', fetchError)
      return NextResponse.json({ error: 'Card not found' }, { status: 404 })
    }

    if (userCard.user_id !== user_id) {
      return NextResponse.json({ error: 'Unauthorized to edit this card' }, { status: 403 })
    }

    // Update the user card
    const updateData: UserCardUpdateData = {}
    if (quantity !== undefined) updateData.quantity = quantity
    if (condition !== undefined) updateData.condition = condition
    if (notes !== undefined) updateData.notes = notes
    if (is_for_trade !== undefined) updateData.is_for_trade = is_for_trade
    if (acquired_at !== undefined) updateData.acquired_at = acquired_at

    const { data, error } = await supabaseServiceRole
      .from('user_cards')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        card:cards(*)
      `)
      .single()

    if (error) {
      console.error('Error updating user card:', error)
      return NextResponse.json({ error: 'Failed to update card', details: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Error in PATCH /api/user-cards/[id]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
