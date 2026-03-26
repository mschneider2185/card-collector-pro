import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/**
 * GET /api/sets/list
 *
 * Returns all card_sets that have been scraped (source_url IS NOT NULL)
 * along with their checklist count. Used by the Sets search page to
 * show previously fetched sets on load.
 */
export async function GET() {
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: sets, error } = await supabase
    .from('card_sets')
    .select('*')
    .not('source_url', 'is', null)
    .order('last_scraped_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ sets: sets || [] })
}
