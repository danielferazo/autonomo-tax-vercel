---
phase: "01"
plan: "01"
subsystem: foundation
tags: [supabase, auth, vite, react, typescript]
dependency_graph:
  requires: []
  provides: [auth, supabase-client, database-schema, tab-navigation]
  affects: [phase-2, phase-3]
tech_stack:
  added: [vite, react, typescript, @supabase/supabase-js, @supabase/ssr]
  patterns: [paper-form aesthetic, RLS policies, tab-state navigation]
key_files:
  created:
    - src/App.tsx
    - src/main.tsx
    - src/styles/design-system.css
    - src/styles/global.css
    - src/components/TabNav.tsx
    - src/pages/Auth.tsx
    - src/lib/supabase.ts
    - src/types/database.ts
    - supabase/config.toml
    - supabase/migrations/001_initial_schema.sql
    - .env.example
    - package.json
    - vite.config.ts
    - tsconfig.json
    - tsconfig.node.json
    - index.html
decisions:
  - id: D-10
    decision: No React Router - tab-based navigation using React state
    rationale: SPA simplicity, per plan constraint
  - id: D-11
    decision: Tab order locked as Invoices | Expenses | Modelo 303 | Modelo 130 | Summary | Profile
    rationale: Per plan specification
  - id: D-12/D-13
    decision: Storage buckets for invoices and receipts with RLS policies
    rationale: Supabase Storage with foldername-based user isolation
metrics:
  duration: "~15 minutes"
  completed: "2026-04-09"
---

# Phase 01 Plan 01: Foundation Summary

## One-liner
Vite + React + TypeScript project scaffolded with paper-form design system, Supabase local project initialized, database migrations created, and email/password auth with tab navigation wired.

## Completed Tasks

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Vite + React + TypeScript scaffold | 4d668f7 | package.json, vite.config.ts, tsconfig.json, index.html, src/main.tsx, src/App.tsx, src/styles/design-system.css, src/styles/global.css |
| 2 | Supabase local init + migrations | b59e272, dcff9bf | supabase/config.toml, supabase/migrations/001_initial_schema.sql, .env.example |
| 3 | Auth page + TabNav + Supabase client | 929c91b, 4f2b23c | src/components/TabNav.tsx, src/pages/Auth.tsx, src/lib/supabase.ts, src/types/database.ts |

## What Was Built

### Task 1: Vite + React + TypeScript Scaffold
- Vite project with React + TypeScript template
- `@supabase/supabase-js` and `@supabase/ssr` installed
- `design-system.css` with exact paper-form colors from MASTER.md:
  - `--color-bg: #F5F0E8` (beige paper background)
  - `--color-header: #1A1A2E` (dark navy like Spanish tax forms)
  - IBM Plex Sans + IBM Plex Mono fonts via Google Fonts
- `global.css` with base component styles (card, input, btn-primary, btn-secondary, btn-danger, select, banner)
- `App.tsx` with tab-based shell using React state (no React Router)
- 6 tabs: Invoices | Expenses | Modelo 303 | Modelo 130 | Summary | Profile

### Task 2: Supabase Local Project + Migrations
- `npx supabase init` ran successfully, created `supabase/config.toml`
- `001_initial_schema.sql` creates:
  - `profiles` table with nif, home_office_pct (default 20%)
  - `invoices` table with full PROJECT.md schema (number, date, date_paid, client, currency, gross_orig, fx_rate, gross_eur, iva_collected, irpf_retained, quarter, year)
  - `expenses` table with category, description, gross, iva_paid, deduct_pct, is_fixed, quarter, year
  - `quarterly_summaries` for Modelo 303/130 YTD carryforward
  - RLS policies on all tables enforcing `auth.uid() = user_id`
  - Auto-create profile trigger on `auth.users` INSERT
  - Storage buckets: `invoices` and `receipts` with foldername-based RLS policies
- `.env.example` with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ANTHROPIC_API_KEY

### Task 3: Auth Page + TabNav + Supabase Client
- `src/lib/supabase.ts` - Supabase client singleton with env var fallback to localhost
- `src/types/database.ts` - TypeScript interfaces: Profile, Invoice, Expense, QuarterlySummary
- `src/components/TabNav.tsx` - Tab navigation with dark header active state, cursor-pointer, 150ms transitions
- `src/pages/Auth.tsx` - Email/password login + signup with tab toggle, error handling, success callback

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None introduced in this phase.

## Known Stubs

None identified in this phase.

## Verification

- `npm run dev` starts Vite dev server on port 5173
- Auth page renders with Login/Signup tabs
- TabNav renders all 6 tabs: Invoices | Expenses | Modelo 303 | Modelo 130 | Summary | Profile
- Supabase client initializes without throwing (warns about missing env vars)
- Migration SQL contains all required tables and RLS policies
- Design system uses paper-form aesthetic: beige bg (#F5F0E8), dark headers (#1A1A2E)

## Self-Check: PASSED

All files exist, all commits verified, no missing items.
