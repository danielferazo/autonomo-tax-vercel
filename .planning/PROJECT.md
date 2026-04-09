# Autonomo Tax Prep — Project Context

## What This Is

A full-stack Spanish freelancer (autónomo) tax preparation application. It replaces manual spreadsheet work with an intelligent, guided UI that handles IVA (Modelo 303) and IRPF pago fraccionado (Modelo 130) calculations.

**Target user:** Solo self-employed developer / freelancer in Spain, filing under Estimación Directa Simplificada.

## Core Value

Replace manual spreadsheet tax prep with an intelligent, guided UI that calculates exact casilla values for Agencia Tributaria's Modelo 303 and Modelo 130 forms.

## Exit Criteria

The app is complete when:
1. User can sign up/log in (Supabase Auth)
2. Upload or manually enter invoices and expenses
3. AI parsing works for both (Claude API)
4. Both Modelo 303 and 130 show correct casilla values
5. Data persists across sessions (Supabase)
6. Filing deadline is displayed correctly per quarter

## Technical Stack

- **Frontend:** React (JSX), built with Vite. Single-page app, no SSR needed.
- **Backend:** Supabase (PostgreSQL) for persistent storage. Auth via Supabase Auth.
- **AI Parsing:** Anthropic Claude API (Sonnet 4.6) for invoice/receipt OCR and extraction.
- **FX Rates:** ECB / Frankfurter API for USD→EUR conversion.
- **Storage:** Supabase database.

## Supabase Schema (Phase 1)

Tables:

1. **`profiles`** — user profile (id, nif, home_office_pct, created_at)
2. **`invoices`** — id, user_id, number, date, date_paid, client, currency, gross_orig, fx_rate, fx_date, gross_eur, iva_collected, irpf_retained, quarter, year, filename, created_at
3. **`expenses`** — id, user_id, category, description, gross, iva_paid, deduct_pct, is_fixed, quarter, year, filename, created_at
4. **`quarterly_summaries`** — id, user_id, year, quarter, prior_ingresos, prior_gastos, prior_pagos, prior_retenciones, prior_303, m130_result, m303_result, created_at

## Key Expense Categories & Deduction Rules

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

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React + Vite | Already specified in brief | — |
| Supabase | Already specified in brief | — |
| Claude API for parsing | Already specified in brief | — |
| ECB/Frankfurter for FX | Already specified in brief | — |
| Coarse granularity (4 phases) | Brief already defines 4 phases | — |

## Requirements

### Active

- [ ] **AUTH-01**: User can sign up/log in with Supabase Auth
- [ ] **AUTH-02**: User profile with NIF and home office percentage
- [ ] **INV-01**: Upload invoices (PDF/images) → Claude AI extraction
- [ ] **INV-02**: Manual invoice entry with all fields
- [ ] **INV-03**: Date Paid field determines quarter assignment
- [ ] **INV-04**: USD invoices with ECB FX rate + manual override
- [ ] **INV-05**: Inline FX rate editing per invoice
- [ ] **INV-06**: Sort and filter by quarter/year
- [ ] **EXP-01**: Upload receipts → Claude AI extraction
- [ ] **EXP-02**: Manual expense entry with category selector
- [ ] **EXP-03**: "Fixed monthly" flag for recurring expenses
- [ ] **EXP-04**: Home office % affects rent/electricity/water deduction dynamically
- [ ] **M303-01**: IVA devengado (Casilla 01, 02, 03)
- [ ] **M303-02**: IVA deducible (Casilla 28, 29)
- [ ] **M303-03**: Result calculation (Casilla 40, 41, 45, 64, 69)
- [ ] **M303-04**: Prior 303 entries for offset
- [ ] **M130-01**: Cumulative YTD calculation
- [ ] **M130-02**: Prior quarter fields for M130
- [ ] **M130-03**: Casilla 01-07 and 12 result
- [ ] **M130-04**: Negative result → €0.00 display
- [ ] **DASH-01**: Currency conversion table for USD invoices
- [ ] **DASH-02**: Side-by-side Modelo 303 and 130 results
- [ ] **DASH-03**: Total liability with filing deadline
- [ ] **DASH-04**: Quarter selector + year selector in header
- [ ] **DASH-05**: NIF display
- [ ] **FILE-01**: File upload to Supabase Storage
- [ ] **FILE-02**: AI parsing via direct Claude API calls (not edge function)

### Out of Scope

- [Exclusion: Auto-filing to Agencia Tributaria] — Manual entry only
- [Exclusion: Modelo 100 (annual IRPF)] — Only quarterly Modelo 130
- [Exclusion: Multi-currency beyond USD→EUR] — Only USD/EUR
- [Exclusion: Invoice PDF generation] — Not mentioned in brief

## Design System

**CRITICAL:** Before writing any UI code, invoke the `ui-ux-pro-max` skill to generate the design system.

Design principles:
- **Paper form aesthetic:** Casilla components mimic Agencia Tributaria form styling (dark headers, monospace numbers, beige background)
- **Color coding:** Red for amounts owed, green for refunds/credits, blue for USD-related values
- **Informational banners:** Yellow warnings for missing Date Paid, purple for invoices in different quarters
- **No console.log** in production code
- **Immutable state updates** — always spread, never mutate

## Development Phases

### Phase 1: Foundation
- Set up Vite + React project
- Invoke `ui-ux-pro-max` skill FIRST — generate design system
- Create Supabase schema (migrations)
- Replace `window.storage` with Supabase client calls
- Wire up Auth (email/password or Google OAuth via Supabase)
- Move `autonomo-tax-prep.jsx` into the new structure

### Phase 2: Invoice & Expense Management
- Full CRUD for invoices and expenses against Supabase
- File upload to Supabase Storage
- AI parsing integration (Claude API calls direct from client)
- Quarter/year filtering
- Inline FX rate editing

### Phase 3: Modelo 303 & 130
- All Casilla components wired to live Supabase-calculated values
- Prior quarter data entry for Modelo 130 cumulative YTD logic
- Prior 303 entries for Modelo 303 offset
- Quarter selector and year selector in header

### Phase 4: Polish
- Summary dashboard with currency conversion table
- Profile management (NIF, home office %)
- Error handling + edge cases
- Mobile responsiveness
- Remove all console.log statements
- Final design audit

---

*Last updated: 2026-04-09 after initialization*
