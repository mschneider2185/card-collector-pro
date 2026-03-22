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
    <div className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
      {/* Page Header */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-6 h-14"
        style={{
          background: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <h1
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          My Collection
        </h1>

        <div className="flex items-center gap-2">
          <Link
            href="/collection/sets"
            className="hidden sm:inline-flex items-center px-3 py-1.5 text-xs font-medium transition-colors"
            style={{
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
              background: 'transparent',
            }}
          >
            Set Completion
          </Link>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              color: '#0D0D0D',
              background: 'var(--color-accent)',
              borderRadius: '4px',
              border: '1px solid var(--color-accent)',
            }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Card
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
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
