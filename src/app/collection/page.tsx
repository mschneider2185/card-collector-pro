'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCard } from '@/types'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

interface CardModalProps {
  userCard: UserCard
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (updatedCard: UserCard) => void
}

function CardModal({ userCard, onClose, onDelete, onUpdate }: CardModalProps) {
  const [showBack, setShowBack] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    quantity: userCard.quantity,
    condition: userCard.condition || '',
    notes: userCard.notes || '',
    is_for_trade: userCard.is_for_trade,
    acquired_at: userCard.acquired_at ? userCard.acquired_at.split('T')[0] : ''
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`/api/user-cards/${userCard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quantity: editForm.quantity,
          condition: editForm.condition || null,
          notes: editForm.notes || null,
          is_for_trade: editForm.is_for_trade,
          acquired_at: editForm.acquired_at || null,
          user_id: user.id
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error('API Error:', errorData)
        throw new Error(errorData.error || 'Failed to update card')
      }

      const { data } = await response.json()
      onUpdate(data)
      setIsEditing(false)
    } catch (error) {
      console.error('Error updating card:', error)
      alert(`Failed to update card: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditForm({
      quantity: userCard.quantity,
      condition: userCard.condition || '',
      notes: userCard.notes || '',
      is_for_trade: userCard.is_for_trade,
      acquired_at: userCard.acquired_at ? userCard.acquired_at.split('T')[0] : ''
    })
    setIsEditing(false)
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {userCard.card?.player_name || 'Unknown Player'}
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
              {(userCard.card as any)?.back_image_url ? (
                // Show both front and back images side by side
                <div className="flex gap-8 justify-center">
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Front</h3>
                    <div className="relative w-64 aspect-[2.5/3.5] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={(userCard.card as any).front_image_url || userCard.card?.image_url || ''}
                        alt={`${userCard.card?.player_name || 'Unknown'} card front`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <div className="text-center">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Back</h3>
                    <div className="relative w-64 aspect-[2.5/3.5] bg-gray-50 rounded-lg overflow-hidden shadow-lg">
                      <Image
                        src={(userCard.card as any).back_image_url}
                        alt={`${userCard.card?.player_name || 'Unknown'} card back`}
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
                    {userCard.card && (
                      <Image
                        src={(userCard.card as any).front_image_url || userCard.card.image_url || ''}
                        alt={`${userCard.card.player_name || 'Unknown'} card`}
                        fill
                        className="object-contain"
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Card Details - Below Images */}
            <div className="space-y-6">
              {/* Main card info in grid */}
              <div className="grid grid-cols-3 md:grid-cols-5 gap-6">
                {/* Year */}
                {userCard.card?.year && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <div className="text-lg font-semibold">{userCard.card.year}</div>
                  </div>
                )}
                
                {/* Player Name */}
                {userCard.card?.player_name && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                    <div className="text-lg font-semibold">{userCard.card.player_name}</div>
                  </div>
                )}
                
                {/* Team */}
                {userCard.card?.team && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <div className="text-lg font-semibold">{userCard.card.team}</div>
                  </div>
                )}
                
                {/* Position */}
                {userCard.card?.position && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <div className="text-lg font-semibold">{userCard.card.position}</div>
                  </div>
                )}
                
                {/* Sport */}
                {userCard.card?.sport && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                    <div className="text-lg font-semibold capitalize">{userCard.card.sport}</div>
                  </div>
                )}
              </div>

              {/* Brand and Series in second row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Brand */}
                {userCard.card?.brand && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <div className="text-lg font-semibold">{userCard.card.brand}</div>
                  </div>
                )}
                
                {/* Series */}
                {userCard.card?.series && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                    <div className="text-lg font-semibold">{userCard.card.series}</div>
                  </div>
                )}
              </div>
              
              {/* Attributes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attributes</label>
                <div className="flex flex-wrap gap-2">
                  {(userCard.card as any)?.rookie && (
                    <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                      Rookie Card
                    </span>
                  )}
                  {(userCard.card as any)?.autographed && (
                    <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium">
                      Autographed
                    </span>
                  )}
                  {(userCard.card as any)?.patch && (
                    <span className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
                      Patch/Jersey
                    </span>
                  )}
                </div>
              </div>

              {/* Collection-specific information */}
              <div className="border-t pt-4 space-y-4">
                {isEditing ? (
                  // Edit mode
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({...editForm, quantity: parseInt(e.target.value) || 1})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                      <select
                        value={editForm.condition}
                        onChange={(e) => setEditForm({...editForm, condition: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select condition...</option>
                        <option value="Mint">Mint</option>
                        <option value="Near Mint">Near Mint</option>
                        <option value="Excellent">Excellent</option>
                        <option value="Very Good">Very Good</option>
                        <option value="Good">Good</option>
                        <option value="Fair">Fair</option>
                        <option value="Poor">Poor</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Private)</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({...editForm, notes: e.target.value})}
                        placeholder="Add your private notes about this card..."
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
                      <input
                        type="date"
                        value={editForm.acquired_at}
                        onChange={(e) => setEditForm({...editForm, acquired_at: e.target.value})}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="is_for_trade"
                        checked={editForm.is_for_trade}
                        onChange={(e) => setEditForm({...editForm, is_for_trade: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="is_for_trade" className="ml-2 text-sm font-medium text-gray-700">
                        Available for trade
                      </label>
                    </div>
                  </>
                ) : (
                  // View mode
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                      <div className="text-lg font-semibold">{userCard.quantity}</div>
                    </div>
                    
                    {userCard.condition && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                        <div className="text-lg font-semibold">{userCard.condition}</div>
                      </div>
                    )}
                    
                    {userCard.notes && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Private Notes</label>
                        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{userCard.notes}</div>
                      </div>
                    )}
                    
                    {userCard.acquired_at && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Acquired</label>
                        <div className="text-lg font-semibold">{new Date(userCard.acquired_at).toLocaleDateString()}</div>
                      </div>
                    )}
                    
                    {userCard.is_for_trade && (
                      <div className="flex items-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                          Available for Trade
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex justify-between border-t pt-4">
                <div className="space-x-3">
                  {isEditing ? (
                    <>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                      <button
                        onClick={handleCancel}
                        disabled={saving}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Edit Card
                    </button>
                  )}
                </div>
                <div className="space-x-3">
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to remove this card from your collection?')) {
                        onDelete(userCard.id)
                        onClose()
                      }
                    }}
                    disabled={isEditing}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                  <button
                    onClick={onClose}
                    disabled={saving}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CollectionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      
      if (user) {
        await fetchUserCards(user.id)
      }
      setLoading(false)
    }

    getUser()
  }, [])

  const fetchUserCards = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_cards')
      .select(`
        *,
        card:cards(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user cards:', error)
      return
    }

    setUserCards(data || [])
  }

  const handleDeleteCard = async (userCardId: string) => {
    const { error } = await supabase
      .from('user_cards')
      .delete()
      .eq('id', userCardId)

    if (error) {
      console.error('Error deleting card:', error)
      return
    }

    setUserCards(prev => prev.filter(card => card.id !== userCardId))
  }

  const handleUpdateCard = (updatedCard: UserCard) => {
    setUserCards(prev => prev.map(card => 
      card.id === updatedCard.id ? updatedCard : card
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">Loading your collection...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="mb-8">
            <svg className="w-20 h-20 mx-auto text-blue-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to view your collection</h2>
          <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium transition-colors">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Go back to home
          </Link>
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
                My Collection
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Link href="/upload" className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Card
              </Link>
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {userCards.length} cards
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {userCards.length === 0 ? (
          <div className="text-center py-16">
            <div className="mb-8">
              <svg className="w-24 h-24 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">No cards in your collection yet</h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Start building your collection by uploading and scanning your trading cards.
            </p>
            <Link href="/upload" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105">
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Upload Your First Card
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {userCards.map((userCard) => (
              <div 
                key={userCard.id} 
                className="group bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-white/20 overflow-hidden cursor-pointer"
                onClick={() => setSelectedCard(userCard)}
              >
                {userCard.card?.image_url || (userCard.card as any)?.front_image_url ? (
                  <div className="relative aspect-[2.5/3.5] overflow-hidden">
                    <Image 
                      src={(userCard.card as any).front_image_url || userCard.card.image_url || ''} 
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
                  </div>
                  
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                        Qty: {userCard.quantity}
                      </span>
                      {userCard.is_for_trade && (
                        <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded-full text-xs font-medium">
                          Trade
                        </span>
                      )}
                      {userCard.condition && (
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          {userCard.condition}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(userCard.card as any)?.rookie && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                          RC
                        </span>
                      )}
                      {(userCard.card as any)?.autographed && (
                        <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium">
                          Auto
                        </span>
                      )}
                      {(userCard.card as any)?.patch && (
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
          onDelete={handleDeleteCard}
          onUpdate={handleUpdateCard}
        />
      )}
    </div>
  )
}