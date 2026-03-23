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
      //    GPT-4o sometimes returns normalized (0-1), percentage (0-100),
      //    or pixel coords relative to the detection image. We auto-detect.
      const imgW = fullResCanvas.width
      const imgH = fullResCanvas.height

      const croppedImages: (string | null)[] = new Array(9).fill(null)
      const flaggedPositions: number[] = []

      // Determine coordinate system: check if ALL coords are < 1.1 (normalized)
      // or < 110 (percentage) vs actual pixel values
      const allCoords = detection.positions
        .filter(p => !p.empty)
        .flatMap(p => p.quad.flat())
      const maxCoord = allCoords.length > 0 ? Math.max(...allCoords) : 0

      let coordScaleX: number
      let coordScaleY: number
      if (maxCoord <= 1.1) {
        // Normalized 0–1 range → scale to full-res
        coordScaleX = imgW
        coordScaleY = imgH
        console.log('[batchScan] Detected NORMALIZED coordinates (0-1), scaling to full-res')
      } else if (maxCoord <= 110) {
        // Percentage 0–100 range → scale to full-res
        coordScaleX = imgW / 100
        coordScaleY = imgH / 100
        console.log('[batchScan] Detected PERCENTAGE coordinates (0-100), scaling to full-res')
      } else {
        // Pixel coordinates relative to the detect image → scale to full-res
        coordScaleX = imgW / detectW
        coordScaleY = imgH / detectH
        console.log(`[batchScan] Detected PIXEL coordinates, scaling ${detectW}→${imgW}`)
      }

      let quadSuccessCount = 0
      for (const pos of detection.positions) {
        if (pos.empty) {
          flaggedPositions.push(pos.index)
          continue
        }

        const scaledQuad = pos.quad.map(([x, y]) => [
          Math.round(x * coordScaleX),
          Math.round(y * coordScaleY)
        ]) as [[number,number],[number,number],[number,number],[number,number]]

        const isValid = validateQuad(scaledQuad, imgW, imgH)
        if (!isValid) {
          console.warn(`[batchScan] Quad ${pos.index} failed validation:`, scaledQuad)
          flaggedPositions.push(pos.index)
          continue
        }

        try {
          const warped = warpCardToRect(fullResCanvas, scaledQuad, 300, 420)
          croppedImages[pos.index] = resizeCanvasToDataUrl(warped, 900, 1260, 0.85)
          quadSuccessCount++
        } catch (warpErr) {
          console.error(`Warp failed for position ${pos.index}:`, warpErr)
          flaggedPositions.push(pos.index)
        }
      }

      // ── FALLBACK: if fewer than 5 quads validated, use border-aware
      //    equal-thirds cropping. Standard 9-pocket pages have equal-sized
      //    pockets — the problem was never the proportions, it was finding
      //    the outer border of the binder page.
      //
      //    Strategy: detect the outer binder border by scanning inward from
      //    each edge until we hit card content (bright pixels), then divide
      //    the inner rectangle into equal thirds.
      if (quadSuccessCount < 5) {
        console.warn(`[batchScan] Only ${quadSuccessCount}/9 quads valid — falling back to border-aware equal thirds`)

        // Detect outer border by scanning for the content rectangle
        const borderCtx = fullResCanvas.getContext('2d')!
        const borderData = borderCtx.getImageData(0, 0, imgW, imgH)
        const bpx = borderData.data

        // Find where card content starts from each edge
        // Cards are colorful (high variance/saturation) vs white/gray binder border
        function scanForContent(
          axis: 'x' | 'y',
          from: number,
          to: number,
          step: number
        ): number {
          const threshold = 180 // luminance below this = likely card content, not white border
          const sampleCount = 20
          for (let pos = from; pos !== to; pos += step) {
            let darkCount = 0
            for (let s = 0; s < sampleCount; s++) {
              let px: number, py: number
              if (axis === 'x') {
                px = pos
                py = Math.round((s + 0.5) * imgH / sampleCount)
              } else {
                px = Math.round((s + 0.5) * imgW / sampleCount)
                py = pos
              }
              const idx = (py * imgW + px) * 4
              const lum = bpx[idx] * 0.299 + bpx[idx+1] * 0.587 + bpx[idx+2] * 0.114
              if (lum < threshold) darkCount++
            }
            // If >40% of sample points are dark, we've hit card content
            if (darkCount > sampleCount * 0.4) return pos
          }
          return from // couldn't find border, use original edge
        }

        const contentLeft   = scanForContent('x', 0, Math.round(imgW * 0.15), 1)
        const contentRight  = scanForContent('x', imgW - 1, Math.round(imgW * 0.85), -1)
        const contentTop    = scanForContent('y', 0, Math.round(imgH * 0.15), 1)
        const contentBottom = scanForContent('y', imgH - 1, Math.round(imgH * 0.85), -1)

        const innerW = contentRight - contentLeft
        const innerH = contentBottom - contentTop

        console.log(`[batchScan] Content rect: (${contentLeft},${contentTop}) → (${contentRight},${contentBottom}) = ${innerW}×${innerH}`)

        // Divide inner rectangle into equal thirds with small gutter inset
        const gutterW = Math.round(innerW * 0.008) // ~0.8% gutter between cells
        const gutterH = Math.round(innerH * 0.008)
        const cellW = Math.round(innerW / 3)
        const cellH = Math.round(innerH / 3)

        flaggedPositions.length = 0
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 3; col++) {
            const idx = row * 3 + col
            // Each cell starts at content edge + col*cellW, with gutter inset
            const x = contentLeft + col * cellW + (col > 0 ? gutterW : 0)
            const y = contentTop  + row * cellH + (row > 0 ? gutterH : 0)
            const w = cellW - (col < 2 ? gutterW : 0)
            const h = cellH - (row < 2 ? gutterH : 0)

            const cropCanvas = document.createElement('canvas')
            const outScale = Math.min(1, 900 / w)
            cropCanvas.width = Math.round(w * outScale)
            cropCanvas.height = Math.round(h * outScale)
            const ctx = cropCanvas.getContext('2d')!
            ctx.drawImage(fullResCanvas, x, y, w, h, 0, 0, cropCanvas.width, cropCanvas.height)
            croppedImages[idx] = cropCanvas.toDataURL('image/jpeg', 0.85)
          }
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
