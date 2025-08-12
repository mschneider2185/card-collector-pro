import { CardExtractionResult } from '@/app/api/ai/process-card/route'

export interface LLMExtractionOptions {
  model?: 'gpt-4o-mini' | 'gpt-4o' | 'claude-3-sonnet'
  temperature?: number
  maxTokens?: number
  includeReasoningSteps?: boolean
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
    "patch": boolean (true if PATCH, JERSEY, fabric swatch present)
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
- Patches: Look for "PATCH", "JERSEY", "GAME-USED" mentions

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
    } catch (parseError) {
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
  options: LLMExtractionOptions = {}
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
 * Smart extraction that combines multiple approaches
 */
export async function smartCardExtraction(
  ocrText: string,
  options: LLMExtractionOptions = {}
): Promise<CardExtractionResult & { validation: ReturnType<typeof validateCardData> }> {
  try {
    const extracted = await extractCardDataWithOpenAI(ocrText, options)
    const validation = validateCardData(extracted)
    
    return {
      ...extracted,
      validation
    }
  } catch (error) {
    console.error('Smart extraction failed:', error)
    
    // Don't fall back to mock data - throw the error instead
    throw error
  }
}

function createMockExtraction(ocrText: string): CardExtractionResult {
  // Create reasonable mock data based on OCR text patterns
  const lines = ocrText.split('\n').map(line => line.trim()).filter(Boolean)
  
  return {
    year: "2023",
    player_name: lines.find(line => /^[A-Z][a-z]+ [A-Z][a-z]+/.test(line)) || "Unknown Player",
    team_name: lines.find(line => line.toLowerCase().includes('hawks') || line.toLowerCase().includes('yankees')) || "Unknown Team",
    position: lines.find(line => /^(CENTER|PITCHER|FORWARD|GUARD)$/i.test(line)) || "Unknown",
    sport: detectSport(ocrText),
    set_name: lines.find(line => line.includes('SERIES') || line.includes('COLLECTION')) || "Unknown Set",
    card_brand: lines.find(line => /^(UPPER DECK|PANINI|TOPPS|FLEER)$/i.test(line)) || "Unknown Brand",
    card_number: lines.find(line => /^#?\d+/.test(line)) || "Unknown",
    attributes: {
      rookie: ocrText.toLowerCase().includes('rc') || ocrText.toLowerCase().includes('rookie'),
      autographed: ocrText.toLowerCase().includes('auto') || ocrText.toLowerCase().includes('signature'),
      patch: ocrText.toLowerCase().includes('patch') || ocrText.toLowerCase().includes('jersey')
    },
    confidence: 0.6,
    raw_ocr_text: ocrText
  }
}

function detectSport(text: string): string {
  const lowerText = text.toLowerCase()
  
  if (lowerText.includes('hockey') || lowerText.includes('blackhawks') || lowerText.includes('center')) {
    return 'Hockey'
  }
  if (lowerText.includes('baseball') || lowerText.includes('yankees') || lowerText.includes('pitcher')) {
    return 'Baseball'
  }
  if (lowerText.includes('basketball') || lowerText.includes('lakers') || lowerText.includes('guard')) {
    return 'Basketball'
  }
  if (lowerText.includes('football') || lowerText.includes('patriots') || lowerText.includes('quarterback')) {
    return 'Football'
  }
  
  return 'Unknown'
}