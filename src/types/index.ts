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
  status: 'pending' | 'processed' | 'failed'
  extracted_data: Record<string, unknown> | null
  created_at: string
}