'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { UserSetCompletion, CardSetSubsetType } from '@/types'

const SUBSET_LABELS: Record<CardSetSubsetType, string> = {
  base: 'Base',
  rookies: 'Rookies',
  inserts: 'Inserts',
  parallels: 'Parallels',
  autographs: 'Autographs',
  relics: 'Relics',
  short_prints: 'Short Prints',
  variations: 'Variations',
  other: 'Other',
}

function completionLabel(row: UserSetCompletion): string {
  if (row.total_cards) {
    return `${row.cards_owned} of ${row.total_cards} cards`
  }
  return `${row.cards_owned} card${row.cards_owned !== 1 ? 's' : ''} collected`
}

function ProgressBar({ pct }: { pct: number | null }) {
  const width = Math.min(100, pct ?? 0)
  return (
    <div className="w-full h-px overflow-hidden" style={{ background: 'var(--color-border)' }}>
      <div
        className="h-full transition-all duration-500"
        style={{ width: `${width}%`, background: 'var(--color-accent)' }}
      />
    </div>
  )
}

export default function SetsPage() {
  const [sets, setSets] = useState<UserSetCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sign in to see your set completion.')
        setLoading(false)
        return
      }

      const { data, error: dbErr } = await supabase
        .from('user_set_completion')
        .select('*')
        .eq('user_id', session.user.id)
        .order('year', { ascending: false })
        .order('brand')
        .order('set_name')

      if (dbErr) {
        setError(dbErr.message)
      } else {
        setSets((data as UserSetCompletion[]) ?? [])
      }
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 h-14"
        style={{ background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/collection"
            className="flex items-center gap-1.5 text-sm transition-colors"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="hidden sm:inline">Collection</span>
          </Link>
          <div className="w-px h-4" style={{ background: 'var(--color-border)' }} />
          <h1
            className="text-base font-semibold truncate"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Set Completion
          </h1>
        </div>
        <Link
          href="/upload"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-80"
          style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Card
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading && (
          <div className="flex items-center justify-center py-24 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            Loading sets...
          </div>
        )}

        {error && (
          <div className="px-4 py-3 text-sm" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-error)', borderRadius: '4px', color: 'var(--color-error)' }}>
            {error}
          </div>
        )}

        {!loading && !error && sets.length === 0 && (
          <div className="py-20 flex flex-col items-center text-center">
            <div className="w-14 h-14 flex items-center justify-center mb-5" style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}>
              <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>No sets yet</h3>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>Upload cards to start tracking set completion.</p>
            <Link
              href="/upload"
              className="text-xs font-semibold px-4 py-2 transition-opacity hover:opacity-80"
              style={{ background: 'var(--color-accent)', color: '#0D0D0D', borderRadius: '4px' }}
            >
              Upload a Card
            </Link>
          </div>
        )}

        {sets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {sets.map((row) => (
              <div
                key={`${row.set_id}`}
                className="p-5 flex flex-col gap-3"
                style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
              >
                {/* Set identity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {row.year} · {row.brand}
                    </p>
                    <h2 className="text-sm font-semibold leading-snug truncate" style={{ color: 'var(--color-text)' }} title={row.set_name}>
                      {row.set_name}
                    </h2>
                  </div>
                  <span
                    className="shrink-0 text-xs font-semibold px-2 py-0.5"
                    style={{ border: '1px solid var(--color-border)', color: 'var(--color-text-muted)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
                  >
                    {SUBSET_LABELS[row.subset_type]}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar pct={row.completion_percentage} />

                {/* Stats */}
                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                  <span>{completionLabel(row)}</span>
                  {row.completion_percentage !== null && (
                    <span style={{ color: row.completion_percentage >= 100 ? 'var(--color-success)' : 'var(--color-accent)' }}>
                      {row.completion_percentage.toFixed(1)}%
                    </span>
                  )}
                </div>

                <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>{row.sport}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
