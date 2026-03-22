'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import type { UserSetCompletion, CardSetSubsetType } from '@/types'

const SUBSET_LABELS: Record<CardSetSubsetType, string> = {
  base: 'Base',
  rookies: 'Rookies',
  inserts: 'Inserts',
  parallels: 'Parallels',
  autographs: 'Autographs',
  relics: 'Relics',
  short_prints: 'Short Prints',
  variations: 'Variations',
  other: 'Other',
}

const SUBSET_COLORS: Record<CardSetSubsetType, string> = {
  base: 'bg-blue-100 text-blue-700',
  rookies: 'bg-green-100 text-green-700',
  inserts: 'bg-purple-100 text-purple-700',
  parallels: 'bg-yellow-100 text-yellow-700',
  autographs: 'bg-red-100 text-red-700',
  relics: 'bg-orange-100 text-orange-700',
  short_prints: 'bg-pink-100 text-pink-700',
  variations: 'bg-indigo-100 text-indigo-700',
  other: 'bg-gray-100 text-gray-600',
}

function completionLabel(row: UserSetCompletion): string {
  if (row.total_cards) {
    return `${row.cards_owned} of ${row.total_cards} cards`
  }
  return `${row.cards_owned} card${row.cards_owned !== 1 ? 's' : ''} collected`
}

function ProgressBar({ pct }: { pct: number | null }) {
  const width = pct ?? 0
  const color =
    width >= 100
      ? 'bg-green-500'
      : width >= 50
      ? 'bg-blue-500'
      : width >= 25
      ? 'bg-yellow-400'
      : 'bg-gray-300'

  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(100, width)}%` }}
      />
    </div>
  )
}

export default function SetsPage() {
  const [sets, setSets] = useState<UserSetCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    async function load() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Sign in to see your set completion.')
        setLoading(false)
        return
      }

      const { data, error: dbErr } = await supabase
        .from('user_set_completion')
        .select('*')
        .eq('user_id', session.user.id)
        .order('year', { ascending: false })
        .order('brand')
        .order('set_name')

      if (dbErr) {
        setError(dbErr.message)
      } else {
        setSets((data as UserSetCompletion[]) ?? [])
      }
      setLoading(false)
    }

    load()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-white/30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4 min-w-0">
              <Link
                href="/collection"
                className="shrink-0 flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">My Collection</span>
              </Link>
              <div className="w-px h-5 bg-gray-200 shrink-0" />
              <h1 className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-700 bg-clip-text text-transparent truncate">
                Set Completion
              </h1>
            </div>
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
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading && (
          <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
            Loading sets...
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {!loading && !error && sets.length === 0 && (
          <div className="text-center py-24">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-gray-500 text-sm">No sets yet — upload some cards to get started.</p>
            <Link
              href="/upload"
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow hover:scale-105 transition-all duration-200"
            >
              Upload a Card
            </Link>
          </div>
        )}

        {sets.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sets.map((row) => (
              <div
                key={`${row.set_id}`}
                className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/60 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col gap-3"
              >
                {/* Set identity */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      {row.year} · {row.brand}
                    </p>
                    <h2 className="text-sm font-bold text-gray-900 leading-snug mt-0.5 truncate" title={row.set_name}>
                      {row.set_name}
                    </h2>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${SUBSET_COLORS[row.subset_type]}`}
                  >
                    {SUBSET_LABELS[row.subset_type]}
                  </span>
                </div>

                {/* Progress bar */}
                <ProgressBar pct={row.completion_percentage} />

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{completionLabel(row)}</span>
                  {row.completion_percentage !== null && (
                    <span className="font-semibold text-gray-700">
                      {row.completion_percentage.toFixed(1)}%
                    </span>
                  )}
                </div>

                {/* Sport pill */}
                <p className="text-xs text-gray-400 capitalize">{row.sport}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
