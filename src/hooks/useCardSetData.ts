'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export interface SetCompletionData {
  set_id: string
  set_name: string
  brand: string
  year: number
  total_cards: number | null
  cards_owned: number
}

interface UseCardSetDataResult {
  setCompletionData: SetCompletionData[]
  cardSetMap: Map<string, string> // card_id → set_id
  getSetForCard: (cardId: string) => SetCompletionData | null
  refresh: () => Promise<void>
  loading: boolean
}

/**
 * Shared hook for fetching card→set membership data.
 * Used by both the collection page and set completion panel to ensure
 * they query the same way and show consistent numbers.
 */
export function useCardSetData(cardIds: string[]): UseCardSetDataResult {
  const [setCompletionData, setSetCompletionData] = useState<SetCompletionData[]>([])
  const [cardSetMap, setCardSetMap] = useState<Map<string, string>>(new Map())
  const [loading, setLoading] = useState(false)

  const supabase = useMemo(
    () => createBrowserClient(supabaseUrl, supabaseAnonKey),
    []
  )

  const fetchSets = useCallback(async () => {
    if (cardIds.length === 0) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('card_set_memberships')
        .select('set_id, card_id, card_sets(id, name, brand, year, total_cards)')
        .in('card_id', cardIds)

      if (error || !data) return

      const setMap = new Map<string, SetCompletionData>()
      const cardToSet = new Map<string, string>()

      for (const row of data) {
        const setInfo = row.card_sets as unknown as {
          id: string; name: string; brand: string; year: number; total_cards: number | null
        }
        if (!setInfo) continue
        cardToSet.set(row.card_id, setInfo.id)
        const existing = setMap.get(setInfo.id)
        if (existing) {
          existing.cards_owned++
        } else {
          setMap.set(setInfo.id, {
            set_id: setInfo.id,
            set_name: setInfo.name,
            brand: setInfo.brand,
            year: setInfo.year,
            total_cards: setInfo.total_cards,
            cards_owned: 1,
          })
        }
      }

      setCardSetMap(cardToSet)
      setSetCompletionData(
        [...setMap.values()].sort((a, b) => {
          const pctA = a.total_cards ? a.cards_owned / a.total_cards : 0
          const pctB = b.total_cards ? b.cards_owned / b.total_cards : 0
          return pctB - pctA
        })
      )
    } catch (err) {
      console.error('Error fetching set completion:', err)
    } finally {
      setLoading(false)
    }
  }, [cardIds.join(','), supabase])

  useEffect(() => {
    fetchSets()
  }, [fetchSets])

  const getSetForCard = useCallback(
    (cardId: string): SetCompletionData | null => {
      const setId = cardSetMap.get(cardId)
      if (!setId) return null
      return setCompletionData.find(s => s.set_id === setId) ?? null
    },
    [cardSetMap, setCompletionData]
  )

  return {
    setCompletionData,
    cardSetMap,
    getSetForCard,
    refresh: fetchSets,
    loading,
  }
}
