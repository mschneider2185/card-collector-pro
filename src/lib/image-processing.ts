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
export async function generateImageEmbeddings(imageUrl: string): Promise<number[]> {
  // Mock implementation - would integrate with actual embedding service
  return new Array(512).fill(0).map(() => Math.random())
}

/**
 * Detect card orientation and suggest rotation
 */
export function detectCardOrientation(imageData: ImageData): {
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
export function extractColorPalette(imageUrl: string): Promise<string[]> {
  // Mock implementation - would analyze dominant colors
  return Promise.resolve(['#1f2937', '#3b82f6', '#ef4444', '#10b981'])
}