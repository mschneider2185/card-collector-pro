'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AvatarUploaderProps {
  userId: string
  currentAvatarUrl?: string | null
  onUploadComplete: (url: string) => void
}

export default function AvatarUploader({ 
  userId, 
  currentAvatarUrl, 
  onUploadComplete 
}: AvatarUploaderProps) {
  const [uploading, setUploading] = useState(false)

  const uploadAvatar = async (file: File) => {
    try {
      setUploading(true)

      // Upload to avatars bucket with upsert: true
      const fileName = `${userId}.jpg`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          upsert: true,
          contentType: 'image/jpeg'
        })

      if (error) {
        throw error
      }

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      onUploadComplete(publicUrl)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Error uploading avatar. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Basic file validation
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert('Image must be less than 5MB')
      return
    }

    uploadAvatar(file)
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar Preview */}
      <div
        className="w-14 h-14 overflow-hidden flex items-center justify-center"
        style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
      >
        {currentAvatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={currentAvatarUrl}
            alt="Avatar"
            className="w-full h-full object-cover"
          />
        ) : (
          <svg className="w-6 h-6" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )}
      </div>

      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          disabled={uploading}
          className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <button
          type="button"
          disabled={uploading}
          className="px-4 py-2 text-sm font-medium transition-opacity hover:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', borderRadius: '2px' }}
        >
          {uploading ? 'Uploading...' : 'Change photo'}
        </button>
      </div>
    </div>
  )
}