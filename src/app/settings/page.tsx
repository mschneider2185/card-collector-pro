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

  // Load current user data
  useEffect(() => {
    const loadUser = async () => {
      try {
        // Get authenticated user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError
        
        if (!authUser) {
          alert('Please sign in to access settings')
          return
        }

        setAuthUser(authUser)

        // Get user profile from database
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          console.error('Error loading user profile:', profileError)
          // Create user profile if it doesn't exist
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({ id: authUser.id })
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

    loadUser()
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4 flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-4 flex items-center justify-center">
        <div className="text-white text-lg">Please sign in to access settings</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Header */}
      <header className="relative bg-white/10 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/" className="flex items-center space-x-2 text-purple-200 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Home</span>
              </Link>
              <h1 className="text-2xl font-bold text-white">
                Settings
              </h1>
            </div>
            <AuthButton />
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
            <p className="text-purple-200">Manage your account and profile settings</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">Profile</h2>
              
              <div className="space-y-6">
                {/* Avatar Section */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-3">
                    Profile Picture
                  </label>
                  <AvatarUploader
                    userId={authUser.id}
                    currentAvatarUrl={avatarUrl}
                    onUploadComplete={handleAvatarUpload}
                  />
                </div>

                {/* Username Section */}
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-purple-200 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-purple-300">
                    3-20 characters, lowercase letters and underscores only
                  </p>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </div>

            {/* Account Section */}
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-6">Account</h2>
              
              <div className="space-y-4">
                {/* Email Display */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Email
                  </label>
                  <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70">
                    {authUser?.email || 'No email'}
                  </div>
                  <p className="mt-1 text-xs text-purple-300">
                    Email cannot be changed from this interface
                  </p>
                </div>

                {/* Account Created */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    Member Since
                  </label>
                  <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70">
                    {new Date(user.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* User ID (for debugging/support) */}
                <div>
                  <label className="block text-sm font-medium text-purple-200 mb-2">
                    User ID
                  </label>
                  <div className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white/70 font-mono text-xs break-all">
                    {user.id}
                  </div>
                  <p className="mt-1 text-xs text-purple-300">
                    For support purposes only
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <Link
              href="/"
              className="inline-flex items-center text-purple-200 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}