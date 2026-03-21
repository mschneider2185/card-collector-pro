'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import Image from 'next/image'
import CameraCapture from '@/components/CameraCapture'
import SheetUploadMode from './SheetUploadMode'

import type { CardExtractionResult } from '@/types'

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
  processingMetadata?: Record<string, unknown>
}

export default function UploadPage() {
  const [user, setUser] = useState<User | null>(null)
  const [uploadMode, setUploadMode] = useState<'single' | 'sheet'>('single')
  const [uploading, setUploading] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [uploadedBackImage, setUploadedBackImage] = useState<string | null>(null)
  const [frontPreviewUrl, setFrontPreviewUrl] = useState<string | null>(null)
  const [backPreviewUrl, setBackPreviewUrl] = useState<string | null>(null)
  const [showCardForm, setShowCardForm] = useState(false)
  const [processingResult, setProcessingResult] = useState<ProcessingResult | null>(null)
  const [processing, setProcessing] = useState(false)
  const [processingStep, setProcessingStep] = useState<string>('')
  const [showCamera, setShowCamera] = useState(false)
  const [cameraMode, setCameraMode] = useState<'front' | 'back'>('front')
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

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    getUser()
  }, [])

  useEffect(() => {
    console.log('uploadedImage state changed:', uploadedImage)
  }, [uploadedImage])

  const uploadImage = async (file: File, isBackImage: boolean = false) => {
    if (!user) {
      alert('Please sign in to upload cards')
      return
    }

    setUploading(true)
    if (!isBackImage) {
      setProcessingResult(null)
    }

    try {
      const rawExt = file.name.split('.').pop()?.toLowerCase()
      const fileExt = rawExt && rawExt !== 'undefined' ? rawExt : 'jpg'
      const mimeType = file.type || (fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg')
      const prefix = isBackImage ? 'back_' : 'front_'
      const fileName = `${user.id}/${prefix}${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('card-uploads')
        .upload(fileName, file, { contentType: mimeType })

      if (uploadError) {
        throw uploadError
      }

      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('card-uploads')
        .createSignedUrl(fileName, 3600)

      const previewUrl = signedUrlError ? null : signedUrlData?.signedUrl ?? null

      if (isBackImage) {
        setUploadedBackImage(fileName)
        setBackPreviewUrl(previewUrl)
      } else {
        setUploadedImage(fileName)
        setFrontPreviewUrl(previewUrl)
      }

    } catch (error) {
      console.error('Error uploading image:', error)
      alert('Error uploading image. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const processCard = async () => {
    if (!user || !uploadedImage) {
      alert('Please upload the front image first')
      return
    }

    setProcessing(true)
    setProcessingResult(null)
    setProcessingStep(uploadedBackImage ? 'Verifying card images...' : 'Analyzing card...')

    try {
      const frontImagePath = uploadedImage
      const backImagePath = uploadedBackImage ?? null

      // Create upload record
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

      // Open SSE stream — Edge function sends events as it processes
      const processResponse = await fetch('/api/ai/process-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadRecord.id,
          imagePath: frontImagePath,
          backImagePath: backImagePath,
          frontSignedUrl: frontPreviewUrl,
          backSignedUrl: backPreviewUrl
        })
      })

      if (!processResponse.ok || !processResponse.body) {
        console.error('AI processing start error:', processResponse.status)
        alert('Failed to start AI processing. You can manually enter card details below.')
        setShowCardForm(true)
        return
      }

      // Read SSE stream and update UI as events arrive
      const reader = processResponse.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let resolved = false

      while (!resolved) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6))

            if (event.step) {
              setProcessingStep(event.step)
            } else if (event.status === 'completed') {
              const data = event.extractedData as CardExtractionResult
              setProcessingResult({
                uploadId: uploadRecord.id,
                imagePath: frontImagePath,
                extractedData: data,
                confidence: data.confidence || 0.5,
                ocrText: data.raw_ocr_text,
                processingMetadata: undefined
              })
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
              resolved = true
            } else if (event.status === 'failed') {
              console.error('AI processing failed:', event.error)
              alert(event.error || 'AI processing failed. You can manually enter card details below.')
              setShowCardForm(true)
              resolved = true
            }
          } catch {
            // ignore parse errors on individual lines
          }
        }
      }

      if (!resolved) {
        alert('Processing stream ended unexpectedly. You can manually enter card details below.')
        setShowCardForm(true)
      }
    } catch (aiError) {
      console.error('AI processing error:', aiError)
      alert('AI processing failed. You can manually enter card details below.')
      setShowCardForm(true)
    } finally {
      setProcessing(false)
      setProcessingStep('')
    }
  }

  const handleCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user || !uploadedImage) return

    try {
      console.log('Attempting to add card to collection with data:', cardData)

      let cardId: string

      if (processingResult) {
        // This is a manual correction of AI-processed card - update the existing card
        console.log('Updating AI-processed card with manual corrections...')
        
        // Find the card created by AI processing using source_upload_id
        const { data: aiCard, error: findAIError } = await supabase
          .from('cards')
          .select('*')
          .eq('source_upload_id', processingResult.uploadId)
          .single()

        if (findAIError) {
          console.error('Error finding AI-created card:', findAIError)
          throw findAIError
        }

        // Update the AI-created card with manual corrections
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
        
        console.log('Updated existing AI card with manual corrections:', updatedCard.id)
        cardId = updatedCard.id
      } else {
        // No AI processing result - check for existing card or create new one
        console.log('Searching for existing card...')
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
          console.log('Found existing card:', existingCard.id)
          cardId = existingCard.id
        } else {
          // Create new card entry
          console.log('Creating new card...')
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
              image_url: null,
              front_image_url: null,
              back_image_url: null,
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
          console.log('Created new card:', newCard.id)
          cardId = newCard.id
        }
      }

      // Add to user's collection
      console.log('Adding to user collection...')
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
      setShowCardForm(false)
      setUploadedImage(null)
      setUploadedBackImage(null)
      setProcessingResult(null)
      setCardData({
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

  const handleCameraCapture = (file: File) => {
    uploadImage(file, cameraMode === 'back')
    setShowCamera(false)
  }

  const openCamera = (mode: 'front' | 'back') => {
    setCameraMode(mode)
    setShowCamera(true)
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl border border-white/20">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Please sign in to upload cards</h2>
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
                Upload Cards
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Mode Selector */}
        <div className="flex rounded-xl overflow-hidden border border-white/30 shadow mb-6 bg-white/60 backdrop-blur-sm w-fit mx-auto">
          <button
            onClick={() => setUploadMode('single')}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors ${
              uploadMode === 'single'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            Single Card
          </button>
          <button
            onClick={() => setUploadMode('sheet')}
            className={`px-6 py-2.5 text-sm font-semibold transition-colors ${
              uploadMode === 'sheet'
                ? 'bg-blue-600 text-white'
                : 'text-gray-600 hover:bg-white/60'
            }`}
          >
            Sheet (3×3)
          </button>
        </div>

        {/* Sheet Upload Mode */}
        {uploadMode === 'sheet' && (
          <div className="bg-gray-900 rounded-2xl shadow-xl border border-white/10 p-6 mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">Scan a 3×3 Binder Sheet</h2>
              <p className="text-gray-400 text-sm max-w-md mx-auto">
                Photograph a 9-pocket binder page. One AI call extracts all 9 cards at once.
              </p>
            </div>
            {user ? (
              <SheetUploadMode user={user} />
            ) : (
              <p className="text-center text-gray-400 py-8">Please sign in to scan sheets.</p>
            )}
          </div>
        )}

        {/* Upload Section (single-card mode) */}
        {uploadMode === 'single' && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Upload Card Images</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upload photos of your trading cards. Our advanced AI will analyze them and help you add them to your collection.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Front Image Upload */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 text-center">Front of Card</h3>
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                  uploading || processing
                    ? 'border-blue-400 bg-blue-50/50' 
                    : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50/30'
                }`}
              >
                {uploadedImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-[2.5/3.5] bg-gray-100 rounded-lg overflow-hidden">
                      {frontPreviewUrl && <Image
                        src={frontPreviewUrl}
                        alt="Front of card"
                        fill
                        className="object-contain"
                      />}
                    </div>
                    <p className="text-sm text-green-600 font-medium">✓ Front image uploaded</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <label className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFrontFileSelect}
                          className="sr-only"
                        />
                        Replace
                      </label>
                      <button
                        onClick={() => openCamera('front')}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Front</h4>
                    <p className="text-gray-600 mb-4 text-sm">Required</p>
                    <div className="flex flex-col gap-3">
                      <label className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFrontFileSelect}
                          className="sr-only"
                        />
                        Choose from Gallery
                      </label>
                      <button
                        onClick={() => openCamera('front')}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Take Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Back Image Upload */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-gray-900 text-center">Back of Card</h3>
              <div className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                uploading || processing
                  ? 'border-purple-400 bg-purple-50/50' 
                  : 'border-gray-300 hover:border-purple-400 hover:bg-purple-50/30'
              }`}>
                {uploadedBackImage ? (
                  <div className="space-y-4">
                    <div className="relative w-full aspect-[2.5/3.5] bg-gray-100 rounded-lg overflow-hidden">
                      {backPreviewUrl && <Image
                        src={backPreviewUrl}
                        alt="Back of card"
                        fill
                        className="object-contain"
                      />}
                    </div>
                    <p className="text-sm text-green-600 font-medium">✓ Back image uploaded</p>
                    <div className="flex flex-col sm:flex-row gap-2 justify-center">
                      <label className="inline-flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg cursor-pointer transition-colors">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackFileSelect}
                          className="sr-only"
                        />
                        Replace
                      </label>
                      <button
                        onClick={() => openCamera('back')}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Retake Photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-2">Upload Back</h4>
                    <p className="text-gray-600 mb-4 text-sm">Optional (improves accuracy)</p>
                    <div className="flex flex-col gap-3">
                      <label className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer">
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleBackFileSelect}
                          className="sr-only"
                        />
                        Choose from Gallery
                      </label>
                      <button
                        onClick={() => openCamera('back')}
                        className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Take Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Process Button */}
          {uploadedImage && (
            <div className="mt-8 text-center">
              {processing ? (
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mb-6"></div>
                  <p className="text-lg text-gray-600 mb-2">{processingStep || 'Analyzing your card...'}</p>
                  <p className="text-sm text-gray-500">Our AI is identifying card details from {uploadedBackImage ? 'both sides' : 'the front'}</p>
                </div>
              ) : (
                <button
                  onClick={processCard}
                  disabled={!uploadedImage}
                  className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 disabled:cursor-not-allowed disabled:transform-none"
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
            <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-2xl p-6">
              <div className="flex items-start mb-4">
                <div className="flex-shrink-0">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-lg font-medium text-green-800 mb-2">
                    🤖 AI Analysis Complete!
                  </h4>
                  <p className="text-green-700 mb-4">
                    Our AI has analyzed your card and extracted the following information. Please review and edit as needed before adding to your collection.
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                      processingResult.confidence >= 0.8
                        ? 'bg-green-100 text-green-800'
                        : processingResult.confidence >= 0.6
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {Math.round(processingResult.confidence * 100)}% confidence
                    </span>
                    {processingResult.extractedData.attributes?.rookie && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
                        RC
                      </span>
                    )}
                    {processingResult.extractedData.attributes?.autographed && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        AUTO
                      </span>
                    )}
                    {processingResult.extractedData.attributes?.patch && (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                        PATCH
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card Entry Form */}
          {showCardForm && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Review & Edit Card Details</h3>
              <form onSubmit={handleCardSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                    <input
                      type="text"
                      value={cardData.sport}
                      onChange={(e) => setCardData({...cardData, sport: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Baseball, Basketball, Pokémon"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Year</label>
                    <input
                      type="number"
                      value={cardData.year}
                      onChange={(e) => setCardData({...cardData, year: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1900"
                      max={new Date().getFullYear() + 1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                    <input
                      type="text"
                      value={cardData.brand}
                      onChange={(e) => setCardData({...cardData, brand: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Topps, Upper Deck"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Series</label>
                    <input
                      type="text"
                      value={cardData.series}
                      onChange={(e) => setCardData({...cardData, series: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Chrome, Heritage"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Set Number</label>
                    <input
                      type="text"
                      value={cardData.set_number}
                      onChange={(e) => setCardData({...cardData, set_number: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Series 1, 2023"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Number</label>
                    <input
                      type="text"
                      value={cardData.card_number}
                      onChange={(e) => setCardData({...cardData, card_number: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., #145"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Player Name</label>
                    <input
                      type="text"
                      value={cardData.player_name}
                      onChange={(e) => setCardData({...cardData, player_name: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Mike Trout"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Team</label>
                    <input
                      type="text"
                      value={cardData.team}
                      onChange={(e) => setCardData({...cardData, team: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Los Angeles Angels"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                    <input
                      type="text"
                      value={cardData.position}
                      onChange={(e) => setCardData({...cardData, position: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., CF, Pitcher"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Variation</label>
                    <input
                      type="text"
                      value={cardData.variation}
                      onChange={(e) => setCardData({...cardData, variation: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Holo, Refractor"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                    <select
                      value={cardData.condition}
                      onChange={(e) => setCardData({...cardData, condition: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={cardData.quantity}
                      onChange={(e) => setCardData({...cardData, quantity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Card Attributes</label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.rookie}
                          onChange={(e) => setCardData({...cardData, rookie: e.target.checked})}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Rookie Card</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.autographed}
                          onChange={(e) => setCardData({...cardData, autographed: e.target.checked})}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Autographed</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={cardData.patch}
                          onChange={(e) => setCardData({...cardData, patch: e.target.checked})}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Patch/Jersey</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={cardData.notes}
                    onChange={(e) => setCardData({...cardData, notes: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Any additional notes about this card..."
                  />
                </div>
                <div className="flex justify-center space-x-4">
                  <button
                    type="submit"
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
                  >
                    Add to Collection
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCardForm(false)
                      setUploadedImage(null)
                      setProcessingResult(null)
                    }}
                    className="px-8 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-blue-800 mb-2">
                  🤖 AI Card Recognition Active!
                </h4>
                <p className="text-blue-700 mb-4">
                  Our AI will automatically analyze your uploaded cards to identify player names, teams, years, and special attributes. Review and edit the extracted data before adding to your collection.
                </p>
                <div className="flex space-x-4">
                  <a 
                    href="/cards" 
                    className="inline-flex items-center text-purple-600 hover:text-purple-800 font-medium transition-colors"
                  >
                    Browse Card Database
                    <svg className="ml-2 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
        )} {/* end uploadMode === 'single' */}

        {/* Tips Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">Tips for Better Card Recognition</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">1</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Good Lighting</h4>
                  <p className="text-gray-600 text-sm">Ensure bright, even lighting when taking photos</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">2</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Flat Surface</h4>
                  <p className="text-gray-600 text-sm">Keep the card flat and centered in the frame</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">3</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Avoid Glare</h4>
                  <p className="text-gray-600 text-sm">Avoid shadows or glare on the card surface</p>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">4</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Full Card</h4>
                  <p className="text-gray-600 text-sm">Include the entire card in the image</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">5</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Plain Background</h4>
                  <p className="text-gray-600 text-sm">Use a plain, contrasting background</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-blue-600 font-bold text-sm">6</span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">Camera Tips</h4>
                  <p className="text-gray-600 text-sm">Hold steady, use the card frame guide, and ensure good focus</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Mobile Camera Tips */}
          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="ml-3">
                <h4 className="text-lg font-medium text-green-800 mb-2">
                  📱 Mobile Camera Features
                </h4>
                <p className="text-green-700 mb-4">
                  Use your device&apos;s camera for instant card capture! The camera interface includes helpful guides and supports both front and back cameras.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-700">Card frame guide</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-700">Switch cameras</span>
                  </div>
                  <div className="flex items-center">
                    <svg className="w-4 h-4 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-green-700">High quality capture</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
          isBackImage={cameraMode === 'back'}
        />
      )}

      {/* Floating Action Button for Quick Camera Access */}
      <div className="fixed bottom-6 right-6 z-40 md:hidden">
        <button
          onClick={() => openCamera('front')}
          className="flex items-center justify-center w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-110"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  )
}