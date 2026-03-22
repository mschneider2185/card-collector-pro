'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { User as UserProfile } from '@/types'

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    setMounted(true)
    const getUser = async () => {
      // getSession reads from local cookie — fast, no network round-trip
      const { data: { session } } = await supabase.auth.getSession()
      const user = session?.user ?? null
      setUser(user)
      
      // If user is authenticated, fetch their profile
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        setUserProfile(profile)
      }
      
      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          // Fetch user profile when auth state changes
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
          
          setUserProfile(profile)
          setShowAuthModal(false)
        } else {
          setUserProfile(null)
        }
        
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // Click outside handler for dropdown
  useEffect(() => {
    if (!showDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      const dropdownElement = document.querySelector('[data-dropdown]')
      
      // Only close if click is outside the dropdown
      if (dropdownElement && !dropdownElement.contains(target)) {
        setShowDropdown(false)
      }
    }

    // Add event listener with a small delay to prevent immediate closing
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
    }
  }, [showDropdown])

  const handleGoogleSignIn = async () => {
    setAuthLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    })
    if (error) {
      console.error('Error signing in with Google:', error)
      alert('Error signing in with Google. Please try again.')
    }
    setAuthLoading(false)
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)

    try {
      if (authMode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        if (error) {
          console.error('Sign in error:', error)
          alert(`Sign in failed: ${error.message}`)
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        
        if (error) {
          console.error('Sign up error:', error)
          alert(`Sign up failed: ${error.message}`)
        } else if (data.user) {
          // Manually create user profile if trigger fails
          try {
            const { error: profileError } = await supabase
              .from('users')
              .insert({ id: data.user.id })
            
            if (profileError) {
              console.warn('Failed to create user profile automatically:', profileError)
              // Don't fail the signup if profile creation fails
            }
          } catch (profileError) {
            console.warn('Profile creation error:', profileError)
          }
          
          alert('Check your email for the confirmation link!')
        }
      }
    } catch (error) {
      console.error('Authentication error:', error)
      alert('Authentication failed. Please check your connection and try again.')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        alert('Error signing out. Please try again.')
      } else {
        setShowDropdown(false)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      alert('Error signing out. Please try again.')
    }
  }

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDropdown(prev => !prev)
  }

  if (loading) {
    return (
      <div className="h-8 w-20 animate-pulse" style={{ background: 'var(--color-border)', borderRadius: '2px' }}></div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="relative" style={{ zIndex: 9998 }}>
          <button
            onClick={toggleDropdown}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity cursor-pointer"
          >
            <div className="w-8 h-8 flex items-center justify-center cursor-pointer overflow-hidden" style={{ background: 'var(--color-accent)', borderRadius: '2px' }}>
              {userProfile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={userProfile.avatar_url} 
                  alt="Avatar" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-[#0D0D0D] text-sm font-semibold">
                  {user.email?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <span className="text-xs hidden sm:block" style={{ color: 'var(--color-text-secondary)' }}>
              {user.email}
            </span>
            <svg 
              className={`w-4 h-4 text-gray-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {showDropdown && (
            <div
              className="absolute right-0 mt-2 w-48 py-1"
              style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
              data-dropdown
              style={{ 
                zIndex: 9999,
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: '0.5rem'
              }}
            >
              <button
                onClick={() => {
                  console.log('Settings clicked!')
                  setShowDropdown(false)
                  window.location.href = '/settings'
                }}
                className="flex items-center w-full px-4 py-2 text-xs text-left cursor-pointer transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg className="w-3.5 h-3.5 mr-3" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </button>
              
              <button
                onClick={() => {
                  console.log('Collection clicked!')
                  setShowDropdown(false)
                  window.location.href = '/collection'
                }}
                className="flex items-center w-full px-4 py-2 text-xs text-left cursor-pointer transition-colors"
                style={{ color: 'var(--color-text-secondary)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg className="w-3.5 h-3.5 mr-3" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
                My Collection
              </button>
              
              <div className="my-1" style={{ borderTop: '1px solid var(--color-border)' }}></div>

              <button
                onClick={() => {
                  handleSignOut()
                }}
                className="flex items-center w-full px-4 py-2 text-xs text-left cursor-pointer transition-colors"
                style={{ color: 'var(--color-error)' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(196,30,58,0.06)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <svg className="w-3.5 h-3.5 mr-3" style={{ color: 'var(--color-error)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                </svg>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowAuthModal(true)}
        className="text-xs font-semibold px-4 py-2 transition-colors"
        style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
      >
        Sign in
      </button>

      {showAuthModal && mounted && createPortal(
        <div 
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center"
          style={{ 
            zIndex: 2147483647,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            minHeight: '100vh',
            width: '100vw',
            height: '100vh'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAuthModal(false);
            }
          }}
        >
          <div
            className="max-w-md w-full mx-4 p-8"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
            style={{
              maxHeight: '90vh',
              overflowY: 'auto',
              zIndex: 2147483647,
              position: 'relative'
            }}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}>
                {authMode === 'signin' ? 'Welcome back' : 'Create account'}
              </h2>
              <button
                onClick={() => setShowAuthModal(false)}
                className="transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px', color: 'var(--color-text)' }}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm focus:outline-none"
                  style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px', color: 'var(--color-text)' }}
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-2.5 text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
              >
                {authLoading ? 'Loading...' : (authMode === 'signin' ? 'Sign in' : 'Create account')}
              </button>
            </form>

            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full" style={{ borderTop: '1px solid var(--color-border)' }}></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2" style={{ background: 'var(--color-surface)', color: 'var(--color-text-muted)' }}>Or continue with</span>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 py-2.5 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ border: '1px solid var(--color-border)', borderRadius: '4px', color: 'var(--color-text-secondary)', background: 'transparent' }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div className="mt-5 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-xs font-medium transition-colors"
                style={{ color: 'var(--color-accent)' }}
              >
                {authMode === 'signin' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}