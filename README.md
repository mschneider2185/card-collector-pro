# Card Collector Pro

A modern trading card collection management platform built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Features

### ✅ Implemented (Phase 1 MVP)
- **User Authentication**: Email/password and Google OAuth through Supabase Auth
- **Card Upload System**: Upload photos of card fronts and backs
- **AI-Powered Card Recognition**: Automatic card data extraction using OCR and LLM processing
- **Personal Collection Management**: View, organize, and manage your card collection
- **Card Database**: Browse and search through the master card database
- **Responsive Design**: Fully responsive UI with modern glassmorphism design
- **Card Attributes**: Support for rookie cards, autographs, patches, condition tracking

### 🔧 Current Status
The application is fully functional with a complete Phase 1 MVP implementation including:
- Beautiful, modern UI with gradient backgrounds and glass-morphism effects
- Full CRUD operations for user collections
- Advanced image processing pipeline with OCR and AI extraction
- Comprehensive card database with search and filtering
- Secure file storage and user authentication

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS with custom gradient designs
- **Backend**: Supabase (Auth, Database, Storage)
- **Database**: PostgreSQL with Row-Level Security
- **AI/ML**: OpenAI GPT for card data extraction, Google Vision for OCR
- **Image Processing**: Custom preprocessing pipeline

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account and project
- OpenAI API key (optional, for AI features)
- Google Cloud Vision API key (optional, for enhanced OCR)

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
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENAI_API_KEY=your_openai_api_key
GOOGLE_CLOUD_VISION_API_KEY=your_google_vision_key
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Database Setup

The application uses Supabase with the following schema:
- `users` - Extended user profiles
- `cards` - Master card database
- `user_cards` - User collection entries
- `card_uploads` - Upload tracking and AI processing results

See `database_schema.md` and the SQL files in the project root for complete schema details.

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

### Card Upload & AI Processing
- Drag-and-drop interface for front/back card images
- Advanced image preprocessing (contrast, sharpening, noise reduction)
- OCR text extraction from card images
- LLM-powered structured data extraction
- Confidence scoring and manual review workflow
- Automatic card database updates

### Collection Management
- Personal card inventory with quantities and conditions
- Card condition tracking (Mint, Near Mint, etc.)
- Notes and acquisition date tracking
- Modal-based detailed card views
- Remove cards from collection
- Side-by-side front/back image display

### Card Database
- Search by player name, brand, or series
- Filter by sport and year
- Grid-based card display with hover effects
- Add cards from database to personal collection
- Comprehensive card details with attributes

### Authentication
- Supabase Auth integration
- Email/password and Google OAuth
- Automatic user profile creation
- Secure session management
- Protected routes for authenticated features

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
