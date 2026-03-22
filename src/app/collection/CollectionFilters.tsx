'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface CollectionFiltersProps {
  sports: string[]
  years: number[]
}

export default function CollectionFilters({ sports, years }: CollectionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [sport, setSport] = useState(searchParams.get('sport') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [trade, setTrade] = useState(searchParams.get('trade') === 'true')

  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    if (searchTerm) params.set('q', searchTerm)
    if (sport) params.set('sport', sport)
    if (year) params.set('year', year)
    if (trade) params.set('trade', 'true')
    const newURL = params.toString() ? `?${params.toString()}` : '/collection'
    router.push(newURL)
  }, [searchTerm, sport, year, trade, router])

  useEffect(() => {
    const timer = setTimeout(() => { updateURL() }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, updateURL])

  useEffect(() => { updateURL() }, [sport, year, trade, updateURL])

  const hasActiveFilters = !!(searchTerm || sport || year || trade)

  const clearAll = () => {
    setSearchTerm('')
    setSport('')
    setYear('')
    setTrade(false)
  }

  const selectStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text)',
    fontSize: '0.8125rem',
  }

  return (
    <div className="mb-5 p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
      <div className="flex flex-col gap-3">
        {/* Search row */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
              style={{ color: 'var(--color-text-muted)' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search player, brand, or series..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm focus:outline-none"
              style={selectStyle}
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="shrink-0 text-xs font-semibold px-3 py-2 transition-colors whitespace-nowrap"
              style={{ color: 'var(--color-error)', border: '1px solid var(--color-error)', borderRadius: '2px' }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sport */}
          <select
            value={sport}
            onChange={e => setSport(e.target.value)}
            className="px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: sport ? 'var(--color-accent)' : 'var(--color-border)',
              color: sport ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <option value="">All Sports</option>
            {sports.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={year}
            onChange={e => setYear(e.target.value)}
            className="px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: year ? 'var(--color-accent)' : 'var(--color-border)',
              color: year ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Trade toggle */}
          <button
            onClick={() => setTrade(!trade)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              border: `1px solid ${trade ? 'var(--color-success)' : 'var(--color-border)'}`,
              color: trade ? 'var(--color-success)' : 'var(--color-text-muted)',
              borderRadius: '2px',
            }}
          >
            <div
              className="w-7 h-4 flex items-center transition-colors px-0.5"
              style={{ background: trade ? 'var(--color-success)' : 'var(--color-border)', borderRadius: '8px' }}
            >
              <div
                className="w-3 h-3 bg-white transition-transform"
                style={{ borderRadius: '1px', transform: trade ? 'translateX(12px)' : 'translateX(0)' }}
              />
            </div>
            For Trade
          </button>

          {/* Active chips */}
          {sport && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1"
              style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
            >
              {sport.charAt(0).toUpperCase() + sport.slice(1)}
              <button onClick={() => setSport('')} className="ml-0.5 opacity-70 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {year && (
            <span
              className="flex items-center gap-1 text-xs font-semibold px-2 py-1"
              style={{ border: '1px solid var(--color-accent)', color: 'var(--color-accent)', borderRadius: '2px', fontFamily: 'var(--font-mono)' }}
            >
              {year}
              <button onClick={() => setYear('')} className="ml-0.5 opacity-70 hover:opacity-100">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
