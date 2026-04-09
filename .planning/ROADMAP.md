# Roadmap — Autonomo Tax Prep

## 4 phases | 31 requirements mapped | All v1 requirements covered ✓

| # | Phase | Goal | Requirements | Success Criteria |
|---|-------|------|--------------|------------------|
| 1 | Foundation | 1/1 | Complete    | 2026-04-09 |
| 2 | Invoice & Expense Management | Full CRUD with AI parsing and FX handling | INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, EXP-01, EXP-02, EXP-03, EXP-04, FILE-02 | Invoices/expenses persist; AI parsing extracts fields; FX rates save |
| 3 | Phase 3: Modelo 303 & 130 | ✅ Complete: Tax form calculations wired to live data | M303-01, M303-02, M303-03, M303-04, M303-05, M130-01, M130-02, M130-03, M130-04 | All casillas calculate correctly; Prior data offsets correctly |
| 4 | Polish | Dashboard, profile, error handling, mobile | DASH-01, DASH-02, DASH-03, DASH-04, DASH-05 | Dashboard displays all; Quarter/year selectors work; Mobile responsive |

---

## Phase 1: Foundation

**Goal:** Set up Vite + React project with Supabase auth, database schema, and basic structure

**Requirements:** AUTH-01, AUTH-02, FILE-01, PROF-01, PROF-02

**Plans:** 1/1 plans complete

Plans:
- [x] 01-01-PLAN.md — Vite + React + TypeScript project scaffold, Supabase local dev setup, database migrations, Auth page, TabNav component

---

## Phase 2: Invoice & Expense Management

**Goal:** Full CRUD for invoices and expenses with AI parsing integration

**Requirements:** INV-01, INV-02, INV-03, INV-04, INV-05, INV-06, EXP-01, EXP-02, EXP-03, EXP-04, FILE-02

**Success Criteria:**
1. Upload PDF/image → Claude API extracts invoice fields correctly
2. Upload receipt → Claude API extracts expense fields correctly
3. Manual invoice entry creates record in Supabase
4. Manual expense entry creates record in Supabase
5. Date Paid determines quarter assignment
6. USD invoices fetch ECB rate on save, manual override persists
7. Inline FX rate editing updates Supabase
8. Quarter/year filter shows correct invoices/expenses
9. Home office % dynamically updates deduction in rent/electricity/water

---

## Phase 3: Modelo 303 & 130

**Goal:** Tax form calculations with all casilla values wired to live Supabase data

**Requirements:** M303-01, M303-02, M303-03, M303-04, M303-05, M130-01, M130-02, M130-03, M130-04

**Success Criteria:**
1. IVA devengado casillas (01, 02, 03) sum from invoices correctly
2. IVA deducible casillas (28, 29) sum from expenses correctly
3. Result casillas (40, 41, 45, 64, 69) calculate correctly
4. Prior 303 offset entries reduce final amount
5. M130 cumulative YTD calculates correctly
6. Prior quarter M130 fields reduce current liability
7. Negative M130 result displays €0.00
8. Quarter/year selector updates all calculations

---

## Phase 4: Polish

**Goal:** Dashboard, profile management, error handling, mobile responsiveness

**Requirements:** DASH-01, DASH-02, DASH-03, DASH-04, DASH-05

**Success Criteria:**
1. Currency conversion table shows all USD invoices with rates
2. Side-by-side 303 and 130 results display correctly
3. Total liability (303 + 130) shows with correct filing deadline
4. Quarter/year selectors in header work
5. NIF displayed in header
6. Mobile responsive at 768px breakpoint
7. No console.log statements in production
8. Error states handle empty data, rate limit errors, network failures
