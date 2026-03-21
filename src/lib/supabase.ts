import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'
)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          username: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
      cards: {
        Row: {
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
        Insert: {
          id?: string
          sport?: string | null
          year?: number | null
          brand?: string | null
          series?: string | null
          set_number?: string | null
          card_number?: string | null
          player_name?: string | null
          team?: string | null
          position?: string | null
          variation?: string | null
          image_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          sport?: string | null
          year?: number | null
          brand?: string | null
          series?: string | null
          set_number?: string | null
          card_number?: string | null
          player_name?: string | null
          team?: string | null
          position?: string | null
          variation?: string | null
          image_url?: string | null
          created_at?: string
        }
      }
      user_cards: {
        Row: {
          id: string
          user_id: string
          card_id: string
          quantity: number
          condition: string | null
          is_for_trade: boolean
          notes: string | null
          acquired_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          card_id: string
          quantity?: number
          condition?: string | null
          is_for_trade?: boolean
          notes?: string | null
          acquired_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          card_id?: string
          quantity?: number
          condition?: string | null
          is_for_trade?: boolean
          notes?: string | null
          acquired_at?: string | null
          created_at?: string
        }
      }
      card_uploads: {
        Row: {
          id: string
          user_id: string
          image_path: string | null
          status: string
          extracted_data: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          image_path?: string | null
          status?: string
          extracted_data?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          image_path?: string | null
          status?: string
          extracted_data?: Record<string, unknown> | null
          created_at?: string
        }
      }
    }
  }
}