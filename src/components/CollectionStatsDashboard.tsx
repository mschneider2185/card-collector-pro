'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

interface RawRow {
  quantity: number
  cards: {
    sport: string | null
    year: number | null
    brand: string | null
    series: string | null
    rookie: boolean | null
    autographed: boolean | null
    patch: boolean | null
  } | null
}

interface StatsData {
  total: number
  rookieCount: number
  autographCount: number
  patchCount: number
  bySport: Array<{ name: string; count: number }>
  byYear: Array<{ year: number; count: number }>
  byBrand: Array<{ name: string; count: number }>
  topSets: Array<{ label: string; count: number }>
}

// ─── Aggregation ─────────────────────────────────────────────────────────────

function computeStats(rows: RawRow[]): StatsData {
  let total = 0
  let rookieCount = 0
  let autographCount = 0
  let patchCount = 0
  const sportMap = new Map<string, number>()
  const yearMap = new Map<number, number>()
  const brandMap = new Map<string, number>()
  const setMap = new Map<string, number>()

  for (const row of rows) {
    const qty = row.quantity ?? 1
    total += qty
    const c = row.cards
    if (!c) continue
    if (c.rookie) rookieCount += qty
    if (c.autographed) autographCount += qty
    if (c.patch) patchCount += qty
    if (c.sport) sportMap.set(c.sport, (sportMap.get(c.sport) ?? 0) + qty)
    if (c.year) yearMap.set(c.year, (yearMap.get(c.year) ?? 0) + qty)
    if (c.brand) brandMap.set(c.brand, (brandMap.get(c.brand) ?? 0) + qty)
    const setKey = [c.brand, c.year, c.series].filter(Boolean).join(' · ')
    if (setKey) setMap.set(setKey, (setMap.get(setKey) ?? 0) + qty)
  }

  function sortDesc<K extends string | number>(m: Map<K, number>) {
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }

  return {
    total,
    rookieCount,
    autographCount,
    patchCount,
    bySport: sortDesc(sportMap).map(([name, count]) => ({ name: String(name), count })),
    byYear: [...yearMap.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([year, count]) => ({ year: Number(year), count })),
    byBrand: sortDesc(brandMap)
      .slice(0, 8)
      .map(([name, count]) => ({ name: String(name), count })),
    topSets: sortDesc(setMap)
      .slice(0, 8)
      .map(([label, count]) => ({ label: String(label), count })),
  }
}

// ─── Sport colors ─────────────────────────────────────────────────────────────

const SPORT_COLORS: Record<string, string> = {
  baseball: '#3b82f6',
  basketball: '#f97316',
  football: '#22c55e',
  hockey: '#06b6d4',
  pokemon: '#eab308',
  soccer: '#a855f7',
}

function sportColor(sport: string): string {
  return SPORT_COLORS[sport.toLowerCase()] ?? '#6b7280'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string
  value: number
  color: string
  icon: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-white/60 backdrop-blur-sm border border-white/40 rounded-xl px-3 py-3.5 shadow-sm">
      <div className="flex items-center gap-1.5">
        <span className="opacity-70">{icon}</span>
        <span className="text-2xl sm:text-3xl font-extrabold tabular-nums" style={{ color }}>
          {value.toLocaleString()}
        </span>
      </div>
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide leading-none">
        {label}
      </span>
    </div>
  )
}

function HorizontalBar({
  name,
  count,
  max,
  color,
  labelWidth = 'w-24',
}: {
  name: string
  count: number
  max: number
  color: string
  labelWidth?: string
}) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span className={`text-[11px] text-gray-600 font-medium ${labelWidth} truncate shrink-0 capitalize`}>
        {name}
      </span>
      <div className="flex-1 relative h-2 rounded-full bg-black/5 overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor: color,
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />
      </div>
      <span className="text-[11px] font-bold text-gray-700 w-7 text-right shrink-0 tabular-nums">
        {count}
      </span>
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-2">
      {children}
    </h3>
  )
}

function SkeletonDashboard() {
  return (
    <div className="p-5 space-y-5 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-[72px] bg-gray-200/50 rounded-xl" />
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="space-y-2.5">
          <div className="h-3 w-16 bg-gray-200/60 rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-2.5 bg-gray-200/50 rounded-full" />
          ))}
        </div>
        <div className="space-y-2.5">
          <div className="h-3 w-16 bg-gray-200/60 rounded" />
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-2.5 bg-gray-200/50 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CollectionStatsDashboard() {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  // Restore collapsed state from localStorage on mount
  useEffect(() => {
    try {
      if (localStorage.getItem('collection-stats-collapsed') === 'true') {
        setCollapsed(true)
      }
    } catch {
      // localStorage may be unavailable in some browsers
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
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session?.user) {
          setLoading(false)
          return
        }

        // Single efficient join query — only fetch columns needed for aggregation
        const { data, error } = await supabase
          .from('user_cards')
          .select('quantity, cards(sport, year, brand, series, rookie, autographed, patch)')
          .eq('user_id', session.user.id)

        if (error) {
          console.error('[CollectionStatsDashboard] fetch error:', error)
          if (!cancelled) setLoading(false)
          return
        }

        if (!cancelled) {
          setStats(computeStats((data ?? []) as unknown as RawRow[]))
          setLoading(false)
        }
      } catch (err) {
        console.error('[CollectionStatsDashboard] error:', err)
        if (!cancelled) setLoading(false)
      }
    }

    fetchStats()
    return () => {
      cancelled = true
    }
  }, [])

  // Don't render if authenticated but collection is empty (loading is done)
  if (!loading && (!stats || stats.total === 0)) return null

  const maxSport = Math.max(1, ...(stats?.bySport.map((s) => s.count) ?? [1]))
  const maxBrand = Math.max(1, ...(stats?.byBrand.map((b) => b.count) ?? [1]))
  const maxYear = Math.max(1, ...(stats?.byYear.map((y) => y.count) ?? [1]))

  return (
    <div className="mb-6">
      <div className="bg-white/80 backdrop-blur-md border border-white/30 rounded-2xl shadow-lg overflow-hidden">
        {/* ── Header ── */}
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-between px-5 py-3.5 border-b border-white/30 hover:bg-white/30 transition-colors group"
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand collection stats' : 'Collapse collection stats'}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-blue-600 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            <span className="text-sm font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-indigo-700 bg-clip-text text-transparent">
              Collection Stats
            </span>
            {!loading && stats && (
              <span className="text-xs text-gray-400 font-medium">
                · {stats.total.toLocaleString()} cards
              </span>
            )}
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-transform duration-200 ${
              collapsed ? '-rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* ── Collapsible body ── */}
        {!collapsed && (
          <>
            {loading ? (
              <SkeletonDashboard />
            ) : stats ? (
              <div className="p-5 space-y-6">
                {/* ── Overview stat cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Cards"
                    value={stats.total}
                    color="#3b82f6"
                    icon={
                      <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M4 6a2 2 0 012-2h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Rookie Cards"
                    value={stats.rookieCount}
                    color="#f97316"
                    icon={
                      <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Autographs"
                    value={stats.autographCount}
                    color="#8b5cf6"
                    icon={
                      <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    }
                  />
                  <StatCard
                    label="Patches"
                    value={stats.patchCount}
                    color="#10b981"
                    icon={
                      <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    }
                  />
                </div>

                {/* ── Sport + Brand breakdown ── */}
                {(stats.bySport.length > 0 || stats.byBrand.length > 0) && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                    {stats.bySport.length > 0 && (
                      <div>
                        <SectionHeader>By Sport</SectionHeader>
                        <div className="space-y-2">
                          {stats.bySport.map((s) => (
                            <HorizontalBar
                              key={s.name}
                              name={s.name}
                              count={s.count}
                              max={maxSport}
                              color={sportColor(s.name)}
                            />
                          ))}
                        </div>
                      </div>
                    )}

                    {stats.byBrand.length > 0 && (
                      <div>
                        <SectionHeader>By Brand</SectionHeader>
                        <div className="space-y-2">
                          {stats.byBrand.map((b) => (
                            <HorizontalBar
                              key={b.name}
                              name={b.name}
                              count={b.count}
                              max={maxBrand}
                              color="#6366f1"
                              labelWidth="w-28"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Year distribution ── */}
                {stats.byYear.length > 0 && (
                  <div>
                    <SectionHeader>By Year</SectionHeader>
                    <div className="relative">
                      {/* Vertical bar chart — horizontally scrollable */}
                      <div className="flex items-end gap-1.5 overflow-x-auto pb-6 pt-1 min-h-[72px]">
                        {stats.byYear.map((y) => {
                          const barH = maxYear > 0 ? Math.max(4, Math.round((y.count / maxYear) * 48)) : 4
                          return (
                            <div
                              key={y.year}
                              className="flex flex-col items-center gap-0.5 shrink-0 group/bar"
                              style={{ minWidth: 26 }}
                            >
                              {/* Count tooltip on hover */}
                              <span className="text-[9px] font-bold text-blue-600 opacity-0 group-hover/bar:opacity-100 transition-opacity tabular-nums">
                                {y.count}
                              </span>
                              <div
                                className="w-4 rounded-t-sm bg-gradient-to-t from-blue-500 to-indigo-400 hover:from-blue-400 hover:to-indigo-300 transition-colors cursor-default"
                                style={{
                                  height: `${barH}px`,
                                  transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                                }}
                                title={`${y.year}: ${y.count} card${y.count !== 1 ? 's' : ''}`}
                              />
                              <span
                                className="text-[9px] text-gray-400 leading-none"
                                style={{
                                  writingMode: 'vertical-rl',
                                  transform: 'rotate(180deg)',
                                }}
                              >
                                {y.year}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Top Sets / Series groupings ── */}
                {stats.topSets.length > 0 && (
                  <div>
                    <SectionHeader>Top Sets</SectionHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                      {stats.topSets.map((s) => (
                        <div
                          key={s.label}
                          className="flex items-center justify-between gap-3 py-1 border-b border-white/20"
                        >
                          <span className="text-xs text-gray-700 truncate leading-snug">{s.label}</span>
                          <span className="text-[11px] font-bold text-gray-600 shrink-0 bg-gray-100/70 px-2 py-0.5 rounded-full tabular-nums">
                            {s.count}
                          </span>
                        </div>
                      ))}
                    </div>
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
