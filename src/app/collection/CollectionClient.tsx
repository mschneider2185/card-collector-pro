'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCard } from '@/types'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'

// ─── Condition badge color ───────────────────────────────────────────────────
function conditionColor(condition: string | null) {
  switch (condition) {
    case 'Mint': return 'bg-emerald-500/90 text-white'
    case 'Near Mint': return 'bg-green-500/90 text-white'
    case 'Excellent': return 'bg-lime-500/90 text-white'
    case 'Very Good': return 'bg-yellow-500/90 text-white'
    case 'Good': return 'bg-orange-500/90 text-white'
    case 'Fair': return 'bg-red-400/90 text-white'
    case 'Poor': return 'bg-red-600/90 text-white'
    default: return 'bg-white/20 text-white'
  }
}

// ─── Card Modal ──────────────────────────────────────────────────────────────
interface CardModalProps {
  userCard: UserCard
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (updatedCard: UserCard) => void
}

function CardModal({ userCard, onClose, onDelete, onUpdate }: CardModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    quantity: userCard.quantity,
    condition: userCard.condition || '',
    notes: userCard.notes || '',
    is_for_trade: userCard.is_for_trade,
    acquired_at: userCard.acquired_at ? userCard.acquired_at.split('T')[0] : ''
  })
  const [saving, setSaving] = useState(false)

  // Trap keyboard close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const response = await fetch(`/api/user-cards/${userCard.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
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
        throw new Error(errorData.error || 'Failed to update card')
      }

      const { data } = await response.json()
      onUpdate(data)
      setIsEditing(false)
    } catch (error) {
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

  const hasBothImages = !!(userCard.card?.back_image_url)
  const frontSrc = userCard.card?.front_image_url || userCard.card?.image_url || ''

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(12px)', background: 'rgba(10,10,20,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-3xl border border-white/15 shadow-2xl"
        style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.97) 0%, rgba(241,245,255,0.97) 100%)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Player name + badges */}
          <div className="mb-6 pr-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">
              {userCard.card?.player_name || 'Unknown Player'}
            </h2>
            <div className="flex flex-wrap gap-2 mt-2">
              {userCard.card?.year && (
                <span className="text-sm font-medium text-gray-500">{userCard.card.year}</span>
              )}
              {userCard.card?.brand && (
                <span className="text-sm text-gray-400">· {userCard.card.brand}</span>
              )}
              {userCard.card?.series && (
                <span className="text-sm text-gray-400">· {userCard.card.series}</span>
              )}
              {userCard.card?.card_number && (
                <span className="text-sm text-gray-400">· #{userCard.card.card_number}</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {userCard.card?.rookie && (
                <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide">RC</span>
              )}
              {userCard.card?.autographed && (
                <span className="bg-violet-100 text-violet-800 border border-violet-200 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide">AUTO</span>
              )}
              {userCard.card?.patch && (
                <span className="bg-orange-100 text-orange-800 border border-orange-200 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide">PATCH</span>
              )}
              {userCard.is_for_trade && (
                <span className="bg-green-100 text-green-800 border border-green-200 px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide">FOR TRADE</span>
              )}
            </div>
          </div>

          {/* Card images */}
          <div className="flex justify-center gap-6 mb-8">
            {hasBothImages ? (
              <>
                <div className="flex-1 max-w-[240px]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">Front</p>
                  <div className="relative aspect-[2.5/3.5] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                    <Image
                      src={frontSrc}
                      alt={`${userCard.card?.player_name || 'Card'} front`}
                      fill
                      className="object-contain bg-gradient-to-br from-gray-50 to-gray-100"
                    />
                  </div>
                </div>
                <div className="flex-1 max-w-[240px]">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 text-center">Back</p>
                  <div className="relative aspect-[2.5/3.5] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                    <Image
                      src={userCard.card!.back_image_url!}
                      alt={`${userCard.card?.player_name || 'Card'} back`}
                      fill
                      className="object-contain bg-gradient-to-br from-gray-50 to-gray-100"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="max-w-[260px] w-full">
                <div className="relative aspect-[2.5/3.5] rounded-2xl overflow-hidden shadow-xl ring-1 ring-black/5">
                  {frontSrc ? (
                    <Image
                      src={frontSrc}
                      alt={`${userCard.card?.player_name || 'Card'}`}
                      fill
                      className="object-contain bg-gradient-to-br from-gray-50 to-gray-100"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                      <svg className="w-16 h-16 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Team', value: userCard.card?.team },
              { label: 'Position', value: userCard.card?.position },
              { label: 'Sport', value: userCard.card?.sport, capitalize: true },
              { label: 'Brand', value: userCard.card?.brand },
              { label: 'Series', value: userCard.card?.series },
            ].filter(item => item.value).map(({ label, value, capitalize }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-sm font-semibold text-gray-800 ${capitalize ? 'capitalize' : ''}`}>{value}</p>
              </div>
            ))}
          </div>

          {/* Collection-specific info */}
          <div className="border-t border-gray-100 pt-5 space-y-4">
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest">Your Collection Details</h3>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="">Select condition...</option>
                    {['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date Acquired</label>
                  <input
                    type="date"
                    value={editForm.acquired_at}
                    onChange={e => setEditForm({ ...editForm, acquired_at: e.target.value })}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      onClick={() => setEditForm({ ...editForm, is_for_trade: !editForm.is_for_trade })}
                      className={`w-10 h-6 rounded-full transition-colors duration-200 flex items-center px-0.5 ${editForm.is_for_trade ? 'bg-green-500' : 'bg-gray-200'}`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${editForm.is_for_trade ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className="text-sm font-medium text-gray-700">Available for trade</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Private Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add your private notes about this card..."
                    rows={3}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <span className="text-xs font-semibold text-blue-400 uppercase tracking-wide">Qty</span>
                  <span className="text-sm font-bold text-blue-700">{userCard.quantity}</span>
                </div>
                {userCard.condition && (
                  <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Condition</span>
                    <span className="text-sm font-bold text-gray-800">{userCard.condition}</span>
                  </div>
                )}
                {userCard.acquired_at && (
                  <div className="bg-gray-50 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Acquired</span>
                    <span className="text-sm font-bold text-gray-800">{new Date(userCard.acquired_at).toLocaleDateString()}</span>
                  </div>
                )}
                {userCard.notes && (
                  <div className="w-full bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                    <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-1">Notes</p>
                    <p className="text-sm text-gray-700">{userCard.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                >
                  Edit Card
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (confirm('Are you sure you want to remove this card from your collection?')) {
                    onDelete(userCard.id)
                    onClose()
                  }
                }}
                disabled={isEditing}
                className="px-5 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-semibold rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Remove
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card Tile ────────────────────────────────────────────────────────────────
function CardTile({ userCard, onClick }: { userCard: UserCard; onClick: () => void }) {
  const imageSrc = userCard.card?.front_image_url || userCard.card?.image_url

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col rounded-2xl overflow-hidden cursor-pointer select-none
        bg-white/70 backdrop-blur-sm border border-white/40
        shadow-md hover:shadow-2xl
        transition-all duration-300 ease-out
        hover:-translate-y-1.5 hover:scale-[1.02]
        ring-1 ring-inset ring-black/5"
    >
      {/* Shimmer highlight on hover */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'linear-gradient(135deg, rgba(255,255,255,0.15) 0%, transparent 60%)' }}
      />

      {/* Card image */}
      <div className="relative aspect-[2.5/3.5] overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200">
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${userCard.card?.player_name || 'Card'}`}
            fill
            className="object-contain transition-transform duration-500 group-hover:scale-[1.06]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Top-left attribute badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
          {userCard.card?.rookie && (
            <span className="bg-amber-400/95 text-amber-900 text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider leading-tight">RC</span>
          )}
          {userCard.card?.autographed && (
            <span className="bg-violet-500/95 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider leading-tight">AUTO</span>
          )}
          {userCard.card?.patch && (
            <span className="bg-orange-500/95 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider leading-tight">PATCH</span>
          )}
        </div>

        {/* Top-right: for trade badge */}
        {userCard.is_for_trade && (
          <div className="absolute top-2 right-2 z-20">
            <span className="bg-emerald-500/95 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wider leading-tight">TRADE</span>
          </div>
        )}

        {/* Condition badge bottom-right */}
        {userCard.condition && (
          <div className="absolute bottom-2 right-2 z-20">
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md shadow-sm tracking-wide backdrop-blur-sm ${conditionColor(userCard.condition)}`}>
              {userCard.condition === 'Near Mint' ? 'NM' : userCard.condition.charAt(0)}
            </span>
          </div>
        )}

        {/* Back-image indicator */}
        {userCard.card?.back_image_url && (
          <div className="absolute bottom-2 left-2 z-20">
            <span className="bg-black/40 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded backdrop-blur-sm">F+B</span>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="p-3 flex-1 flex flex-col gap-1">
        <h3 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 transition-colors leading-snug line-clamp-2">
          {userCard.card?.player_name || 'Unknown Player'}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-gray-400 flex-wrap">
          {userCard.card?.year && <span>{userCard.card.year}</span>}
          {userCard.card?.brand && <><span>·</span><span className="truncate max-w-[80px]">{userCard.card.brand}</span></>}
          {userCard.card?.card_number && <><span>·</span><span>#{userCard.card.card_number}</span></>}
        </div>
        {userCard.quantity > 1 && (
          <div className="mt-1">
            <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">×{userCard.quantity}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
interface CollectionClientProps {
  userCards: UserCard[]
  searchParams: {
    q?: string
    sport?: string
    year?: string
    trade?: string
  }
}

export default function CollectionClient({ userCards: initialUserCards, searchParams }: CollectionClientProps) {
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>(initialUserCards)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserCards = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (!user) { setLoading(false); return }

      let query = supabase
        .from('user_cards')
        .select('*, card:cards(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (searchParams.q)
        query = query.or(`card.player_name.ilike.%${searchParams.q}%,card.brand.ilike.%${searchParams.q}%,card.series.ilike.%${searchParams.q}%`)
      if (searchParams.sport)
        query = query.eq('card.sport', searchParams.sport)
      if (searchParams.year)
        query = query.eq('card.year', parseInt(searchParams.year))
      if (searchParams.trade === 'true')
        query = query.eq('is_for_trade', true)

      const { data, error } = await query
      if (error) { console.error('Error fetching user cards:', error) }
      else { setUserCards(data || []) }
      setLoading(false)
    }

    fetchUserCards()
  }, [searchParams.q, searchParams.sport, searchParams.year, searchParams.trade])

  const handleDeleteCard = async (userCardId: string) => {
    const { error } = await supabase.from('user_cards').delete().eq('id', userCardId)
    if (error) { console.error('Error deleting card:', error); return }
    window.location.reload()
  }

  const handleUpdateCard = () => { window.location.reload() }

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center">
        <div className="relative w-16 h-16 mb-6">
          <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
          <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
        </div>
        {/* Skeleton grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-5 mt-6 opacity-40">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden bg-white/60 animate-pulse">
              <div className="aspect-[2.5/3.5] bg-gradient-to-br from-slate-200 to-slate-300" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-slate-200 rounded-full w-3/4" />
                <div className="h-2.5 bg-slate-200 rounded-full w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sign in to view your collection</h2>
        <p className="text-gray-500 mb-6 max-w-sm">Your personal card museum awaits. Sign in to see all your cards.</p>
        <Link href="/" className="inline-flex items-center px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Go Home to Sign In
        </Link>
      </div>
    )
  }

  if (userCards.length === 0) {
    return (
      <div className="py-24 flex flex-col items-center text-center">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shadow-inner">
            <svg className="w-16 h-16 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <h3 className="text-2xl font-extrabold text-gray-900 mb-2">Your collection is empty</h3>
        <p className="text-gray-500 mb-8 max-w-sm">
          Start building your digital card museum. Upload or scan your first card to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/upload" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Upload Your First Card
          </Link>
          <Link href="/upload" className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take a Photo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Card count summary */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-gray-500">
          Showing <span className="font-semibold text-gray-800">{userCards.length}</span> card{userCards.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Click any card to view details
        </div>
      </div>

      {/* Gallery grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
        {userCards.map(userCard => (
          <CardTile
            key={userCard.id}
            userCard={userCard}
            onClick={() => setSelectedCard(userCard)}
          />
        ))}
      </div>

      {/* Detail Modal */}
      {selectedCard && (
        <CardModal
          userCard={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDelete={handleDeleteCard}
          onUpdate={handleUpdateCard}
        />
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <Link
          href="/upload"
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full shadow-lg hover:shadow-2xl transition-all duration-200 hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </Link>
      </div>
    </>
  )
}
