/** Structured output from AI card processing (OCR/vision + extraction). */
export interface CardExtractionResult {
  year?: string
  player_name?: string
  team_name?: string
  position?: string
  sport?: string
  set_name?: string
  card_brand?: string
  card_number?: string
  attributes?: {
    rookie?: boolean
    autographed?: boolean
    patch?: boolean
  }
  confidence?: number
  raw_ocr_text?: string
}

export interface Card {
  id: string
  sport: string | null
  year: number | null
  brand: string | null
  series: string | null
  set_number: string | null
  card_number: string | null
  player_name: string | null
  team: string | null
  position: string | null
  variation: string | null
  image_url: string | null
  front_image_url?: string | null
  back_image_url?: string | null
  rookie?: boolean
  autographed?: boolean
  patch?: boolean
  jersey?: boolean
  numbered?: boolean
  parallel?: boolean
  insert?: boolean
  short_print?: boolean
  error?: boolean
  estimated_value?: number | null
  confidence_score?: number | null
  ocr_text?: string | null
  processing_metadata?: Record<string, unknown> | null
  last_updated?: string
  source_upload_id?: string
  created_at: string
}

export interface UserCard {
  id: string
  user_id: string
  card_id: string
  card?: Card
  quantity: number
  condition: string | null
  is_for_trade: boolean
  notes: string | null
  acquired_at: string | null
  created_at: string
}

export interface CardWithTradeInfo extends Card {
  user_cards: Array<{
    id: string
    user_id: string
    is_for_trade: boolean
    quantity: number
  }>
}

export interface User {
  id: string
  username: string | null
  avatar_url: string | null
  created_at: string
}

export interface CardUpload {
  id: string
  user_id: string
  image_path: string | null
  back_image_path?: string | null
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_data?: Record<string, unknown> | null
  confidence_score?: number | null
  ocr_text?: string | null
  processing_metadata?: Record<string, unknown> | null
  processed_at?: string | null
  completed_at?: string | null
  error_message?: string | null
  created_at: string
}

// Type for update data in user-cards API
export interface UserCardUpdateData {
  quantity?: number
  condition?: string | null
  notes?: string | null
  is_for_trade?: boolean
  acquired_at?: string | null
}

// Batch / sheet scanning types

/** A single card position within a 3×3 binder sheet (row-major: 0=top-left … 8=bottom-right). */
export interface BatchCardPosition {
  /** 0–8, row-major order */
  position: number
  /** Model's overall confidence for this cell */
  confidence: 'high' | 'medium' | 'low'
  /** True when confidence is low or recognition was partial — user must confirm before saving */
  needs_review: boolean
  /** Extracted card data, or null for empty / unreadable cells */
  card: CardExtractionResult | null
}

/** Full result of a single-call 3×3 sheet extraction. */
export interface SheetExtractionResult {
  /** False when the image does not contain a recognizable 3×3 grid */
  grid_detected: boolean
  /** Always exactly 9 entries (positions 0–8), padded with nulls when needed */
  cards: BatchCardPosition[]
}

/** A card slot in the batch review UI — tracks DB card_id after the server upserts the cards table. */
export interface ProcessedBatchCard {
  position: number
  card_id: string | null
  needs_review: boolean
}

// =============================================================================
// Set completion tracking types
// Mirrors: card_sets, card_set_memberships, user_set_completion (view)
// =============================================================================

/**
 * Categorisation of a card set or subset.
 * Matches the CHECK constraint on card_sets.subset_type.
 */
export type CardSetSubsetType =
  | 'base'
  | 'rookies'
  | 'inserts'
  | 'parallels'
  | 'autographs'
  | 'relics'
  | 'short_prints'
  | 'variations'
  | 'other'

/**
 * A card set or subset in the master catalog.
 * Top-level sets have parent_set_id = null.
 * Subsets (inserts, parallels, rookie variations, etc.) reference their parent
 * via parent_set_id.
 */
export interface CardSet {
  id: string
  name: string
  brand: string
  year: number
  sport: string
  /** Total number of cards in this set/subset. Null when the checklist is not yet known. */
  total_cards: number | null
  /**
   * Human-readable card number range, e.g. "1-200", "RC-1-RC-50", "NNO".
   * Stored as a display string; not used for range arithmetic in the DB.
   */
  card_number_range: string | null
  subset_type: CardSetSubsetType
  /** Null for top-level sets; UUID of the parent set for subsets. */
  parent_set_id: string | null
  created_at: string
  updated_at: string
}

/**
 * Many-to-many join between cards and card_sets.
 * A single card can belong to multiple sets (e.g. base set + an insert subset).
 * Composite PK: (card_id, set_id).
 */
export interface CardSetMembership {
  card_id: string
  set_id: string
  /**
   * The card's position number within this specific set/subset.
   * May differ from card.card_number — e.g. an insert numbered "RC-12"
   * within its insert set while the base card is numbered "47".
   */
  set_card_number: string | null
  created_at: string
}

/**
 * One row from the user_set_completion view.
 * Represents a single user's ownership progress within one card set.
 *
 * Example: { set_name: "Series 1", brand: "Topps", year: 2020,
 *             total_cards: 200, cards_owned: 3, completion_percentage: 1.50 }
 * Readable as: "You have 3 of 200 cards from 2020 Topps Series 1."
 */
export interface UserSetCompletion {
  user_id: string
  set_id: string
  set_name: string
  brand: string
  year: number
  sport: string
  subset_type: CardSetSubsetType
  parent_set_id: string | null
  card_number_range: string | null
  /** Null when the set's full checklist is unknown. */
  total_cards: number | null
  /** Distinct cards the user owns that are members of this set. */
  cards_owned: number
  /**
   * Rounded to 2 decimal places. Null when total_cards is null.
   * Range: 0.00 – 100.00
   */
  completion_percentage: number | null
}

