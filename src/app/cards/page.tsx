'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCard } from '@/types'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

interface CardModalProps {
  userCard: UserCard
  onClose: () => void
  onAddToCollection: (cardId: string) => void
  user: User | null
}

function CardModal({ userCard, onClose, onAddToCollection, user }: CardModalProps) {

  const card = userCard.card
  
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

export default function CardsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterSport, setFilterSport] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)

  const fetchCards = useCallback(async () => {
    // Query the master cards table instead of user_cards
    let query = supabase
      .from('cards')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply filters directly to the cards table
    if (searchTerm) {
      query = query.or(`player_name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,series.ilike.%${searchTerm}%`)
    }

    if (filterSport) {
      query = query.eq('sport', filterSport)
    }

    if (filterYear) {
      query = query.eq('year', parseInt(filterYear))
    }

    const { data: cards, error } = await query

    if (error) {
      console.error('Error fetching cards:', error)
      return
    }

    // Transform the data to match the UserCard interface structure
    const transformedCards = (cards || []).map(card => ({
      id: card.id,
      user_id: user?.id || '',
      card_id: card.id,
      quantity: 0, // Default quantity for browsing
      condition: null,
      is_for_trade: false,
      notes: null,
      acquired_at: null,
      created_at: card.created_at,
      card: card // The actual card data
    }))

    setUserCards(transformedCards)
  }, [searchTerm, filterSport, filterYear, user?.id])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }

    getUser()
    fetchCards()
  }, [fetchCards])

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      fetchCards()
    }, 300)

    return () => clearTimeout(delayedSearch)
  }, [searchTerm, filterSport, filterYear, fetchCards])

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

  const sports = ['baseball', 'basketball', 'football', 'hockey', 'pokemon', 'soccer']
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading cards...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Home</span>
              </Link>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Browse Cards
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {userCards.length} cards
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filters */}
        <div className="mb-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search by player, brand, or series..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
              />
            </div>
            
            <select
              value={filterSport}
              onChange={(e) => setFilterSport(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
            >
              <option value="">All Sports</option>
              {sports.map(sport => (
                <option key={sport} value={sport}>
                  {sport.charAt(0).toUpperCase() + sport.slice(1)}
                </option>
              ))}
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
            >
              <option value="">All Years</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {userCards.length === 0 ? (
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
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {userCards.map((userCard) => (
              <div 
                key={userCard.id} 
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden cursor-pointer"
                onClick={() => setSelectedCard(userCard)}
              >
                {userCard.card?.image_url || userCard.card?.front_image_url ? (
                  <div className="relative aspect-[2.5/3.5] overflow-hidden">
                    <Image 
                      src={userCard.card?.front_image_url || userCard.card?.image_url || ''} 
                      alt={`${userCard.card?.player_name || 'Unknown'} card`}
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
                    {userCard.card?.player_name || 'Unknown Player'}
                  </h3>
                  
                  <div className="space-y-1 text-xs text-gray-600">
                    {userCard.card?.year && <div>{userCard.card.year}</div>}
                    {userCard.card?.brand && <div>{userCard.card.brand}</div>}
                    {userCard.card?.card_number && <div>#{userCard.card.card_number}</div>}
                    {userCard.card?.sport && <div className="capitalize">{userCard.card.sport}</div>}
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs font-medium">
                        Available
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {userCard.card?.rookie && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          RC
                        </span>
                      )}
                      {userCard.card?.autographed && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          Auto
                        </span>
                      )}
                      {userCard.card?.patch && (
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
        )}
      </main>

      {/* Modal */}
      {selectedCard && (
        <CardModal 
          userCard={selectedCard} 
          onClose={() => setSelectedCard(null)}
          onAddToCollection={addToCollection}
          user={user}
        />
      )}
    </div>
  )
}