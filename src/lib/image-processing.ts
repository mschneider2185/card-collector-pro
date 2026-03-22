export interface ImagePreprocessingResult {
  processedImageUrl: string
  originalDimensions: { width: number; height: number }
  processedDimensions: { width: number; height: number }
  operations: string[]
  enhancementDetails?: {
    contrast: number
    brightness: number
    sharpness: number
    rotationDegrees: number
  }
}

/**
 * Preprocess image for better OCR accuracy
 * Uses canvas manipulation to enhance image quality
 */
export async function preprocessImage(imageUrl: string): Promise<ImagePreprocessingResult> {
  try {
    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      // Server-side fallback - just return original URL
      return {
        processedImageUrl: imageUrl,
        originalDimensions: { width: 800, height: 600 },
        processedDimensions: { width: 800, height: 600 },
        operations: ['server-side-fallback']
      }
    }

    // Download the image
    const response = await fetch(imageUrl)
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`)
    }
    
    const blob = await response.blob()
    const img = new Image()
    
    return new Promise((resolve) => {
      img.onload = async () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          // Fallback if canvas not available
          resolve({
            processedImageUrl: imageUrl,
            originalDimensions: { width: img.width, height: img.height },
            processedDimensions: { width: img.width, height: img.height },
            operations: ['no-processing-available']
          })
          return
        }

        // Set optimal size for OCR (larger images work better)
        const targetWidth = Math.max(1200, img.width)
        const targetHeight = Math.max(800, img.height)
        const scale = Math.min(targetWidth / img.width, targetHeight / img.height)
        
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        
        // Apply image enhancements for better OCR
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        
        // Draw the base image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        
        // Get image data for processing
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Enhance contrast and brightness for better text recognition
        const contrastFactor = 1.3 // Increase contrast
        const brightnessFactor = 20 // Slight brightness boost
        
        for (let i = 0; i < data.length; i += 4) {
          // Apply contrast and brightness to RGB channels
          data[i] = Math.min(255, Math.max(0, (data[i] - 128) * contrastFactor + 128 + brightnessFactor))     // Red
          data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * contrastFactor + 128 + brightnessFactor)) // Green
          data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * contrastFactor + 128 + brightnessFactor)) // Blue
          // Alpha channel stays the same
        }
        
        // Put the enhanced image data back
        ctx.putImageData(imageData, 0, 0)
        
        // Convert to blob and create object URL
        canvas.toBlob((processedBlob) => {
          if (processedBlob) {
            const processedUrl = URL.createObjectURL(processedBlob)
            resolve({
              processedImageUrl: processedUrl,
              originalDimensions: { width: img.width, height: img.height },
              processedDimensions: { width: canvas.width, height: canvas.height },
              operations: ['resize', 'contrast-enhancement', 'brightness-adjustment'],
              enhancementDetails: {
                contrast: contrastFactor,
                brightness: brightnessFactor,
                sharpness: 1.0,
                rotationDegrees: 0
              }
            })
          } else {
            // Fallback if blob creation fails
            resolve({
              processedImageUrl: imageUrl,
              originalDimensions: { width: img.width, height: img.height },
              processedDimensions: { width: img.width, height: img.height },
              operations: ['processing-failed-fallback']
            })
          }
        }, 'image/jpeg', 0.95)
      }
      
      img.onerror = () => {
        // Fallback if image loading fails
        resolve({
          processedImageUrl: imageUrl,
          originalDimensions: { width: 800, height: 600 },
          processedDimensions: { width: 800, height: 600 },
          operations: ['image-load-failed-fallback']
        })
      }
      
      img.src = URL.createObjectURL(blob)
    })
  } catch (error) {
    console.error('Image preprocessing error:', error)
    // Return original image if preprocessing fails
    return {
      processedImageUrl: imageUrl,
      originalDimensions: { width: 800, height: 600 },
      processedDimensions: { width: 800, height: 600 },
      operations: ['preprocessing-error-fallback']
    }
  }
}

/**
 * Generate vector embeddings for image similarity search
 * This would integrate with services like OpenAI CLIP or similar
 */
export async function generateImageEmbeddings(_imageUrl: string): Promise<number[]> {
  // Mock implementation - would integrate with actual embedding service
  return new Array(512).fill(0).map(() => Math.random())
}

/**
 * Detect card orientation and suggest rotation
 */
export function detectCardOrientation(_imageData: ImageData): {
  suggestedRotation: number
  confidence: number
  isPortrait: boolean
} {
  // Mock implementation
  return {
    suggestedRotation: 0,
    confidence: 0.9,
    isPortrait: true
  }
}

/**
 * Extract color palette from card for visual matching
 */
export function extractColorPalette(_imageUrl: string): Promise<string[]> {
  // Mock implementation - would analyze dominant colors
  return Promise.resolve(['#1f2937', '#3b82f6', '#ef4444', '#10b981'])
}

// ────────────────────────────────────────────────────────────────────────────
// Perspective correction for 3×3 sheet scanning pipeline
// ────────────────────────────────────────────────────────────────────────────

/**
 * Load a data URL into an HTMLCanvasElement.
 */
export function sheetImageToCanvas(dataUrl: string): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0)
      resolve(canvas)
    }
    img.onerror = () => reject(new Error('Failed to load sheet image'))
    img.src = dataUrl
  })
}

/**
 * Perspective-warp a quadrilateral region from sourceCanvas into a clean
 * rectangular card image using Canvas 2D and manual bilinear sampling.
 *
 * @param sourceCanvas  The full sheet image loaded into a canvas
 * @param quad          4 corner points [TL, TR, BR, BL] in source pixel coords
 * @param outputWidth   Desired output width  (default 300)
 * @param outputHeight  Desired output height (default 420)
 */
export function warpCardToRect(
  sourceCanvas: HTMLCanvasElement,
  quad: [[number, number], [number, number], [number, number], [number, number]],
  outputWidth: number = 300,
  outputHeight: number = 420
): HTMLCanvasElement {
  const outCanvas = document.createElement('canvas')
  outCanvas.width = outputWidth
  outCanvas.height = outputHeight
  const outCtx = outCanvas.getContext('2d')!

  const srcCtx = sourceCanvas.getContext('2d')!
  const srcData = srcCtx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height)
  const srcPixels = srcData.data
  const srcW = sourceCanvas.width
  const srcH = sourceCanvas.height

  const outImageData = outCtx.createImageData(outputWidth, outputHeight)
  const outPixels = outImageData.data

  // Compute the INVERSE homography: maps destination coords -> source coords
  // We need: for each (dx, dy) in output, find (sx, sy) in source
  // So we compute homography from destination rect to source quad
  const dstCorners: [[number, number], [number, number], [number, number], [number, number]] = [
    [0, 0],
    [outputWidth, 0],
    [outputWidth, outputHeight],
    [0, outputHeight]
  ]

  // Compute homography: dst -> src
  // We reuse computeHomography but swap the roles: map dst corners to src quad
  const h = computeHomographyGeneral(dstCorners, quad)

  // For each output pixel, find the source coordinate and bilinear sample
  for (let dy = 0; dy < outputHeight; dy++) {
    for (let dx = 0; dx < outputWidth; dx++) {
      // Apply homography: [sx, sy, sw] = H * [dx, dy, 1]
      const sw = h[6] * dx + h[7] * dy + 1
      const sx = (h[0] * dx + h[1] * dy + h[2]) / sw
      const sy = (h[3] * dx + h[4] * dy + h[5]) / sw

      // Bilinear interpolation
      const outIdx = (dy * outputWidth + dx) * 4

      if (sx < 0 || sx >= srcW - 1 || sy < 0 || sy >= srcH - 1) {
        // Out of bounds — black
        outPixels[outIdx] = 0
        outPixels[outIdx + 1] = 0
        outPixels[outIdx + 2] = 0
        outPixels[outIdx + 3] = 255
        continue
      }

      const x0 = Math.floor(sx)
      const y0 = Math.floor(sy)
      const fx = sx - x0
      const fy = sy - y0

      const i00 = (y0 * srcW + x0) * 4
      const i10 = (y0 * srcW + x0 + 1) * 4
      const i01 = ((y0 + 1) * srcW + x0) * 4
      const i11 = ((y0 + 1) * srcW + x0 + 1) * 4

      for (let c = 0; c < 4; c++) {
        const v =
          srcPixels[i00 + c] * (1 - fx) * (1 - fy) +
          srcPixels[i10 + c] * fx * (1 - fy) +
          srcPixels[i01 + c] * (1 - fx) * fy +
          srcPixels[i11 + c] * fx * fy
        outPixels[outIdx + c] = Math.round(v)
      }
    }
  }

  outCtx.putImageData(outImageData, 0, 0)
  return outCanvas
}

/**
 * General homography computation: maps 4 source points to 4 destination points.
 * Returns [a,b,c,d,e,f,g,h] where the 3×3 matrix is [[a,b,c],[d,e,f],[g,h,1]].
 */
function computeHomographyGeneral(
  src: [[number, number], [number, number], [number, number], [number, number]],
  dst: [[number, number], [number, number], [number, number], [number, number]]
): number[] {
  const A: number[][] = []
  const b_vec: number[] = []

  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i]
    const [X, Y] = dst[i]

    A.push([x, y, 1, 0, 0, 0, -X * x, -X * y])
    b_vec.push(X)

    A.push([0, 0, 0, x, y, 1, -Y * x, -Y * y])
    b_vec.push(Y)
  }

  const n = 8
  const augmented = A.map((row, i) => [...row, b_vec[i]])

  for (let col = 0; col < n; col++) {
    let maxVal = Math.abs(augmented[col][col])
    let maxRow = col
    for (let row = col + 1; row < n; row++) {
      const v = Math.abs(augmented[row][col])
      if (v > maxVal) {
        maxVal = v
        maxRow = row
      }
    }
    if (maxRow !== col) {
      const tmp = augmented[col]
      augmented[col] = augmented[maxRow]
      augmented[maxRow] = tmp
    }

    const pivot = augmented[col][col]
    if (Math.abs(pivot) < 1e-12) {
      return [1, 0, 0, 0, 1, 0, 0, 0]
    }

    for (let row = col + 1; row < n; row++) {
      const factor = augmented[row][col] / pivot
      for (let j = col; j <= n; j++) {
        augmented[row][j] -= factor * augmented[col][j]
      }
    }
  }

  const h = new Array(n).fill(0)
  for (let i = n - 1; i >= 0; i--) {
    let sum = augmented[i][n]
    for (let j = i + 1; j < n; j++) {
      sum -= augmented[i][j] * h[j]
    }
    h[i] = sum / augmented[i][i]
  }

  return h
}

/**
 * Resize a canvas and return a JPEG data URL.
 */
export function resizeCanvasToDataUrl(
  canvas: HTMLCanvasElement,
  maxWidth: number = 900,
  maxHeight: number = 1260,
  quality: number = 0.85
): string {
  const scale = Math.min(1, maxWidth / canvas.width, maxHeight / canvas.height)
  if (scale >= 1) {
    return canvas.toDataURL('image/jpeg', quality)
  }

  const outCanvas = document.createElement('canvas')
  outCanvas.width = Math.round(canvas.width * scale)
  outCanvas.height = Math.round(canvas.height * scale)
  const ctx = outCanvas.getContext('2d')!
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, outCanvas.width, outCanvas.height)
  return outCanvas.toDataURL('image/jpeg', quality)
}