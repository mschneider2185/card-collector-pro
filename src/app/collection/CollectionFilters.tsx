'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface CollectionFiltersProps {
  sports: string[]
  years: number[]
}

const SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'value_desc', label: 'Value: High to Low' },
  { value: 'value_asc', label: 'Value: Low to High' },
  { value: 'player_az', label: 'Player: A-Z' },
  { value: 'player_za', label: 'Player: Z-A' },
  { value: 'year_desc', label: 'Year: Newest' },
  { value: 'year_asc', label: 'Year: Oldest' },
  { value: 'last_sale', label: 'Last Sale Date' },
]

const ATTRIBUTE_FILTERS = [
  { key: 'rookie', label: 'RC' },
  { key: 'auto', label: 'Auto' },
  { key: 'patch', label: 'Patch' },
  { key: 'numbered', label: '/XX' },
  { key: 'jersey', label: 'Jersey' },
  { key: 'parallel', label: 'Parallel' },
  { key: 'insert', label: 'Insert' },
  { key: 'sp', label: 'SP' },
  { key: 'error', label: 'Error' },
]

export type ViewMode = 'grid' | 'table'
export type SortOption = typeof SORT_OPTIONS[number]['value']

interface FilterState {
  q: string
  sport: string
  year: string
  trade: boolean
  sort: string
  view: ViewMode
  attributes: string[]
}

export default function CollectionFilters({ sports, years }: CollectionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filters, setFilters] = useState<FilterState>({
    q: searchParams.get('q') || '',
    sport: searchParams.get('sport') || '',
    year: searchParams.get('year') || '',
    trade: searchParams.get('trade') === 'true',
    sort: searchParams.get('sort') || 'recent',
    view: (searchParams.get('view') as ViewMode) || 'grid',
    attributes: searchParams.get('attrs')?.split(',').filter(Boolean) || [],
  })

  const updateURL = useCallback((newFilters: FilterState) => {
    const params = new URLSearchParams()
    if (newFilters.q) params.set('q', newFilters.q)
    if (newFilters.sport) params.set('sport', newFilters.sport)
    if (newFilters.year) params.set('year', newFilters.year)
    if (newFilters.trade) params.set('trade', 'true')
    if (newFilters.sort !== 'recent') params.set('sort', newFilters.sort)
    if (newFilters.view !== 'grid') params.set('view', newFilters.view)
    if (newFilters.attributes.length > 0) params.set('attrs', newFilters.attributes.join(','))
    const newURL = params.toString() ? `?${params.toString()}` : '/collection'
    router.push(newURL)
  }, [router])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => { updateURL(filters) }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.q])

  // Immediate update for non-search filters
  const setFilter = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    const next = { ...filters, [key]: value }
    setFilters(next)
    if (key !== 'q') updateURL(next)
  }

  const toggleAttribute = (attr: string) => {
    const next = filters.attributes.includes(attr)
      ? filters.attributes.filter(a => a !== attr)
      : [...filters.attributes, attr]
    setFilter('attributes', next)
  }

  const hasActiveFilters = !!(filters.q || filters.sport || filters.year || filters.trade || filters.attributes.length > 0)

  const clearAll = () => {
    const next: FilterState = { q: '', sport: '', year: '', trade: false, sort: 'recent', view: filters.view, attributes: [] }
    setFilters(next)
    updateURL(next)
  }

  const selectStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text)',
    fontSize: '0.8125rem',
  }

  return (
    <div
      className="mb-5 p-4"
      style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}
    >
      <div className="flex flex-col gap-3">
        {/* Search + View Toggle row */}
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
              value={filters.q}
              onChange={e => setFilters({ ...filters, q: e.target.value })}
              className="w-full pl-9 pr-8 py-2 text-sm focus:outline-none"
              style={selectStyle}
            />
            {filters.q && (
              <button
                onClick={() => { setFilters({ ...filters, q: '' }); updateURL({ ...filters, q: '' }) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex" style={{ border: '1px solid var(--color-border)', borderRadius: '2px' }}>
            <button
              onClick={() => setFilter('view', 'grid')}
              className="p-2 transition-colors"
              style={{
                color: filters.view === 'grid' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: filters.view === 'grid' ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
              }}
              aria-label="Grid view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </button>
            <button
              onClick={() => setFilter('view', 'table')}
              className="hidden sm:block p-2 transition-colors"
              style={{
                color: filters.view === 'table' ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: filters.view === 'table' ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                borderLeft: '1px solid var(--color-border)',
              }}
              aria-label="Table view"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5m-16.5 4.5h16.5" />
              </svg>
            </button>
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

        {/* Filter dropdowns + sort row */}
        <div className="flex flex-wrap gap-2 items-center">
          {/* Sport */}
          <select
            value={filters.sport}
            onChange={e => setFilter('sport', e.target.value)}
            className="px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: filters.sport ? 'var(--color-accent)' : 'var(--color-border)',
              color: filters.sport ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <option value="">All Sports</option>
            {sports.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Year */}
          <select
            value={filters.year}
            onChange={e => setFilter('year', e.target.value)}
            className="px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: filters.year ? 'var(--color-accent)' : 'var(--color-border)',
              color: filters.year ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            <option value="">All Years</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {/* Trade toggle */}
          <button
            onClick={() => setFilter('trade', !filters.trade)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors"
            style={{
              border: `1px solid ${filters.trade ? 'var(--color-success)' : 'var(--color-border)'}`,
              color: filters.trade ? 'var(--color-success)' : 'var(--color-text-muted)',
              borderRadius: '2px',
            }}
          >
            For Trade
          </button>

          {/* Attribute toggles */}
          {ATTRIBUTE_FILTERS.map(attr => (
            <button
              key={attr.key}
              onClick={() => toggleAttribute(attr.key)}
              className="px-2 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors"
              style={{
                border: `1px solid ${filters.attributes.includes(attr.key) ? 'var(--color-accent)' : 'var(--color-border)'}`,
                color: filters.attributes.includes(attr.key) ? 'var(--color-accent)' : 'var(--color-text-muted)',
                background: filters.attributes.includes(attr.key) ? 'rgba(201, 168, 76, 0.08)' : 'transparent',
                borderRadius: '2px',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {attr.label}
            </button>
          ))}

          {/* Spacer + Sort */}
          <div className="flex-1" />
          <select
            value={filters.sort}
            onChange={e => setFilter('sort', e.target.value)}
            className="px-3 py-1.5 text-sm focus:outline-none cursor-pointer"
            style={{
              ...selectStyle,
              borderColor: filters.sort !== 'recent' ? 'var(--color-accent)' : 'var(--color-border)',
              color: filters.sort !== 'recent' ? 'var(--color-accent)' : 'var(--color-text-secondary)',
            }}
          >
            {SORT_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
