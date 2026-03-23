'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { CardWithTradeInfo } from '@/types'
import { User } from '@supabase/supabase-js'
import Image from 'next/image'

interface CardModalProps {
  card: CardWithTradeInfo
  onClose: () => void
  onAddToCollection: (cardId: string) => void
  user: User | null
}

function CardModal({ card, onClose, onAddToCollection, user }: CardModalProps) {
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
          {/* Header */}
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
                    <p className="text-sm font-semibold capitalize" style={{ color: 'var(--color-text)' }}>{card.sport}</p>
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

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user ?? null
        setUser(user)

        if (!user) return

        let query = supabase
          .from('cards')
          .select(`
            *,
            user_cards(
              id,
              user_id,
              is_for_trade,
              quantity
            )
          `)
          .order('created_at', { ascending: false })
          .limit(100)

        if (searchParams.q) {
          query = query.or(`player_name.ilike.%${searchParams.q}%,brand.ilike.%${searchParams.q}%,series.ilike.%${searchParams.q}%`)
        }
        if (searchParams.sport) query = query.eq('sport', searchParams.sport)
        if (searchParams.year) query = query.eq('year', parseInt(searchParams.year))
        if (searchParams.rookie === 'true') query = query.eq('rookie', true)
        if (searchParams.auto === 'true') query = query.eq('autographed', true)
        if (searchParams.patch === 'true') query = query.eq('patch', true)

        const { data, error } = await query
        if (error) console.error('Error fetching cards:', error)
        else setCards(data || [])
      } catch (err) {
        console.error('Error in fetchCards:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchCards()
  }, [searchParams.q, searchParams.sport, searchParams.year, searchParams.rookie, searchParams.auto, searchParams.patch])

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

  if (!user) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Sign in to browse cards</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>View and add cards to your collection.</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No cards found</h3>
        <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>Try adjusting your search criteria or check back later.</p>
      </div>
    )
  }

  return (
    <>
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
                {[card?.year, card?.brand, card?.card_number ? `#${card.card_number}` : null].filter(Boolean).join(' · ')}
              </p>

              <div className="flex flex-wrap gap-1">
                {card.user_cards?.some(uc => uc.is_for_trade) && (
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
