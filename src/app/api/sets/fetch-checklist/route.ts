import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import FirecrawlApp from '@mendable/firecrawl-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const firecrawlApiKey = process.env.FIRECRAWL_API_KEY!

interface ParsedCard {
  card_number: string
  player_name: string | null
  team: string | null
  position: string | null
  variation: string | null
  is_short_print: boolean
  is_rookie: boolean
}

/**
 * Parse card rows from a TCDB markdown page.
 *
 * TCDB checklist pages render as markdown tables with columns like:
 *   | # | Name | Team | Pos | ... |
 *
 * We also handle non-table list formats like:
 *   1 Player Name Team
 */
function parseChecklistFromMarkdown(markdown: string): ParsedCard[] {
  const cards: ParsedCard[] = []
  const seen = new Set<string>()
  const lines = markdown.split('\n')

  // Strategy 1: Parse markdown table rows
  // Look for rows that start with | and have a card number in the first cell
  for (const line of lines) {
    if (!line.startsWith('|')) continue
    // Skip header separator rows like |---|---|
    if (/^\|[\s-:|]+\|$/.test(line)) continue

    const cells = line.split('|').map(c => c.trim()).filter(c => c.length > 0)
    if (cells.length < 2) continue

    // First cell should be a card number (numeric, or alphanumeric like "RC-1")
    const cardNum = cells[0]
    if (!cardNum || /^[#\s]*$/.test(cardNum)) continue
    // Skip header rows
    if (/^(#|number|card|no\.?|num)$/i.test(cardNum)) continue

    const playerName = cells[1] || null
    if (!playerName || /^(name|player|description)$/i.test(playerName)) continue

    const key = `${cardNum}|${playerName}`
    if (seen.has(key)) continue
    seen.add(key)

    const team = cells.length > 2 ? cells[2] : null
    const position = cells.length > 3 ? cells[3] : null
    const fullLine = line.toLowerCase()

    cards.push({
      card_number: cardNum.replace(/^#/, '').trim(),
      player_name: playerName,
      team: team && !/^(team|club)$/i.test(team) ? team : null,
      position: position && !/^(pos|position)$/i.test(position) ? position : null,
      variation: null,
      is_short_print: fullLine.includes(' sp') || fullLine.includes('short print'),
      is_rookie: fullLine.includes(' rc') || fullLine.includes('rookie'),
    })
  }

  if (cards.length > 0) return cards

  // Strategy 2: Parse non-table formats — look for lines starting with a number
  // Pattern: "123 Player Name Team" or "#123 Player Name"
  const linePattern = /^#?(\d+[a-zA-Z]?)\s+(.+)/
  for (const line of lines) {
    const match = line.trim().match(linePattern)
    if (!match) continue

    const cardNum = match[1]
    const rest = match[2].trim()
    if (!rest) continue

    const key = `${cardNum}|${rest}`
    if (seen.has(key)) continue
    seen.add(key)

    // Try to split "Player Name Team" — team is often the last 1-2 words
    const parts = rest.split(/\s{2,}|\t/)
    const playerName = parts[0] || rest
    const team = parts.length > 1 ? parts[1] : null

    cards.push({
      card_number: cardNum,
      player_name: playerName,
      team,
      position: null,
      variation: null,
      is_short_print: rest.toLowerCase().includes('sp'),
      is_rookie: rest.toLowerCase().includes('rc') || rest.toLowerCase().includes('rookie'),
    })
  }

  return cards
}

/**
 * POST /api/sets/fetch-checklist
 *
 * Fetches a full set checklist. Checks Supabase first — if the set already
 * exists with a checklist, returns cached data. Otherwise uses Firecrawl
 * search to find the TCDB checklist page, scrapes it as markdown, and
 * parses card rows programmatically (avoids LLM token limits that truncate
 * large checklists).
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
    const searchResults = await firecrawl.search(searchQuery, { limit: 5 })

    const webResults = searchResults.web || []
    const tcdbResults = webResults.filter(
      (r) => 'url' in r && r.url?.includes('tcdb.com')
    )

    if (tcdbResults.length > 0) {
      // Prefer Checklist or ViewAll pages over Gallery
      const checklistPage = tcdbResults.find(
        (r) => 'url' in r && (r.url?.includes('Checklist.cfm') || r.url?.includes('ViewAll.cfm'))
      )
      const best = checklistPage || tcdbResults[0]
      sourceUrl = 'url' in best ? best.url : null

      // If we got a Gallery page, try converting to Checklist
      if (sourceUrl && sourceUrl.includes('Gallery.cfm')) {
        sourceUrl = sourceUrl.replace('Gallery.cfm', 'Checklist.cfm')
      }
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

  // Step 2: Scrape the page as MARKDOWN (not JSON) to get ALL card rows
  // LLM JSON extraction truncates large sets — markdown parsing gets everything
  let parsedCards: ParsedCard[] = []
  let setNameFromPage: string | null = null

  try {
    const scrapeResult = await firecrawl.scrape(sourceUrl, {
      formats: ['markdown'],
    })

    const markdown = scrapeResult.markdown || ''

    if (markdown) {
      parsedCards = parseChecklistFromMarkdown(markdown)

      // Try to extract set name from page title (usually first heading)
      const titleMatch = markdown.match(/^#\s+(.+)/m)
      if (titleMatch) {
        setNameFromPage = titleMatch[1].trim()
      }
    }
  } catch (err) {
    console.error('Firecrawl scrape error:', err)
  }

  if (parsedCards.length === 0) {
    return NextResponse.json(
      { error: `Found TCDB page (${sourceUrl}) but could not parse checklist data. Try a different set name.` },
      { status: 404 }
    )
  }

  // ── Parse brand/series from setName ────────────────────────────────────
  const nameParts = setName.split(' ')
  const brand = nameParts[0] || setName
  const series = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

  // ── Insert into card_sets ──────────────────────────────────────────────
  const setRow = {
    name: setNameFromPage || setName,
    sport,
    year,
    brand,
    series,
    subset_type: 'base',
    total_cards: parsedCards.length,
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

  // ── Insert checklist rows (batch in chunks of 500) ─────────────────────
  const checklistRows = parsedCards.map((card) => ({
    set_id: insertedSet.id,
    card_number: card.card_number,
    player_name: card.player_name || null,
    team: card.team || null,
    position: card.position || null,
    variation: card.variation || null,
    is_short_print: card.is_short_print,
    is_rookie: card.is_rookie,
  }))

  // Insert in chunks to avoid payload limits
  const CHUNK_SIZE = 500
  for (let i = 0; i < checklistRows.length; i += CHUNK_SIZE) {
    const chunk = checklistRows.slice(i, i + CHUNK_SIZE)
    const { error: checklistError } = await supabase
      .from('set_checklist')
      .insert(chunk)

    if (checklistError) {
      console.error('Error inserting set_checklist chunk:', checklistError)
      return NextResponse.json(
        { error: 'Failed to save checklist data' },
        { status: 500 }
      )
    }
  }

  // ── Return the full result ─────────────────────────────────────────────
  const { data: fullChecklist } = await supabase
    .from('set_checklist')
    .select('*')
    .eq('set_id', insertedSet.id)
    .order('card_number', { ascending: true })

  return NextResponse.json({
    cached: false,
    set: { ...insertedSet, total_cards: parsedCards.length },
    checklist: fullChecklist,
  })
}
