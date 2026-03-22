'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

interface CardsFiltersProps {
  sports: string[]
  years: number[]
}

export default function CardsFilters({ sports, years }: CardsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [searchTerm, setSearchTerm] = useState(searchParams.get('q') || '')
  const [sport, setSport] = useState(searchParams.get('sport') || '')
  const [year, setYear] = useState(searchParams.get('year') || '')
  const [rookie, setRookie] = useState(searchParams.get('rookie') === 'true')
  const [auto, setAuto] = useState(searchParams.get('auto') === 'true')
  const [patch, setPatch] = useState(searchParams.get('patch') === 'true')

  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    
    if (searchTerm) params.set('q', searchTerm)
    if (sport) params.set('sport', sport)
    if (year) params.set('year', year)
    if (rookie) params.set('rookie', 'true')
    if (auto) params.set('auto', 'true')
    if (patch) params.set('patch', 'true')
    
    const newURL = params.toString() ? `?${params.toString()}` : '/cards'
    router.push(newURL)
  }, [searchTerm, sport, year, rookie, auto, patch, router])

  // Debounced search update
  useEffect(() => {
    const timer = setTimeout(() => {
      updateURL()
    }, 300)
    
    return () => clearTimeout(timer)
  }, [searchTerm, updateURL])

  // Immediate update for other filters
  useEffect(() => {
    updateURL()
  }, [sport, year, rookie, auto, patch, updateURL])

  const selectStyle = {
    background: 'var(--color-bg)',
    border: '1px solid var(--color-border)',
    borderRadius: '2px',
    color: 'var(--color-text)',
    fontSize: '0.875rem',
  }

  return (
    <div className="mb-6 p-4" style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: '4px' }}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--color-text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search player, brand, series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm focus:outline-none"
            style={selectStyle}
          />
        </div>

        {/* Sport Filter */}
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="px-3 py-2 text-sm focus:outline-none"
          style={selectStyle}
        >
          <option value="">All Sports</option>
          {sports.map(sportOption => (
            <option key={sportOption} value={sportOption}>
              {sportOption.charAt(0).toUpperCase() + sportOption.slice(1)}
            </option>
          ))}
        </select>

        {/* Year Filter */}
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-3 py-2 text-sm focus:outline-none"
          style={selectStyle}
        >
          <option value="">All Years</option>
          {years.map(yearOption => (
            <option key={yearOption} value={yearOption}>{yearOption}</option>
          ))}
        </select>

        {/* Attribute Filters */}
        <div className="flex flex-wrap gap-2 items-center lg:col-span-2">
          {[
            { label: 'RC', checked: rookie, onChange: setRookie },
            { label: 'AUTO', checked: auto, onChange: setAuto },
            { label: 'PATCH', checked: patch, onChange: setPatch },
          ].map(({ label, checked, onChange }) => (
            <label key={label} className="flex items-center gap-1.5 cursor-pointer select-none">
              <div
                onClick={() => onChange(!checked)}
                className="w-4 h-4 flex items-center justify-center transition-colors"
                style={{
                  border: `1px solid ${checked ? 'var(--color-accent)' : 'var(--color-border)'}`,
                  background: checked ? 'var(--color-accent)' : 'transparent',
                  borderRadius: '2px',
                }}
              >
                {checked && (
                  <svg className="w-2.5 h-2.5" fill="none" stroke="#0D0D0D" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              <span className="text-xs font-semibold" style={{ color: checked ? 'var(--color-accent)' : 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
