# Card Collector Pro — Product Vision & Strategy

> **The operating system for sports card collecting.**
> One sentence: Transform the fragmented, physical hobby of card collecting into a connected, intelligent, living digital experience.

---

## 1. What We're Building

Card Collector Pro is a collector-first platform that sits at the intersection of portfolio tracker, digital binder, social showcase, and market intelligence hub. It is not a marketplace that happens to show collections — it is a **personal card museum** that happens to support trading, selling, and community.

The platform eliminates the single biggest friction point in the hobby: the gap between owning physical cards and knowing what you have, what it's worth, and what to do with it. Point your phone at a card, and in seconds it becomes a tracked digital asset with real-time context.

---

## 2. Core Problem

Collectors have shoeboxes full of cards but no efficient way to catalog, value, track, organize, or share them. The existing landscape is fragmented:

- **TCDB**: Comprehensive database, feels like a spreadsheet from 2005
- **CollX**: Decent card recognition, weak community and UX
- **Market Movers**: Good analytics, limited collection management
- **Sports Card Investor**: Great content, not a platform
- **eBay**: Marketplace, not a collector tool

No single product combines smart AI recognition, clean modern UX, real-time sports integration, market intelligence, and community engagement. That's the gap.

---

## 3. The Three Pillars

### Pillar 1 — AI as the Bridge Between Physical and Digital

The card recognition pipeline is the **onramp** that eliminates manual cataloging:

- Upload or photograph a card → AI reads everything (player, set, year, brand, card number, parallels, attributes)
- Automatic detection of rookie cards, autographs, patches, numbered cards, and variations
- Removes all manual entry friction, converting passive ownership into active curation

**Current implementation**: GPT-4o Vision via Edge Runtime SSE streaming. Single API call handles both image reading and structured data extraction. No Google Vision, no separate OCR step.

**Future direction**: Batch scanning (point at a stack), condition grading assistance, parallel/variation detection, and continuous accuracy improvement as the scan volume grows.

### Pillar 2 — Data-Driven Intelligence

By combining multiple data streams, the platform becomes predictive rather than reactive:

- **Live sports data**: Scores, player performance, injuries, trades
- **Market data**: eBay sold listings, auction results, trending cards
- **Collection data**: What collectors are buying, selling, and watching
- **Social sentiment**: Community discussions, expert opinions

This creates actionable intelligence:
- "This player just got traded to a contender — his cards are up 23% in the last hour"
- "Rookie cards from this set historically spike 6 months after release"
- "Cards you own that are trending upward based on playoff performance"

### Pillar 3 — Community as the Competitive Moat

The platform is a **destination**, not just a tool:

- Shareable collections that become social status symbols (player PCs, team builds, set completions, rainbow chases)
- Community-driven price verification, condition assessment, and authenticity confirmation
- Engagement loops: watching live sports → checking card values → sharing with community → curating better collections

---

## 4. Product Phases

### Phase 1 — Collection Foundation (Current Focus)

**If this part isn't smooth, nothing else matters.**

- Upload cards via AI recognition pipeline ✅ (working, needs upload bug fix)
- Store cards cleanly with rich metadata and dual images ✅
- Manage a personal collection with CRUD, inline editing, condition tracking ✅
- Authentication (email/password + Google OAuth) ✅
- Professional card database with search and filtering ✅
- Mobile camera integration with card frame guides ✅

**Immediate priority**: Fix the 400 Bad Request upload error blocking the AI pipeline.

### Phase 2 — Collection Experience

- Gallery-style collection views (not a spreadsheet)
- Organization tools: binders, decks, lists, tags, custom groupings
- Set completion tracking with progress indicators
- Shareable public collection pages via simple links
- Player PC (personal collection) showcases
- Collection value dashboard with total value, gains/losses, rarity breakdown

### Phase 3 — Market Intelligence

- Price tracking via eBay sold data and auction results
- Price history charts and comparable sales
- Collection valuation with real-time updates
- Price alerts and trending card notifications
- "Robinhood for cards" portfolio view

### Phase 4 — Live Sports Integration (Unique Differentiator)

- Real-time scores and player stats
- Tie player performance directly to card values
- Push notifications: "Your rookie QB just threw 4 TDs — card up 12%"
- Historical performance-to-value correlation patterns
- Game-day engagement features

### Phase 5 — Community & Social

- Follow other collectors, share pulls, show off collections
- Trade board: mark cards as "for trade" or "ISO" (in search of)
- Community-driven data: price verification, condition consensus, authenticity
- Collector profiles with reputation and trading history
- Card show meetup facilitation

### Phase 6 — Marketplace & Monetization

- Built-in buy/sell/trade functionality
- Marketplace commissions on transactions
- Premium features: advanced analytics, price alerts, early market trends, bulk import
- Professional services: insurance valuations, authentication partnerships
- Data licensing to card manufacturers, sports leagues, auction houses

---

## 5. The Flywheel

Each new user makes the platform more valuable for everyone:

1. **More scans → smarter AI** — recognition accuracy improves with volume
2. **More transactions → better pricing** — market data becomes more accurate and predictive
3. **More collectors → stickier community** — more trading opportunities, harder to leave
4. **Better data → more trust** — collectors rely on it as their source of truth

---

## 6. The Data Asset

The hidden gold mine: the most comprehensive real-time database of sports card ownership, values, and market movements. This data becomes valuable to card manufacturers (what to print), sports leagues (fan engagement), auction houses (market timing), financial institutions (alternative asset valuations), and advertisers (engaged sports fans with disposable income).

---

## 7. Mobile-First Strategy

The mobile experience captures moments of peak engagement:

- **Watching a game** → player performs → check card value right now
- **At a card show** → scan a card you're considering → instant comp prices
- **Opening a pack** → scan as you pull → instant value gratification
- **With a friend** → "I have that card!" → instant social connection

The app becomes part of **experiencing the hobby**, not just managing it.

---

## 8. Technical Foundation

### Current Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage) with Row-Level Security
- **Database**: PostgreSQL (tables: users, cards, user_cards, card_uploads)
- **AI**: OpenAI GPT-4o Vision — single-call extraction, no separate OCR
- **Storage**: card-uploads (private), card-images (public), avatars (public)
- **Hosting**: Vercel (Hobby plan) with Edge Runtime for streaming
- **Auth**: Email/password + Google OAuth via @supabase/ssr

### Key Architecture Decisions
- Edge Runtime + SSE streaming to handle GPT-4o Vision's 15-30s processing within Vercel Hobby limits
- Cookie-based sessions via @supabase/ssr (not @supabase/supabase-js createClient)
- Client creates upload records and passes pre-signed URLs to the Edge function
- No Google Cloud Vision, no Docker, no Supabase Edge Functions

### Guardrails (Do Not)
- Do not use Google Cloud Vision API
- Do not use Docker or Supabase Edge Functions
- Do not use Node.js Buffer in Edge routes (use ArrayBuffer/Uint8Array/btoa)
- Do not use @supabase/supabase-js storage .download() in Edge Runtime
- Do not use getPublicUrl on card-uploads bucket (it's private)
- Do not use waitUntil() or after() for background processing on Vercel Hobby

---

## 9. Success Metrics

### Phase 1 (Foundation)
- Cards can be uploaded and recognized in <15 seconds
- AI extraction accuracy >90% on major sports card brands
- Zero-friction signup to first card uploaded in <2 minutes

### Phase 2+ (Growth)
- User activation: 60%+ upload first card in first session
- Retention: 40% Day 7, 20% Day 30
- Collection size: average 50+ cards per active user within 30 days
- Community: NPS >50

### Long-term
- LTV:CAC ratio >3:1
- Become the default "where's my collection?" answer for collectors
- Data asset value exceeding the consumer product value

---

## 10. Competitive Positioning

Card Collector Pro is the **first platform to combine all four**:

1. **Smart AI recognition** (CollX-quality scanning)
2. **Real-time sports integration** (unique differentiator no competitor has)
3. **Marketplace functionality** (competitive necessity)
4. **Community engagement** (the moat)

The vision: **Sports card collecting meets social network meets Bloomberg Terminal** — as engaging, social, and intelligent as fantasy sports, transforming a lonely physical hobby into a connected, data-driven community experience.

---

## 11. Agent Team Structure for Development

Based on the Agency Agents NEXUS framework, here is how to organize multi-agent development for Card Collector Pro. This uses NEXUS-Sprint mode (skip Phase 0 discovery — market is validated).

### Team Alpha — Core Product (Sprint Cadence)

**Mission**: Build and ship the collection platform.

| Agent Role | Responsibility | Tools |
|-----------|---------------|-------|
| **Agents Orchestrator** | Pipeline management, Dev↔QA loops, task routing | Claude Code orchestration |
| **Senior Project Manager** | Spec-to-task conversion, sprint planning, scope management | Task lists, acceptance criteria |
| **Backend Architect** | API design, database schema, Supabase configuration, Edge routes | Supabase, PostgreSQL, Vercel |
| **Frontend Developer** | React/Next.js UI, responsive design, component architecture | Next.js 15, Tailwind, React 19 |
| **AI Engineer** | GPT-4o Vision pipeline, extraction accuracy, prompt engineering | OpenAI API, Edge Runtime |
| **Evidence Collector** | QA validation, screenshot proof, regression testing | Browser testing, Vercel preview |
| **Reality Checker** | Integration verification, production readiness gates | End-to-end testing |

**Workflow**: Sprint Prioritizer sets tasks → Developers implement → Evidence Collector validates → Orchestrator routes PASS/FAIL → iterate.

### Team Beta — Data & Intelligence (Phase 3+)

**Mission**: Build the market intelligence and sports integration layers.

| Agent Role | Responsibility |
|-----------|---------------|
| **Backend Architect** | eBay API integration, sports data feeds, price history storage |
| **AI Engineer** | Price prediction models, trend detection, sentiment analysis |
| **Data Analytics Reporter** | Dashboard design, KPI tracking, market data pipelines |
| **API Tester** | Data feed reliability, endpoint validation |

### Team Gamma — Growth & Community (Phase 5+)

**Mission**: Build the social layer and drive user acquisition.

| Agent Role | Responsibility |
|-----------|---------------|
| **Growth Hacker** | Viral loops, referral mechanics, funnel optimization |
| **UX Researcher** | User interviews, persona validation, journey mapping |
| **Content Creator** | Launch content, collector education, community content |
| **Reddit Community Builder** | Authentic engagement in r/baseballcards, r/sportscards, etc. |
| **Brand Guardian** | Visual identity, brand consistency across all touchpoints |

### Team Delta — Quality & Operations (Continuous)

**Mission**: Keep everything running and improving.

| Agent Role | Responsibility |
|-----------|---------------|
| **DevOps Automator** | CI/CD, Vercel deployments, monitoring |
| **Infrastructure Maintainer** | Supabase health, storage management, performance |
| **Performance Benchmarker** | Load testing, Core Web Vitals, AI pipeline latency |
| **Analytics Reporter** | User behavior tracking, collection growth metrics |

### How to Activate

**For immediate work (NEXUS-Micro)**:
Activate 2-4 agents for a targeted task. Example for fixing the upload bug:
```
Backend Architect → diagnose 400 error
Frontend Developer → fix client-side upload flow
Evidence Collector → verify fix in production
```

**For feature sprints (NEXUS-Sprint)**:
Activate Team Alpha for 2-week sprints. Sprint Prioritizer pulls from the Phase 2 backlog. Agents Orchestrator manages the Dev↔QA loop.

**For full product phases (NEXUS-Full)**:
Activate all teams when entering Phase 3+. Teams Alpha and Delta run continuously; Beta and Gamma activate at their respective phase triggers.

### Handoff Protocol

Every agent-to-agent handoff carries:
1. **What was done** (deliverable + evidence)
2. **What's needed next** (clear acceptance criteria)
3. **Context** (relevant files, decisions, constraints)
4. **Quality status** (PASS/FAIL with proof)

Use the NEXUS Handoff Template format from `strategy/coordination/handoff-templates.md`.

---

## 12. Authenticated Homepage — The Sports Hub Experience

> **The homepage is the product's heartbeat.** After authentication, the user should feel like they've landed inside a living, breathing sports command center built specifically around them — not a generic feed, not a card spreadsheet.

The inspiration is The Athletic meets Bleacher Report meets a personal card portfolio. Every element on the page is filtered through the user's preferences. Nothing generic, nothing irrelevant.

---

### 12.1 — Onboarding Preference System (Gate to Personalization)

Before a new user ever sees the homepage, a lightweight onboarding flow captures the preferences that power everything:

**Step 1 — Pick your sports** (multi-select: NHL, NBA, NFL, MLB, MLS, etc.)
**Step 2 — Pick your teams** (filtered to selected sports)
**Step 3 — Pick favorite players** (optional, searchable, filtered to selected teams)
**Step 4 — Collection prompt** ("Add your first card" or "Skip for now")

These preferences are stored in a `user_preferences` table and immediately drive:
- Which scores appear in the live score scroller
- Which news stories populate the feed
- Which Kalshi markets surface in the markets scroller
- Which card alerts get triggered (Phase 4 Live Sports Integration)

Users can update preferences at any time from their profile settings. Additionally, as they favorite players and teams from within the app (news cards, score cards, player pages), those signals feed back into their preference profile automatically.

**Design principle**: Never show a user a score, story, or market that has nothing to do with their sports. The competitor failure mode (Bleacher Report's most-complained-about issue) is showing irrelevant scores. We solve this at onboarding, not after the fact.

---

### 12.2 — Homepage Layout

The homepage has two distinct layouts depending on screen size, but the same content hierarchy on both.

#### Mobile Layout (primary surface)

```
┌─────────────────────────────────────┐
│  [Sticky: Sport/Team tab switcher]  │  ← One-tap switch between followed sports/teams
├─────────────────────────────────────┤
│  [Live Scores Strip]                │  ← Horizontal scroller, YOUR sports only
├─────────────────────────────────────┤
│  [Kalshi Markets Strip]             │  ← Horizontal scroller, algorithmically relevant
├─────────────────────────────────────┤
│                                     │
│  [Main Content Feed]                │  ← Alternating news cards + video cards
│  - News story card                  │
│  - Video card (YouTube embed)       │
│  - News story card                  │
│  - Card Collection pulse widget     │  ← Your cards, surfaced when relevant
│  - News story card                  │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  Feed | Scores | Cards | Search | ⚙ │  ← Bottom nav
└─────────────────────────────────────┘
```

**Key mobile decisions:**
- The scores and Kalshi scrollers are intentionally separate strips (not tabbed) because they serve different cognitive modes — scores are passive awareness, markets are active interest
- Video cards link to YouTube (no licensing required, no self-hosting)
- The collection pulse widget is not a fixed position — it surfaces contextually within the feed when there's something relevant to show (e.g., after a game result that affects a card the user owns)

#### Desktop Layout (3-column)

```
┌──────────────┬───────────────────────┬──────────────┐
│              │  [Score + Kalshi bar] │              │
│  LEFT RAIL   │  [Hero video/story]   │  RIGHT RAIL  │
│              │                       │              │
│  News Feed   │  Featured story card  │  Live Scores │
│  (your       │                       │              │
│  teams/      │  Card Collection      │  Kalshi      │
│  sports)     │  Pulse Widget         │  Markets     │
│              │                       │  Feed        │
│  Story cards │  More news/video      │              │
│  continue    │  cards                │  Standings   │
│  scrolling   │                       │              │
└──────────────┴───────────────────────┴──────────────┘
```

**Key desktop decisions:**
- Left rail = news (text-first, how users scan left-to-right)
- Center = video hero + featured content + collection widget (the unique value of the platform)
- Right rail = scores + Kalshi + standings (data at a glance)
- This mirrors how ESPN's 3-column layout works but with the collection widget as the center differentiator

---

### 12.3 — Live Scores Scroller

- Pulls from SportsRadar (already in the tech stack plan)
- Filtered strictly to sports and teams from `user_preferences`
- Shows: team abbreviations, score, game status (Live / Final / Upcoming + tip-off time)
- Clicking a score card expands to full game detail or links to game page
- On mobile: horizontal scroll strip pinned below the tab switcher
- On desktop: right rail section, auto-refreshing

---

### 12.4 — Kalshi Markets Feed (Read-Only Integration)

Kalshi is a regulated prediction market platform. The integration is intentionally read-only — no account linking, no financial data handled by this platform.

**How it works:**
- Pull public Kalshi market data via their API
- Filter and rank markets algorithmically based on `user_preferences` (sport, team, player matches)
- Surface the most relevant markets as scrollable cards
- Clicking a market card opens Kalshi's site/app directly in a new tab where users can trade on their own account

**Market selection algorithm (v1 — simple):**
1. Exact team match (e.g., "Will the Wild make the playoffs?") → highest priority
2. Sport match (e.g., "Will the NHL season be extended?") → medium priority
3. Broad sports/trending markets → fill remaining slots

**Card format:**
```
┌──────────────────────────────────┐
│ 🏒 Will the Wild win tonight?    │
│ YES 67¢  |  NO 33¢              │
│ 1,240 contracts traded           │
│                [Trade on Kalshi →]│
└──────────────────────────────────┘
```

**What we explicitly do not do:**
- No account linking
- No financial transaction handling
- No display of user's Kalshi positions
- No "buy/sell" functionality within the platform

This keeps the integration clean, legally simple, and fast to build while still being genuinely useful.

---

### 12.5 — News Feed

- Aggregated from sports news APIs (e.g., ESPN API, NewsAPI with sports filter, or SportsRadar news endpoints)
- Filtered to user's teams and sports from `user_preferences`
- Displayed as cards: headline, source, thumbnail image, timestamp
- Relevant news cards can be linked to cards in the user's collection where a direct player/team match exists (e.g., a Kaprizov injury story surfaces alongside his cards in the collection)
- Video cards embedded from YouTube: search YouTube Data API for "[team name] highlights" or "[player name] highlights" — no licensing required, links out to YouTube for playback

**News-to-collection linking logic (simple v1):**
- Extract player names and team names from news headline/tags
- Cross-reference against `user_cards` table for matching `player_name` or `team`
- If match found, append a "You own X cards featuring this player" chip to the news card

---

### 12.6 — Card Collection Pulse Widget

This is the homepage feature that makes Card Collector Pro feel unlike anything else in the market. It turns the user's collection from a static inventory into a living, reactive display.

**Phase 1 implementation (current target — sports trigger only, no price data):**

A background job runs after every completed game in the user's followed sports:
1. Pull final game stats from SportsRadar for all players in that game
2. Query `user_cards` for any card whose `player_name` matches a player who had a notable performance (defined below)
3. If match found, write an alert row to `card_alerts` table
4. Homepage reads `card_alerts` on load and surfaces undismissed alerts in the widget

**"Notable performance" triggers (v1 — configurable):**
- Goals/points above a threshold (e.g., 2+ goals in hockey, 25+ points in basketball)
- Team wins a playoff game
- Player records a milestone (hat trick, triple-double, etc.)
- Team clinches a playoff spot or division

**Alert card format:**
```
┌────────────────────────────────────────┐
│ 🔥  Kirill Kaprizov — 2 Goals Tonight  │
│     Wild win 3-1 vs Dallas             │
│     You own 3 of his cards             │
│                    [View Cards]  [✕]   │
└────────────────────────────────────────┘
```

**DB additions required:**
```sql
-- user_preferences table
user_id          uuid references users
favorite_sports  text[]
favorite_teams   text[]
favorite_players text[]
created_at       timestamptz
updated_at       timestamptz

-- card_alerts table
id               uuid primary key
user_id          uuid references users
card_id          uuid references user_cards (nullable — alert can be team-level)
alert_type       text  -- 'player_performance' | 'team_win' | 'milestone'
player_name      text
team_name        text
message          text
game_date        date
dismissed        boolean default false
created_at       timestamptz
```

**Phase 2 (future — adds price signals):**
- Add eBay sold listing API queries for cards in the collection
- Detect price deltas week-over-week
- Combine sports trigger + price movement into a richer alert: *"Kaprizov had 2 goals tonight — his rookie cards are up 18% this week on eBay"*

**Phase 3 (future — full intelligence feed):**
- Injury/trade alerts from SportsRadar news feed
- Playoff performance correlation patterns
- "Cards to watch" recommendations based on upcoming schedules

---

### 12.7 — Homepage Personalization Philosophy

The homepage should feel like it was built for one person. Design principles to enforce this:

1. **Never show irrelevant scores.** If the user follows NHL and NFL only, they never see an NBA score.
2. **Content density over whitespace.** Bleacher Report's most-cited complaint is excessive whitespace. Pack information intelligently.
3. **Dark mode default.** Consistent with The Athletic's aesthetic — dark palette feels premium, reduces eye strain during night games.
4. **Dismissable alerts, not notification spam.** The collection pulse widget should feel like a helpful nudge, not an alert system. Everything is dismissable with a single tap.
5. **Progressive disclosure.** Score strip → tap → full game. Alert card → tap → full collection view. News card → tap → full story. Nothing dumps you into an overwhelming detail page without invitation.
6. **Preference refinement over time.** As users interact — favoriting players, dismissing irrelevant alerts, clicking certain sport tabs more than others — those signals can feed back into the preference model in Phase 3+.

---

*This section documents decisions made during product design sessions and represents the intended homepage experience for authenticated users. Implementation begins during Phase 2 (Collection Experience) for layout and onboarding, with the Card Pulse Widget and Kalshi feed targeting Phase 4 (Live Sports Integration).*

---

*This document is the single source of truth for Card Collector Pro's vision, strategy, and development approach. All agents and contributors should reference it to stay aligned.*
