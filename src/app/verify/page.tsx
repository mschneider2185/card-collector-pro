'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { CardExtractionResult } from '@/app/api/ai/process-card/route'

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
    year: '',
    player_name: '',
    team_name: '',
    position: '',
    sport: '',
    set_name: '',
    card_brand: '',
    card_number: '',
    rookie: false,
    autographed: false,
    patch: false,
    condition: '',
    quantity: 1,
    notes: ''
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        loadUploads(user.id)
      }
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

    if (error) {
      console.error('Error loading uploads:', error)
    } else {
      setUploads(data || [])
    }
  }

  const selectUpload = (upload: CardUpload) => {
    setSelectedUpload(upload)
    
    // Pre-populate form with extracted data
    if (upload.extracted_data) {
      const data = upload.extracted_data
      setFormData({
        year: data.year || '',
        player_name: data.player_name || '',
        team_name: data.team_name || '',
        position: data.position || '',
        sport: data.sport || '',
        set_name: data.set_name || '',
        card_brand: data.card_brand || '',
        card_number: data.card_number || '',
        rookie: data.attributes?.rookie || false,
        autographed: data.attributes?.autographed || false,
        patch: data.attributes?.patch || false,
        condition: '',
        quantity: 1,
        notes: ''
      })
    }
  }

  const saveToCollection = async () => {
    if (!user || !selectedUpload) return

    setSaving(true)
    
    try {
      // First, create or find the card in the cards table
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
        // Create new card entry
        const { data: { publicUrl } } = supabase.storage
          .from('card-uploads')
          .getPublicUrl(selectedUpload.image_path)

        const { data: newCard, error: createError } = await supabase
          .from('cards')
          .insert({
            sport: formData.sport,
            year: parseInt(formData.year),
            brand: formData.card_brand,
            series: formData.set_name,
            set_number: '', // Could be extracted in future
            card_number: formData.card_number,
            player_name: formData.player_name,
            team: formData.team_name,
            position: formData.position,
            variation: '', // Could be extracted in future
            image_url: publicUrl,
            rookie: formData.rookie,
            autographed: formData.autographed,
            patch: formData.patch
          })
          .select()
          .single()

        if (createError) throw createError
        cardId = newCard.id
      }

      // Add to user's collection
      const { error: collectionError } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id,
          card_id: cardId,
          quantity: formData.quantity,
          condition: formData.condition,
          notes: formData.notes
        })

      if (collectionError) throw collectionError

      // Mark upload as processed
      await supabase
        .from('card_uploads')
        .update({ status: 'processed' })
        .eq('id', selectedUpload.id)

      alert('Card added to your collection successfully!')
      
      // Remove from list and clear selection
      setUploads(prev => prev.filter(u => u.id !== selectedUpload.id))
      setSelectedUpload(null)

    } catch (error) {
      console.error('Error saving card:', error)
      alert('Error saving card to collection. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to verify cards</h2>
          <Link href="/" className="text-blue-600 hover:text-blue-800 font-medium">
            Go back to home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
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
                Verify Cards
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Processed Cards</h2>
            
            {uploads.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No cards to verify</h3>
                <p className="text-gray-600 mb-4">Upload some cards first to see them here.</p>
                <Link 
                  href="/upload"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upload Cards
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {uploads.map((upload) => (
                  <div
                    key={upload.id}
                    onClick={() => selectUpload(upload)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedUpload?.id === upload.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                        <Image
                          src={supabase.storage.from('card-uploads').getPublicUrl(upload.image_path).data.publicUrl}
                          alt="Card preview"
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">
                          {upload.extracted_data?.player_name || 'Unknown Player'}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {upload.extracted_data?.set_name || 'Unknown Set'}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                            upload.confidence_score >= 0.8
                              ? 'bg-green-100 text-green-800'
                              : upload.confidence_score >= 0.6
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {Math.round(upload.confidence_score * 100)}% confidence
                          </span>
                          {upload.extracted_data?.attributes?.rookie && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                              RC
                            </span>
                          )}
                          {upload.extracted_data?.attributes?.autographed && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              AUTO
                            </span>
                          )}
                          {upload.extracted_data?.attributes?.patch && (
                            <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                              PATCH
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Verification and Edit Form */}
          {selectedUpload && (
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Verify & Edit</h2>
              
              {/* Card Image */}
              <div className="mb-6">
                <div className="relative w-full h-64 bg-gray-100 rounded-xl overflow-hidden">
                  <Image
                    src={supabase.storage.from('card-uploads').getPublicUrl(selectedUpload.image_path).data.publicUrl}
                    alt="Selected card"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Form */}
              <form onSubmit={(e) => { e.preventDefault(); saveToCollection(); }} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                    <input
                      type="text"
                      value={formData.player_name}
                      onChange={(e) => setFormData(prev => ({...prev, player_name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                    <input
                      type="text"
                      value={formData.sport}
                      onChange={(e) => setFormData(prev => ({...prev, sport: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="text"
                      value={formData.year}
                      onChange={(e) => setFormData(prev => ({...prev, year: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <input
                      type="text"
                      value={formData.team_name}
                      onChange={(e) => setFormData(prev => ({...prev, team_name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
                    <input
                      type="text"
                      value={formData.position}
                      onChange={(e) => setFormData(prev => ({...prev, position: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Brand</label>
                    <input
                      type="text"
                      value={formData.card_brand}
                      onChange={(e) => setFormData(prev => ({...prev, card_brand: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Set Name</label>
                    <input
                      type="text"
                      value={formData.set_name}
                      onChange={(e) => setFormData(prev => ({...prev, set_name: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={formData.card_number}
                      onChange={(e) => setFormData(prev => ({...prev, card_number: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Special Attributes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Attributes</label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.rookie}
                        onChange={(e) => setFormData(prev => ({...prev, rookie: e.target.checked}))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Rookie Card</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.autographed}
                        onChange={(e) => setFormData(prev => ({...prev, autographed: e.target.checked}))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Autographed</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.patch}
                        onChange={(e) => setFormData(prev => ({...prev, patch: e.target.checked}))}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Patch Card</span>
                    </label>
                  </div>
                </div>

                {/* Collection Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={formData.condition}
                      onChange={(e) => setFormData(prev => ({...prev, condition: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select condition</option>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({...prev, quantity: parseInt(e.target.value) || 1}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({...prev, notes: e.target.value}))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedUpload(null)}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Add to Collection'}
                  </button>
                </div>
              </form>

              {/* Debug Info (if available) */}
              {selectedUpload.ocr_text && (
                <details className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <summary className="cursor-pointer font-medium text-gray-700">Debug Info</summary>
                  <div className="mt-2 space-y-2">
                    <div>
                      <h4 className="font-medium text-gray-700">OCR Text:</h4>
                      <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                        {selectedUpload.ocr_text}
                      </pre>
                    </div>
                    {selectedUpload.processing_metadata && (
                      <div>
                        <h4 className="font-medium text-gray-700">Processing Metadata:</h4>
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white p-2 rounded border">
                          {JSON.stringify(selectedUpload.processing_metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}