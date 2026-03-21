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

*This document is the single source of truth for Card Collector Pro's vision, strategy, and development approach. All agents and contributors should reference it to stay aligned.*
