'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { UserCard } from '@/types'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import { CardExtractionResult } from '@/app/api/ai/process-card/route'

interface CardData {
  sport: string
  year: number
  brand: string
  series: string
  set_number: string
  card_number: string
  player_name: string
  team: string
  position: string
  variation: string
  condition: string
  quantity: number
  notes: string
  rookie: boolean
  autographed: boolean
  patch: boolean
}

interface ProcessingResult {
  uploadId: string
  imagePath: string
  extractedData: CardExtractionResult
  confidence: number
  ocrText?: string
  processingMetadata?: any
}

interface CardModalProps {
  userCard: UserCard
  onClose: () => void
  onDelete: (id: string) => void
}

interface UploadCardFormProps {
  user: User
  onCardAdded: () => void
  onClose: () => void
}

function UploadCardForm({ user, onCardAdded, onClose }: UploadCardFormProps) {
  const [uploading, setUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedBackImage, setUploadedBackImage] = useState<string | null>(null)
  const [showCardForm, setShowCardForm] = useState(false)
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cardData, setCardData] = useState<CardData>({
    sport: '',
    year: new Date().getFullYear(),
    brand: '',
    series: '',
    set_number: '',
    card_number: '',
    player_name: '',
    team: '',
    position: '',
    variation: '',
    condition: '',
    quantity: 1,
    notes: '',
    rookie: false,
    autographed: false,
    patch: false
  })

  const uploadImage = async (file: File, isBackImage: boolean = false) => {
    setUploading(true)
    if (!isBackImage) {
      setProcessingResult(null)
    }

    try {
      const fileExt = file.name.split('.').pop()
      const prefix = isBackImage ? 'back_' : 'front_'
      const fileName = `${user.id}/${prefix}${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('card-uploads')
        .upload(fileName, file)

      if (uploadError) {
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage
        .from('card-uploads')
        .getPublicUrl(fileName)

      if (isBackImage) {
        setUploadedBackImage(publicUrl)
      } else {
        setUploadedImage(publicUrl)
      }

    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const processCard = async () => {
    if (!uploadedImage) {
      alert('Please upload the front image first')
      return
    }

    setProcessing(true)
    setProcessingResult(null)

    try {
      const frontImagePath = uploadedImage.split('/storage/v1/object/public/card-uploads/')[1]?.split('?')[0] || ''
      let backImagePath = null
      
      if (uploadedBackImage) {
        backImagePath = uploadedBackImage.split('/storage/v1/object/public/card-uploads/')[1]?.split('?')[0] || ''
      }

      const { data: uploadRecord, error: insertError } = await supabase
        .from('card_uploads')
        .insert({
          user_id: user.id,
          image_path: frontImagePath,
          status: 'pending'
        })
        .select()
        .single()

      if (insertError) {
        throw insertError
      }

      const processResponse = await fetch('/api/ai/process-card', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: uploadRecord.id,
          imagePath: frontImagePath,
          backImagePath: backImagePath
        })
      })

      if (processResponse.ok) {
        const result = await processResponse.json()
        setProcessingResult({
          uploadId: uploadRecord.id,
          imagePath: frontImagePath,
          extractedData: result.data,
          confidence: result.data.confidence || 0.5,
          ocrText: result.data.raw_ocr_text,
          processingMetadata: result.data.processing_metadata
        })
        
        const data = result.data
        setCardData({
          sport: data.sport || '',
          year: data.year ? parseInt(data.year) : new Date().getFullYear(),
          brand: data.card_brand || '',
          series: data.set_name || '',
          set_number: data.set_name || '',
          card_number: data.card_number || '',
          player_name: data.player_name || '',
          team: data.team_name || '',
          position: data.position || '',
          variation: '',
          condition: '',
          quantity: 1,
          notes: '',
          rookie: data.attributes?.rookie || false,
          autographed: data.attributes?.autographed || false,
          patch: data.attributes?.patch || false
        })
        
        setShowCardForm(true)
      } else {
        const errorData = await processResponse.json()
        console.error('AI processing error:', errorData)
        
        if (errorData.error === 'OCR service not configured' || errorData.error === 'AI processing service not configured') {
          alert(`AI processing is not configured. ${errorData.suggestion} For now, you can manually enter card details below.`)
        } else {
          alert('Image uploaded successfully, but AI processing failed. You can manually enter card details below.')
        }
        setShowCardForm(true)
      }
    } catch (aiError) {
      console.error('AI processing error:', aiError)
      alert('AI processing failed. You can manually enter card details below.')
      setShowCardForm(true)
    } finally {
      setProcessing(false)
    }
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!uploadedImage) return

    try {
      let cardId: string

      if (processingResult) {
        const { data: aiCard, error: findAIError } = await supabase
          .from('cards')
          .select('*')
          .eq('source_upload_id', processingResult.uploadId)
          .single()

        if (findAIError) {
          console.error('Error finding AI-created card:', findAIError)
          throw findAIError
        }

        const { data: updatedCard, error: updateError } = await supabase
          .from('cards')
          .update({
            sport: cardData.sport,
            year: cardData.year,
            brand: cardData.brand,
            series: cardData.series,
            set_number: cardData.set_number,
            card_number: cardData.card_number,
            player_name: cardData.player_name,
            team: cardData.team,
            position: cardData.position,
            variation: cardData.variation,
            rookie: cardData.rookie,
            autographed: cardData.autographed,
            patch: cardData.patch,
            last_updated: new Date().toISOString()
          })
          .eq('id', aiCard.id)
          .select()
          .single()

        if (updateError) {
          console.error('Error updating card:', updateError)
          throw updateError
        }
        
        cardId = updatedCard.id
      } else {
        const { data: existingCard, error: findError } = await supabase
          .from('cards')
          .select('*')
          .eq('sport', cardData.sport)
          .eq('year', cardData.year)
          .eq('brand', cardData.brand)
          .eq('series', cardData.series)
          .eq('set_number', cardData.set_number)
          .eq('card_number', cardData.card_number)
          .eq('player_name', cardData.player_name)
          .single()

        if (findError && findError.code !== 'PGRST116') {
          console.error('Error searching for existing card:', findError)
          throw findError
        }

        if (existingCard) {
          cardId = existingCard.id
        } else {
          const { data: newCard, error: createError } = await supabase
            .from('cards')
            .insert({
              sport: cardData.sport,
              year: cardData.year,
              brand: cardData.brand,
              series: cardData.series,
              set_number: cardData.set_number,
              card_number: cardData.card_number,
              player_name: cardData.player_name,
              team: cardData.team,
              position: cardData.position,
              variation: cardData.variation,
              image_url: uploadedImage,
              front_image_url: uploadedImage,
              back_image_url: uploadedBackImage,
              rookie: cardData.rookie,
              autographed: cardData.autographed,
              patch: cardData.patch
            })
            .select()
            .single()

          if (createError) {
            console.error('Error creating new card:', createError)
            throw createError
          }
          cardId = newCard.id
        }
      }

      const { error: collectionError } = await supabase
        .from('user_cards')
        .insert({
          user_id: user.id,
          card_id: cardId,
          quantity: cardData.quantity,
          condition: cardData.condition,
          notes: cardData.notes
        })

      if (collectionError) {
        console.error('Error adding to collection:', collectionError)
        throw collectionError
      }

      alert('Card added to your collection successfully!')
      onCardAdded()
      onClose()

    } catch (error) {
      console.error('Error adding card to collection:', error)
      alert('Error adding card to collection. Please try again.')
    }
  }

  const handleFrontFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadImage(file, false)
    }
  }

  const handleBackFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadImage(file, true)
    }
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      uploadImage(file, false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Add New Card</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Upload Section */}
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Front Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">Front of Card</h3>
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                    uploading || processing
                      ? 'border-blue-400 bg-blue-50/50' 
                      : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                  }`}
                >
                  {uploadedImage ? (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-[2.5/3.5] bg-gray-100 rounded-lg overflow-hidden">
                        <img src={uploadedImage} alt="Front of card" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-sm text-green-600 font-medium">✓ Front image uploaded</p>
                      <label className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFrontFileSelect}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Front</h4>
                      <p className="text-gray-600 mb-3 text-sm">Required</p>
                      <label className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg cursor-pointer">
                        Choose Front
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFrontFileSelect}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Image Upload */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 text-center">Back of Card</h3>
                <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${
                  uploading || processing
                    ? 'border-purple-400 bg-purple-50/50' 
                    : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
                }`}>
                  {uploadedBackImage ? (
                    <div className="space-y-3">
                      <div className="relative w-full aspect-[2.5/3.5] bg-gray-100 rounded-lg overflow-hidden">
                        <img src={uploadedBackImage} alt="Back of card" className="w-full h-full object-contain" />
                      </div>
                      <p className="text-sm text-green-600 font-medium">✓ Back image uploaded</p>
                      <label className="inline-flex items-center px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                        Replace
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackFileSelect}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  ) : (
                    <div>
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Back</h4>
                      <p className="text-gray-600 mb-3 text-sm">Optional</p>
                      <label className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg cursor-pointer">
                        Choose Back
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackFileSelect}
                          className="sr-only"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Process Button */}
            {uploadedImage && (
              <div className="text-center">
                {processing ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mb-4"></div>
                    <p className="text-lg text-gray-600 mb-2">Analyzing your card...</p>
                    <p className="text-sm text-gray-500">Our AI is identifying card details</p>
                  </div>
                ) : (
                  <button
                    onClick={processCard}
                    disabled={!uploadedImage}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl transition-all duration-200 disabled:cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Process Card with AI
                  </button>
                )}
              </div>
            )}

            {/* AI Analysis Results */}
            {processingResult && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-lg font-medium text-green-800 mb-2">🤖 AI Analysis Complete!</h4>
                    <p className="text-green-700 mb-3">Please review and edit the extracted information below.</p>
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      processingResult.confidence >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : processingResult.confidence >= 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(processingResult.confidence * 100)}% confidence
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Card Entry Form */}
            {showCardForm && (
              <form onSubmit={handleCardSubmit} className="space-y-4">
                <h3 className="text-xl font-bold text-gray-900 text-center">Review & Edit Card Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sport</label>
                    <input
                      type="text"
                      value={cardData.sport}
                      onChange={(e) => setCardData({...cardData, sport: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Baseball, Basketball"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input
                      type="number"
                      value={cardData.year}
                      onChange={(e) => setCardData({...cardData, year: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                    <input
                      type="text"
                      value={cardData.brand}
                      onChange={(e) => setCardData({...cardData, brand: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Topps, Upper Deck"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Player Name</label>
                    <input
                      type="text"
                      value={cardData.player_name}
                      onChange={(e) => setCardData({...cardData, player_name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Mike Trout"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Series</label>
                    <input
                      type="text"
                      value={cardData.series}
                      onChange={(e) => setCardData({...cardData, series: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Chrome, Heritage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Number</label>
                    <input
                      type="text"
                      value={cardData.card_number}
                      onChange={(e) => setCardData({...cardData, card_number: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., #145"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Team</label>
                    <input
                      type="text"
                      value={cardData.team}
                      onChange={(e) => setCardData({...cardData, team: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Los Angeles Angels"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Condition</label>
                    <select
                      value={cardData.condition}
                      onChange={(e) => setCardData({...cardData, condition: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={cardData.quantity}
                      onChange={(e) => setCardData({...cardData, quantity: parseInt(e.target.value)})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Card Attributes</label>
                    <div className="flex space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.rookie}
                          onChange={(e) => setCardData({...cardData, rookie: e.target.checked})}
                          className="mr-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Rookie</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.autographed}
                          onChange={(e) => setCardData({...cardData, autographed: e.target.checked})}
                          className="mr-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Auto</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.patch}
                          onChange={(e) => setCardData({...cardData, patch: e.target.checked})}
                          className="mr-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Patch</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={cardData.notes}
                    onChange={(e) => setCardData({...cardData, notes: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    placeholder="Any additional notes..."
                  />
                </div>

                <div className="flex justify-center space-x-3 pt-4">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    Add to Collection
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-6 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function CardModal({ userCard, onClose, onDelete }: CardModalProps) {
  const [showBack, setShowBack] = useState(false)
  
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{userCard.notes}</div>
                  </div>
                )}
              </div>
              
              {/* Actions */}
              <div className="flex justify-end space-x-3 border-t pt-4">
                <button
                  onClick={() => {
                    onDelete(userCard.id)
                    onClose()
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Remove from Collection
                </button>
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

export default function CollectionPage() {
  const [user, setUser] = useState<User | null>(null)
  const [userCards, setUserCards] = useState<UserCard[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCard, setSelectedCard] = useState<UserCard | null>(null)
  const [showUploadForm, setShowUploadForm] = useState(false)

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
    if (!confirm('Are you sure you want to remove this card from your collection?')) {
      return
    }

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

  const handleCardAdded = async () => {
    if (user) {
      await fetchUserCards(user.id)
    }
    setShowUploadForm(false)
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
              <button
                onClick={() => setShowUploadForm(true)}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Card
              </button>
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
            <button 
              onClick={() => setShowUploadForm(true)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Upload Your First Card
            </button>
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
                      src={(userCard.card as any)?.front_image_url || userCard.card?.image_url || ''} 
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
                  
                  <div className="mt-3 flex items-center justify-between">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">
                      Qty: {userCard.quantity}
                    </span>
                    {userCard.condition && (
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                        {userCard.condition}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modals */}
      {selectedCard && (
        <CardModal 
          userCard={selectedCard} 
          onClose={() => setSelectedCard(null)}
          onDelete={handleDeleteCard}
        />
      )}

      {showUploadForm && user && (
        <UploadCardForm
          user={user}
          onCardAdded={handleCardAdded}
          onClose={() => setShowUploadForm(false)}
        />
      )}
    </div>
  )
}