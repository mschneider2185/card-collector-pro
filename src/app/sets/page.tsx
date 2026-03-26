'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { ScrapedCardSet, SetChecklistCard } from '@/types'

const SPORTS = ['Baseball', 'Basketball', 'Football', 'Hockey'] as const

interface FetchResult {
  cached: boolean
  set: ScrapedCardSet
  checklist: SetChecklistCard[]
}

export default function SetsSearchPage() {
  const [setName, setSetName] = useState('')
  const [sport, setSport] = useState<string>('Baseball')
  const [year, setYear] = useState<number>(2023)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<FetchResult[]>([])
  const [cachedSets, setCachedSets] = useState<ScrapedCardSet[]>([])
  const [loadingCached, setLoadingCached] = useState(true)

  // Load previously scraped sets on mount
  useEffect(() => {
    async function loadCachedSets() {
      try {
        const res = await fetch('/api/sets/list')
        const data = await res.json()
        if (res.ok && data.sets) {
          setCachedSets(data.sets)
        }
      } catch {
        // Silent fail — cached sets are a convenience, not critical
      } finally {
        setLoadingCached(false)
      }
    }
    loadCachedSets()
  }, [])

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!setName.trim()) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sets/fetch-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setName: setName.trim(), sport, year }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to fetch checklist')
        return
      }

      // Add to search results
      setResults((prev) => {
        const existing = prev.findIndex((r) => r.set.id === data.set.id)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = data
          return updated
        }
        return [data, ...prev]
      })

      // Also update cached sets list if this is new
      if (!data.cached) {
        setCachedSets((prev) => {
          if (prev.some((s) => s.id === data.set.id)) return prev
          return [data.set, ...prev]
        })
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  // IDs of sets already shown in search results
  const searchResultIds = new Set(results.map((r) => r.set.id))

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
          Set Tracker
        </h1>
        <Link
          href="/collection/sets"
          className="text-xs font-medium transition-colors"
          style={{ color: 'var(--color-text-muted)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-accent)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-text-muted)')}
        >
          My Sets
        </Link>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <form onSubmit={handleSearch} className="space-y-4 mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Set Name
              </label>
              <input
                type="text"
                value={setName}
                onChange={(e) => setSetName(e.target.value)}
                placeholder="e.g. Topps Series 1"
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  color: 'var(--color-text)',
                }}
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Sport
              </label>
              <select
                value={sport}
                onChange={(e) => setSport(e.target.value)}
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  color: 'var(--color-text)',
                }}
              >
                {SPORTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm focus:outline-none"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: '4px',
                  color: 'var(--color-text)',
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !setName.trim()}
            className="px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{
              background: 'var(--color-accent)',
              color: '#0D0D0D',
              borderRadius: '4px',
            }}
          >
            {loading ? 'Searching...' : 'Find Set'}
          </button>
        </form>

        {/* Loading Indicator */}
        {loading && (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <div
              className="w-6 h-6 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)' }}
            />
            <p className="text-sm">Fetching checklist from TCDB... this may take a moment.</p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-4 py-3 text-sm mb-6"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-error)',
              borderRadius: '4px',
              color: 'var(--color-error)',
            }}
          >
            {error}
          </div>
        )}

        {/* Search Results */}
        {!loading && results.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Search Results
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {results.map((result) => (
                <SetCard key={result.set.id} set={result.set} badge={result.cached ? 'cached' : 'new'} />
              ))}
            </div>
          </div>
        )}

        {/* Previously Scraped Sets */}
        {!loadingCached && cachedSets.filter((s) => !searchResultIds.has(s.id)).length > 0 && (
          <div>
            <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: 'var(--color-text-muted)' }}>
              Previously Fetched Sets
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cachedSets
                .filter((s) => !searchResultIds.has(s.id))
                .map((set) => (
                  <SetCard key={set.id} set={set} />
                ))}
            </div>
          </div>
        )}

        {/* Empty state — only when no cached sets and no search results */}
        {!loading && !error && results.length === 0 && !loadingCached && cachedSets.length === 0 && (
          <div className="py-20 flex flex-col items-center text-center">
            <div
              className="w-14 h-14 flex items-center justify-center mb-5"
              style={{ border: '1px solid var(--color-border)', borderRadius: '4px' }}
            >
              <svg className="w-7 h-7" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
              Search for a Set
            </h3>
            <p className="text-sm max-w-sm" style={{ color: 'var(--color-text-muted)' }}>
              Enter a set name like &ldquo;Topps Series 1&rdquo; to find the full checklist and track your completion.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}

/** Reusable card component for displaying a set. */
function SetCard({ set, badge }: { set: ScrapedCardSet; badge?: 'cached' | 'new' }) {
  return (
    <Link
      href={`/sets/${set.id}`}
      className="p-5 flex flex-col gap-3 card-lift"
      style={{
        background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderRadius: '4px',
      }}
    >
      {badge === 'cached' && (
        <span
          className="self-start text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5"
          style={{ border: '1px solid var(--color-success)', color: 'var(--color-success)', borderRadius: '2px' }}
        >
          Cached
        </span>
      )}
      {badge === 'new' && (
        <span
          className="self-start text-[10px] uppercase tracking-widest font-semibold px-1.5 py-0.5"
          style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px' }}
        >
          New
        </span>
      )}

      <div>
        <p
          className="text-xs uppercase tracking-widest mb-0.5"
          style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {set.year} · {set.brand}
        </p>
        <h2
          className="text-sm font-semibold leading-snug truncate"
          style={{ color: 'var(--color-text)' }}
          title={set.name}
        >
          {set.name}
        </h2>
      </div>

      <div
        className="flex items-center justify-between text-xs"
        style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
      >
        <span>{set.total_cards} cards</span>
        <span className="capitalize">{set.sport}</span>
      </div>
    </Link>
  )
}
