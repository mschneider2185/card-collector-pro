import { supabase } from '@/lib/supabase'
import { Card } from '@/types'
import CardsFilters from './CardsFilters'
import CardsClient from './CardsClient'

interface SearchParams {
  q?: string
  sport?: string
  year?: string
  rookie?: string
  auto?: string
  patch?: string
}

async function getCards(searchParams: Promise<SearchParams>) {
  // For server-side rendering, we'll return empty data and let the client handle auth
  // This prevents RLS issues and ensures proper authentication flow
  return []
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cards = await getCards(searchParams)
  
  const sports = ['baseball', 'basketball', 'football', 'hockey', 'pokemon', 'soccer']
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="relative bg-white/80 backdrop-blur-md border-b border-white/20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <a href="/" className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back to Home</span>
              </a>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Browse Cards
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium">
                {cards.length} cards
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <CardsFilters sports={sports} years={years} />

        {/* Results */}
        <CardsClient cards={cards} searchParams={searchParams} />
      </main>
    </div>
  )
}