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
  }, [sport, year, trade, updateURL])

  return (
    <div className="mb-8 bg-white/80 backdrop-blur-sm p-6 rounded-2xl shadow-xl border border-white/20">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by player, brand, or series..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
          />
        </div>
        
        {/* Sport Filter */}
        <select
          value={sport}
          onChange={(e) => setSport(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
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
          className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white/50 backdrop-blur-sm"
        >
          <option value="">All Years</option>
          {years.map(yearOption => (
            <option key={yearOption} value={yearOption}>{yearOption}</option>
          ))}
        </select>

        {/* Trade Filter */}
        <div className="flex items-center justify-center">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={trade}
              onChange={(e) => setTrade(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="text-sm font-medium text-gray-700">For Trade Only</span>
          </label>
        </div>
      </div>
    </div>
  )
}
