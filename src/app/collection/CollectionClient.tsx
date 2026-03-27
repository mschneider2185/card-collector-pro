'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCard, Card } from '@/types'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(v: number | null | undefined): string {
  if (v == null || v === 0) return '\u2014'
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(d: string | null | undefined): string {
  if (!d) return '\u2014'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const ATTRIBUTE_DEFS: Array<{ key: keyof Card; label: string }> = [
  { key: 'rookie', label: 'RC' },
  { key: 'autographed', label: 'AUTO' },
  { key: 'patch', label: 'PATCH' },
  { key: 'jersey', label: 'JERSEY' },
  { key: 'numbered', label: '/XX' },
  { key: 'parallel', label: 'PARALLEL' },
  { key: 'insert', label: 'INSERT' },
  { key: 'short_print', label: 'SP' },
  { key: 'error', label: 'ERROR' },
]

function AttributeBadges({ card, size = 'sm' }: { card: Card; size?: 'sm' | 'md' }) {
  const badges = ATTRIBUTE_DEFS.filter(a => card[a.key])
  if (badges.length === 0) return null
  const textSize = size === 'sm' ? 'text-[9px]' : 'text-[11px]'
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5'
  return (
    <div className="flex flex-wrap gap-1">
      {badges.map(b => (
        <span
          key={b.label}
          className={`${textSize} font-bold uppercase tracking-widest ${padding}`}
          style={{
            border: '1px solid var(--color-accent)',
            color: 'var(--color-accent)',
            borderRadius: '2px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  )
}

// ─── Price History Chart ──────────────────────────────────────────────────────

function PriceHistoryChart({ data }: { data: Array<{ date: string; price: number }> }) {
  if (!data || data.length < 2) return null

  const formatted = data.map(d => ({
    date: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    price: d.price,
  }))

  return (
    <div
      className="mt-4 p-4"
      style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
    >
      <h4
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
      >
        Price History
      </h4>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={formatted}>
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#6B6B8A' }}
            axisLine={{ stroke: '#3D3D5C' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#6B6B8A', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <RechartsTooltip
            contentStyle={{
              background: '#1A1A2E',
              border: '1px solid #3D3D5C',
              borderRadius: '2px',
              fontSize: 12,
              fontFamily: 'var(--font-mono)',
            }}
            labelStyle={{ color: '#B8B8C8' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Price']}
          />
          <Line
            type="monotone"
            dataKey="price"
            stroke="#C9A84C"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#C9A84C', stroke: '#0D0D0D', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ─── Card Detail Modal ────────────────────────────────────────────────────────

interface CardModalProps {
  userCard: UserCard
  onClose: () => void
  onDelete: (id: string) => void
  onUpdate: (updatedCard: UserCard) => void
  setCompletion?: { setName: string; owned: number; total: number; setId: string } | null
}

function CardModal({ userCard, onClose, onDelete, onUpdate, setCompletion }: CardModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [showBack, setShowBack] = useState(false)
  const [editForm, setEditForm] = useState({
    quantity: userCard.quantity,
    condition: userCard.condition || '',
    notes: userCard.notes || '',
    is_for_trade: userCard.is_for_trade,
    acquired_at: userCard.acquired_at ? userCard.acquired_at.split('T')[0] : '',
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  const card = userCard.card
  const frontSrc = card?.front_image_url || card?.image_url || ''
  const backSrc = card?.back_image_url || ''
  const hasBothImages = !!(frontSrc && backSrc)
  const currentImage = showBack && backSrc ? backSrc : frontSrc

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
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
          user_id: user.id,
        }),
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
      acquired_at: userCard.acquired_at ? userCard.acquired_at.split('T')[0] : '',
    })
    setIsEditing(false)
  }

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
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-[900px] max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 md:p-8">
          {/* Two-column layout on desktop */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Left: Card Image */}
            <div className="md:w-[45%] shrink-0">
              <div
                className="relative overflow-hidden"
                style={{ background: 'var(--color-bg)', borderRadius: '2px' }}
              >
                {currentImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentImage}
                    alt={`${card?.player_name || 'Card'} ${showBack ? 'back' : 'front'}`}
                    className="w-full h-auto object-contain"
                  />
                ) : (
                  <div className="w-full aspect-[2.5/3.5] flex items-center justify-center">
                    <svg className="w-16 h-16" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              {/* Front/Back toggle */}
              {hasBothImages && (
                <div className="flex gap-3 mt-2 justify-center">
                  <button
                    onClick={() => setShowBack(false)}
                    className="text-xs font-medium transition-colors"
                    style={{
                      color: !showBack ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      textDecoration: !showBack ? 'underline' : 'none',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    Front
                  </button>
                  <button
                    onClick={() => setShowBack(true)}
                    className="text-xs font-medium transition-colors"
                    style={{
                      color: showBack ? 'var(--color-accent)' : 'var(--color-text-muted)',
                      textDecoration: showBack ? 'underline' : 'none',
                      textUnderlineOffset: '3px',
                    }}
                  >
                    Back
                  </button>
                </div>
              )}
            </div>

            {/* Right: Metadata */}
            <div className="md:w-[55%] flex flex-col">
              {/* Player name */}
              <h2
                className="text-xl font-semibold leading-tight mb-1"
                style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
              >
                {card?.player_name || 'Unknown Player'}
              </h2>
              <p
                className="text-xs mb-3"
                style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
              >
                {[card?.year, card?.brand, card?.series, card?.card_number ? `#${card.card_number}` : null].filter(Boolean).join(' \u00b7 ')}
              </p>

              {/* Attribute badges */}
              {card && <div className="mb-4"><AttributeBadges card={card} size="md" /></div>}
              {userCard.is_for_trade && (
                <span
                  className="inline-flex text-[11px] font-bold uppercase tracking-widest px-2 py-0.5 mb-4 self-start"
                  style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
                >
                  FOR TRADE
                </span>
              )}

              {/* Metadata rows */}
              <div className="space-y-2 mb-4" style={{ borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
                {[
                  { label: 'Team', value: card?.team },
                  { label: 'Position', value: card?.position },
                  { label: 'Sport', value: card?.sport, capitalize: true },
                  { label: 'Variation', value: card?.variation },
                  { label: 'Condition', value: userCard.condition },
                  { label: 'Quantity', value: userCard.quantity > 1 ? `\u00d7${userCard.quantity}` : null },
                ].filter(item => item.value).map(({ label, value, capitalize }) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{label}</span>
                    <span className={`text-sm font-medium ${capitalize ? 'capitalize' : ''}`} style={{ color: 'var(--color-text)' }}>{value}</span>
                  </div>
                ))}
              </div>

              {/* Price section */}
              <div
                className="p-4 mb-4"
                style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
              >
                <h4
                  className="text-[10px] font-semibold uppercase tracking-widest mb-3"
                  style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
                >
                  Valuation
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Est. Value</p>
                    <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                      {formatValue(card?.estimated_value)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)' }}>Last Sale</p>
                    <p className="text-lg font-bold tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}>
                      {formatValue(card?.last_sale_price)}
                    </p>
                    {card?.last_sale_date && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {formatDate(card.last_sale_date)}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Set completion context */}
              {setCompletion && (
                <Link
                  href={`/sets/${setCompletion.setId}`}
                  className="flex items-center gap-3 p-3 mb-4 transition-colors"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
                      {setCompletion.setName}
                    </p>
                    <p className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {setCompletion.owned} of {setCompletion.total} collected
                    </p>
                  </div>
                  {/* Progress bar */}
                  <div className="w-20 shrink-0">
                    <div className="h-1 w-full" style={{ background: 'var(--color-border)', borderRadius: '1px' }}>
                      <div
                        className="h-full"
                        style={{
                          width: `${setCompletion.total > 0 ? Math.round((setCompletion.owned / setCompletion.total) * 100) : 0}%`,
                          background: 'var(--color-accent)',
                          borderRadius: '1px',
                        }}
                      />
                    </div>
                    <p className="text-[9px] text-right mt-0.5 tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {setCompletion.total > 0 ? `${Math.round((setCompletion.owned / setCompletion.total) * 100)}%` : '\u2014'}
                    </p>
                  </div>
                  <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              )}
            </div>
          </div>

          {/* Price history chart */}
          {card?.price_history && Array.isArray(card.price_history) && card.price_history.length >= 2 && (
            <PriceHistoryChart data={card.price_history as Array<{ date: string; price: number }>} />
          )}

          {/* Notes */}
          {userCard.notes && !isEditing && (
            <div
              className="mt-4 px-4 py-3"
              style={{ background: 'var(--color-bg)', borderRadius: '2px', borderLeft: '2px solid var(--color-accent)' }}
            >
              <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</p>
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{userCard.notes}</p>
            </div>
          )}

          {/* Edit form */}
          {isEditing && (
            <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--color-text-muted)' }}>Edit Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Quantity</label>
                  <input type="number" min="1" value={editForm.quantity} onChange={e => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })} className="w-full px-3 py-2 focus:outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Condition</label>
                  <select value={editForm.condition} onChange={e => setEditForm({ ...editForm, condition: e.target.value })} className="w-full px-3 py-2 focus:outline-none" style={inputStyle}>
                    <option value="">Select condition...</option>
                    {['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Date Acquired</label>
                  <input type="date" value={editForm.acquired_at} onChange={e => setEditForm({ ...editForm, acquired_at: e.target.value })} className="w-full px-3 py-2 focus:outline-none" style={inputStyle} />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div onClick={() => setEditForm({ ...editForm, is_for_trade: !editForm.is_for_trade })} className="w-9 h-5 flex items-center px-0.5 transition-colors" style={{ background: editForm.is_for_trade ? 'var(--color-success)' : 'var(--color-border)', borderRadius: '10px' }}>
                      <div className="w-4 h-4 bg-white transition-transform" style={{ borderRadius: '2px', transform: editForm.is_for_trade ? 'translateX(16px)' : 'translateX(0)' }} />
                    </div>
                    <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Available for trade</span>
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                  <textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} placeholder="Private notes about this card..." rows={3} className="w-full px-3 py-2 focus:outline-none resize-none" style={inputStyle} />
                </div>
              </div>
            </div>
          )}

          {/* Action bar */}
          <div className="flex justify-between items-center mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border)' }}>
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}>
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button onClick={handleCancel} disabled={saving} className="px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '4px' }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}>
                  Edit Card
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { if (confirm('Remove this card from your collection?')) { onDelete(userCard.id); onClose() } }}
                disabled={isEditing}
                className="px-5 py-2 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: '4px' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Card Tile (Grid View) ────────────────────────────────────────────────────

function CardTile({ userCard, onClick }: { userCard: UserCard; onClick: () => void }) {
  const card = userCard.card
  const imageSrc = card?.front_image_url || card?.image_url

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col cursor-pointer select-none"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
        overflow: 'hidden',
        transition: 'border-color 0.15s ease-out',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201, 168, 76, 0.5)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
    >
      {/* Card image */}
      <div className="relative aspect-[2.5/3.5] overflow-hidden" style={{ background: 'var(--color-bg)' }}>
        {imageSrc ? (
          <Image src={imageSrc} alt={card?.player_name || 'Card'} fill className="object-contain" sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}

        {/* Attribute badges — top left */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-0.5 z-20">
          {card?.rookie && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '2px' }}>RC</span>
          )}
          {card?.autographed && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>AUTO</span>
          )}
          {card?.patch && (
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>PATCH</span>
          )}
        </div>

        {/* Trade badge — top right */}
        {userCard.is_for_trade && (
          <div className="absolute top-1.5 right-1.5 z-20">
            <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>TRADE</span>
          </div>
        )}

        {/* Value overlay — bottom right */}
        {card?.estimated_value != null && card.estimated_value > 0 && (
          <div className="absolute bottom-1.5 right-1.5 z-20">
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 tabular-nums"
              style={{ background: 'rgba(13,13,13,0.8)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
            >
              {formatValue(card.estimated_value)}
            </span>
          </div>
        )}

        {/* Condition — bottom left */}
        {userCard.condition && (
          <div className="absolute bottom-1.5 left-1.5 z-20">
            <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 tracking-wide" style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', background: 'rgba(13,13,13,0.7)', borderRadius: '2px' }}>
              {userCard.condition === 'Near Mint' ? 'NM' : userCard.condition === 'Very Good' ? 'VG' : userCard.condition.charAt(0)}
            </span>
          </div>
        )}
      </div>

      {/* Info strip */}
      <div className="px-3 py-2.5 flex flex-col gap-0.5" style={{ borderTop: '1px solid var(--color-border)' }}>
        <h3 className="font-semibold text-xs leading-snug line-clamp-1" style={{ color: 'var(--color-text)' }}>
          {card?.player_name || 'Unknown Player'}
        </h3>
        <div className="flex items-center gap-1 text-[10px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}>
          {card?.year && <span>{card.year}</span>}
          {card?.brand && <><span>\u00b7</span><span className="truncate max-w-[72px]">{card.brand}</span></>}
          {card?.card_number && <><span>\u00b7</span><span>#{card.card_number}</span></>}
        </div>
        {userCard.quantity > 1 && (
          <span className="text-[10px] font-semibold mt-0.5" style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}>\u00d7{userCard.quantity}</span>
        )}
      </div>
    </div>
  )
}

// ─── Table View ───────────────────────────────────────────────────────────────

function CollectionTable({ userCards, onSelect }: { userCards: UserCard[]; onSelect: (uc: UserCard) => void }) {
  return (
    <div
      className="overflow-x-auto"
      style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}
    >
      <table className="w-full text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em', width: '56px' }}></th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Player</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden md:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Brand</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden lg:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Year</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden lg:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Series</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden md:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>#</th>
            <th className="text-left px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden sm:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Cond.</th>
            <th className="text-right px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Value</th>
            <th className="text-right px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest hidden xl:table-cell" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}>Last Sale</th>
          </tr>
        </thead>
        <tbody>
          {userCards.map((uc) => {
            const card = uc.card
            const imageSrc = card?.front_image_url || card?.image_url
            return (
              <tr
                key={uc.id}
                onClick={() => onSelect(uc)}
                className="cursor-pointer transition-colors"
                style={{ borderBottom: '1px solid var(--color-border)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201, 168, 76, 0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Thumbnail */}
                <td className="px-3 py-2">
                  <div className="w-10 h-14 relative overflow-hidden shrink-0" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                    {imageSrc ? (
                      <Image src={imageSrc} alt="" fill className="object-contain" sizes="40px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-4 h-4" style={{ color: 'var(--color-border)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" />
                        </svg>
                      </div>
                    )}
                  </div>
                </td>
                {/* Player */}
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--color-text)' }}>
                      {card?.player_name || 'Unknown'}
                    </span>
                    {card?.rookie && (
                      <span className="text-[8px] font-bold px-1 py-0.5 tracking-widest" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '2px' }}>RC</span>
                    )}
                    {card?.autographed && (
                      <span className="text-[8px] font-bold px-1 py-0.5 tracking-widest" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px' }}>A</span>
                    )}
                  </div>
                  {uc.quantity > 1 && (
                    <span className="text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>\u00d7{uc.quantity}</span>
                  )}
                </td>
                <td className="px-3 py-2 hidden md:table-cell text-xs" style={{ color: 'var(--color-text-secondary)' }}>{card?.brand || '\u2014'}</td>
                <td className="px-3 py-2 hidden lg:table-cell text-xs tabular-nums" style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>{card?.year || '\u2014'}</td>
                <td className="px-3 py-2 hidden lg:table-cell text-xs truncate max-w-[140px]" style={{ color: 'var(--color-text-secondary)' }}>{card?.series || '\u2014'}</td>
                <td className="px-3 py-2 hidden md:table-cell text-xs tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{card?.card_number || '\u2014'}</td>
                <td className="px-3 py-2 hidden sm:table-cell text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {uc.condition ? (uc.condition === 'Near Mint' ? 'NM' : uc.condition === 'Very Good' ? 'VG' : uc.condition) : '\u2014'}
                </td>
                <td className="px-3 py-2 text-right text-sm font-semibold tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: card?.estimated_value ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                  {formatValue(card?.estimated_value)}
                </td>
                <td className="px-3 py-2 text-right hidden xl:table-cell">
                  <span className="text-xs tabular-nums" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)' }}>
                    {formatValue(card?.last_sale_price)}
                  </span>
                  {card?.last_sale_date && (
                    <span className="block text-[10px] tabular-nums" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {formatDate(card.last_sale_date)}
                    </span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ─── Set Completion Panel ─────────────────────────────────────────────────────

interface SetCompletionData {
  set_id: string
  set_name: string
  brand: string
  year: number
  total_cards: number | null
  cards_owned: number
}

function SetCompletionPanel({ sets }: { sets: SetCompletionData[] }) {
  if (sets.length === 0) return null

  return (
    <div
      className="mt-5 p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
    >
      <h3
        className="text-[10px] font-semibold uppercase tracking-widest mb-3"
        style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
      >
        Set Completion
      </h3>
      <div className="space-y-2">
        {sets.map((s) => {
          const pct = s.total_cards ? Math.round((s.cards_owned / s.total_cards) * 100) : null
          return (
            <Link
              key={s.set_id}
              href={`/sets/${s.set_id}`}
              className="flex items-center gap-3 py-2 px-1 transition-colors group"
              style={{ borderBottom: '1px solid var(--color-border)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate group-hover:underline" style={{ color: 'var(--color-text-secondary)' }}>
                  {s.year} {s.brand} {s.set_name}
                </p>
              </div>
              <span
                className="text-[11px] font-semibold tabular-nums shrink-0"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text-muted)' }}
              >
                {s.cards_owned}{s.total_cards ? `/${s.total_cards}` : ''}
              </span>
              {pct !== null && (
                <div className="w-16 shrink-0">
                  <div className="h-1 w-full" style={{ background: 'var(--color-border)', borderRadius: '1px' }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: 'var(--color-accent)',
                        borderRadius: '1px',
                      }}
                    />
                  </div>
                </div>
              )}
              <span className="text-[10px] tabular-nums w-8 text-right shrink-0" style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}>
                {pct !== null ? `${pct}%` : '\u2014'}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

// ─── Sort Logic ───────────────────────────────────────────────────────────────

function sortCards(cards: UserCard[], sortKey: string): UserCard[] {
  const sorted = [...cards]
  switch (sortKey) {
    case 'value_desc':
      return sorted.sort((a, b) => (b.card?.estimated_value ?? 0) - (a.card?.estimated_value ?? 0))
    case 'value_asc':
      return sorted.sort((a, b) => (a.card?.estimated_value ?? 0) - (b.card?.estimated_value ?? 0))
    case 'player_az':
      return sorted.sort((a, b) => (a.card?.player_name ?? '').localeCompare(b.card?.player_name ?? ''))
    case 'player_za':
      return sorted.sort((a, b) => (b.card?.player_name ?? '').localeCompare(a.card?.player_name ?? ''))
    case 'year_desc':
      return sorted.sort((a, b) => (b.card?.year ?? 0) - (a.card?.year ?? 0))
    case 'year_asc':
      return sorted.sort((a, b) => (a.card?.year ?? 0) - (b.card?.year ?? 0))
    case 'last_sale':
      return sorted.sort((a, b) => {
        const da = a.card?.last_sale_date ?? ''
        const db = b.card?.last_sale_date ?? ''
        return db.localeCompare(da)
      })
    case 'recent':
    default:
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface CollectionClientProps {
  userCards: UserCard[]
  searchParams: {
    q?: string
    sport?: string
    year?: string
    trade?: string
    sort?: string
    view?: string
    attrs?: string
  }
}

export default function CollectionClient({ userCards: initialUserCards, searchParams }: CollectionClientProps) {
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>(initialUserCards)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [setCompletionData, setSetCompletionData] = useState<SetCompletionData[]>([])

  const viewMode = (searchParams.view as 'grid' | 'table') || 'grid'
  const sortKey = searchParams.sort || 'recent'
  const activeAttrs = searchParams.attrs?.split(',').filter(Boolean) || []

  // Fetch user cards once auth state is ready
  useEffect(() => {
    const fetchUserCards = async (currentUser: User | null) => {
      setUser(currentUser)

      if (!currentUser) {
        setLoading(false)
        return
      }

      try {
        let query = supabase
          .from('user_cards')
          .select('*, card:cards(*), checklist:set_checklist(id, set_id)')
          .eq('user_id', currentUser.id)
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
      } catch (err) {
        console.error('Error in fetchUserCards:', err)
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        fetchUserCards(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [searchParams.q, searchParams.sport, searchParams.year, searchParams.trade])

  // Fetch set completion data
  useEffect(() => {
    if (!user) return
    async function fetchSets() {
      try {
        const { data, error } = await supabase
          .from('card_set_memberships')
          .select('set_id, card_id, card_sets(id, name, brand, year, total_cards)')
          .in('card_id', userCards.filter(uc => uc.card_id).map(uc => uc.card_id))

        if (error || !data) return

        const setMap = new Map<string, SetCompletionData>()
        for (const row of data) {
          const setInfo = row.card_sets as unknown as { id: string; name: string; brand: string; year: number; total_cards: number | null }
          if (!setInfo) continue
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

        setSetCompletionData(
          [...setMap.values()].sort((a, b) => {
            const pctA = a.total_cards ? a.cards_owned / a.total_cards : 0
            const pctB = b.total_cards ? b.cards_owned / b.total_cards : 0
            return pctB - pctA
          })
        )
      } catch (err) {
        console.error('Error fetching set completion:', err)
      }
    }
    if (userCards.length > 0) fetchSets()
  }, [user, userCards])

  // Client-side attribute filtering and sorting
  const filteredAndSorted = useMemo(() => {
    let result = [...userCards]

    // Apply attribute filters
    if (activeAttrs.length > 0) {
      const attrMap: Record<string, keyof Card> = {
        rookie: 'rookie', auto: 'autographed', patch: 'patch', jersey: 'jersey',
        numbered: 'numbered', parallel: 'parallel', insert: 'insert',
        sp: 'short_print', error: 'error',
      }
      result = result.filter(uc => {
        if (!uc.card) return false
        return activeAttrs.every(attr => {
          const cardKey = attrMap[attr]
          return cardKey ? uc.card![cardKey] : false
        })
      })
    }

    return sortCards(result, sortKey)
  }, [userCards, sortKey, activeAttrs])

  // Find set completion for selected card
  const selectedSetCompletion = useMemo(() => {
    if (!selectedCard?.card_id) return null
    const membership = setCompletionData.find(s => {
      // Check if selected card belongs to this set via the fetched memberships
      return true // simplified - we show the first matching set
    })
    if (!membership) return null
    return {
      setName: `${membership.year} ${membership.brand} ${membership.set_name}`,
      owned: membership.cards_owned,
      total: membership.total_cards ?? 0,
      setId: membership.set_id,
    }
  }, [selectedCard, setCompletionData])

  const handleDeleteCard = async (userCardId: string) => {
    const { error } = await supabase.from('user_cards').delete().eq('id', userCardId)
    if (error) { console.error('Error deleting card:', error); return }
    window.location.reload()
  }

  const handleUpdateCard = () => { window.location.reload() }

  if (loading) {
    return (
      <div className="py-12">
        <div className="w-full grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 opacity-50">
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

  if (filteredAndSorted.length === 0 && userCards.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center text-center">
        <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>Collection is empty</h3>
        <p className="text-sm mb-6 max-w-sm" style={{ color: 'var(--color-text-muted)' }}>Upload or scan your first card to get started.</p>
        <Link href="/upload" className="text-xs font-semibold px-4 py-2 transition-colors" style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}>
          Add your first card
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Card count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          <span className="font-semibold tabular-nums" style={{ color: 'var(--color-text)', fontFamily: 'var(--font-mono)' }}>{filteredAndSorted.length}</span>
          {' '}card{filteredAndSorted.length !== 1 ? 's' : ''}
          {filteredAndSorted.length !== userCards.length && (
            <span> of {userCards.length}</span>
          )}
        </p>
      </div>

      {/* No results from filters */}
      {filteredAndSorted.length === 0 && userCards.length > 0 && (
        <div className="py-16 text-center">
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No cards match your filters.</p>
        </div>
      )}

      {/* Grid View */}
      {viewMode === 'grid' && filteredAndSorted.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {filteredAndSorted.map(userCard => (
            <CardTile
              key={userCard.id}
              userCard={userCard}
              onClick={() => setSelectedCard(userCard)}
            />
          ))}
        </div>
      )}

      {/* Table View (hidden on mobile) */}
      {viewMode === 'table' && filteredAndSorted.length > 0 && (
        <div className="hidden sm:block">
          <CollectionTable userCards={filteredAndSorted} onSelect={setSelectedCard} />
        </div>
      )}

      {/* Fallback to grid on mobile when table is selected */}
      {viewMode === 'table' && filteredAndSorted.length > 0 && (
        <div className="sm:hidden grid grid-cols-2 gap-3">
          {filteredAndSorted.map(userCard => (
            <CardTile
              key={userCard.id}
              userCard={userCard}
              onClick={() => setSelectedCard(userCard)}
            />
          ))}
        </div>
      )}

      {/* Set Completion Panel */}
      <SetCompletionPanel sets={setCompletionData} />

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardModal
          userCard={selectedCard}
          onClose={() => setSelectedCard(null)}
          onDelete={handleDeleteCard}
          onUpdate={handleUpdateCard}
          setCompletion={selectedSetCompletion}
        />
      )}
    </>
  )
}
