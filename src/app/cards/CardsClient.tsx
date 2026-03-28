'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { CardWithTradeInfo } from '@/types'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

const PAGE_SIZE = 36

interface CardModalProps {
  card: CardWithTradeInfo
  onClose: () => void
  onAddToCollection: (cardId: string) => void
  user: User | null
}

function CardModal({ card, onClose, onAddToCollection, user }: CardModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4 z-50"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex justify-between items-start mb-6">
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {card?.player_name || 'Unknown Player'}
            </h2>
            <button
              onClick={onClose}
              style={{ color: 'var(--color-text-muted)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Card Images */}
            <div className="flex justify-center">
              {card?.back_image_url ? (
                <div className="flex gap-6 justify-center">
                  <div className="text-center">
                    <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Front</p>
                    <div className="relative w-56 aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                      <Image src={card.front_image_url || card.image_url || ''} alt={`${card.player_name || 'Unknown'} front`} fill className="object-contain" />
                    </div>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium mb-2 uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Back</p>
                    <div className="relative w-56 aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                      <Image src={card.back_image_url} alt={`${card.player_name || 'Unknown'} back`} fill className="object-contain" />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative w-56 aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                  <Image src={card?.front_image_url || card?.image_url || ''} alt={`${card?.player_name || 'Unknown'} card`} fill className="object-contain" />
                </div>
              )}
            </div>

            {/* Card Details */}
            <div className="space-y-5">
              <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                {card?.year && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Year</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{card.year}</p>
                  </div>
                )}
                {card?.player_name && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Player</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.player_name}</p>
                  </div>
                )}
                {card?.team && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Team</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.team}</p>
                  </div>
                )}
                {card?.position && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Position</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.position}</p>
                  </div>
                )}
                {card?.sport && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Sport</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.sport}</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {card?.brand && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Brand</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.brand}</p>
                  </div>
                )}
                {card?.series && (
                  <div>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Series</p>
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{card.series}</p>
                  </div>
                )}
              </div>

              {/* Attributes */}
              {(card?.rookie || card?.autographed || card?.patch) && (
                <div className="flex flex-wrap gap-2">
                  {card?.rookie && (
                    <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>RC</span>
                  )}
                  {card?.autographed && (
                    <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>AUTO</span>
                  )}
                  {card?.patch && (
                    <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>PATCH</span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                {user && card ? (
                  <button
                    onClick={() => { onAddToCollection(card.id); onClose() }}
                    className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                    style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
                  >
                    Add to Collection
                  </button>
                ) : (
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Sign in to add to collection</span>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium transition-colors"
                  style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '4px' }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--color-text-muted)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--color-border)')}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sport-first landing rows ─────────────────────────────────────────────────

interface SportRowProps {
  sport: string
  cards: CardWithTradeInfo[]
  onCardClick: (card: CardWithTradeInfo) => void
  onSeeAll: (sport: string) => void
}

function SportRow({ sport, cards, onCardClick, onSeeAll }: SportRowProps) {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          {sport}
          <span className="ml-2 text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
            {cards.length}+ cards
          </span>
        </h2>
        <button
          onClick={() => onSeeAll(sport)}
          className="text-xs font-medium px-2 py-1 transition-colors"
          style={{ color: 'var(--color-accent)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
        >
          See all
        </button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
        {cards.map(card => (
          <div
            key={card.id}
            className="flex-shrink-0 w-36 card-lift cursor-pointer overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            onClick={() => onCardClick(card)}
          >
            {card?.front_image_url || card?.image_url ? (
              <div className="card-image-wrapper aspect-[2.5/3.5]" style={{ background: 'var(--color-bg)' }}>
                <Image src={card.front_image_url || card.image_url || ''} alt={card.player_name || 'Card'} fill className="object-contain" sizes="144px" />
              </div>
            ) : (
              <div className="aspect-[2.5/3.5] flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <svg className="w-8 h-8" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            <div className="p-2">
              <p className="text-xs font-semibold line-clamp-1" style={{ color: 'var(--color-text)' }}>{card.player_name}</p>
              <p className="text-[10px]" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {[card.year, card.brand].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface CardsClientProps {
  searchParams: {
    q?: string
    sport?: string
    year?: string
    rookie?: string
    auto?: string
    patch?: string
  }
}

export default function CardsClient({ searchParams }: CardsClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardWithTradeInfo | null>(null)
  const [cards, setCards] = useState<CardWithTradeInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [totalCount, setTotalCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Sport-first landing state
  const [sportRows, setSportRows] = useState<Map<string, CardWithTradeInfo[]>>(new Map())

  const hasFilters = !!(searchParams.q || searchParams.sport || searchParams.year || searchParams.rookie || searchParams.auto || searchParams.patch)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  // Fetch cards — either filtered results or sport-first landing
  const fetchCards = useCallback(async (offset = 0) => {
    if (offset > 0) setLoadingMore(true)
    else setLoading(true)

    try {
      if (!hasFilters && offset === 0) {
        // Sport-first landing: fetch top 6 per sport
        const sports = ['Baseball', 'Basketball', 'Football', 'Hockey', 'Soccer']
        const rows = new Map<string, CardWithTradeInfo[]>()

        const results = await Promise.all(
          sports.map(sport =>
            supabase
              .from('cards')
              .select('*, user_cards(id, user_id, is_for_trade, quantity)')
              .eq('sport', sport)
              .not('player_name', 'is', null)
              .order('created_at', { ascending: false })
              .limit(6)
          )
        )

        sports.forEach((sport, i) => {
          const data = results[i].data || []
          if (data.length > 0) rows.set(sport, data)
        })

        setSportRows(rows)

        // Also get total count
        const { count } = await supabase
          .from('cards')
          .select('id', { count: 'exact', head: true })
          .not('player_name', 'is', null)

        setTotalCount(count || 0)
        setCards([])
        setHasMore(false)
      } else {
        // Filtered view with pagination
        let query = supabase
          .from('cards')
          .select('*, user_cards(id, user_id, is_for_trade, quantity)', { count: 'exact' })
          .not('player_name', 'is', null)
          .order('created_at', { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1)

        if (searchParams.q) {
          query = query.or(`player_name.ilike.%${searchParams.q}%,brand.ilike.%${searchParams.q}%,series.ilike.%${searchParams.q}%`)
        }
        if (searchParams.sport) query = query.eq('sport', searchParams.sport)
        if (searchParams.year) query = query.eq('year', parseInt(searchParams.year))
        if (searchParams.rookie === 'true') query = query.eq('rookie', true)
        if (searchParams.auto === 'true') query = query.eq('autographed', true)
        if (searchParams.patch === 'true') query = query.eq('patch', true)

        const { data, error, count } = await query
        if (error) {
          console.error('Error fetching cards:', error)
        } else {
          if (offset === 0) {
            setCards(data || [])
          } else {
            setCards(prev => [...prev, ...(data || [])])
          }
          setTotalCount(count || 0)
          setHasMore((data || []).length === PAGE_SIZE)
          setSportRows(new Map())
        }
      }
    } catch (err) {
      console.error('Error in fetchCards:', err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [searchParams.q, searchParams.sport, searchParams.year, searchParams.rookie, searchParams.auto, searchParams.patch, hasFilters])

  useEffect(() => {
    fetchCards(0)
  }, [fetchCards])

  // Infinite scroll via Intersection Observer
  useEffect(() => {
    if (!hasMore || loadingMore || !sentinelRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          fetchCards(cards.length)
        }
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, loadingMore, cards.length, fetchCards])

  const addToCollection = async (cardId: string) => {
    if (!user) {
      alert('Please sign in to add cards to your collection')
      return
    }

    const { data: existingCard } = await supabase
      .from('user_cards')
      .select('*')
      .eq('user_id', user.id)
      .eq('card_id', cardId)
      .single()

    if (existingCard) {
      alert('You already have this card in your collection!')
      return
    }

    const { error } = await supabase
      .from('user_cards')
      .insert({ user_id: user.id, card_id: cardId, quantity: 1 })

    if (error) {
      console.error('Error adding card to collection:', error)
      alert('Error adding card to collection')
      return
    }

    alert('Card added to your collection!')
  }

  const navigateToSport = (sport: string) => {
    const params = new URLSearchParams()
    params.set('sport', sport)
    window.location.href = `/cards?${params.toString()}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="animate-pulse" style={{ border: '1px solid var(--color-border)', borderRadius: '4px', overflow: 'hidden' }}>
            <div className="aspect-[2.5/3.5]" style={{ background: 'var(--color-border)' }} />
            <div className="p-3 space-y-2">
              <div className="h-3 rounded" style={{ background: 'var(--color-border)', width: '70%' }} />
              <div className="h-2 rounded" style={{ background: 'var(--color-border)', width: '50%' }} />
            </div>
          </div>
        ))}
      </div>
    )
  }

  // Sport-first landing page
  if (!hasFilters && sportRows.size > 0) {
    return (
      <>
        <div className="mb-4">
          <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
            {totalCount.toLocaleString()} cards in database
          </p>
        </div>

        {[...sportRows.entries()].map(([sport, sportCards]) => (
          <SportRow
            key={sport}
            sport={sport}
            cards={sportCards}
            onCardClick={setSelectedCard}
            onSeeAll={navigateToSport}
          />
        ))}

        {selectedCard && (
          <CardModal
            card={selectedCard}
            onClose={() => setSelectedCard(null)}
            onAddToCollection={addToCollection}
            user={user}
          />
        )}
      </>
    )
  }

  // Filtered view — no results
  if (cards.length === 0 && hasFilters) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No cards found</h3>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>Try adjusting your search criteria or clear filters to browse all cards.</p>
      </div>
    )
  }

  // Filtered view — card grid with infinite scroll
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
          {totalCount.toLocaleString()} cards
          {searchParams.sport ? ` in ${searchParams.sport}` : ''}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            className="card-lift cursor-pointer overflow-hidden"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            onClick={() => setSelectedCard(card)}
          >
            {card?.image_url || card?.front_image_url ? (
              <div className="card-image-wrapper aspect-[2.5/3.5]" style={{ background: 'var(--color-bg)' }}>
                <Image
                  src={card?.front_image_url || card?.image_url || ''}
                  alt={`${card?.player_name || 'Unknown'} card`}
                  fill
                  className="object-contain"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 16vw"
                />
              </div>
            ) : (
              <div className="aspect-[2.5/3.5] flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
                <svg className="w-10 h-10" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}

            <div className="p-3">
              <p className="text-xs font-semibold mb-1 line-clamp-1" style={{ color: 'var(--color-text)' }}>
                {card?.player_name || 'Unknown Player'}
              </p>
              <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                {[card?.year, card?.brand, card?.card_number ? `#${card.card_number}` : null].filter(Boolean).join(' \u00B7 ')}
              </p>

              <div className="flex flex-wrap gap-1">
                {card?.sport && !searchParams.sport && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5" style={{ background: 'rgba(201, 168, 76, 0.08)', color: 'var(--color-text-secondary)', borderRadius: '2px' }}>
                    {card.sport}
                  </span>
                )}
                {card.user_cards?.some((uc: { is_for_trade: boolean }) => uc.is_for_trade) && (
                  <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '2px' }}>TRADE</span>
                )}
                {card?.rookie && (
                  <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>RC</span>
                )}
                {card?.autographed && (
                  <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>AUTO</span>
                )}
                {card?.patch && (
                  <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>PATCH</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Infinite scroll sentinel */}
      {hasMore && (
        <div ref={sentinelRef} className="py-8 flex justify-center">
          {loadingMore && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }} />
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Loading more cards...</span>
            </div>
          )}
        </div>
      )}

      {!hasMore && cards.length > 0 && (
        <p className="py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing all {cards.length} cards
        </p>
      )}

      {selectedCard && (
        <CardModal
          card={selectedCard}
          onClose={() => setSelectedCard(null)}
          onAddToCollection={addToCollection}
          user={user}
        />
      )}
    </>
  )
}
