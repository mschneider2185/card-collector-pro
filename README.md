# Card Collector Pro

A sophisticated trading card collection management platform built with Next.js 15, TypeScript, Tailwind CSS, and Supabase. Features comprehensive AI-powered card recognition, mobile camera integration, and professional collection management tools.

## Features

### ✅ Production-Ready Implementation
- **Multi-Provider Authentication**: Email/password and Google OAuth with automatic user profile creation
- **Mobile Camera Integration**: Native camera access with card frame guides and high-quality capture
- **Advanced AI Processing**: OCR text extraction + LLM data structuring with confidence scoring
- **Professional Collection Management**: Full CRUD operations with inline editing and trade status tracking
- **Comprehensive Card Database**: Advanced search, filtering, and discovery with real-time results
- **Dual Image Support**: Front and back card image upload with side-by-side viewing
- **Special Card Detection**: Automatic recognition of rookie cards, autographs, and patches
- **Modern UI/UX**: Glassmorphism design with responsive layouts and professional animations

### 🚀 Recent Enhancements
- **Mobile-First Camera Interface**: Full-screen camera with device switching and capture guides
- **Enhanced AI Processing**: Improved patch detection and special attribute recognition
- **Collection Management**: Inline editing, condition tracking, and acquisition date management
- **Professional Error Handling**: User-friendly messages with graceful fallbacks

## Tech Stack

- **Frontend**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS with glassmorphism design system
- **Backend**: Supabase (Auth, Database, Storage) with Row-Level Security
- **Database**: PostgreSQL with optimized schema and proper relationships
- **AI/ML**: OpenAI GPT-4o-mini for LLM extraction, Google Cloud Vision for OCR
- **Image Processing**: Canvas-based preprocessing with quality optimization
- **Mobile**: Native camera API integration with device switching

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key (optional, for real AI processing - graceful fallbacks included)
- Google Cloud Vision API key (optional, for enhanced OCR accuracy)

### Installation

1. Clone the repository and navigate to the app directory:
```bash
cd card-collector-pro
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with:
```env
# Required for basic functionality
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Optional for AI features (app works without these)
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLOUD_VISION_API_KEY=your_google_vision_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

**IMPORTANT**: Run `database_setup.sql` in your Supabase SQL Editor to create all required tables, triggers, and RLS policies.

The application uses a comprehensive schema:
- `users` - Extended user profiles with automatic creation triggers
- `cards` - Master card database with comprehensive metadata
- `user_cards` - Collection entries with condition tracking and trade status
- `card_uploads` - AI processing pipeline with confidence scoring

**Storage Buckets** (create in Supabase Dashboard):
- `card-uploads` (private) - User uploads for processing
- `card-images` (public) - Verified card images
- `avatars` (public) - User profile pictures

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
│   ├── api/            # API routes
│   ├── auth/           # Authentication pages
│   ├── cards/          # Card database browsing
│   ├── collection/     # User collection management
│   ├── upload/         # Card upload interface
│   └── page.tsx        # Home page
├── components/         # Reusable React components
├── lib/               # Utility functions and configurations
└── types/             # TypeScript type definitions
```

## Key Features Detail

### Mobile Camera Integration
- **Full-screen camera interface** with native device camera access
- **Front/back camera switching** with professional controls
- **Card frame overlay** with positioning guides for optimal capture
- **High-quality image capture** (ideal 1920x1080 resolution)
- **Mobile-optimized UI** with touch-friendly controls
- **Real-time error handling** with informative user feedback

### Advanced AI Processing Pipeline
- **Dual image processing** for front and back of cards
- **Image preprocessing** with canvas-based enhancement (contrast, sharpening, noise reduction)
- **OCR text extraction** using Google Cloud Vision with word-level accuracy
- **LLM data structuring** with OpenAI GPT-4o-mini and expert prompts
- **Special attribute detection** for rookie cards, autographs, and patches
- **Confidence scoring** and validation with manual review workflow
- **Graceful fallbacks** when AI services aren't configured

### Professional Collection Management
- **Responsive grid layout** with professional card display
- **Inline editing** with save/cancel functionality
- **Comprehensive tracking** - condition, quantity, trade status, notes
- **Side-by-side viewing** of front/back images in modals
- **Real-time updates** with optimistic UI patterns
- **Professional empty states** with actionable guidance

### Sophisticated Card Database
- **Advanced search** across player names, brands, and series with debounced queries
- **Multi-filter system** for sport, year, and special attributes
- **Real-time results** with efficient database operations
- **Professional card grid** with hover effects and loading states
- **One-click collection addition** with duplicate prevention
- **Comprehensive modal views** with full card information

### Enterprise-Grade Authentication
- **Multi-provider support** - Email/password and Google OAuth
- **Automatic user provisioning** with database triggers and fallbacks
- **Real-time auth state** management with session persistence
- **Modal-based UI** with portal rendering and proper z-index management
- **Protected routes** with comprehensive access control
- **OAuth callback handling** with proper redirect management

## Development Commands

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Contributing

The application is currently in active development. See `CLAUDE.md` for development guidelines and architecture details.

## License

This project is private and proprietary.
