'use client'

import { useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import SheetCapture from '@/components/SheetCapture'
import { useBatchScan } from '@/hooks/useBatchScan'
import type { BatchCardPosition, ProcessedBatchCard, CardExtractionResult } from '@/types'

// ---- Types ----

interface ReviewCard {
  position: number
  card_id: string | null
  needs_review: boolean
  data: CardExtractionResult | null
  player_name: string
  sport: string
  year: string
  brand: string
  set_name: string
  card_number: string
  team: string
  condition: string
  quantity: number
  notes: string
  rookie: boolean
  autographed: boolean
  patch: boolean
  confirmed: boolean
}

const POSITION_LABELS = [
  'Top-Left', 'Top-Center', 'Top-Right',
  'Mid-Left', 'Mid-Center', 'Mid-Right',
  'Bot-Left', 'Bot-Center', 'Bot-Right'
]

function emptyReviewCard(position: number): ReviewCard {
  return {
    position, card_id: null, needs_review: false, data: null,
    player_name: '', sport: '', year: String(new Date().getFullYear()),
    brand: '', set_name: '', card_number: '', team: '',
    condition: '', quantity: 1, notes: '',
    rookie: false, autographed: false, patch: false, confirmed: false
  }
}

function reviewCardFromBatch(pos: BatchCardPosition, card_id: string | null): ReviewCard {
  const c = pos.card
  return {
    position: pos.position, card_id, needs_review: pos.needs_review, data: c,
    player_name: c?.player_name ?? '',
    sport: c?.sport ?? '',
    year: c?.year ?? String(new Date().getFullYear()),
    brand: c?.card_brand ?? '',
    set_name: c?.set_name ?? '',
    card_number: c?.card_number ?? '',
    team: c?.team_name ?? '',
    condition: '', quantity: 1, notes: '',
    rookie: c?.attributes?.rookie ?? false,
    autographed: c?.attributes?.autographed ?? false,
    patch: c?.attributes?.patch ?? false,
    confirmed: !pos.needs_review && !!c?.player_name
  }
}

/**
 * Crop the BACK of a binder page sheet into 9 thumbnails, column-mirrored.
 * Front position p at (row r, col c) maps to back image at (row r, col 2-c).
 * Returns array of 9 data URLs where index i = back of card at front-position i.
 *
 * Uses simple equal-thirds cropping for back images (good enough for text extraction).
 */
async function cropBackSheetIntoThumbnails(file: File): Promise<string[]> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => {
      const crops: string[] = new Array(9)
      const cellW = img.width / 3
      const cellH = img.height / 3
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const frontPos = row * 3 + col
          const backCol = 2 - col // column mirror when page is flipped left-to-right
          const srcX = Math.round(backCol * cellW)
          const srcY = Math.round(row * cellH)
          const srcW = Math.round(cellW)
          const srcH = Math.round(cellH)
          const scale = Math.min(1, 900 / srcW)
          const outW = Math.round(srcW * scale)
          const outH = Math.round(srcH * scale)
          const canvas = document.createElement('canvas')
          canvas.width = outW; canvas.height = outH
          const ctx = canvas.getContext('2d')!
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
          crops[frontPos] = canvas.toDataURL('image/jpeg', 0.85)
        }
      }
      URL.revokeObjectURL(img.src)
      resolve(crops)
    }
    img.src = URL.createObjectURL(file)
  })
}

// ---- Component ----

interface SheetUploadModeProps {
  user: User
}

type Stage = 'capture' | 'processing' | 'review' | 'saving' | 'done'

export default function SheetUploadMode({ user }: SheetUploadModeProps) {
  // Use the new two-phase batch scan hook
  const { state: scanState, startScan, reset: resetScan } = useBatchScan(user.id)

  const [stage, setStage] = useState<Stage>('capture')
  const [showCamera, setShowCamera] = useState(false)
  const [sheetPreview, setSheetPreview] = useState<string | null>(null)
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([])
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [noGridError, setNoGridError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reScanInputRef = useRef<HTMLInputElement>(null)
  const backFileInputRef = useRef<HTMLInputElement>(null)
  const [reScanPosition, setReScanPosition] = useState<number | null>(null)

  const [backCropThumbnails, setBackCropThumbnails] = useState<string[]>([])
  const [backSheetPreview, setBackSheetPreview] = useState<string | null>(null)
  const [backStage, setBackStage] = useState<'idle' | 'processing' | 'done'>('idle')
  const [backProgress, setBackProgress] = useState(0)

  // Derive processing state from hook
  const isProcessing = ['detecting', 'warping', 'extracting'].includes(scanState.phase)

  // When the scan completes, transition to review stage
  // We track this with a ref to avoid re-running on every render
  const lastPhaseRef = useRef(scanState.phase)
  if (scanState.phase !== lastPhaseRef.current) {
    lastPhaseRef.current = scanState.phase

    if (scanState.phase === 'complete' && stage === 'processing') {
      // Build review cards from scan results
      const cardMap = new Map<number, ProcessedBatchCard>()
      for (const pc of scanState.processedCards) cardMap.set(pc.position, pc)

      const cards: ReviewCard[] = Array.from({ length: 9 }, (_, i) => {
        const batchCard = scanState.cardProgress.get(i)
        const pc = cardMap.get(i)
        if (batchCard) return reviewCardFromBatch(batchCard, pc?.card_id ?? null)
        const empty = emptyReviewCard(i)
        if (pc) empty.card_id = pc.card_id
        return empty
      })
      setReviewCards(cards)
      setStage('review')
    } else if (scanState.phase === 'error' && stage === 'processing') {
      if (scanState.error?.includes('No 3x3 grid')) {
        setNoGridError(true)
      }
      setStage('capture')
    }
  }

  // ---- Upload & process ----

  const handleFile = async (file: File) => {
    const preview = URL.createObjectURL(file)
    setSheetPreview(preview)
    setNoGridError(false)
    setStage('processing')
    await startScan(file)
  }

  // ---- Back-of-sheet scan (preserved from original) ----

  const handleBackFile = async (file: File) => {
    setBackSheetPreview(URL.createObjectURL(file))
    setBackStage('processing')
    setBackProgress(0)
    const backCrops = await cropBackSheetIntoThumbnails(file)
    setBackCropThumbnails(backCrops)

    // Snapshot review cards and front crops at call time
    const snapshot = [...reviewCards]
    const frontCrops = [...scanState.croppedImages]

    // Re-extract all 9 slots sequentially with front+back for QA pass
    for (let i = 0; i < 9; i++) {
      const frontDataUrl = frontCrops[i]
      const backDataUrl = backCrops[i]
      if (!frontDataUrl || !backDataUrl) { setBackProgress(i + 1); continue }

      try {
        const cardId = snapshot[i]?.card_id ?? null
        const res = await fetch('/api/ai/extract-card-dataurl', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ frontDataUrl, backDataUrl, cardId })
        })
        const json = await res.json() as CardExtractionResult & { error?: string; backImageSaved?: boolean; card_id?: string | null }
        if (!res.ok) {
          console.error(`[backScan] pos ${i} API error:`, json.error)
        } else {
          if (!json.backImageSaved) {
            console.warn(`[backScan] pos ${i}: back image upload failed`)
          }
          const prev = snapshot[i]
          updateReviewCard(i, {
            // Set card_id if the route created/found one (critical for save)
            card_id: json.card_id ?? prev?.card_id ?? null,
            player_name: json.player_name ?? prev?.player_name ?? '',
            sport: json.sport ?? prev?.sport ?? '',
            year: json.year ?? prev?.year ?? '',
            brand: json.card_brand ?? prev?.brand ?? '',
            set_name: json.set_name ?? prev?.set_name ?? '',
            card_number: json.card_number ?? prev?.card_number ?? '',
            team: json.team_name ?? prev?.team ?? '',
            rookie: json.attributes?.rookie ?? prev?.rookie ?? false,
            autographed: json.attributes?.autographed ?? prev?.autographed ?? false,
            patch: json.attributes?.patch ?? prev?.patch ?? false,
            needs_review: false,
            confirmed: true
          })
        }
      } catch (slotErr) {
        console.error(`[backScan] pos ${i} exception:`, slotErr)
      }
      setBackProgress(i + 1)
    }
    setBackStage('done')
  }

  // ---- Per-slot re-scan ----

  const triggerReScan = (position: number) => {
    setReScanPosition(position)
    reScanInputRef.current?.click()
  }

  const handleReScanFile = async (file: File) => {
    if (reScanPosition === null) return
    const pos = reScanPosition
    setReScanPosition(null)

    try {
      const rawExt = file.name.split('.').pop()?.toLowerCase()
      const fileExt = rawExt && rawExt !== 'undefined' ? rawExt : 'jpg'
      const mimeType = file.type || (fileExt === 'png' ? 'image/png' : 'image/jpeg')
      const fileName = `${user.id}/rescan_${Date.now()}.${fileExt}`

      const { error: upErr } = await supabase.storage
        .from('card-uploads')
        .upload(fileName, file, { contentType: mimeType })
      if (upErr) throw upErr

      const { data: signed } = await supabase.storage
        .from('card-uploads')
        .createSignedUrl(fileName, 3600)
      if (!signed?.signedUrl) throw new Error('Signed URL failed')

      const { data: uploadRecord, error: insertErr } = await supabase
        .from('card_uploads')
        .insert({ user_id: user.id, image_path: fileName, status: 'pending' })
        .select()
        .single()
      if (insertErr) throw insertErr

      const res = await fetch('/api/ai/process-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId: uploadRecord.id,
          imagePath: fileName,
          frontSignedUrl: signed.signedUrl
        })
      })
      if (!res.ok || !res.body) throw new Error('Re-scan failed')

      const reader = res.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let done = false
      while (!done) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break
        buf += dec.decode(value, { stream: true })
        for (const line of buf.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const ev = JSON.parse(line.slice(6)) as Record<string, unknown>
          if (ev.status === 'completed') {
            const { data: newCard } = await supabase
              .from('cards')
              .select('id')
              .eq('source_upload_id', uploadRecord.id)
              .maybeSingle()
            const extracted = ev.extractedData as CardExtractionResult
            updateReviewCard(pos, {
              card_id: newCard?.id ?? null,
              player_name: extracted.player_name ?? '',
              sport: extracted.sport ?? '',
              year: extracted.year ?? String(new Date().getFullYear()),
              brand: extracted.card_brand ?? '',
              set_name: extracted.set_name ?? '',
              card_number: extracted.card_number ?? '',
              team: extracted.team_name ?? '',
              rookie: extracted.attributes?.rookie ?? false,
              autographed: extracted.attributes?.autographed ?? false,
              patch: extracted.attributes?.patch ?? false,
              needs_review: false,
              confirmed: true
            })
            done = true
          } else if (ev.status === 'failed') {
            alert(`Re-scan failed: ${ev.error}`)
            done = true
          }
        }
        buf = buf.split('\n').pop() || ''
      }
    } catch (err) {
      alert('Re-scan failed: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  // ---- Review helpers ----

  const updateReviewCard = (position: number, updates: Partial<ReviewCard>) => {
    setReviewCards(prev => prev.map(c => c.position === position ? { ...c, ...updates } : c))
  }

  const confirmCard = (position: number) => updateReviewCard(position, { confirmed: true })

  // ---- Save all ----

  const saveAll = async () => {
    const unconfirmed = reviewCards.filter(c => c.needs_review && !c.confirmed && c.card_id)
    if (unconfirmed.length > 0) {
      alert(`Please confirm ${unconfirmed.length} flagged card(s) before saving.`)
      return
    }
    setStage('saving')
    setSaveError(null)
    try {
      const cardsToSave = reviewCards.filter(c => c.card_id)
      if (cardsToSave.length === 0) { setSavedCount(0); setStage('done'); return }

      const res = await fetch('/api/user-cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cards: cardsToSave.map(c => ({
            position: c.position, card_id: c.card_id!,
            quantity: c.quantity, condition: c.condition || null,
            notes: c.notes || null, is_for_trade: false
          }))
        })
      })
      const result = await res.json() as { success: boolean; inserted: number; errors: string[] }
      if (!result.success) throw new Error(result.errors?.[0] ?? 'Save failed')
      setSavedCount(result.inserted)
      setStage('done')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setStage('review')
    }
  }

  const handleDiscard = () => stage === 'review' ? setDiscardConfirm(true) : resetAll()

  const resetAll = () => {
    resetScan()
    setStage('capture')
    setSheetPreview(null)
    setReviewCards([])
    setExpandedSlot(null)
    setDiscardConfirm(false)
    setNoGridError(false)
    setSaveError(null)
    setReScanPosition(null)
    setBackCropThumbnails([])
    setBackSheetPreview(null)
    setBackStage('idle')
    setBackProgress(0)
  }

  // ---- Render ----

  if (showCamera) {
    return (
      <SheetCapture
        onCapture={file => { setShowCamera(false); handleFile(file) }}
        onClose={() => setShowCamera(false)}
      />
    )
  }

  const needsReviewCount = reviewCards.filter(c => c.needs_review && !c.confirmed).length
  const savableCount = reviewCards.filter(c => c.card_id).length

  // Build crop thumbnails from scan state
  const cropThumbnails = scanState.croppedImages

  return (
    <div className="space-y-6">
      {/* ---- DONE ---- */}
      {stage === 'done' && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {savedCount} card{savedCount !== 1 ? 's' : ''} added to your collection!
          </h3>
          <button
            onClick={resetAll}
            className="mt-4 px-6 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: '4px' }}
          >
            Scan Another Sheet
          </button>
        </div>
      )}

      {/* ---- CAPTURE ---- */}
      {stage === 'capture' && (
        <div className="space-y-4">
          {noGridError && (
            <div className="p-4 bg-red-900/40 border border-red-500 rounded-xl text-red-200 text-sm">
              No 3x3 grid detected in that photo. Make sure the sheet fills the frame with all 9 pockets visible, then try again.
            </div>
          )}

          {sheetPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheetPreview} alt="Sheet preview" className="w-full rounded-xl object-contain max-h-64" />
              <button onClick={resetAll} className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center space-y-4">
              <div className="text-white/50 text-sm">Photograph a 3x3 binder page with 9 card slots</div>
              <div className="inline-grid grid-cols-3 gap-1 mx-auto opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-7 h-9 border border-white rounded-sm" />
                ))}
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => setShowCamera(true)}
                  className="px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-80"
                  style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: '4px' }}
                >
                  Open Camera
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium">
                  Upload Photo
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ---- PROCESSING ---- */}
      {stage === 'processing' && isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', borderRadius: '2px' }} />
            <span>{scanState.processingStep || 'Processing...'}</span>
          </div>

          {/* Show phase-specific info */}
          {scanState.phase === 'detecting' && (
            <div className="text-white/40 text-xs">Analyzing sheet layout with GPT-4o Vision...</div>
          )}
          {scanState.phase === 'warping' && (
            <div className="text-white/40 text-xs">
              Correcting perspective for {9 - scanState.flaggedPositions.length} detected cards...
            </div>
          )}

          {/* Show grid of cropped images as they become available */}
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => {
              const cropped = scanState.croppedImages[i]
              const cardProgress = scanState.cardProgress.get(i)
              const isFlagged = scanState.flaggedPositions.includes(i)

              return (
                <div key={i} className={`rounded-lg overflow-hidden transition-all border ${
                  cardProgress ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/10'
                }`} style={{ minHeight: 90 }}>
                  {cropped ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={cropped} alt={POSITION_LABELS[i]} className="w-full h-auto object-contain" />
                      {!cardProgress && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <div className="w-5 h-5 border-2 border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', borderRadius: '2px' }} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-24 flex items-center justify-center">
                      {isFlagged ? (
                        <div className="text-amber-400 text-xs">Skipped</div>
                      ) : (
                        <div className="w-4 h-4 border-2 border-t-transparent animate-spin" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', borderRadius: '2px' }} />
                      )}
                    </div>
                  )}
                  <div className="p-2 text-center text-xs">
                    <div className="text-white/40 mb-0.5">{POSITION_LABELS[i]}</div>
                    {cardProgress?.card?.player_name && (
                      <div className="text-white/80 truncate font-medium">{cardProgress.card.player_name}</div>
                    )}
                    {cardProgress && !cardProgress.card?.player_name && (
                      <div className="text-white/30 italic">Empty</div>
                    )}
                    {!cardProgress && !isFlagged && <div className="text-white/30">Scanning...</div>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ---- REVIEW ---- */}
      {stage === 'review' && (
        <div className="space-y-4">
          {/* Sheet preview strip */}
          {sheetPreview && (
            <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheetPreview} alt="Scanned sheet" className="h-16 w-auto rounded object-contain" />
              <div>
                <p className="text-white text-sm font-medium">{savableCount} of 9 cards identified</p>
                <p className="text-white/40 text-xs mt-0.5">
                  {needsReviewCount > 0
                    ? `${needsReviewCount} need review before saving`
                    : 'All cards confirmed -- ready to save'}
                </p>
              </div>
              <button onClick={resetAll} className="ml-auto text-white/30 hover:text-white/60 transition-colors text-xs">
                Rescan
              </button>
            </div>
          )}

          {/* Back-of-sheet scanning section */}
          {backStage === 'idle' && (
            <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2">
              <div className="flex items-start gap-3">
                <div className="text-2xl">🔄</div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">Add Back of Sheet</p>
                  <p className="text-white/50 text-xs mt-0.5">
                    Scan the back to capture set name, card numbers, and stats — dramatically improves accuracy.
                  </p>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => backFileInputRef.current?.click()}
                      className="px-4 py-1.5 text-xs font-medium transition-opacity hover:opacity-80"
                      style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: '4px' }}>
                      Upload Back Photo
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {backStage === 'processing' && (
            <div className="p-4 space-y-2" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-accent)', borderRadius: '4px' }}>
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-t-transparent animate-spin shrink-0" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', borderRadius: '2px' }} />
                <div className="flex-1">
                  <p className="text-white text-sm font-medium">Enhancing with back images...</p>
                  <div className="mt-2 bg-white/10 h-1.5" style={{ borderRadius: '2px' }}>
                    <div className="h-1.5 transition-all" style={{ background: '#C9A84C', width: `${(backProgress / 9) * 100}%`, borderRadius: '2px' }} />
                  </div>
                  <p className="text-white/40 text-xs mt-1">{backProgress} of 9 complete</p>
                </div>
              </div>
            </div>
          )}

          {backStage === 'done' && (
            <div className="p-3 flex items-center gap-2" style={{ border: '1px solid var(--color-success)', borderRadius: '4px' }}>
              <svg className="w-4 h-4 shrink-0" style={{ color: 'var(--color-success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Back images applied — all cards re-extracted</p>
              {backSheetPreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backSheetPreview} alt="Back sheet" className="ml-auto h-8 w-auto rounded object-contain opacity-60" />
              )}
            </div>
          )}

          <input ref={backFileInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleBackFile(f); e.target.value = '' }} />

          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Review {reviewCards.length} Cards</h3>
            <span className={`text-sm font-medium ${needsReviewCount > 0 ? 'text-amber-400' : 'text-green-400'}`}>
              {needsReviewCount > 0 ? `${needsReviewCount} need review` : 'All clear'}
            </span>
          </div>

          {saveError && (
            <div className="p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-200 text-sm">{saveError}</div>
          )}

          <div className="grid grid-cols-3 gap-2">
            {reviewCards.map(card => (
              <ReviewSlot
                key={card.position}
                card={card}
                thumbnail={cropThumbnails[card.position] ?? undefined}
                isExpanded={expandedSlot === card.position}
                onToggleExpand={() => setExpandedSlot(prev => prev === card.position ? null : card.position)}
                onChange={updates => updateReviewCard(card.position, updates)}
                onConfirm={() => confirmCard(card.position)}
                onReScan={() => triggerReScan(card.position)}
              />
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={saveAll}
              className="flex-1 py-3 font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: '4px' }}
            >
              Save {savableCount} Card{savableCount !== 1 ? 's' : ''}
            </button>
            <button onClick={handleDiscard} className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors">
              Discard All
            </button>
          </div>
        </div>
      )}

      {/* ---- SAVING ---- */}
      {stage === 'saving' && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-t-transparent animate-spin mx-auto mb-4" style={{ borderColor: '#C9A84C', borderTopColor: 'transparent', borderRadius: '2px' }} />
          <p className="text-white/70">Saving cards to your collection...</p>
        </div>
      )}

      {/* ---- DISCARD CONFIRM ---- */}
      {discardConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="p-6 max-w-sm w-full text-center space-y-4" style={{ background: '#1A1A2E', border: '1px solid #3D3D5C', borderRadius: '4px' }}>
            <h3 className="text-white font-bold text-lg">Discard all {reviewCards.length} cards?</h3>
            <p className="text-white/60 text-sm">Any extracted card data will be lost.</p>
            <div className="flex gap-3">
              <button onClick={resetAll} className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Discard</button>
              <button onClick={() => setDiscardConfirm(false)} className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
      <input ref={reScanInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleReScanFile(f) }} />

      {/* Unused state variable reference to satisfy TypeScript */}
      {backCropThumbnails.length > 0 && null}
    </div>
  )
}

// ---- Sub-components ----

interface ReviewSlotProps {
  card: ReviewCard
  thumbnail?: string
  isExpanded: boolean
  onToggleExpand: () => void
  onChange: (updates: Partial<ReviewCard>) => void
  onConfirm: () => void
  onReScan: () => void
}

function ReviewSlot({ card, thumbnail, isExpanded, onToggleExpand, onChange, onConfirm, onReScan }: ReviewSlotProps) {
  const label = POSITION_LABELS[card.position]
  const isEmpty = !card.card_id && !card.player_name
  const needsAttention = card.needs_review && !card.confirmed

  return (
    <div className={`rounded-lg border transition-all overflow-hidden ${
      isEmpty ? 'border-white/10 bg-white/5'
        : needsAttention ? 'border-amber-500 bg-amber-950/30'
        : 'border-white/20 bg-white/8'
    }`}>
      {/* Crop thumbnail */}
      {thumbnail && !isEmpty && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnail} alt={label} className="w-full h-auto object-contain" />
      )}

      {/* Slot header */}
      <button onClick={onToggleExpand} className="w-full p-2 text-left">
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="text-white/40 text-[10px]">{label}</div>
            {isEmpty ? (
              <div className="text-white/25 text-xs italic">Empty</div>
            ) : (
              <div className="text-white text-xs font-medium truncate">{card.player_name || '(unnamed)'}</div>
            )}
            {needsAttention && <div className="text-amber-400 text-[10px] font-semibold mt-0.5">Review needed</div>}
            {card.confirmed && !isEmpty && <div className="text-green-400 text-[10px] mt-0.5">Confirmed</div>}
          </div>
          {!isEmpty && (
            <svg className={`w-3 h-3 text-white/30 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded editor */}
      {isExpanded && !isEmpty && (
        <div className="px-2 pb-3 space-y-2 border-t border-white/10 pt-2">
          <Field label="Player" value={card.player_name} onChange={v => onChange({ player_name: v })} />
          <Field label="Sport" value={card.sport} onChange={v => onChange({ sport: v })} />
          <Field label="Year" value={card.year} onChange={v => onChange({ year: v })} />
          <Field label="Brand" value={card.brand} onChange={v => onChange({ brand: v })} />
          <Field label="Set" value={card.set_name} onChange={v => onChange({ set_name: v })} />
          <Field label="Card #" value={card.card_number} onChange={v => onChange({ card_number: v })} />
          <Field label="Team" value={card.team} onChange={v => onChange({ team: v })} />
          <div className="flex gap-3 text-[10px] text-white/60">
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={card.rookie} onChange={e => onChange({ rookie: e.target.checked })} className="w-3 h-3" /> RC
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={card.autographed} onChange={e => onChange({ autographed: e.target.checked })} className="w-3 h-3" /> Auto
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={card.patch} onChange={e => onChange({ patch: e.target.checked })} className="w-3 h-3" /> Patch
            </label>
          </div>
          <Field label="Condition" value={card.condition} onChange={v => onChange({ condition: v })} />
          <div className="flex gap-2 pt-1">
            {needsAttention && (
              <button onClick={onConfirm} className="flex-1 py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors">
                Confirm Card
              </button>
            )}
            <button onClick={onReScan} className="flex-1 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
              style={{ border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: '2px' }}>
              Re-scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <div className="text-white/40 text-[9px] uppercase tracking-wide mb-0.5">{label}</div>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/15 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-yellow-400" />
    </div>
  )
}
