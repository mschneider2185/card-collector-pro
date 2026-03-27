'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User } from '@/types'
import AvatarUploader from '@/components/AvatarUploader'
import AuthButton from '@/components/AuthButton'

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  // Form state
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  // Load current user data once auth state is ready
  useEffect(() => {
    const loadUser = async (sessionUser: { id: string; email?: string } | null) => {
      if (!sessionUser) {
        setLoading(false)
        return
      }

      try {
        setAuthUser(sessionUser)

        // Get user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .single()

        if (profileError) {
          console.error('Error loading user profile:', profileError)
          // Create user profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({ id: sessionUser.id })
            .select()
            .single()

          if (createError) {
            console.error('Error creating user profile:', createError)
            alert('Error loading user profile')
            return
          }

          setUser(newProfile)
          setUsername(newProfile.username || '')
          setAvatarUrl(newProfile.avatar_url)
        } else {
          setUser(userProfile)
          setUsername(userProfile.username || '')
          setAvatarUrl(userProfile.avatar_url)
        }
      } catch (error) {
        console.error('Error loading user:', error)
        alert('Error loading user data')
      } finally {
        setLoading(false)
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        loadUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Validate username
  const validateUsername = (username: string): string | null => {
    if (username.length < 3 || username.length > 20) {
      return 'Username must be 3-20 characters long'
    }
    
    if (!/^[a-z_]+$/.test(username)) {
      return 'Username can only contain lowercase letters and underscores'
    }
    
    return null
  }

  // Save profile changes
  const handleSave = async () => {
    if (!user || !authUser) return

    // Validate username
    const usernameError = validateUsername(username)
    if (usernameError) {
      alert(usernameError)
      return
    }

    try {
      setSaving(true)

      const { error } = await supabase
        .from('users')
        .update({
          username: username.trim(),
          avatar_url: avatarUrl
        })
        .eq('id', authUser.id)

      if (error) throw error

      // Update local state
      setUser({
        ...user,
        username: username.trim(),
        avatar_url: avatarUrl
      })

      alert('Profile updated successfully!')
    } catch (error) {
      console.error('Error updating profile:', error)
      alert('Error updating profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Handle avatar upload completion
  const handleAvatarUpload = async (url: string) => {
    setAvatarUrl(url)
    
    // Update the user profile in the database immediately
    if (authUser) {
      try {
        await supabase
          .from('users')
          .update({ avatar_url: url })
          .eq('id', authUser.id)
        
        // Update local state
        setUser(prev => prev ? { ...prev, avatar_url: url } : null)
      } catch (error) {
        console.error('Error updating avatar URL:', error)
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Loading...</div>
      </div>
    )
  }

  if (!user || !authUser) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--color-bg)' }}>
        <div className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Please sign in to access settings</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 h-14"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <h1
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Settings
        </h1>
        <AuthButton />
      </header>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid gap-5 md:grid-cols-2">
          {/* Profile Section */}
          <div className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <h2 className="text-sm font-semibold mb-5 uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>Profile</h2>

            <div className="space-y-5">
              {/* Avatar Section */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Profile picture
                </label>
                <AvatarUploader
                  userId={authUser.id}
                  currentAvatarUrl={avatarUrl}
                  onUploadComplete={handleAvatarUpload}
                />
              </div>

              {/* Username Section */}
              <div>
                <label htmlFor="username" className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full px-3 py-2 text-sm focus:outline-none"
                  style={{
                    background: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '2px',
                    color: 'var(--color-text)',
                  }}
                />
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  3-20 characters, lowercase letters and underscores only
                </p>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
              >
                {saving ? 'Saving...' : 'Save profile'}
              </button>
            </div>
          </div>

          {/* Account Section */}
          <div className="p-6" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
            <h2 className="text-sm font-semibold mb-5 uppercase tracking-widest" style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.08em' }}>Account</h2>

            <div className="space-y-4">
              {/* Email Display */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Email
                </label>
                <div className="px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px', color: 'var(--color-text-muted)' }}>
                  {authUser?.email || 'No email'}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Email cannot be changed here
                </p>
              </div>

              {/* Account Created */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Member since
                </label>
                <div className="px-3 py-2 text-sm" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>

              {/* User ID */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  User ID
                </label>
                <div className="px-3 py-2 text-xs break-all" style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {user.id}
                </div>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  For support purposes only
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}