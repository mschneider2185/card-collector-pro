'use client'

import { useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { validateQuad } from '@/lib/llm-extraction'
import { sheetImageToCanvas, warpCardToRect, resizeCanvasToDataUrl } from '@/lib/image-processing'
import type { DetectionResult, SheetExtractionResult, BatchCardPosition, ProcessedBatchCard } from '@/types'

export interface BatchScanState {
  phase: 'idle' | 'detecting' | 'warping' | 'extracting' | 'complete' | 'error'
  detectionResult: DetectionResult | null
  croppedImages: (string | null)[]
  extractionResult: SheetExtractionResult | null
  flaggedPositions: number[]
  error: string | null
  /** Processing step description for UI display */
  processingStep: string
  /** Per-slot card progress from SSE stream */
  cardProgress: Map<number, BatchCardPosition>
  /** Processed card IDs from the server */
  processedCards: ProcessedBatchCard[]
  /** Batch ID for this scan */
  batchId: string | null
}

const initialState: BatchScanState = {
  phase: 'idle',
  detectionResult: null,
  croppedImages: [],
  extractionResult: null,
  flaggedPositions: [],
  error: null,
  processingStep: '',
  cardProgress: new Map(),
  processedCards: [],
  batchId: null
}

export function useBatchScan(userId: string) {
  const [state, setState] = useState<BatchScanState>(initialState)
  const abortRef = useRef<AbortController | null>(null)

  const startScan = useCallback(async (sheetFile: File) => {
    abortRef.current?.abort()
    const abort = new AbortController()
    abortRef.current = abort

    setState({
      ...initialState,
      phase: 'detecting',
      processingStep: 'Loading image...'
    })

    try {
      // 1. Load file into full-res canvas (kept for perspective warping later)
      const fileDataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(sheetFile)
      })

      if (abort.signal.aborted) return

      setState(prev => ({ ...prev, processingStep: 'Preparing image...' }))

      // Load full-res canvas first (needed for warp step)
      const fullResCanvas = await sheetImageToCanvas(fileDataUrl)

      // 2. Resize for detection API — max 2000px on longest side.
      // The full-res base64 is typically 5-10MB and exceeds Vercel's 4.5MB
      // Edge body limit. A 2000px image is ~300-600KB base64, well within limits,
      // and GPT-4o with detail:'high' still detects quad corners accurately.
      const MAX_DETECT_PX = 2000
      const scale = Math.min(1, MAX_DETECT_PX / Math.max(fullResCanvas.width, fullResCanvas.height))
      const detectW = Math.round(fullResCanvas.width * scale)
      const detectH = Math.round(fullResCanvas.height * scale)
      const detectCanvas = document.createElement('canvas')
      detectCanvas.width = detectW
      detectCanvas.height = detectH
      const dCtx = detectCanvas.getContext('2d')!
      dCtx.drawImage(fullResCanvas, 0, 0, detectW, detectH)
      const detectDataUrl = detectCanvas.toDataURL('image/jpeg', 0.80)

      setState(prev => ({ ...prev, processingStep: 'Detecting card positions...' }))

      if (abort.signal.aborted) return

      // 3. POST downsized image to /api/ai/detect-sheet
      const detectRes = await fetch('/api/ai/detect-sheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetDataUrl: detectDataUrl }),
        signal: abort.signal
      })

      if (!detectRes.ok) {
        const err = await detectRes.json().catch(() => ({ error: 'Detection failed' }))
        throw new Error((err as { error?: string }).error || `Detection failed: ${detectRes.status}`)
      }

      const detection = (await detectRes.json()) as DetectionResult

      if (!detection.grid_detected) {
        setState(prev => ({
          ...prev,
          phase: 'error',
          detectionResult: detection,
          error: 'No 3x3 grid detected in the image. Make sure the sheet fills the frame with all 9 pockets visible.',
          processingStep: ''
        }))
        return
      }

      setState(prev => ({
        ...prev,
        detectionResult: detection,
        phase: 'warping',
        processingStep: 'Correcting perspective...'
      }))

      if (abort.signal.aborted) return

      // 4. Scale quad coordinates from detection resolution back to full-res,
      //    then validate and warp against the full-res canvas.
      const scaleX = fullResCanvas.width / detectW
      const scaleY = fullResCanvas.height / detectH
      const imgW = fullResCanvas.width
      const imgH = fullResCanvas.height

      const croppedImages: (string | null)[] = new Array(9).fill(null)
      const flaggedPositions: number[] = []

      for (const pos of detection.positions) {
        if (pos.empty) {
          flaggedPositions.push(pos.index)
          continue
        }

        // Scale quad corners to full-res pixel space
        const scaledQuad = pos.quad.map(([x, y]) => [
          Math.round(x * scaleX),
          Math.round(y * scaleY)
        ]) as [[number,number],[number,number],[number,number],[number,number]]

        const isValid = validateQuad(scaledQuad, imgW, imgH)
        if (!isValid) {
          flaggedPositions.push(pos.index)
          continue
        }

        try {
          const warped = warpCardToRect(fullResCanvas, scaledQuad, 300, 420)
          croppedImages[pos.index] = resizeCanvasToDataUrl(warped, 900, 1260, 0.85)
        } catch (warpErr) {
          console.error(`Warp failed for position ${pos.index}:`, warpErr)
          flaggedPositions.push(pos.index)
        }
      }

      setState(prev => ({
        ...prev,
        croppedImages,
        flaggedPositions,
        phase: 'extracting',
        processingStep: 'Uploading sheet...'
      }))

      if (abort.signal.aborted) return

      // 5. Upload sheet to card-uploads and create upload record
      const urlRes = await fetch('/api/uploads/batch-signed-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count: 1, userId }),
        signal: abort.signal
      })
      if (!urlRes.ok) throw new Error('Failed to generate upload URL')

      const { batchId, urls } = (await urlRes.json()) as {
        batchId: string
        urls: Array<{ position: number; path: string; signedUrl: string; token: string }>
      }

      const { path, token } = urls[0]
      const rawExt = sheetFile.name.split('.').pop()?.toLowerCase()
      const fileExt = rawExt && rawExt !== 'undefined' ? rawExt : 'jpg'
      const mimeType =
        sheetFile.type ||
        (fileExt === 'png' ? 'image/png' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg')

      const { error: uploadError } = await supabase.storage
        .from('card-uploads')
        .uploadToSignedUrl(path, token, sheetFile, { contentType: mimeType })
      if (uploadError) throw uploadError

      setState(prev => ({
        ...prev,
        batchId,
        processingStep: 'Extracting card details...'
      }))

      if (abort.signal.aborted) return

      // 6. POST cropped images to /api/ai/process-batch (SSE stream)
      const processRes = await fetch('/api/ai/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          croppedDataUrls: croppedImages,
          batchId,
          userId,
          imagePaths: [path]
        }),
        signal: abort.signal
      })

      if (!processRes.ok || !processRes.body) {
        throw new Error('Failed to start batch extraction')
      }

      // 7. Read SSE stream and update state progressively
      const reader = processRes.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let resolved = false
      const progressMap = new Map<number, BatchCardPosition>()

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
              setState(prev => ({ ...prev, processingStep: event.step as string }))
            } else if (event.type === 'card_progress') {
              const pos = event.position as number
              const card = event.card as BatchCardPosition
              progressMap.set(pos, card)
              setState(prev => ({
                ...prev,
                cardProgress: new Map(progressMap)
              }))
            } else if (event.status === 'completed') {
              const processedCards = (event.processedCards as ProcessedBatchCard[]) ?? []
              const extractionResult = (event.result as SheetExtractionResult) ?? {
                grid_detected: true,
                cards: Array.from(progressMap.values())
              }

              setState(prev => ({
                ...prev,
                phase: 'complete',
                extractionResult,
                processedCards,
                processingStep: '',
                cardProgress: new Map(progressMap)
              }))
              resolved = true
            } else if (event.status === 'failed') {
              throw new Error((event.error as string) || 'Batch extraction failed')
            }
          } catch (parseErr) {
            if (
              parseErr instanceof Error &&
              parseErr.message !== 'Unexpected end of JSON input'
            ) {
              throw parseErr
            }
          }
        }
      }

      // Fallback if stream ended without 'completed' event
      if (!resolved) {
        setState(prev => ({
          ...prev,
          phase: 'complete',
          extractionResult: {
            grid_detected: true,
            cards: Array.from(progressMap.values())
          },
          processingStep: '',
          cardProgress: new Map(progressMap)
        }))
      }
    } catch (err) {
      if (abort.signal.aborted) return
      console.error('Batch scan error:', err)
      setState(prev => ({
        ...prev,
        phase: 'error',
        error: err instanceof Error ? err.message : 'Batch scan failed',
        processingStep: ''
      }))
    }
  }, [userId])

  const rescanPosition = useCallback(
    async (position: number, croppedDataUrl: string) => {
      setState(prev => {
        const next = [...prev.croppedImages]
        next[position] = croppedDataUrl
        return { ...prev, croppedImages: next }
      })
    },
    []
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    setState(initialState)
  }, [])

  return { state, startScan, rescanPosition, reset }
}
