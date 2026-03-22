import Link from 'next/link'
import CollectionFilters from './CollectionFilters'
import CollectionClient from './CollectionClient'
import CollectionStatsDashboard from '@/components/CollectionStatsDashboard'

interface SearchParams {
  q?: string
  sport?: string
  year?: string
  trade?: string
}

async function getUserCards() {
  // For server-side rendering, we'll return empty data and let the client handle auth
  // This prevents hydration issues and ensures proper authentication flow
  return { userCards: [], user: null, needsClientAuth: true }
}

export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { userCards } = await getUserCards()
  const resolvedSearchParams = await searchParams

  const sports = ['baseball', 'basketball', 'football', 'hockey', 'pokemon', 'soccer']
  const years = Array.from({ length: 30 }, (_, i) => new Date().getFullYear() - i)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: back + title */}
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/"
                className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Home</span>
              </Link>

              <div className="w-px h-5 bg-gray-200 shrink-0" />

              <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-700 bg-clip-text text-transparent truncate">
                My Collection
              </h1>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/collection/sets"
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
              >
                Set Completion
              </Link>
              <Link
                href="/cards"
                className="hidden sm:inline-flex items-center px-3.5 py-2 text-sm font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors shadow-sm"
              >
                Browse Cards
              </Link>
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span className="hidden xs:inline">Add Card</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Stats Dashboard */}
        <CollectionStatsDashboard />

        {/* Filters */}
        <CollectionFilters sports={sports} years={years} />

        {/* Gallery */}
        <CollectionClient userCards={userCards} searchParams={resolvedSearchParams} />
      </main>
    </div>
  )
}
