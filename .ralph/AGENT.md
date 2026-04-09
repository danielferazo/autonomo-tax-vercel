# Ralph Agent Configuration — autonomo-tax

## Build Instructions

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start dev server (runs on http://localhost:5173)
npm run dev
```

## Test Instructions

```bash
# Run unit tests (Vitest)
npm run test

# Run tests with coverage
npm run test:coverage

# Run e2e tests (Playwright)
npm run test:e2e
```

## Run Instructions

```bash
# Development mode
npm run dev

# Production preview (after build)
npm run preview
```

## Environment Setup

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ANTHROPIC_API_KEY=your-claude-api-key
```

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (PostgreSQL + Auth + Storage)
- Anthropic API key for Claude

## Key Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run test` | Run Vitest unit tests |
| `npm run lint` | Run ESLint |