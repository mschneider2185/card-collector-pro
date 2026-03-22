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
    default: return 'bg-black/30 text-white'
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

  const inputStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Player name + badges */}
          <div className="mb-6 pr-10">
            <h2
              className="text-xl font-semibold leading-tight"
              style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
            >
              {userCard.card?.player_name || 'Unknown Player'}
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
              {[userCard.card?.year, userCard.card?.brand, userCard.card?.series, userCard.card?.card_number ? `#${userCard.card.card_number}` : null].filter(Boolean).join(' · ')}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {userCard.card?.rookie && (
                <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>RC</span>
              )}
              {userCard.card?.autographed && (
                <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>AUTO</span>
              )}
              {userCard.card?.patch && (
                <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>PATCH</span>
              )}
              {userCard.is_for_trade && (
                <span className="text-xs font-semibold px-2 py-0.5" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>TRADE</span>
              )}
            </div>
          </div>

          {/* Card images */}
          <div className="flex justify-center gap-6 mb-8">
            {hasBothImages ? (
              <>
                <div className="flex-1 max-w-[220px]">
                  <p className="text-xs font-medium uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--color-text-muted)' }}>Front</p>
                  <div className="relative aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                    <Image src={frontSrc} alt={`${userCard.card?.player_name || 'Card'} front`} fill className="object-contain" />
                  </div>
                </div>
                <div className="flex-1 max-w-[220px]">
                  <p className="text-xs font-medium uppercase tracking-widest mb-2 text-center" style={{ color: 'var(--color-text-muted)' }}>Back</p>
                  <div className="relative aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                    <Image src={userCard.card!.back_image_url!} alt={`${userCard.card?.player_name || 'Card'} back`} fill className="object-contain" />
                  </div>
                </div>
              </>
            ) : (
              <div className="max-w-[240px] w-full">
                <div className="relative aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                  {frontSrc ? (
                    <Image src={frontSrc} alt={`${userCard.card?.player_name || 'Card'}`} fill className="object-contain" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <svg className="w-16 h-16" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 mb-6">
            {[
              { label: 'Team', value: userCard.card?.team },
              { label: 'Position', value: userCard.card?.position },
              { label: 'Sport', value: userCard.card?.sport, capitalize: true },
              { label: 'Brand', value: userCard.card?.brand },
              { label: 'Series', value: userCard.card?.series },
            ].filter(item => item.value).map(({ label, value, capitalize }) => (
              <div key={label} className="p-3" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</p>
                <p className={`text-sm font-semibold ${capitalize ? 'capitalize' : ''}`} style={{ color: 'var(--color-text)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Collection-specific info */}
          <div className="pt-5 space-y-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Collection Details</h3>

            {isEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.quantity}
                    onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Condition</label>
                  <select
                    value={editForm.condition}
                    onChange={e => setEditForm({ ...editForm, condition: e.target.value })}
                    className="w-full px-3 py-2 focus:outline-none"
                    style={inputStyle}
                  >
                    <option value="">Select condition...</option>
                    {['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date Acquired</label>
                  <input
                    type="date"
                    value={editForm.acquired_at}
                    onChange={e => setEditForm({ ...editForm, acquired_at: e.target.value })}
                    className="w-full px-3 py-2 focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setEditForm({ ...editForm, is_for_trade: !editForm.is_for_trade })}
                      className="w-9 h-5 flex items-center px-0.5 transition-colors"
                      style={{ background: editForm.is_for_trade ? 'var(--color-success)' : 'var(--color-border)', borderRadius: '10px' }}
                    >
                      <div
                        className="w-4 h-4 bg-white transition-transform"
                        style={{ borderRadius: '2px', transform: editForm.is_for_trade ? 'translateX(16px)' : 'translateX(0)' }}
                      />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Available for trade</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Private Notes</label>
                  <textarea
                    value={editForm.notes}
                    onChange={e => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="Add your private notes about this card..."
                    rows={3}
                    className="w-full px-3 py-2 focus:outline-none resize-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap gap-3">
                <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                  <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Qty</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>{userCard.quantity}</span>
                </div>
                {userCard.condition && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                    <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Condition</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>{userCard.condition}</span>
                  </div>
                )}
                {userCard.acquired_at && (
                  <div className="px-3 py-2 flex items-center gap-2" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                    <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>Acquired</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{new Date(userCard.acquired_at).toLocaleDateString()}</span>
                  </div>
                )}
                {userCard.notes && (
                  <div className="w-full px-4 py-3" style={{ background: 'var(--color-bg)', borderRadius: '2px', borderLeft: '2px solid var(--color-accent)' }}>
                    <p className="text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
                    <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{userCard.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action bar */}
          <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '4px' }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
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
                className="px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: '4px' }}
              >
                Remove
              </button>
              <button
                onClick={onClose}
                disabled={saving}
                className="px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40"
                style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '4px' }}
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
      className="group relative flex flex-col cursor-pointer select-none card-lift"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        overflow: 'hidden',
      }}
    >
      {/* Card image — natural aspect ratio, sharp corners */}
      <div className="relative aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {imageSrc ? (
          <Image
            src={imageSrc}
            alt={`${userCard.card?.player_name || 'Card'}`}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Attribute badges — top left */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 z-20">
          {userCard.card?.rookie && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '2px' }}>RC</span>
          )}
          {userCard.card?.autographed && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>AUTO</span>
          )}
          {userCard.card?.patch && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>PATCH</span>
          )}
        </div>

        {/* For trade badge — top right */}
        {userCard.is_for_trade && (
          <div className="absolute top-1.5 right-1.5 z-20">
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>TRADE</span>
          </div>
        )}

        {/* Condition — bottom right */}
        {userCard.condition && (
          <div className="absolute bottom-1.5 right-1.5 z-20">
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 tracking-wide" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>
              {userCard.condition === 'Near Mint' ? 'NM' : userCard.condition.charAt(0)}
            </span>
          </div>
        )}

        {/* F+B indicator */}
        {userCard.card?.back_image_url && (
          <div className="absolute bottom-1.5 left-1.5 z-20">
            <span className="text-[9px] font-semibold px-1.5 py-0.5" style={{ color: 'var(--color-text-muted)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>F+B</span>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h3 className="font-semibold text-xs leading-snug line-clamp-2" style={{ color: 'var(--color-text)' }}>
          {userCard.card?.player_name || 'Unknown Player'}
        </h3>
        <div className="flex items-center gap-1 text-[10px] flex-wrap" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {userCard.card?.year && <span>{userCard.card.year}</span>}
          {userCard.card?.brand && <><span>·</span><span className="truncate max-w-[72px]">{userCard.card.brand}</span></>}
          {userCard.card?.card_number && <><span>·</span><span>#{userCard.card.card_number}</span></>}
        </div>
        {userCard.quantity > 1 && (
          <span className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>×{userCard.quantity}</span>
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
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mt-5 opacity-50">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="overflow-hidden animate-pulse" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <div className="aspect-[2.5/3.5]" style={{ background: 'var(--color-border)' }} />
              <div className="p-2.5 space-y-1.5" style={{ borderTop: '1px solid var(--color-border)' }}>
                <div className="h-2 w-3/4" style={{ background: 'var(--color-border)' }} />
                <div className="h-2 w-1/2" style={{ background: 'var(--color-border)' }} />
              </div>
            </div>
          ))}
        </div>
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
        <h2 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Sign in to view your collection</h2>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>Your personal card museum awaits.</p>
        <Link href="/" className="text-xs font-semibold px-4 py-2 transition-colors" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}>
          Go home to sign in
        </Link>
      </div>
    )
  }

  if (userCards.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Collection is empty</h3>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
          Upload or scan your first card to get started.
        </p>
        <Link href="/upload" className="text-xs font-semibold px-4 py-2 transition-colors" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}>
          Add your first card
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Card count summary */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          Showing <span className="font-semibold" style={{ color: 'var(--color-text)' }}>{userCards.length}</span> card{userCards.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
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
          className="flex items-center justify-center w-14 h-14 transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-accent)', borderRadius: '4px', boxShadow: '0 4px 16px rgba(201,168,76,0.3)', color: '#0D0D0D' }}
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
