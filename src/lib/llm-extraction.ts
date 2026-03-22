import type { CardExtractionResult, BatchCardPosition, SheetExtractionResult } from '@/types'

export interface LLMExtractionOptions {
  model?: 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet'
  temperature?: number
  maxTokens?: number
  includeReasoningSteps?: boolean
}

function parseModelJsonObject(content: string): Record<string, unknown> {
  let trimmed = content.trim()
  if (trimmed.startsWith('```')) {
    trimmed = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
  }
  return JSON.parse(trimmed) as Record<string, unknown>
}

/**
 * Extract structured card data using OpenAI GPT
 */
export async function extractCardDataWithOpenAI(
  ocrText: string, 
  options: LLMExtractionOptions = {}
): Promise<CardExtractionResult> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.1,
    maxTokens = 500,
    includeReasoningSteps = false
  } = options

  // Debug: Check environment variable
  console.log('LLM Debug - OpenAI API Key check:', {
    hasKey: !!process.env.OPENAI_API_KEY,
    keyLength: process.env.OPENAI_API_KEY?.length || 0,
    keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'none'
  })

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.')
  }

  const systemPrompt = `You are an expert sports card identifier with deep knowledge of trading cards across all sports and eras. Extract structured data from OCR text of trading cards.

The OCR text may contain information from BOTH the front and back of the card. Use ALL available information to make the most accurate extraction possible.

IMPORTANT: Return ONLY a valid JSON object with these exact fields (omit fields if uncertain):

{
  "year": "YYYY" (string, e.g., "2023"),
  "player_name": "Full Name" (string, e.g., "Connor Bedard"),
  "team_name": "Full Team Name" (string, e.g., "Chicago Blackhawks", not abbreviations),
  "position": "Position" (string, e.g., "Center", "Pitcher", "Forward"),
  "sport": "Sport Name" (string, e.g., "Hockey", "Baseball", "Basketball"),
  "set_name": "Set Name" (string, e.g., "2023-24 Upper Deck Series 1"),
  "card_brand": "Brand" (string, e.g., "Upper Deck", "Panini", "Topps"),
  "card_number": "Number" (string, e.g., "201", "RC-5"),
  "attributes": {
    "rookie": boolean (true if RC, ROOKIE, or rookie year indicators present),
    "autographed": boolean (true if AUTO, AUTOGRAPH, signature present),
    "patch": boolean (true if PATCH, JERSEY, fabric swatch, game-used, or material present)
  },
  "confidence": 0.0-1.0 (number, your confidence in the extraction)
}

Recognition guidelines:
- Team names: Use full names (e.g., "New York Yankees" not "NYY")
- Sports: Hockey, Baseball, Basketball, Football, Soccer, etc.
- Brands: Upper Deck, Panini, Topps, Fleer, Donruss, etc.
- Years: Look for season years like "2023-24" (use "2023")
- Rookie cards: Look for "RC", "ROOKIE", or first-year indicators
- Autographs: Look for "AUTO", "AUTOGRAPH", signature mentions
- Patches: Look for "PATCH", "JERSEY", "GAME-USED", "MATERIAL", "FABRIC", "SWATCH", "RELIC", "TICKET" (especially "Rookie Ticket" cards often have patches), or any mention of embedded materials

CRITICAL: CARD NUMBER vs PLAYER JERSEY NUMBER:
- "card_number": This is the CARD'S number in the set (e.g., "#25", "Card 152"). Usually found on the back of the card, often in a corner or near set information.
- DO NOT use the player's jersey number (what they wear during games) as the card number.
- Look for text like "#25", "Card 25", "No. 25", or similar SET NUMBERING on the back of the card.
- The card number identifies this specific card within the trading card set, NOT the player's uniform number.

Back of card information often contains:
- Complete player statistics
- Biographical information
- Full set name and series information
- Copyright dates and manufacturer details
- Card numbering within the set (THIS IS THE CARD NUMBER YOU WANT)
- Special card designations (rookie, insert, parallel, etc.)

Use back information to fill in missing details from the front, especially:
- Exact set names and series
- Complete card numbers from the set numbering system (e.g., "#25" if that's what appears on the back)
- Player positions and teams (if unclear from front)
- Year information from copyright or season stats

PATCH DETECTION: Be especially attentive to patch detection. Look for:
- Explicit mentions: "PATCH", "JERSEY", "GAME-USED", "MATERIAL", "FABRIC", "SWATCH", "RELIC"
- Card types that typically include patches: "Rookie Ticket", "Contenders", "Prizm", "Select", "Flawless"
- Set names that suggest premium materials: "Contenders", "Prizm", "Select", "Flawless", "National Treasures"
- Any mention of embedded materials, textures, or game-worn items
- Cards with "Ticket" in the name often have patches or materials embedded

SPECIAL PATCH DETECTION RULES:
- If the card is a "Rookie Ticket" (any card with "TICKET" in the name), it likely has a patch
- If the card is from "Contenders" series, it likely has a patch
- If the card has a jersey number that matches the card number or appears in a special format, it might indicate a patch
- Look for any mention of "SEC", "ROW", "SEAT" (ticket stub format) which often indicates a patch card
- If the card mentions "GRIZZLIES" or team names in a ticket format, it's likely a patch card

${includeReasoningSteps ? 'Include a brief reasoning for each extracted field.' : ''}

Do not include any explanatory text before or after the JSON.`

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract card data from this OCR text:\n\n${ocrText}` }
        ],
        temperature,
        max_tokens: maxTokens
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`)
    }

    const result = await response.json()
    const content = result.choices[0].message.content.trim()
    
    try {
      const extractedData = JSON.parse(content)
      return {
        ...extractedData,
        raw_ocr_text: ocrText
      }
    } catch {
      console.error('Failed to parse LLM response:', content)
      throw new Error('Invalid JSON response from LLM')
    }

  } catch (error) {
    console.error('LLM extraction error:', error)
    throw error
  }
}

/**
 * Extract card data using Claude (Anthropic)
 */
export async function extractCardDataWithClaude(
  ocrText: string,
  _options: LLMExtractionOptions = {}
): Promise<CardExtractionResult> {
  // Check if Anthropic API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.')
  }

  // Mock implementation - would integrate with Anthropic Claude API
  throw new Error('Claude integration not yet implemented')
}

/**
 * Validate extracted card data for completeness and accuracy
 */
export function validateCardData(data: CardExtractionResult): {
  isValid: boolean
  errors: string[]
  completeness: number
} {
  const errors: string[] = []
  let completenessScore = 0
  const totalFields = 8 // Core fields we expect

  // Check required fields
  if (!data.player_name) errors.push('Player name is required')
  else completenessScore++

  if (!data.sport) errors.push('Sport is required')
  else completenessScore++

  // Check optional but important fields
  if (data.year) completenessScore++
  if (data.team_name) completenessScore++
  if (data.card_brand) completenessScore++
  if (data.set_name) completenessScore++
  if (data.card_number) completenessScore++
  if (data.position) completenessScore++

  // Validate year format
  if (data.year && !/^\d{4}$/.test(data.year)) {
    errors.push('Year must be in YYYY format')
  }

  // Validate confidence score
  if (data.confidence && (data.confidence < 0 || data.confidence > 1)) {
    errors.push('Confidence must be between 0 and 1')
  }

  return {
    isValid: errors.length === 0,
    errors,
    completeness: completenessScore / totalFields
  }
}

/**
 * Post-process extracted data to improve patch detection
 */
function postProcessPatchDetection(data: CardExtractionResult, ocrText: string): CardExtractionResult {
  const lowerOcrText = ocrText.toLowerCase()
  const lowerSetName = data.set_name?.toLowerCase() || ''
  const lowerBrand = data.card_brand?.toLowerCase() || ''
  
  // If patch is already detected, don't change it
  if (data.attributes?.patch) {
    return data
  }
  
  // Enhanced patch detection logic
  const patchIndicators = [
    // Card types that typically have patches
    lowerOcrText.includes('ticket'),
    lowerOcrText.includes('contenders'),
    lowerOcrText.includes('prizm'),
    lowerOcrText.includes('select'),
    lowerOcrText.includes('flawless'),
    lowerOcrText.includes('national treasures'),
    
    // Set names that suggest patches
    lowerSetName.includes('ticket'),
    lowerSetName.includes('contenders'),
    lowerSetName.includes('prizm'),
    lowerSetName.includes('select'),
    lowerSetName.includes('flawless'),
    lowerSetName.includes('national treasures'),
    
    // Brand names that often have patches
    lowerBrand.includes('panini'),
    
    // Ticket stub format indicators
    lowerOcrText.includes('sec'),
    lowerOcrText.includes('row'),
    lowerOcrText.includes('seat'),
    
    // Team names in ticket context
    lowerOcrText.includes('grizzlies') && lowerOcrText.includes('ticket'),
    
    // Material indicators
    lowerOcrText.includes('material'),
    lowerOcrText.includes('fabric'),
    lowerOcrText.includes('swatch'),
    lowerOcrText.includes('relic'),
    lowerOcrText.includes('game-used'),
    lowerOcrText.includes('jersey')
  ]
  
  const hasPatchIndicator = patchIndicators.some(indicator => indicator)
  
  if (hasPatchIndicator) {
    console.log('Post-processing detected patch indicators:', {
      ocrText: ocrText.substring(0, 200) + '...',
      set_name: data.set_name,
      brand: data.card_brand,
      indicators: patchIndicators.filter(Boolean)
    })
    
    return {
      ...data,
      attributes: {
        ...data.attributes,
        patch: true
      }
    }
  }
  
  return data
}

/**
 * Smart extraction that combines multiple approaches
 */
export async function smartCardExtraction(
  ocrText: string,
  options: LLMExtractionOptions = {}
): Promise<CardExtractionResult & { validation: ReturnType<typeof validateCardData> }> {
  try {
    const extracted = await extractCardDataWithOpenAI(ocrText, options)
    const validation = validateCardData(extracted)
    
    // Apply post-processing to improve patch detection
    const postProcessed = postProcessPatchDetection(extracted, ocrText)
    
    return {
      ...postProcessed,
      validation
    }
  } catch (error) {
    console.error('Smart extraction failed:', error)
    
    // Don't fall back to mock data - throw the error instead
    throw error
  }
}

/**
 * Verify that a front and back image belong to the same trading card.
 * Returns isMatch=false (with reasoning) if they appear to be different cards.
 */
export async function verifyCardMatch(
  frontDataUrl: string,
  backDataUrl: string
): Promise<{ isMatch: boolean; confidence: number; reasoning: string }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are a trading card expert. You will be shown two images: the front and back of what should be the same trading card. Determine if they belong to the same card. Return ONLY a JSON object: { "isMatch": boolean, "confidence": number (0.0-1.0), "reasoning": string }'
        },
        {
          role: 'user',
          content: [
            { type: 'text', text: 'FRONT of card:' },
            { type: 'image_url', image_url: { url: frontDataUrl } },
            { type: 'text', text: 'BACK of card:' },
            { type: 'image_url', image_url: { url: backDataUrl } },
            {
              type: 'text',
              text: 'Do these show the front and back of the same trading card? Reply with JSON only.'
            }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(`OpenAI API error: ${response.status} - ${err.error?.message || 'Unknown'}`)
  }

  const result = await response.json()
  const content = result.choices[0].message.content.trim()
  try {
    const parsed = parseModelJsonObject(content) as {
      isMatch: boolean
      confidence: number
      reasoning: string
    }
    return {
      isMatch: parsed.isMatch ?? true,
      confidence: Math.min(1, Math.max(0, parsed.confidence ?? 0.5)),
      reasoning: parsed.reasoning ?? ''
    }
  } catch {
    // If parsing fails, assume match to avoid blocking the user
    return { isMatch: true, confidence: 0.5, reasoning: 'Could not parse verification response' }
  }
}

const visionCardSystemPrompt = `You are an expert sports card identifier with deep knowledge of trading cards across all sports and eras. You analyze photos of trading cards (front and optionally back).

IMPORTANT: Return ONLY a valid JSON object with these exact fields (omit fields if uncertain):

{
  "year": "YYYY" (string, e.g., "2023"),
  "player_name": "Full Name" (string),
  "team_name": "Full Team Name" (string, not abbreviations),
  "position": "Position" (string),
  "sport": "Sport Name" (string),
  "set_name": "Set Name" (string),
  "card_brand": "Brand" (string),
  "card_number": "Number" (string, e.g., "201", "RC-5"),
  "attributes": {
    "rookie": boolean,
    "autographed": boolean,
    "patch": boolean (true if PATCH, JERSEY, fabric swatch, game-used, material, Rookie Ticket style, etc.)
  },
  "confidence": 0.0-1.0 (number),
  "raw_ocr_text": "string — transcribe ALL visible text from the images; label sections FRONT OF CARD: and BACK OF CARD: when both are shown"
}

Recognition guidelines:
- Team names: full names (e.g., "New York Yankees" not "NYY")
- Years: season years like "2023-24" → use "2023"
- Rookie: RC, ROOKIE, first-year indicators
- Autographs: AUTO, AUTOGRAPH, signature visible
- Patches: PATCH, JERSEY, GAME-USED, MATERIAL, SWATCH, RELIC, ticket-stub layouts, Contenders/Prizm-style premium cards

CRITICAL — CARD NUMBER vs PLAYER JERSEY NUMBER:
- "card_number" is the card's number in the set (from back/corners/set info), NOT the player's uniform number.

Use the back image when present for set name, manufacturer, copyright year, and card numbering.

Do not include any text before or after the JSON object.`

/**
 * Single GPT-4o Vision call: front image plus optional back image → structured card data.
 */
export async function smartCardVisionExtraction(
  parts: { frontDataUrl: string; backDataUrl?: string | null },
  options: LLMExtractionOptions = {}
): Promise<CardExtractionResult & { validation: ReturnType<typeof validateCardData> }> {
  const { model = 'gpt-4o', temperature = 0.1, maxTokens = 1500 } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.')
  }

  const systemPrompt = visionCardSystemPrompt

  const userContent: Array<
    { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } }
  > = [
    {
      type: 'text',
      text:
        'Images follow in order: first = FRONT of the card.' +
        (parts.backDataUrl ? ' Second = BACK of the same card.' : '')
    },
    { type: 'image_url', image_url: { url: parts.frontDataUrl } }
  ]
  if (parts.backDataUrl) {
    userContent.push({ type: 'text', text: 'BACK of the same card:' })
    userContent.push({ type: 'image_url', image_url: { url: parts.backDataUrl } })
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`
    )
  }

  const result = await response.json()
  const content = result.choices[0].message.content.trim()

  try {
    const raw = parseModelJsonObject(content) as CardExtractionResult
    const validation = validateCardData(raw)
    const ocrForPost = raw.raw_ocr_text || ''
    const postProcessed = postProcessPatchDetection(raw, ocrForPost)
    return {
      ...postProcessed,
      validation
    }
  } catch {
    console.error('Failed to parse vision LLM response:', content)
    throw new Error('Invalid JSON response from vision model')
  }
}

// Removed unused function

// Removed unused function

// ────────────────────────────────────────────────────────────────────────────
// Sheet / batch extraction — 3×3 binder page in a single API call
// ────────────────────────────────────────────────────────────────────────────

const sheetVisionSystemPrompt = `You are an expert sports card identifier with encyclopedic knowledge of trading cards across all sports, brands, sets, and eras.

You will receive a HIGH-RESOLUTION image of a 3×3 binder page — nine trading card pockets arranged in 3 columns × 3 rows. Each pocket shows the front of one card.

════════════════════════════════════
STEP 1 — GRID DETECTION
════════════════════════════════════
Confirm the image contains a 3×3 layout of trading cards.
If NOT, return ONLY: { "grid_detected": false, "cards": [] }

════════════════════════════════════
STEP 2 — PER-CELL READING STRATEGY
════════════════════════════════════
Work left-to-right, top-to-bottom (row-major). Treat each pocket as an independent close-up:

  Position map:
  ┌───┬───┬───┐
  │ 0 │ 1 │ 2 │  ← top row
  ├───┼───┼───┤
  │ 3 │ 4 │ 5 │  ← middle row
  ├───┼───┼───┤
  │ 6 │ 7 │ 8 │  ← bottom row
  └───┴───┴───┘

For EACH cell, zoom in mentally and read every visible character carefully:
• PLAYER NAME — typically the largest text on the card front; read each letter individually if needed
• TEAM NAME — full name, never abbreviations (e.g., "Buffalo Sabres" not "BUF")
• YEAR — look for season format like "2023-24" → output "2023"; also check set/brand text for copyright year
• SET NAME — printed on the card front or in the border/footer area (e.g., "Upper Deck Series 1", "Topps Chrome")
• CARD BRAND — the manufacturer (Upper Deck, Panini, Topps, O-Pee-Chee, Donruss, Fleer, Score, Leaf, etc.)
• CARD NUMBER — the number in the SET printed on the front bottom or back corner — NOT the player's jersey number
• SPORT — infer from team, player, or card design if not explicit
• POSITION — printed on card front; common abbreviations: C, LW, RW, D (hockey), QB, RB, WR (football), etc.
• raw_ocr_text — transcribe EVERY character you can read from the cell: player, team, set, brand, logos, copyright, stats snippets, watermarks, serial numbers

ATTRIBUTE DETECTION (per cell):
• rookie: true if you see RC, ROOKIE, or it's clearly a player's first-year card
• autographed: true if AUTO, AUTOGRAPH, or a visible on-card signature is present
• patch: true if PATCH, JERSEY, GAME-USED, MATERIAL, SWATCH, RELIC, Rookie Ticket, Contenders ticket-stub layout, or any embedded material window

CONFIDENCE SCORING:
• 0.8–1.0 → "high"   (player name + at least 2 other fields clearly legible)
• 0.5–0.79 → "medium" (player name legible but other details uncertain)
• 0.0–0.49 → "low"   (even player name uncertain or pocket is empty)
• needs_review: true whenever confidence < 0.8, or ANY key field was guessed rather than clearly read
• Empty / blank pockets → card: null, confidence: "low", needs_review: true
• NEVER invent or hallucinate data. Omit a field entirely rather than guess.

CARD NUMBER vs JERSEY NUMBER:
"card_number" is the card's catalog number within its set (e.g., "#147", "RC-23"). It is NOT the player's uniform/jersey number. Look for small set-numbering text, typically at the bottom front or in a corner badge.

════════════════════════════════════
REQUIRED OUTPUT FORMAT (strict JSON)
════════════════════════════════════
Return ONLY a JSON object — no prose, no markdown fences — with exactly this structure and exactly 9 entries:

{
  "grid_detected": true,
  "cards": [
    {
      "position": 0,
      "confidence": "high" | "medium" | "low",
      "needs_review": boolean,
      "card": {
        "year": "YYYY",
        "player_name": "Full Name",
        "team_name": "Full Team Name",
        "position": "Position",
        "sport": "Sport Name",
        "set_name": "Set Name",
        "card_brand": "Brand",
        "card_number": "Set catalog number",
        "attributes": { "rookie": boolean, "autographed": boolean, "patch": boolean },
        "confidence": 0.0-1.0,
        "raw_ocr_text": "every character you can read from this cell"
      }
    }
    ... (positions 1 through 8)
  ]
}`

/**
 * Single GPT-4o Vision call: one 3×3 sheet image → structured data for all 9 positions.
 * Returns exactly 9 BatchCardPosition entries (padded with nulls if fewer are detected).
 */
export async function smartSheetVisionExtraction(
  sheetDataUrl: string,
  options: LLMExtractionOptions = {}
): Promise<SheetExtractionResult> {
  const { model = 'gpt-4o', temperature = 0.1, maxTokens = 6000 } = options

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured.')
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: sheetVisionSystemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'This image shows a 3×3 binder page or sheet of trading cards. Extract all 9 card positions as instructed.'
            },
            { type: 'image_url', image_url: { url: sheetDataUrl, detail: 'high' } }
          ]
        }
      ],
      temperature,
      max_tokens: maxTokens
    })
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(
      `OpenAI API error: ${response.status} ${response.statusText} - ${(err as { error?: { message?: string } }).error?.message || 'Unknown error'}`
    )
  }

  const result = await response.json()
  const content = (result as { choices: Array<{ message: { content: string } }> }).choices[0].message.content.trim()

  let raw: { grid_detected: boolean; cards: Array<Record<string, unknown>> }
  try {
    raw = parseModelJsonObject(content) as typeof raw
  } catch {
    console.error('Failed to parse sheet vision response:', content)
    throw new Error('Invalid JSON response from sheet vision model')
  }

  if (!raw.grid_detected) {
    return { grid_detected: false, cards: [] }
  }

  // Normalise and pad to exactly 9 positions
  const seen = new Set<number>()
  const positions: BatchCardPosition[] = []

  for (const entry of raw.cards ?? []) {
    const pos = typeof entry.position === 'number' ? entry.position : -1
    if (pos < 0 || pos > 8 || seen.has(pos)) continue
    seen.add(pos)

    const rawCard = entry.card as Record<string, unknown> | null
    const cardData: CardExtractionResult | null = rawCard
      ? {
          year: rawCard.year as string | undefined,
          player_name: rawCard.player_name as string | undefined,
          team_name: rawCard.team_name as string | undefined,
          position: rawCard.position as string | undefined,
          sport: rawCard.sport as string | undefined,
          set_name: rawCard.set_name as string | undefined,
          card_brand: rawCard.card_brand as string | undefined,
          card_number: rawCard.card_number as string | undefined,
          attributes: rawCard.attributes as CardExtractionResult['attributes'],
          confidence: typeof rawCard.confidence === 'number' ? rawCard.confidence : undefined,
          raw_ocr_text: rawCard.raw_ocr_text as string | undefined
        }
      : null

    // Post-process patch detection for non-null cards
    const processedCard =
      cardData && cardData.raw_ocr_text
        ? postProcessPatchDetection(cardData, cardData.raw_ocr_text)
        : cardData

    const confidenceNum =
      processedCard?.confidence ?? (cardData?.confidence as number | undefined) ?? 0
    const confidenceLabel: 'high' | 'medium' | 'low' =
      confidenceNum >= 0.8 ? 'high' : confidenceNum >= 0.5 ? 'medium' : 'low'

    positions.push({
      position: pos,
      confidence: (entry.confidence as 'high' | 'medium' | 'low') ?? confidenceLabel,
      needs_review: Boolean(entry.needs_review) || confidenceLabel === 'low' || !processedCard,
      card: processedCard
    })
  }

  // Pad missing positions with null entries
  for (let i = 0; i < 9; i++) {
    if (!seen.has(i)) {
      positions.push({
        position: i,
        confidence: 'low',
        needs_review: true,
        card: null
      })
    }
  }

  // Sort by position
  positions.sort((a, b) => a.position - b.position)

  return { grid_detected: true, cards: positions }
}