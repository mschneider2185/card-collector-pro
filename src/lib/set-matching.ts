/**
 * Auto-match extracted card data to set_checklist entries.
 * Uses Supabase RPC (pg_trgm) for fuzzy matching with confidence scoring.
 *
 * Works in Edge Runtime — only uses Supabase JS client.
 */
import { SupabaseClient } from '@supabase/supabase-js'
import { normalizeBrand, normalizeCardNumber, normalizePlayerName } from './card-normalizer'

export interface SetMatchResult {
  auto_matched: boolean
  confidence: number
  checklist_id: string | null
  set_id: string | null
  set_name: string | null
  reference_image_url: string | null
  requires_confirmation: boolean
}

interface CardMatchInput {
  year?: string | null
  card_number?: string | null
  player_name?: string | null
  card_brand?: string | null
}

const NO_MATCH: SetMatchResult = {
  auto_matched: false,
  confidence: 0,
  checklist_id: null,
  set_id: null,
  set_name: null,
  reference_image_url: null,
  requires_confirmation: false,
}

/**
 * Match extracted card data to a set_checklist entry.
 *
 * @param supabase - Supabase client (service role)
 * @param extractedData - Data from GPT-4o vision extraction
 * @returns Match result with confidence score and checklist_id
 */
export async function matchCardToChecklist(
  supabase: SupabaseClient,
  extractedData: CardMatchInput
): Promise<SetMatchResult> {
  const year = extractedData.year ? parseInt(extractedData.year, 10) : null
  const brand = normalizeBrand(extractedData.card_brand)
  const cardNumber = normalizeCardNumber(extractedData.card_number)
  const playerName = normalizePlayerName(extractedData.player_name)

  // Need at least a card number or player name to attempt matching
  if (!cardNumber && !playerName) return NO_MATCH

  const { data: matches, error } = await supabase.rpc('match_card_to_checklist', {
    p_year: year,
    p_brand: brand || null,
    p_card_number: cardNumber || null,
    p_player_name: playerName || null,
  })

  if (error) {
    console.error('Set matching RPC error:', error)
    return NO_MATCH
  }

  if (!matches || matches.length === 0) return NO_MATCH

  const best = matches[0]
  const score = best.score as number

  if (score < 50) return NO_MATCH

  return {
    auto_matched: score >= 85,
    confidence: score,
    checklist_id: best.checklist_id,
    set_id: best.set_id,
    set_name: best.set_name,
    reference_image_url: best.reference_image_url,
    requires_confirmation: score >= 50 && score < 85,
  }
}
