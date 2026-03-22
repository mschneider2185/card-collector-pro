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

async function getCards() {
  return []
}

export default async function CardsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const cards = await getCards()
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
          Browse Cards
        </h1>

        <span
          className="text-xs font-medium px-2 py-1"
          style={{
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            borderRadius: '2px',
          }}
        >
          {cards.length.toLocaleString()} cards
        </span>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Filters */}
        <CardsFilters sports={sports} years={years} />

        {/* Results */}
        <CardsClient searchParams={resolvedSearchParams} />
      </main>
    </div>
  )
}
