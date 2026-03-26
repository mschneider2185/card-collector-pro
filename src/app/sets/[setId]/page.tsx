'use client'

import { useEffect, useState, useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { ScrapedCardSet, SetChecklistCard } from '@/types'

type Filter = 'all' | 'owned' | 'missing' | 'rookies' | 'short_prints'

interface AnnotatedCard extends SetChecklistCard {
  owned: boolean
}

interface CompletionData {
  set: ScrapedCardSet
  total: number
  owned: number
  completion_percentage: number
  checklist: AnnotatedCard[]
}

export default function SetDetailPage() {
  const { setId } = useParams<{ setId: string }>()
  const [data, setData] = useState<CompletionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [userId, setUserId] = useState<string | null>(null)
  const [markingId, setMarkingId] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sign in to view set completion.')
        setLoading(false)
        return
      }

      setUserId(session.user.id)

      const res = await fetch(`/api/sets/completion?setId=${setId}&userId=${session.user.id}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Failed to load set')
      } else {
        setData(json)
      }
      setLoading(false)
    }

    load()
  }, [setId])

  const filteredChecklist = useMemo(() => {
    if (!data) return []
    switch (filter) {
      case 'owned': return data.checklist.filter((c) => c.owned)
      case 'missing': return data.checklist.filter((c) => !c.owned)
      case 'rookies': return data.checklist.filter((c) => c.is_rookie)
      case 'short_prints': return data.checklist.filter((c) => c.is_short_print)
      default: return data.checklist
    }
  }, [data, filter])

  const handleMarkOwned = async (checklistCard: AnnotatedCard) => {
    if (!userId || markingId) return
    setMarkingId(checklistCard.id)

    try {
      // Create a card in the cards table, then link via user_cards with checklist_id
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Upsert a card entry
      const cardData = {
        player_name: checklistCard.player_name,
        team: checklistCard.team,
        position: checklistCard.position,
        card_number: checklistCard.card_number,
        sport: data?.set.sport || null,
        year: data?.set.year || null,
        brand: data?.set.brand || null,
        series: data?.set.series || null,
        variation: checklistCard.variation,
      }

      const { data: card, error: cardErr } = await supabase
        .from('cards')
        .insert(cardData)
        .select('id')
        .single()

      if (cardErr || !card) {
        console.error('Error creating card:', cardErr)
        return
      }

      // Insert user_card with checklist_id
      const { error: ucErr } = await supabase
        .from('user_cards')
        .insert({
          user_id: userId,
          card_id: card.id,
          checklist_id: checklistCard.id,
          quantity: 1,
          is_for_trade: false,
        })

      if (ucErr) {
        console.error('Error creating user_card:', ucErr)
        return
      }

      // Update local state
      setData((prev) => {
        if (!prev) return prev
        const updatedChecklist = prev.checklist.map((c) =>
          c.id === checklistCard.id ? { ...c, owned: true } : c
        )
        const owned = updatedChecklist.filter((c) => c.owned).length
        return {
          ...prev,
          owned,
          completion_percentage: prev.total > 0
            ? Math.round((owned / prev.total) * 10000) / 100
            : 0,
          checklist: updatedChecklist,
        }
      })
    } finally {
      setMarkingId(null)
    }
  }

  const filters: { key: Filter; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'owned', label: 'Owned' },
    { key: 'missing', label: 'Missing' },
    { key: 'rookies', label: 'Rookies' },
    { key: 'short_prints', label: 'Short Prints' },
  ]

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="flex flex-col items-center gap-3" style={{ color: 'var(--color-text-muted)' }}>
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
          />
          <p className="text-sm">Loading set...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div
          className="px-4 py-3 text-sm"
          style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', borderRadius: '4px', color: 'var(--color-error)' }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const pctWidth = Math.min(100, data.completion_percentage)

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 px-6 py-4"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3 mb-3">
          <Link
            href="/sets"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Sets</span>
          </Link>
          <div className="w-px h-4" style={{ background: 'var(--color-border)' }} />
          <div className="min-w-0">
            <p
              className="text-xs uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            >
              {data.set.year} · {data.set.brand}
            </p>
            <h1
              className="text-base font-semibold truncate"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {data.set.name}
            </h1>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full h-2 overflow-hidden" style={{ background: 'var(--color-border)', borderRadius: '1px' }}>
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${pctWidth}%`,
                  background: data.completion_percentage >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
                }}
              />
            </div>
          </div>
          <div
            className="shrink-0 text-sm font-semibold tabular-nums"
            style={{
              fontFamily: 'var(--font-mono)',
              color: data.completion_percentage >= 100 ? 'var(--color-success)' : 'var(--color-accent)',
            }}
          >
            {data.owned} / {data.total} — {data.completion_percentage}%
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto">
          {filters.map((f) => {
            const active = filter === f.key
            const count = f.key === 'all' ? data.checklist.length
              : f.key === 'owned' ? data.owned
              : f.key === 'missing' ? data.total - data.owned
              : f.key === 'rookies' ? data.checklist.filter((c) => c.is_rookie).length
              : data.checklist.filter((c) => c.is_short_print).length

            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className="px-3 py-1.5 text-xs font-semibold tracking-wide uppercase whitespace-nowrap transition-colors"
                style={{
                  borderRadius: '2px',
                  background: active ? 'rgba(201, 168, 76, 0.1)' : 'transparent',
                  border: active ? '1px solid rgba(201, 168, 76, 0.3)' : '1px solid var(--color-border)',
                  color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                }}
              >
                {f.label} ({count})
              </button>
            )
          })}
        </div>

        {/* Two-column summary */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Cards Owned</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>{data.owned}</p>
          </div>
          <div className="p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Cards Missing</p>
            <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-error)' }}>{data.total - data.owned}</p>
          </div>
        </div>

        {/* Checklist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
          {filteredChecklist.map((card) => (
            <div
              key={card.id}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{
                background: card.owned ? 'rgba(45, 106, 79, 0.06)' : 'var(--color-surface)',
                border: `1px solid ${card.owned ? 'rgba(45, 106, 79, 0.2)' : 'var(--color-border)'}`,
                borderRadius: '4px',
              }}
            >
              {/* Status dot */}
              <div
                className="w-2 h-2 shrink-0 rounded-full"
                style={{ background: card.owned ? 'var(--color-success)' : 'var(--color-border)' }}
              />

              {/* Card info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span
                    className="text-xs font-bold shrink-0"
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
                  >
                    #{card.card_number}
                  </span>
                  {card.is_rookie && (
                    <span className="badge badge-accent" style={{ fontSize: '9px', padding: '0 3px' }}>RC</span>
                  )}
                  {card.is_short_print && (
                    <span className="badge badge-error" style={{ fontSize: '9px', padding: '0 3px' }}>SP</span>
                  )}
                </div>
                <p
                  className="text-sm truncate"
                  style={{ color: card.owned ? 'var(--color-text)' : 'var(--color-text-secondary)' }}
                >
                  {card.player_name || 'Unknown'}
                </p>
                {card.team && (
                  <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                    {card.team}
                  </p>
                )}
              </div>

              {/* Action */}
              {!card.owned && (
                <button
                  onClick={() => handleMarkOwned(card)}
                  disabled={markingId === card.id}
                  className="shrink-0 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: 'var(--color-accent)',
                    color: '#0D0D0D',
                    borderRadius: '2px',
                  }}
                >
                  {markingId === card.id ? '...' : 'Own'}
                </button>
              )}

              {card.owned && (
                <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-success)' }} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          ))}
        </div>

        {filteredChecklist.length === 0 && (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No cards match this filter.
          </div>
        )}
      </main>
    </div>
  )
}
