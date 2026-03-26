import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import FirecrawlApp from '@mendable/firecrawl-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!

interface ChecklistItem {
  card_number: string
  player_name: string | null
  team: string | null
  position: string | null
  variation: string | null
  is_short_print: boolean
  is_rookie: boolean
}

interface FirecrawlExtraction {
  cards: ChecklistItem[]
  set_name?: string
  total_cards?: number
}

/**
 * POST /api/sets/fetch-checklist
 *
 * Fetches a full set checklist. Checks Supabase first — if the set already
 * exists with a checklist, returns cached data. Otherwise uses Firecrawl
 * search to find the TCDB checklist page, then scrapes it with structured
 * JSON extraction, seeds both card_sets and set_checklist, and returns the result.
 *
 * Body: { setName: string, sport: string, year: number }
 */
export async function POST(request: NextRequest) {
  const body = await request.json() as {
    setName?: string
    sport?: string
    year?: number
  }

  const { setName, sport, year } = body

  if (!setName || !sport || !year) {
    return NextResponse.json(
      { error: 'setName, sport, and year are required' },
      { status: 400 }
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey)

  // ── Check cache: do we already have this set? ──────────────────────────
  const { data: existingSet } = await supabase
    .from('card_sets')
    .select('*')
    .ilike('name', `%${setName}%`)
    .eq('sport', sport)
    .eq('year', year)
    .maybeSingle()

  if (existingSet) {
    const { data: checklist } = await supabase
      .from('set_checklist')
      .select('*')
      .eq('set_id', existingSet.id)
      .order('card_number', { ascending: true })

    if (checklist && checklist.length > 0) {
      return NextResponse.json({
        cached: true,
        set: existingSet,
        checklist,
      })
    }
  }

  // ── Search & scrape via Firecrawl ──────────────────────────────────────
  if (!firecrawlApiKey) {
    return NextResponse.json(
      { error: 'FIRECRAWL_API_KEY is not configured' },
      { status: 500 }
    )
  }

  const firecrawl = new FirecrawlApp({ apiKey: firecrawlApiKey })

  // Step 1: Use Firecrawl search to find the TCDB checklist page
  const searchQuery = `site:tcdb.com ${year} ${setName} ${sport} checklist`
  let sourceUrl: string | null = null

  try {
    const searchResults = await firecrawl.search(searchQuery, { limit: 3 })

    // Find a TCDB result with a checklist/ViewAll URL
    const webResults = searchResults.web || []
    const tcdbResults = webResults.filter(
      (r) => 'url' in r && r.url?.includes('tcdb.com')
    )

    if (tcdbResults.length > 0) {
      // Prefer ViewAll or Checklist pages
      const checklistPage = tcdbResults.find(
        (r) => 'url' in r && (r.url?.includes('ViewAll.cfm') || r.url?.includes('Checklist.cfm'))
      )
      const best = checklistPage || tcdbResults[0]
      sourceUrl = 'url' in best ? best.url : null
    }
  } catch (err) {
    console.error('Firecrawl search error:', err)
  }

  if (!sourceUrl) {
    return NextResponse.json(
      { error: `Could not find a TCDB checklist for "${year} ${setName} ${sport}". Try a more specific set name.` },
      { status: 404 }
    )
  }

  // Step 2: Scrape the found page with structured JSON extraction
  let extractedData: FirecrawlExtraction | null = null

  try {
    const scrapeResult = await firecrawl.scrape(sourceUrl, {
      formats: [
        {
          type: 'json',
          schema: {
            type: 'object',
            properties: {
              set_name: { type: 'string' },
              total_cards: { type: 'number' },
              cards: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    card_number: { type: 'string' },
                    player_name: { type: 'string' },
                    team: { type: 'string' },
                    position: { type: 'string' },
                    variation: { type: 'string' },
                    is_short_print: { type: 'boolean' },
                    is_rookie: { type: 'boolean' },
                  },
                  required: ['card_number', 'player_name'],
                },
              },
            },
            required: ['cards'],
          },
          prompt: `Extract every card in this trading card set checklist. For each card return: card_number, player_name, team, position, variation (if any), is_short_print (boolean), is_rookie (boolean). The set is "${year} ${setName}" for ${sport}.`,
        },
      ],
    })

    if (scrapeResult.json) {
      extractedData = scrapeResult.json as FirecrawlExtraction
    }
  } catch (err) {
    console.error('Firecrawl scrape error:', err)
  }

  if (!extractedData || !extractedData.cards || extractedData.cards.length === 0) {
    return NextResponse.json(
      { error: `Found TCDB page (${sourceUrl}) but could not extract checklist data. The page may not contain a card list.` },
      { status: 404 }
    )
  }

  // ── Parse brand/series from setName ────────────────────────────────────
  const nameParts = setName.split(' ')
  const brand = nameParts[0] || setName
  const series = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

  // ── Insert into card_sets ──────────────────────────────────────────────
  const setRow = {
    name: extractedData.set_name || setName,
    sport,
    year,
    brand,
    series,
    subset_type: 'base',
    total_cards: extractedData.total_cards || extractedData.cards.length,
    source_url: sourceUrl,
    last_scraped_at: new Date().toISOString(),
  }

  const { data: insertedSet, error: setError } = await supabase
    .from('card_sets')
    .insert(setRow)
    .select()
    .single()

  if (setError || !insertedSet) {
    console.error('Error inserting card_sets:', setError)
    return NextResponse.json(
      { error: 'Failed to save set data' },
      { status: 500 }
    )
  }

  // ── Insert checklist rows ──────────────────────────────────────────────
  const checklistRows = extractedData.cards.map((card) => ({
    set_id: insertedSet.id,
    card_number: card.card_number,
    player_name: card.player_name || null,
    team: card.team || null,
    position: card.position || null,
    variation: card.variation || null,
    is_short_print: card.is_short_print ?? false,
    is_rookie: card.is_rookie ?? false,
  }))

  const { error: checklistError } = await supabase
    .from('set_checklist')
    .insert(checklistRows)

  if (checklistError) {
    console.error('Error inserting set_checklist:', checklistError)
    return NextResponse.json(
      { error: 'Failed to save checklist data' },
      { status: 500 }
    )
  }

  // ── Return the full result ─────────────────────────────────────────────
  const { data: fullChecklist } = await supabase
    .from('set_checklist')
    .select('*')
    .eq('set_id', insertedSet.id)
    .order('card_number', { ascending: true })

  return NextResponse.json({
    cached: false,
    set: insertedSet,
    checklist: fullChecklist,
  })
}
