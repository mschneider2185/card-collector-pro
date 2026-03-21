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

