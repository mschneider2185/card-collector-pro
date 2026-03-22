'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface SheetCaptureProps {
  onCapture: (file: File) => void
  onClose: () => void
}

/**
 * Camera capture component for a 3×3 binder page / sheet of 9 cards.
 * Renders a 3×3 grid overlay with corner anchors so the user can align the sheet.
 */
export default function SheetCapture({ onCapture, onClose }: SheetCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const setStream = useState<MediaStream | null>(null)[1]
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')

  const startCamera = useCallback(async () => {
    // Stop previous stream if any
    setStream(prev => {
      if (prev) prev.getTracks().forEach(t => t.stop())
      return null
    })

    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch {
      setError('Unable to access camera. Please check permissions and try again.')
    }
  }, [facingMode])

  useEffect(() => {
    startCamera()
    return () => {
      setStream(prev => {
        if (prev) prev.getTracks().forEach(t => t.stop())
        return null
      })
    }
  }, [startCamera])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    setIsCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) { setIsCapturing(false); return }

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    canvas.toBlob(blob => {
      if (blob) {
        onCapture(new File([blob], `sheet_${Date.now()}.jpg`, { type: 'image/jpeg' }))
      }
      setIsCapturing(false)
    }, 'image/jpeg', 0.92)
  }

  const switchCamera = () => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black text-white p-4 flex justify-between items-center shrink-0">
        <button onClick={onClose} className="text-white hover:text-gray-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <h2 className="text-lg font-semibold">Scan Sheet (3×3)</h2>
        <button onClick={switchCamera} className="text-white hover:text-gray-300 transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Camera View */}
      <div className="flex-1 relative bg-black overflow-hidden">
        {error ? (
          <div className="flex items-center justify-center h-full text-white text-center p-8">
            <div>
              <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <p className="text-lg font-semibold mb-2">Camera Error</p>
              <p className="text-gray-300 mb-4">{error}</p>
              <button
                onClick={startCamera}
                className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80"
                style={{ background: '#C9A84C', color: '#0D0D0D', borderRadius: '4px' }}
              >
                Try Again
              </button>
            </div>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* 3×3 Grid Overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Outer binder-page frame — sized for a standard 9-pocket page */}
              <div className="relative" style={{ width: 'min(85vw, 85vh * 0.77)', aspectRatio: '3/3.9' }}>
                {/* Semi-dark border outside the grid */}
                <div className="absolute inset-0 border-2 border-white rounded-sm opacity-70" />

                {/* Corner anchors */}
                {[
                  'top-0 left-0',
                  'top-0 right-0',
                  'bottom-0 left-0',
                  'bottom-0 right-0'
                ].map(pos => (
                  <div
                    key={pos}
                    className={`absolute ${pos} w-5 h-5 border-white`}
                    style={{
                      borderTopWidth: pos.includes('top') ? 3 : 0,
                      borderBottomWidth: pos.includes('bottom') ? 3 : 0,
                      borderLeftWidth: pos.includes('left') ? 3 : 0,
                      borderRightWidth: pos.includes('right') ? 3 : 0
                    }}
                  />
                ))}

                {/* 3×3 interior grid lines */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div
                      key={i}
                      className="border border-white border-opacity-40"
                    />
                  ))}
                </div>

                {/* Label */}
                <div className="absolute -bottom-8 left-0 right-0 text-center">
                  <p className="text-white text-xs font-medium opacity-90 drop-shadow">
                    Align all 9 cards within the guide
                  </p>
                </div>
              </div>
            </div>

            {/* Camera Controls */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-6">
              <div className="flex justify-center items-center space-x-8">
                <button
                  onClick={onClose}
                  className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <button
                  onClick={capturePhoto}
                  disabled={isCapturing}
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  {isCapturing ? (
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="w-12 h-12 bg-white rounded-full border-4 border-gray-300" />
                  )}
                </button>

                <button
                  onClick={switchCamera}
                  className="w-12 h-12 bg-gray-600 rounded-full flex items-center justify-center text-white hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="text-center mt-4">
                <p className="text-white text-sm">
                  {isCapturing ? 'Processing...' : 'Tap the white button to capture'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
