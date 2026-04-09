# Autonomo Tax Prep — Project Brief

## Overview

A full-stack Spanish freelancer (autónomo) tax preparation application. It replaces manual spreadsheet work with an intelligent, guided UI that handles IVA (Modelo 303) and IRPF pago fraccionado (Modelo 130) calculations. The app parses invoice documents, tracks expenses with deduction percentages, converts USD/EUR using ECB rates, and produces the exact casilla values needed for Agencia Tributaria's Sede Electrónica.

**Target user:** Solo self-employed developer / freelancer in Spain, filing under Estimación Directa Simplificada.

## Superpowers Skills

This project uses the **obra/superpowers** agentic skills framework. Ralph MUST use these skills during implementation:
- **`brainstorming`** — Before writing any new feature, run `skill: brainstorming` to clarify what to build
- **`writing-plans`** — After brainstorming, use `skill: writing-plans` to create an implementation plan (TDD approach)
- **`subagent-driven-development`** — For complex features, use subagents for parallel work
- **`tdd`** — For features, follow RED-GREEN-REFACTOR: write test first, implement, refactor
- **`systematic-debugging`** — When encountering bugs, use `skill: systematic-debugging`
- **`verification-before-completion`** — Before marking a phase done, use `skill: verification-before-completion`
- **`requesting-code-review`** — After implementing major features, use `skill: requesting-code-review`

Skills activate automatically — invoke `skill: <name>` in context as needed.

## GSD (Get Shit Done) Context Engineering

This project also uses **gsd-build/get-shit-done** for structured context engineering and spec-driven development. Ralph MUST use these GSD skills during implementation:
- **`gsd-new-project`** — Initialize project structure (only needed once at start)
- **`gsd-plan-phase <n>`** — Create atomic task plans for each phase before execution
- **`gsd-execute-phase <n>`** — Execute phase plans in waves with fresh context per task
- **`gsd-verify-work <n>`** — Verify phase deliverables before moving to next phase
- **`gsd-next`** — Auto-detect and run next step in workflow
- **`gsd-discuss-phase <n>`** — Capture implementation preferences before planning
- **`gsd-roadmapper`** — Create/update project roadmap
- **`gsd-research-phase`** — Research ecosystem before planning

GSD runs alongside Superpowers — use GSD for structured context and phase planning, use Superpowers for TDD and code review workflows.

## Impeccable Frontend Design

This project uses **pbakaus/impeccable** for frontend design quality. Ralph MUST use these impeccable skills when implementing UI:

**Core design skills:**
- **`impeccable`** — Main skill with reference files (typography, color/OKLCH, spatial, motion, interaction, responsive, UX writing)
- **`audit`** — Audit existing UI for design issues before implementing
- **`normalize`** — Normalize CSS/design before building
- **`polish`** — Polish UI after implementation
- **`critique`** — Review UI against anti-patterns

**UI steering commands:**
- **`clarify`** — Clarify ambiguous design decisions
- **`distill`** — Simplify complex UI patterns
- **`colorize`** — Apply proper color and contrast
- **`typeset`** — Handle typography correctly
- **`shape`** — Spatial design and layout
- **`animate`** — Motion and animation design
- **`adapt`** — Responsive design adaptation
- **`optimize`** — Performance optimization
- **`harden`** — Accessibility improvements

**Design anti-patterns to avoid:** Inter font, purple gradients, cards nested in cards, gray text on colored backgrounds.

## Architecture

- **Frontend:** React (JSX), built with Vite. Single-page app, no SSR needed.
- **Backend:** Supabase (PostgreSQL) for persistent storage. Auth via Supabase Auth.
- **AI Parsing:** Anthropic Claude API ( Sonnet 4.6) for invoice/receipt OCR and extraction.
- **FX Rates:** ECB / Frankfurter API for USD→EUR conversion.
- **Storage:** Supabase database (not `window.storage` Chrome extension API).

### Supabase Schema (Phase 1)

Tables:

1. **`profiles`** — user profile (id, nif, home_office_pct, created_at)
2. **`invoices`** — id, user_id, number, date, date_paid, client, currency, gross_orig, fx_rate, fx_date, gross_eur, iva_collected, irpf_retained, quarter, year, filename, created_at
3. **`expenses`** — id, user_id, category, description, gross, iva_paid, deduct_pct, is_fixed, quarter, year, filename, created_at
4. **`quarterly_summaries`** — id, user_id, year, quarter, prior_ingresos, prior_gastos, prior_pagos, prior_retenciones, prior_303, m130_result, m303_result, created_at

### Key Expense Categories & Deduction Rules

| Category | Key | Deduct % | IVA Rate |
|---|---|---|---|
| Rent | rent | 20% (home office) | 0% |
| Electricity | electricity | 20% (home office) | 21% |
| Water | water | 20% (home office) | 0% |
| Internet | internet | 50% | 21% |
| Phone | phone | 50% | 21% |
| Cuota Autónomos | cuota | 100% | 0% |
| Software | software | 100% | 21% |
| Hardware | hardware | 100% | 21% |
| Other | other | 100% | 21% |

## Core Features

### 1. Invoice Management
- Upload PDFs or images → Claude AI extracts: number, date, client, gross, IVA, IRPF, currency
- Manual invoice entry with all fields
- Date Paid field determines which quarter the invoice counts toward
- USD invoices: auto-fetch ECB rate for invoice date, allow manual override
- Inline FX rate editing per invoice
- Sort and filter by quarter/year

### 2. Expense Management
- Upload receipts → Claude AI extracts: description, gross, IVA amount, category
- Manual expense entry with category selector
- "Fixed monthly" flag for recurring expenses (cuota autónomos, rent, etc.)
- Home office percentage affects rent/electricity/water deduction % dynamically

### 3. Modelo 303 (IVA)
- IVA devengado (output):Casilla 01 (num operations), 02 (base imponible), 03 (cuota repercotido)
- IVA deducible (input): Casilla 28 (base), 29 (cuota soportado)
- Result: Casilla 40, 41, 45 (difference), 64 (prior 303), 69 (final result)
- Prior 303 entries can be manually entered per quarter
- Net positive = amount to pay; negative = refund/carryforward

### 4. Modelo 130 (IRPF Pago Fraccionado)
- Cumulative YTD calculation
- Prior quarter fields: priorIngresos, priorGastos, priorPagos, priorRetenciones
- Casilla 01 (ingresos YTD), 02 (gastos YTD), 03 (rendimiento neto), 04 (20%), 05 (prior pagos), 06 (retenciones), 07 (prior pagos + retenciones), 12 (final result)
- If result negative → enter €0.00 (retentions already exceeded liability)

### 5. Summary / Dashboard
- Currency conversion table for all USD invoices
- Side-by-side Modelo 303 and 130 results
- Total liability (303 + 130) with filing deadline
- Quarter selector + year selector in header
- NIF display

### 6. User Profile
- NIF (tax ID) stored per user
- Home office percentage (default 20%)
- Save/load profile from Supabase

## Design System — UI/UX Pro Max

**CRITICAL:** Before writing any UI code, invoke the `ui-ux-pro-max` skill to generate the design system for this application.

Run: `skill: ui-ux-pro-max` with the context of this project (Spanish tax prep app for freelancers, paper-form aesthetic, professional/financial tooling).

The skill will produce:
- A complete color palette with hex codes
- Typography pairings (heading + body)
- Component patterns (buttons, cards, inputs, tables, modals)
- Spacing and layout system
- Motion/animation guidelines
- Anti-patterns to avoid

Use the design system output to guide ALL UI implementation. The existing JSX seed file provides the paper-form aesthetic — integrate that look with the professional design system from ui-ux-pro-max.

## Design Principles

- **Paper form aesthetic:** Casilla components mimic Agencia Tributaria form styling (dark headers, monospace numbers, beige background)
- **Color coding:** Red for amounts owed, green for refunds/credits, blue for USD-related values
- **Informational banners:** Yellow warnings for missing Date Paid, purple for invoices in different quarters
- **No console.log** in production code
- **Immutable state updates** — always spread, never mutate

## Development Phases

### Phase 1: Foundation (Ralph starts here)
- Set up Vite + React project in `~/projects/autonomo-tax/`
- **Invoke `ui-ux-pro-max` skill FIRST** — generate the full design system before writing any UI code
- Create Supabase schema (migrations)
- Replace `window.storage` with Supabase client calls
- Wire up Auth (email/password or Google OAuth via Supabase)
- Move `autonomo-tax-prep.jsx` into the new structure as a starting point

### Phase 2: Invoice & Expense Management
- Full CRUD for invoices and expenses against Supabase (use design system components)
- File upload to Supabase Storage (invoices + receipts)
- AI parsing integration (Claude API calls direct from client, not edge function)
- Quarter/year filtering
- Inline FX rate editing with Supabase persistence
- All UI components built using the ui-ux-pro-max design system

### Phase 3: Modelo 303 & 130
- All Casilla components wired to live Supabase-calculated values
- Prior quarter data entry for Modelo 130 cumulative YTD logic
- Prior 303 entries for Modelo 303 offset
- Quarter selector and year selector in header
- Use design system for form styling, tables, and informational banners

### Phase 4: Polish
- Summary dashboard with currency conversion table
- Profile management (NIF, home office %)
- Error handling + edge cases (empty states, rate limit errors)
- Mobile responsiveness (apply design system's responsive breakpoints)
- Remove all console.log statements
- Final design audit against ui-ux-pro-max output

## Exit Criteria

The app is complete when:
1. User can sign up/log in
2. Upload or manually enter invoices and expenses
3. AI parsing works for both
4. Both Modelo 303 and 130 show correct casilla values
5. Data persists across sessions (Supabase)
6. Filing deadline is displayed correctly per quarter

## Non-Goals (Out of Scope)
- Auto-filing to Agencia Tributaria (manual entry only)
- Annual IRPF declaration (Modelo 100)
- Multi-currency beyond USD→EUR
- Invoice PDF generation