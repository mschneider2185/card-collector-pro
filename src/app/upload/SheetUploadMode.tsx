'use client'

import { useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import SheetCapture from '@/components/SheetCapture'
import type { BatchCardPosition, ProcessedBatchCard, CardExtractionResult } from '@/types'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SlotState {
  status: 'idle' | 'loading' | 'done' | 'error'
  card: BatchCardPosition | null
}

interface ReviewCard {
  position: number
  card_id: string | null
  needs_review: boolean
  data: CardExtractionResult | null
  // editable fields
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
    position,
    card_id: null,
    needs_review: false,
    data: null,
    player_name: '',
    sport: '',
    year: String(new Date().getFullYear()),
    brand: '',
    set_name: '',
    card_number: '',
    team: '',
    condition: '',
    quantity: 1,
    notes: '',
    rookie: false,
    autographed: false,
    patch: false,
    confirmed: false
  }
}

function reviewCardFromBatch(pos: BatchCardPosition, card_id: string | null): ReviewCard {
  const c = pos.card
  return {
    position: pos.position,
    card_id,
    needs_review: pos.needs_review,
    data: c,
    player_name: c?.player_name ?? '',
    sport: c?.sport ?? '',
    year: c?.year ?? String(new Date().getFullYear()),
    brand: c?.card_brand ?? '',
    set_name: c?.set_name ?? '',
    card_number: c?.card_number ?? '',
    team: c?.team_name ?? '',
    condition: '',
    quantity: 1,
    notes: '',
    rookie: c?.attributes?.rookie ?? false,
    autographed: c?.attributes?.autographed ?? false,
    patch: c?.attributes?.patch ?? false,
    confirmed: !pos.needs_review && !!c?.player_name
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

interface SheetUploadModeProps {
  user: User
}

type Stage = 'capture' | 'processing' | 'review' | 'saving' | 'done'

export default function SheetUploadMode({ user }: SheetUploadModeProps) {
  const [stage, setStage] = useState<Stage>('capture')
  const [showCamera, setShowCamera] = useState(false)
  const [sheetPreview, setSheetPreview] = useState<string | null>(null)
  const [processingStep, setProcessingStep] = useState('')
  const [slots, setSlots] = useState<SlotState[]>(
    Array.from({ length: 9 }, () => ({ status: 'idle', card: null }))
  )
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([])
  const [expandedSlot, setExpandedSlot] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedCount, setSavedCount] = useState(0)
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [noGridError, setNoGridError] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Upload & process ──────────────────────────────────────────────────────

  const handleFile = async (file: File) => {
    setSheetPreview(URL.createObjectURL(file))
    setNoGridError(false)
    await uploadAndProcess(file)
  }

  const uploadAndProcess = async (file: File) => {
    setStage('processing')
    setProcessingStep('Uploading sheet...')
    setSlots(Array.from({ length: 9 }, () => ({ status: 'loading', card: null })))

    try {
      // 1. Get a pre-signed upload URL + batchId
      const urlRes = await fetch('/api/uploads/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1, userId: user.id })
      })
      if (!urlRes.ok) throw new Error('Failed to generate upload URL')
      const { batchId, urls } = await urlRes.json() as {
        batchId: string
        urls: Array<{ position: number; path: string; signedUrl: string; token: string }>
      }

      const { path, token } = urls[0]

      // 2. Upload sheet image via signed upload URL
      const rawExt = file.name.split('.').pop()?.toLowerCase()
      const fileExt = rawExt && rawExt !== 'undefined' ? rawExt : 'jpg'
      const mimeType = file.type || (fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg')

      const { error: uploadError } = await supabase.storage
        .from('card-uploads')
        .uploadToSignedUrl(path, token, file, { contentType: mimeType })

      if (uploadError) throw uploadError

      // 3. Generate a reading preview URL for the Edge function
      const { data: signedData, error: signedError } = await supabase.storage
        .from('card-uploads')
        .createSignedUrl(path, 3600)
      if (signedError || !signedData?.signedUrl) throw new Error('Failed to generate signed URL')

      // 4. Create card_uploads record
      const { data: uploadRecord, error: insertError } = await supabase
        .from('card_uploads')
        .insert({
          user_id: user.id,
          image_path: path,
          status: 'pending',
          batch_id: batchId
        })
        .select()
        .single()
      if (insertError) throw insertError

      setProcessingStep('Detecting grid...')

      // 5. Stream SSE from process-sheet
      const processRes = await fetch('/api/ai/process-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId,
          uploadId: uploadRecord.id,
          sheetSignedUrl: signedData.signedUrl,
          imagePath: path
        })
      })

      if (!processRes.ok || !processRes.body) {
        throw new Error('Failed to start sheet processing')
      }

      const reader = processRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let resolved = false
      let processedCards: ProcessedBatchCard[] = []
      // Local accumulator avoids stale-closure problem: React state updates
      // from setSlots() are async, so reading `slots` inside the SSE loop
      // would always see the initial snapshot. We track card_progress data
      // here in plain JS and use it when the completed event fires.
      const cardProgressAccum = new Map<number, BatchCardPosition>()

      while (!resolved) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const event = JSON.parse(line.slice(6)) as Record<string, unknown>

            if (event.step) {
              setProcessingStep(event.step as string)
            } else if (event.type === 'card_progress') {
              const pos = event.position as number
              const card = event.card as BatchCardPosition
              // Track in local accumulator (used when building review cards)
              cardProgressAccum.set(pos, card)
              // Also update UI slots state for the live progress grid
              setSlots(prev => {
                const next = [...prev]
                next[pos] = { status: 'done', card }
                return next
              })
            } else if (event.type === 'error' && event.reason === 'no_grid_detected') {
              setNoGridError(true)
              setStage('capture')
              setSlots(Array.from({ length: 9 }, () => ({ status: 'idle', card: null })))
              resolved = true
            } else if (event.status === 'completed') {
              processedCards = (event.processedCards as ProcessedBatchCard[]) ?? []
              const cardMap = new Map<number, ProcessedBatchCard>()
              for (const pc of processedCards) cardMap.set(pc.position, pc)

              // Build review cards from the LOCAL accumulator (not stale state)
              const cards: ReviewCard[] = Array.from({ length: 9 }, (_, i) => {
                const batchCard = cardProgressAccum.get(i)
                const pc = cardMap.get(i)
                if (batchCard) {
                  return reviewCardFromBatch(batchCard, pc?.card_id ?? null)
                }
                const empty = emptyReviewCard(i)
                if (pc) empty.card_id = pc.card_id
                return empty
              })

              setReviewCards(cards)
              setStage('review')
              resolved = true
            } else if (event.status === 'failed') {
              throw new Error((event.error as string) || 'Sheet processing failed')
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr
            }
          }
        }
      }

      // If the completed event didn't fire, build review from the local accumulator
      if (!resolved) {
        const fallbackCards: ReviewCard[] = Array.from({ length: 9 }, (_, i) => {
          const batchCard = cardProgressAccum.get(i)
          if (batchCard) return reviewCardFromBatch(batchCard, null)
          return emptyReviewCard(i)
        })
        setReviewCards(fallbackCards)
        setStage('review')
      }
    } catch (err) {
      console.error('Sheet upload error:', err)
      setProcessingStep('')
      setStage('capture')
      setSlots(Array.from({ length: 9 }, () => ({ status: 'idle', card: null })))
      alert((err instanceof Error ? err.message : 'Upload failed') + '. Please try again.')
    }
  }

  // After SSE stream completes, reviewCards may be empty if the completed event
  // built them from stale slots state. Rebuild from current slots if needed.
  const handleReviewStage = () => {
    if (reviewCards.length === 0) {
      const cards: ReviewCard[] = slots.map((slot, i) => {
        if (slot.card) return reviewCardFromBatch(slot.card, null)
        return emptyReviewCard(i)
      })
      setReviewCards(cards)
    }
    setStage('review')
  }

  // ── Review helpers ────────────────────────────────────────────────────────

  const updateReviewCard = (position: number, updates: Partial<ReviewCard>) => {
    setReviewCards(prev =>
      prev.map(c => (c.position === position ? { ...c, ...updates } : c))
    )
  }

  const confirmCard = (position: number) => {
    updateReviewCard(position, { confirmed: true })
  }

  // ── Save all ─────────────────────────────────────────────────────────────

  const saveAll = async () => {
    // All flagged cards must be confirmed before saving
    const unconfirmed = reviewCards.filter(c => c.needs_review && !c.confirmed && c.card_id)
    if (unconfirmed.length > 0) {
      alert(`Please review and confirm ${unconfirmed.length} flagged card(s) before saving.`)
      return
    }

    setStage('saving')
    setSaveError(null)

    try {
      const cardsToSave = reviewCards.filter(c => c.card_id)

      if (cardsToSave.length === 0) {
        setSavedCount(0)
        setStage('done')
        return
      }

      const res = await fetch('/api/user-cards/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          cards: cardsToSave.map(c => ({
            position: c.position,
            card_id: c.card_id!,
            quantity: c.quantity,
            condition: c.condition || null,
            notes: c.notes || null,
            is_for_trade: false
          }))
        })
      })

      const result = await res.json() as { success: boolean; inserted: number; errors: string[] }

      if (!result.success) {
        throw new Error(result.errors?.[0] ?? 'Save failed')
      }

      setSavedCount(result.inserted)
      setStage('done')
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed')
      setStage('review')
    }
  }

  const handleDiscard = () => {
    if (stage === 'review') {
      setDiscardConfirm(true)
    } else {
      resetAll()
    }
  }

  const resetAll = () => {
    setStage('capture')
    setSheetPreview(null)
    setSlots(Array.from({ length: 9 }, () => ({ status: 'idle', card: null })))
    setReviewCards([])
    setExpandedSlot(null)
    setDiscardConfirm(false)
    setNoGridError(false)
    setSaveError(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (showCamera) {
    return (
      <SheetCapture
        onCapture={file => { setShowCamera(false); handleFile(file) }}
        onClose={() => setShowCamera(false)}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* ── DONE ── */}
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
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Scan Another Sheet
          </button>
        </div>
      )}

      {/* ── CAPTURE ── */}
      {stage === 'capture' && (
        <div className="space-y-4">
          {noGridError && (
            <div className="p-4 bg-red-900/40 border border-red-500 rounded-xl text-red-200 text-sm">
              No 3×3 grid detected. Make sure the sheet fills the frame and all 9 pockets are visible, then try again.
            </div>
          )}

          {sheetPreview ? (
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={sheetPreview} alt="Sheet preview" className="w-full rounded-xl object-contain max-h-64" />
              <button
                onClick={resetAll}
                className="absolute top-2 right-2 w-8 h-8 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-white/20 rounded-xl p-10 text-center space-y-4">
              <div className="text-white/50 text-sm">
                Photograph a 3×3 binder page with 9 card slots
              </div>

              {/* 3×3 icon hint */}
              <div className="inline-grid grid-cols-3 gap-1 mx-auto opacity-30">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="w-7 h-9 border border-white rounded-sm" />
                ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                <button
                  onClick={() => setShowCamera(true)}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Open Camera
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-5 py-2.5 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors text-sm font-medium"
                >
                  Upload Photo
                </button>
              </div>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />
        </div>
      )}

      {/* ── PROCESSING ── */}
      {stage === 'processing' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-white/70 text-sm">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            <span>{processingStep}</span>
          </div>

          {/* Live 3×3 grid of slot spinners */}
          <div className="grid grid-cols-3 gap-2">
            {slots.map((slot, i) => (
              <SlotCard key={i} position={i} slot={slot} />
            ))}
          </div>
        </div>
      )}

      {/* ── REVIEW ── */}
      {stage === 'review' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Review 9 Cards</h3>
            <span className="text-white/50 text-sm">
              {reviewCards.filter(c => c.needs_review && !c.confirmed).length > 0
                ? `${reviewCards.filter(c => c.needs_review && !c.confirmed).length} need review`
                : 'All clear'}
            </span>
          </div>

          {saveError && (
            <div className="p-3 bg-red-900/40 border border-red-500 rounded-lg text-red-200 text-sm">
              {saveError}
            </div>
          )}

          {/* 3×3 review grid */}
          <div className="grid grid-cols-3 gap-2">
            {reviewCards.map(card => (
              <ReviewSlot
                key={card.position}
                card={card}
                isExpanded={expandedSlot === card.position}
                onToggleExpand={() => setExpandedSlot(prev => prev === card.position ? null : card.position)}
                onChange={updates => updateReviewCard(card.position, updates)}
                onConfirm={() => confirmCard(card.position)}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              onClick={saveAll}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Save {reviewCards.filter(c => c.card_id).length} Card{reviewCards.filter(c => c.card_id).length !== 1 ? 's' : ''}
            </button>
            <button
              onClick={handleDiscard}
              className="flex-1 py-3 bg-white/10 text-white rounded-xl font-semibold hover:bg-white/20 transition-colors"
            >
              Discard All
            </button>
          </div>
        </div>
      )}

      {/* ── SAVING ── */}
      {stage === 'saving' && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/70">Saving cards to your collection...</p>
        </div>
      )}

      {/* ── DISCARD CONFIRM ── */}
      {discardConfirm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4">
            <h3 className="text-white font-bold text-lg">Discard all 9 cards?</h3>
            <p className="text-white/60 text-sm">Any extracted card data will be lost.</p>
            <div className="flex gap-3">
              <button
                onClick={resetAll}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={() => setDiscardConfirm(false)}
                className="flex-1 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SlotCard({ position, slot }: { position: number; slot: SlotState }) {
  const label = POSITION_LABELS[position]
  const card = slot.card?.card

  return (
    <div
      className={`rounded-lg p-2 text-center text-xs transition-all ${
        slot.status === 'done'
          ? 'bg-white/10 border border-white/20'
          : 'bg-white/5 border border-white/10'
      }`}
      style={{ minHeight: 80 }}
    >
      <div className="text-white/40 mb-1">{label}</div>
      {slot.status === 'loading' && (
        <div className="flex items-center justify-center h-10">
          <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {slot.status === 'done' && card && (
        <div className="text-white/80 truncate font-medium" title={card.player_name}>
          {card.player_name ?? '—'}
        </div>
      )}
      {slot.status === 'done' && !card && (
        <div className="text-white/30 italic">Empty</div>
      )}
    </div>
  )
}

interface ReviewSlotProps {
  card: ReviewCard
  isExpanded: boolean
  onToggleExpand: () => void
  onChange: (updates: Partial<ReviewCard>) => void
  onConfirm: () => void
}

function ReviewSlot({ card, isExpanded, onToggleExpand, onChange, onConfirm }: ReviewSlotProps) {
  const label = POSITION_LABELS[card.position]
  const isEmpty = !card.card_id && !card.player_name
  const needsAttention = card.needs_review && !card.confirmed

  return (
    <div
      className={`rounded-lg border transition-all ${
        isEmpty
          ? 'border-white/10 bg-white/5'
          : needsAttention
          ? 'border-amber-500 bg-amber-950/30'
          : 'border-white/20 bg-white/8'
      }`}
    >
      {/* Slot header — tap to expand */}
      <button
        onClick={onToggleExpand}
        className="w-full p-2 text-left"
      >
        <div className="flex items-start justify-between gap-1">
          <div className="min-w-0">
            <div className="text-white/40 text-[10px]">{label}</div>
            {isEmpty ? (
              <div className="text-white/25 text-xs italic">Empty</div>
            ) : (
              <div className="text-white text-xs font-medium truncate">
                {card.player_name || '(unnamed)'}
              </div>
            )}
            {needsAttention && (
              <div className="text-amber-400 text-[10px] font-semibold mt-0.5">Review needed</div>
            )}
          </div>
          {!isEmpty && (
            <svg
              className={`w-3 h-3 text-white/30 shrink-0 mt-0.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </button>

      {/* Expanded inline editor */}
      {isExpanded && !isEmpty && (
        <div className="px-2 pb-3 space-y-2 border-t border-white/10 pt-2">
          <Field
            label="Player"
            value={card.player_name}
            onChange={v => onChange({ player_name: v })}
          />
          <Field
            label="Sport"
            value={card.sport}
            onChange={v => onChange({ sport: v })}
          />
          <Field
            label="Year"
            value={card.year}
            onChange={v => onChange({ year: v })}
          />
          <Field
            label="Brand"
            value={card.brand}
            onChange={v => onChange({ brand: v })}
          />
          <Field
            label="Set"
            value={card.set_name}
            onChange={v => onChange({ set_name: v })}
          />
          <Field
            label="Card #"
            value={card.card_number}
            onChange={v => onChange({ card_number: v })}
          />
          <Field
            label="Team"
            value={card.team}
            onChange={v => onChange({ team: v })}
          />
          <div className="flex gap-3 text-[10px] text-white/60">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={card.rookie}
                onChange={e => onChange({ rookie: e.target.checked })}
                className="w-3 h-3"
              />
              RC
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={card.autographed}
                onChange={e => onChange({ autographed: e.target.checked })}
                className="w-3 h-3"
              />
              Auto
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="checkbox"
                checked={card.patch}
                onChange={e => onChange({ patch: e.target.checked })}
                className="w-3 h-3"
              />
              Patch
            </label>
          </div>
          <Field
            label="Condition"
            value={card.condition}
            onChange={v => onChange({ condition: v })}
          />
          {needsAttention && (
            <button
              onClick={onConfirm}
              className="w-full py-1.5 bg-amber-600 text-white rounded text-xs font-semibold hover:bg-amber-700 transition-colors"
            >
              Confirm Card
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  value,
  onChange
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <div className="text-white/40 text-[9px] uppercase tracking-wide mb-0.5">{label}</div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-white/10 border border-white/15 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
      />
    </div>
  )
}
