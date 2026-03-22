'use client'

import AuthButton from '@/components/AuthButton'
import Link from 'next/link'

export default function Home() {
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
        <span
          className="text-base font-semibold"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
        >
          Card Collector Pro
        </span>
        <AuthButton />
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-12">
          <p
            className="text-xs font-semibold tracking-widest uppercase mb-4"
            style={{ color: 'var(--color-accent)', letterSpacing: '0.12em' }}
          >
            The Operating System for Serious Collectors
          </p>
          <h1
            className="text-4xl md:text-5xl mb-5 leading-tight"
            style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)' }}
          >
            Your physical cards,<br />tracked with precision.
          </h1>
          <p className="text-base max-w-xl leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            Point your phone at a card. In seconds it becomes a tracked digital asset
            with metadata, condition history, and real-time context. No manual entry.
            No spreadsheets.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-16">
          <Link
            href="/upload"
            className="flex flex-col gap-3 p-5 transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
            }}
          >
            <div style={{ color: 'var(--color-accent)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Add a Card</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                AI reads player, set, year, brand, and attributes in one shot.
              </div>
            </div>
          </Link>

          <Link
            href="/collection"
            className="flex flex-col gap-3 p-5 transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
            }}
          >
            <div style={{ color: 'var(--color-accent)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>My Collection</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Gallery view, set tracking, condition history, and stats.
              </div>
            </div>
          </Link>

          <Link
            href="/cards"
            className="flex flex-col gap-3 p-5 transition-all"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: '4px',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border)'
            }}
          >
            <div style={{ color: 'var(--color-accent)' }}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-semibold mb-1" style={{ color: 'var(--color-text)' }}>Browse Database</div>
              <div className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                Search by player, team, year, brand, or card number.
              </div>
            </div>
          </Link>
        </div>

        {/* Stats strip */}
        <div
          className="grid grid-cols-3 divide-x"
          style={{
            background: 'var(--color-surface)',
            border: '1px solid var(--color-border)',
            borderRadius: '4px',
          }}
        >
          {[
            { value: '10M+', label: 'Cards in database' },
            { value: 'GPT-4o', label: 'AI recognition' },
            { value: 'Secure', label: 'Cloud storage' },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center py-5 px-4 gap-1">
              <span
                className="text-lg font-semibold"
                style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-accent)' }}
              >
                {stat.value}
              </span>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
