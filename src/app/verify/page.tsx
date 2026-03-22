'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import type { CardExtractionResult } from '@/types'

interface CardUpload {
  id: string
  image_path: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  extracted_data: CardExtractionResult | null
  confidence_score: number
  created_at: string
  ocr_text?: string
  processing_metadata?: Record<string, unknown>
}

interface CardFormData {
  year: string
  player_name: string
  team_name: string
  position: string
  sport: string
  set_name: string
  card_brand: string
  card_number: string
  rookie: boolean
  autographed: boolean
  patch: boolean
  condition: string
  quantity: number
  notes: string
}

export default function VerifyPage() {
  const [user, setUser] = useState<User | null>(null)
  const [uploads, setUploads] = useState<CardUpload[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUpload, setSelectedUpload] = useState<CardUpload | null>(null)
  const [formData, setFormData] = useState<CardFormData>({
    year: '', player_name: '', team_name: '', position: '', sport: '',
    set_name: '', card_brand: '', card_number: '', rookie: false,
    autographed: false, patch: false, condition: '', quantity: 1, notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) loadUploads(user.id)
      setLoading(false)
    }
    getUser()
  }, [])

  const loadUploads = async (userId: string) => {
    const { data, error } = await supabase
      .from('card_uploads')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
    if (!error) setUploads(data || [])
  }

  const selectUpload = (upload: CardUpload) => {
    setSelectedUpload(upload)
    if (upload.extracted_data) {
      const d = upload.extracted_data
      setFormData({
        year: d.year || '', player_name: d.player_name || '', team_name: d.team_name || '',
        position: d.position || '', sport: d.sport || '', set_name: d.set_name || '',
        card_brand: d.card_brand || '', card_number: d.card_number || '',
        rookie: d.attributes?.rookie || false, autographed: d.attributes?.autographed || false,
        patch: d.attributes?.patch || false, condition: '', quantity: 1, notes: ''
      })
    }
  }

  const saveToCollection = async () => {
    if (!user || !selectedUpload) return
    setSaving(true)
    try {
      const { data: existingCard } = await supabase
        .from('cards')
        .select('*')
        .eq('sport', formData.sport)
        .eq('year', parseInt(formData.year))
        .eq('brand', formData.card_brand)
        .eq('series', formData.set_name)
        .eq('card_number', formData.card_number)
        .eq('player_name', formData.player_name)
        .single()

      let cardId: string
      if (existingCard) {
        cardId = existingCard.id
      } else {
        const { data: { publicUrl } } = supabase.storage.from('card-uploads').getPublicUrl(selectedUpload.image_path)
        const { data: newCard, error: createError } = await supabase
          .from('cards')
          .insert({
            sport: formData.sport, year: parseInt(formData.year), brand: formData.card_brand,
            series: formData.set_name, set_number: '', card_number: formData.card_number,
            player_name: formData.player_name, team: formData.team_name, position: formData.position,
            variation: '', image_url: publicUrl, rookie: formData.rookie,
            autographed: formData.autographed, patch: formData.patch
          })
          .select().single()
        if (createError) throw createError
        cardId = newCard.id
      }

      const { error: collectionError } = await supabase
        .from('user_cards')
        .insert({ user_id: user.id, card_id: cardId, quantity: formData.quantity, condition: formData.condition, notes: formData.notes })
      if (collectionError) throw collectionError

      await supabase.from('card_uploads').update({ status: 'processed' }).eq('id', selectedUpload.id)
      alert('Card added to your collection successfully!')
      setUploads(prev => prev.filter(u => u.id !== selectedUpload.id))
      setSelectedUpload(null)
    } catch (error) {
      console.error('Error saving card:', error)
      alert('Error saving card to collection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="w-8 h-8 border-t-2 animate-spin" style={{ borderColor: 'var(--color-accent)', borderRadius: '2px' }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-center p-8" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
          <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text)' }}>Sign in to verify cards</h2>
          <Link href="/" className="text-sm" style={{ color: 'var(--color-accent)' }}>Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center px-6 h-14 gap-4"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Home
        </Link>
        <div className="w-px h-4" style={{ background: 'var(--color-border)' }} />
        <h1 className="text-base font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
          Verify Cards
        </h1>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Upload List */}
          <div className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-secondary)' }}>Processed Cards</h2>

            {uploads.length === 0 ? (
              <div className="py-16 flex flex-col items-center text-center">
                <div className="w-12 h-12 flex items-center justify-center mb-4" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
                  <svg className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No cards to verify</h3>
                <p className="text-xs mb-5" style={{ color: 'var(--color-text-muted)' }}>Upload some cards first to see them here.</p>
                <Link
                  href="/upload"
                  className="text-xs font-semibold px-4 py-2 transition-opacity hover:opacity-80"
                  style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
                >
                  Upload Cards
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {uploads.map((upload) => {
                  const isSelected = selectedUpload?.id === upload.id
                  return (
                    <div
                      key={upload.id}
                      onClick={() => selectUpload(upload)}
                      className="p-3 cursor-pointer flex items-center gap-3 transition-colors"
                      style={{
                        border: `1px solid ${isSelected ? 'var(--color-accent)' : 'var(--color-border)'}`,
                        background: isSelected ? 'rgba(201,168,76,0.06)' : 'var(--color-bg)',
                        borderRadius: '2px',
                      }}
                    >
                      <div className="relative w-12 h-16 shrink-0 overflow-hidden" style={{ background: 'var(--color-border)', borderRadius: '2px' }}>
                        <Image
                          src={supabase.storage.from('card-uploads').getPublicUrl(upload.image_path).data.publicUrl}
                          alt="Card preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                          {upload.extracted_data?.player_name || 'Unknown Player'}
                        </p>
                        <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                          {upload.extracted_data?.set_name || 'Unknown Set'}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span
                            className="text-xs font-semibold px-1.5 py-0.5"
                            style={{
                              border: `1px solid ${upload.confidence_score >= 0.8 ? 'var(--color-success)' : upload.confidence_score >= 0.6 ? 'var(--color-accent)' : 'var(--color-error)'}`,
                              color: upload.confidence_score >= 0.8 ? 'var(--color-success)' : upload.confidence_score >= 0.6 ? 'var(--color-accent)' : 'var(--color-error)',
                              borderRadius: '2px',
                              fontFamily: 'var(--font-mono)',
                            }}
                          >
                            {Math.round(upload.confidence_score * 100)}%
                          </span>
                          {upload.extracted_data?.attributes?.rookie && (
                            <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>RC</span>
                          )}
                          {upload.extracted_data?.attributes?.autographed && (
                            <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>AUTO</span>
                          )}
                          {upload.extracted_data?.attributes?.patch && (
                            <span className="text-xs font-semibold px-1.5 py-0.5" style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}>PATCH</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Verification Form */}
          {selectedUpload && (
            <div className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <h2 className="text-sm font-semibold uppercase tracking-widest mb-5" style={{ color: 'var(--color-text-secondary)' }}>Verify & Edit</h2>

              {/* Card Image */}
              <div className="relative w-full h-48 mb-5 overflow-hidden" style={{ background: 'var(--color-bg)', borderRadius: '2px' }}>
                <Image
                  src={supabase.storage.from('card-uploads').getPublicUrl(selectedUpload.image_path).data.publicUrl}
                  alt="Selected card"
                  fill
                  className="object-contain"
                />
              </div>

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); saveToCollection() }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {[
                    { label: 'Player Name', key: 'player_name', required: true },
                    { label: 'Sport', key: 'sport', required: true },
                    { label: 'Year', key: 'year' },
                    { label: 'Team', key: 'team_name' },
                    { label: 'Position', key: 'position' },
                    { label: 'Card Brand', key: 'card_brand' },
                    { label: 'Set Name', key: 'set_name' },
                    { label: 'Card Number', key: 'card_number' },
                  ].map(({ label, key, required }) => (
                    <div key={key}>
                      <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>{label}</label>
                      <input
                        type="text"
                        value={formData[key as keyof CardFormData] as string}
                        onChange={(e) => setFormData(prev => ({ ...prev, [key]: e.target.value }))}
                        className="w-full px-3 py-2 focus:outline-none"
                        style={inputStyle}
                        required={required}
                      />
                    </div>
                  ))}
                </div>

                {/* Attributes */}
                <div>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--color-text-muted)' }}>Attributes</p>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { label: 'Rookie Card', key: 'rookie' },
                      { label: 'Autographed', key: 'autographed' },
                      { label: 'Patch Card', key: 'patch' },
                    ].map(({ label, key }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer select-none">
                        <div
                          onClick={() => setFormData(prev => ({ ...prev, [key]: !prev[key as keyof CardFormData] }))}
                          className="w-4 h-4 flex items-center justify-center transition-colors"
                          style={{
                            border: `1px solid ${formData[key as keyof CardFormData] ? 'var(--color-accent)' : 'var(--color-border)'}`,
                            background: formData[key as keyof CardFormData] ? 'var(--color-accent)' : 'transparent',
                            borderRadius: '2px',
                          }}
                        >
                          {formData[key as keyof CardFormData] && (
                            <svg className="w-2.5 h-2.5" fill="none" stroke="#0D0D0D" viewBox="0 0 24 24" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Collection Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                      className="w-full px-3 py-2 focus:outline-none"
                      style={inputStyle}
                      required
                    >
                      <option value="">Select condition</option>
                      {['Mint', 'Near Mint', 'Excellent', 'Very Good', 'Good', 'Fair', 'Poor'].map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                      className="w-full px-3 py-2 focus:outline-none"
                      style={inputStyle}
                      min="1" max="100" required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-widest mb-1" style={{ color: 'var(--color-text-muted)' }}>Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3 py-2 focus:outline-none resize-none"
                    style={inputStyle}
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedUpload(null)}
                    className="px-5 py-2 text-sm font-medium transition-colors"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '4px' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
                  >
                    {saving ? 'Saving...' : 'Add to Collection'}
                  </button>
                </div>
              </form>

              {selectedUpload.ocr_text && (
                <details className="mt-5 p-4" style={{ background: 'var(--color-bg)', borderRadius: '2px', border: '1px solid var(--color-border)' }}>
                  <summary className="cursor-pointer text-xs uppercase tracking-widest font-medium" style={{ color: 'var(--color-text-muted)' }}>Debug Info</summary>
                  <pre className="mt-3 text-xs whitespace-pre-wrap" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {selectedUpload.ocr_text}
                  </pre>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
