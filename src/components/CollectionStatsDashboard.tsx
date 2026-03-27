'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortfolioStats {
  totalCards: number
  totalValue: number
  rookieCount: number
  autoCount: number
  patchCount: number
  numberedCount: number
  jerseyCount: number
  insertCount: number
  parallelCount: number
  shortPrintCount: number
  errorCount: number
  avgValue: number
  cardsWithValue: number
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CollectionStatsDashboard() {
  const [stats, setStats] = useState<PortfolioStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('collection-stats-collapsed') === 'true') {
        setCollapsed(true)
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev
      try {
        localStorage.setItem('collection-stats-collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function fetchStats() {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          setLoading(false)
          return
        }

        const { data, error } = await supabase
          .from('user_cards')
          .select(`
            quantity,
            cards(
              estimated_value,
              rookie,
              autographed,
              patch,
              jersey,
              numbered,
              parallel,
              insert,
              short_print,
              error
            )
          `)
          .eq('user_id', session.user.id)

        if (error) {
          console.error('[PortfolioBar] fetch error:', error)
          if (!cancelled) setLoading(false)
          return
        }

        if (!cancelled) {
          const rows = (data ?? []) as unknown as Array<{
            quantity: number
            cards: {
              estimated_value: number | null
              rookie: boolean | null
              autographed: boolean | null
              patch: boolean | null
              jersey: boolean | null
              numbered: boolean | null
              parallel: boolean | null
              insert: boolean | null
              short_print: boolean | null
              error: boolean | null
            } | null
          }>

          let totalCards = 0
          let totalValue = 0
          let cardsWithValue = 0
          let rookieCount = 0
          let autoCount = 0
          let patchCount = 0
          let numberedCount = 0
          let jerseyCount = 0
          let insertCount = 0
          let parallelCount = 0
          let shortPrintCount = 0
          let errorCount = 0

          for (const row of rows) {
            const qty = row.quantity ?? 1
            totalCards += qty
            const c = row.cards
            if (!c) continue
            if (c.estimated_value != null) {
              totalValue += c.estimated_value * qty
              cardsWithValue += qty
            }
            if (c.rookie) rookieCount += qty
            if (c.autographed) autoCount += qty
            if (c.patch) patchCount += qty
            if (c.jersey) jerseyCount += qty
            if (c.numbered) numberedCount += qty
            if (c.parallel) parallelCount += qty
            if (c.insert) insertCount += qty
            if (c.short_print) shortPrintCount += qty
            if (c.error) errorCount += qty
          }

          setStats({
            totalCards,
            totalValue,
            rookieCount,
            autoCount,
            patchCount,
            numberedCount,
            jerseyCount,
            insertCount,
            parallelCount,
            shortPrintCount,
            errorCount,
            avgValue: cardsWithValue > 0 ? totalValue / cardsWithValue : 0,
            cardsWithValue,
          })
          setLoading(false)
        }
      } catch (err) {
        console.error('[PortfolioBar] error:', err)
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => { cancelled = true }
  }, [])

  if (!loading && (!stats || stats.totalCards === 0)) return null

  const formatValue = (v: number) => {
    if (v >= 1000) return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `$${v.toFixed(2)}`
  }

  // Attribute badges to show (only those with count > 0)
  const attributes = stats ? [
    { label: 'RC', count: stats.rookieCount },
    { label: 'AUTO', count: stats.autoCount },
    { label: 'PATCH', count: stats.patchCount },
    { label: 'JERSEY', count: stats.jerseyCount },
    { label: '/XX', count: stats.numberedCount },
    { label: 'PARALLEL', count: stats.parallelCount },
    { label: 'INSERT', count: stats.insertCount },
    { label: 'SP', count: stats.shortPrintCount },
    { label: 'ERROR', count: stats.errorCount },
  ].filter(a => a.count > 0) : []

  return (
    <div className="mb-5">
      <div
        style={{
          background: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          borderRadius: '4px',
          overflow: 'hidden',
        }}
      >
        {/* Header — always visible toggle */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-between px-5 py-3 group transition-colors"
          style={{ borderBottom: collapsed ? 'none' : '1px solid var(--color-border)' }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand portfolio summary' : 'Collapse portfolio summary'}
        >
          <div className="flex items-center gap-3">
            <span
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--color-text-muted)', letterSpacing: '0.1em' }}
            >
              Portfolio
            </span>
            {!loading && stats && (
              <span
                className="text-sm font-bold tabular-nums"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
              >
                {stats.totalValue > 0 ? formatValue(stats.totalValue) : `${stats.totalCards} cards`}
              </span>
            )}
          </div>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
            style={{ color: 'var(--color-text-muted)' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Expandable body */}
        {!collapsed && (
          <>
            {loading ? (
              <div className="p-5 animate-pulse">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="h-[72px]" style={{ background: 'var(--color-border)', borderRadius: '2px' }} />
                  ))}
                </div>
              </div>
            ) : stats ? (
              <div className="p-5">
                {/* Primary stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {/* Total Value */}
                  <div
                    className="px-4 py-3"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                    >
                      Est. Value
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
                    >
                      {stats.totalValue > 0 ? formatValue(stats.totalValue) : '\u2014'}
                    </p>
                    {stats.cardsWithValue > 0 && stats.cardsWithValue < stats.totalCards && (
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                        {stats.cardsWithValue} of {stats.totalCards} priced
                      </p>
                    )}
                  </div>

                  {/* Total Cards */}
                  <div
                    className="px-4 py-3"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                    >
                      Total Cards
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
                    >
                      {stats.totalCards.toLocaleString()}
                    </p>
                  </div>

                  {/* Avg Value */}
                  <div
                    className="px-4 py-3"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                    >
                      Avg Value
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
                    >
                      {stats.avgValue > 0 ? formatValue(stats.avgValue) : '\u2014'}
                    </p>
                  </div>

                  {/* Most Valuable Attribute */}
                  <div
                    className="px-4 py-3"
                    style={{ background: 'var(--color-bg)', border: '1px solid var(--color-border)', borderRadius: '2px' }}
                  >
                    <p
                      className="text-[10px] font-semibold uppercase tracking-widest mb-1"
                      style={{ color: 'var(--color-text-muted)', letterSpacing: '0.08em' }}
                    >
                      Priced Cards
                    </p>
                    <p
                      className="text-xl font-bold tabular-nums"
                      style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-text)' }}
                    >
                      {stats.cardsWithValue > 0
                        ? `${Math.round((stats.cardsWithValue / stats.totalCards) * 100)}%`
                        : '\u2014'}
                    </p>
                  </div>
                </div>

                {/* Attribute breakdown */}
                {attributes.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {attributes.map((attr) => (
                      <div
                        key={attr.label}
                        className="flex items-center gap-1.5 px-2.5 py-1"
                        style={{ border: '1px solid var(--color-border)', borderRadius: '2px' }}
                      >
                        <span
                          className="text-[10px] font-bold uppercase tracking-widest"
                          style={{ color: 'var(--color-accent)', fontFamily: 'var(--font-mono)' }}
                        >
                          {attr.label}
                        </span>
                        <span
                          className="text-[11px] font-semibold tabular-nums"
                          style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                        >
                          {attr.count}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}
