'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, UserCard, CardWithTradeInfo } from '@/types'
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {card?.player_name || 'Unknown Player'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-8">
            {/* Card Images - Side by Side */}
            <div className="flex justify-center">
              {(card?.back_image_url) ? (
                // Show both front and back images side by side
                <div className="flex gap-8 justify-center">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Front</h3>
                    <div className="relative w-64 aspect-[2.5/3.5] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={card.front_image_url || card.image_url || ''}
                        alt={`${card.player_name || 'Unknown'} card front`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Back</h3>
                    <div className="relative w-64 aspect-[2.5/3.5] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={card.back_image_url}
                        alt={`${card.player_name || 'Unknown'} card back`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                // Show only front image centered
                <div className="text-center">
                  <div className="relative w-64 aspect-[2.5/3.5] bg-gray-50 rounded-lg overflow-hidden shadow-lg mx-auto">
                    <Image
                      src={card?.front_image_url || card?.image_url || ''}
                      alt={`${card?.player_name || 'Unknown'} card`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
            
            {/* Card Details - Below Images */}
            <div className="space-y-6">
              {/* Main card info in grid */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
                {/* Year */}
                {card?.year && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <div className="text-lg font-semibold">{card.year}</div>
                  </div>
                )}
                
                {/* Player Name */}
                {card?.player_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                    <div className="text-lg font-semibold">{card.player_name}</div>
                  </div>
                )}
                
                {/* Team */}
                {card?.team && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <div className="text-lg font-semibold">{card.team}</div>
                  </div>
                )}
                
                {/* Position */}
                {card?.position && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <div className="text-lg font-semibold">{card.position}</div>
                  </div>
                )}
                
                {/* Sport */}
                {card?.sport && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                    <div className="text-lg font-semibold capitalize">{card.sport}</div>
                  </div>
                )}
              </div>

              {/* Brand and Series in second row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand */}
                {card?.brand && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <div className="text-lg font-semibold">{card.brand}</div>
                  </div>
                )}
                
                {/* Series */}
                {card?.series && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                    <div className="text-lg font-semibold">{card.series}</div>
                  </div>
                )}
              </div>
              
              {/* Attributes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attributes</label>
                <div className="flex flex-wrap gap-2">
                  {card?.rookie && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      Rookie Card
                    </span>
                  )}
                  {card?.autographed && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Autographed
                    </span>
                  )}
                  {card?.patch && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      Patch/Jersey
                    </span>
                  )}
                </div>
              </div>
              
              {/* Card availability information */}
              <div className="border-t pt-4 space-y-4">
                <div className="text-center">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-blue-900 mb-2">Add to Your Collection</h3>
                    <p className="text-blue-700 text-sm">
                      This card is available in our database. Click the button below to add it to your personal collection.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-3 border-t pt-4">
                {user && card ? (
                  <button
                    onClick={() => {
                      onAddToCollection(card.id)
                      onClose()
                    }}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    Add to Collection
                  </button>
                ) : (
                  <div className="text-sm text-gray-500">Sign in to add to collection</div>
                )}
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
  cards: Card[]
  searchParams: {
    q?: string
    sport?: string
    year?: string
    rookie?: string
    auto?: string
    patch?: string
  }
}

export default function CardsClient({ cards: initialCards, searchParams }: CardsClientProps) {
  const [user, setUser] = useState<User | null>(null)
  const [selectedCard, setSelectedCard] = useState<CardWithTradeInfo | null>(null)
  const [cards, setCards] = useState<CardWithTradeInfo[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch cards on client side
  useEffect(() => {
    const fetchCards = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (!user) {
        setLoading(false)
        return
      }

             // Get all cards with trade information
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

      // Apply search filter
      if (searchParams.q) {
        query = query.or(`player_name.ilike.%${searchParams.q}%,brand.ilike.%${searchParams.q}%,series.ilike.%${searchParams.q}%`)
      }

      // Apply sport filter
      if (searchParams.sport) {
        query = query.eq('sport', searchParams.sport)
      }

      // Apply year filter
      if (searchParams.year) {
        query = query.eq('year', parseInt(searchParams.year))
      }

      // Apply attribute filters
      if (searchParams.rookie === 'true') {
        query = query.eq('rookie', true)
      }

      if (searchParams.auto === 'true') {
        query = query.eq('autographed', true)
      }

      if (searchParams.patch === 'true') {
        query = query.eq('patch', true)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error fetching cards:', error)
      } else {
        setCards(data || [])
      }
      
      setLoading(false)
    }

    fetchCards()
  }, [searchParams.q, searchParams.sport, searchParams.year, searchParams.rookie, searchParams.auto, searchParams.patch])

  const addToCollection = async (cardId: string) => {
    if (!user) {
      alert('Please sign in to add cards to your collection')
      return
    }

    // Check if user already has this card
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
      .insert({
        user_id: user.id,
        card_id: cardId,
        quantity: 1
      })

    if (error) {
      console.error('Error adding card to collection:', error)
      alert('Error adding card to collection')
      return
    }

    alert('Card added to your collection!')
  }

  if (loading) {
    return (
      <div className="text-center py-16">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading cards...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="text-center py-16">
        <div className="mb-8">
          <svg className="w-20 h-20 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to browse cards</h2>
        <p className="text-gray-600 mb-8">Sign in to view and add cards to your collection.</p>
      </div>
    )
  }

  if (cards.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">No cards found</h3>
        <p className="text-gray-600 max-w-md mx-auto">
          Try adjusting your search criteria or check back later for new cards.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        {cards.map((card) => (
          <div 
            key={card.id} 
            className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden cursor-pointer"
            onClick={() => setSelectedCard(card)}
          >
            {card?.image_url || card?.front_image_url ? (
              <div className="relative aspect-[2.5/3.5] overflow-hidden">
                <Image 
                  src={card?.front_image_url || card?.image_url || ''} 
                  alt={`${card?.player_name || 'Unknown'} card`}
                  fill
                  className="object-contain group-hover:scale-105 transition-transform duration-300 bg-gray-50"
                />
              </div>
            ) : (
              <div className="aspect-[2.5/3.5] bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
            
            <div className="p-4">
              <h3 className="font-bold text-sm mb-2 text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                {card?.player_name || 'Unknown Player'}
              </h3>
              
              <div className="space-y-1 text-xs text-gray-600">
                {card?.year && <div>{card.year}</div>}
                {card?.brand && <div>{card.brand}</div>}
                {card?.card_number && <div>#{card.card_number}</div>}
                {card?.sport && <div className="capitalize">{card.sport}</div>}
              </div>
              
                             <div className="mt-3 space-y-2">
                 {/* Show Available badge only if card is marked for trade */}
                 {card.user_cards && card.user_cards.some(uc => uc.is_for_trade) && (
                   <div className="flex items-center justify-between">
                     <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                       Available
                     </span>
                   </div>
                 )}
                 <div className="flex flex-wrap gap-1">
                   {card?.rookie && (
                     <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                       RC
                     </span>
                   )}
                   {card?.autographed && (
                     <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                       Auto
                     </span>
                   )}
                   {card?.patch && (
                     <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                       Patch
                     </span>
                   )}
                 </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
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
