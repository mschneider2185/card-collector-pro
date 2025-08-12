import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('- NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.error('Please create a .env.local file with your Supabase credentials.')
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
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