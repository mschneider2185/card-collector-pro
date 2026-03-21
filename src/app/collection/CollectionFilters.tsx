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

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => { updateURL() }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, updateURL])

  // Immediate update for dropdown/toggle filters
  useEffect(() => { updateURL() }, [sport, year, trade, updateURL])

  const hasActiveFilters = !!(searchTerm || sport || year || trade)

  const clearAll = () => {
    setSearchTerm('')
    setSport('')
    setYear('')
    setTrade(false)
  }

  return (
    <div className="mb-6 bg-white/75 backdrop-blur-md rounded-2xl shadow-lg border border-white/30 p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        {/* Top row: search + clear */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search player, brand, or series…"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-white/80 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
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
              className="shrink-0 text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors whitespace-nowrap"
            >
              Clear all
            </button>
          )}
        </div>

        {/* Bottom row: dropdowns + trade toggle */}
        <div className="flex flex-wrap gap-2.5 items-center">
          {/* Sport */}
          <div className="relative">
            <select
              value={sport}
              onChange={e => setSport(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer
                ${sport ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white/80 border-gray-200 text-gray-600'}`}
            >
              <option value="">All Sports</option>
              {sports.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Year */}
          <div className="relative">
            <select
              value={year}
              onChange={e => setYear(e.target.value)}
              className={`appearance-none pl-3 pr-8 py-2 text-sm border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none cursor-pointer
                ${year ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium' : 'bg-white/80 border-gray-200 text-gray-600'}`}
            >
              <option value="">All Years</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          {/* Trade toggle */}
          <button
            onClick={() => setTrade(!trade)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium border transition-all duration-200
              ${trade
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-white/80 border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
          >
            <div className={`w-7 h-4 rounded-full flex items-center transition-colors duration-200 px-0.5 ${trade ? 'bg-emerald-500' : 'bg-gray-200'}`}>
              <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-200 ${trade ? 'translate-x-3' : 'translate-x-0'}`} />
            </div>
            For Trade
          </button>

          {/* Active filter chips */}
          {sport && (
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
              {sport.charAt(0).toUpperCase() + sport.slice(1)}
              <button onClick={() => setSport('')} className="ml-0.5 hover:text-blue-900">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1 bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg">
              {year}
              <button onClick={() => setYear('')} className="ml-0.5 hover:text-blue-900">
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
