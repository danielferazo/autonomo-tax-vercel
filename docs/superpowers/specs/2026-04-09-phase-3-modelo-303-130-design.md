# Phase 3 Design — Modelo 303 & 130

**Date:** 2026-04-09
**Phase:** 3 of 4
**Status:** Approved for planning

---

## Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | 303 layout | Agencia Tributaria paper form layout (Option A) |
| 2 | M130 prior quarter | Manual entry per quarter (Option A) |
| 3 | Quarter/year selectors | Shared in header bar (Option A) |

---

## Architecture

### Shared Quarter/Year State

Quarter and year state lives in `App.tsx` via a `useTaxPeriod` hook. Both Modelo 303 and 130 consume this shared state. The header bar (already in `App.tsx`) is updated to include:

- Left: app title
- Center: Quarter dropdown (Q1/Q2/Q3/Q4) + Year dropdown (current ± 1)
- Right: NIF display (from profile), filing deadline (`getFilingDeadline(quarter, year)`), Logout button

```typescript
// src/hooks/useTaxPeriod.ts
export function useTaxPeriod(): {
  quarter: number
  year: number
  setQuarter: (q: number) => void
  setYear: (y: number) => void
  filingDeadline: string
}
```

Filing deadline from `src/lib/dates.ts`:
- Q1 → April 30 of year
- Q2 → July 31 of year
- Q3 → October 31 of year
- Q4 → January 30 of year + 1

---

## Calculation Engine

### `src/lib/tax.ts`

Two pure functions — no side effects, no Supabase calls.

#### Modelo 303

```typescript
interface Modelo303Input {
  invoices: Invoice[]       // all invoices for the selected quarter/year
  expenses: Expense[]       // all expenses for the selected quarter/year
  prior303: number          // from quarterly_summaries.prior_303
}

interface Modelo303Result {
  cas01: number   // count of invoices
  cas02: number   // sum of gross_eur from invoices
  cas03: number   // sum of iva_collected from invoices
  cas22: number   // regularisation — always 0 (Simplificada)
  cas28: number   // sum of expense.gross * expense.deduct_pct / 100
  cas29: number   // sum of iva_paid from expenses
  cas40: number   // cas01 + cas22 + cas02 + cas03 (note: cas01 is count not amount — in Simplificada this is just cas02+cas03)
  cas41: number   // cas28 + cas29
  cas45: number   // cas40 - cas41
  cas64: number   // prior303 offset
  cas69: number   // cas45 - cas64 (final result)
  isPayable: boolean
}
```

**Correction on cas40:** In Estimación Directa Simplificada, cas01 is not a monetary value — it's the count of operations. Cas40 = cas01 (count) + cas02 (base) + cas03 (cuota). But for a freelancer with few invoices, the visual effect is that cas40 ≈ cas02 + cas03. For simplicity: `cas40 = cas02 + cas03` (monetary interpretation).

Actually, the official 303 form for Simplificada: cas01 = número de operaciones, cas02 = base imponible, cas03 = cuota. cas40 = cas01 + cas22 + cas02 + cas03. Since cas01 is a count (not money) and cas22 is 0: `cas40 = cas02 + cas03`.

**Deductible expense calculation:**
- `deductible_amount = expense.gross * (expense.deduct_pct / 100)`
- `cas28 = sum of all deductible_amounts` (this is the BASE, not the IVA)
- `cas29 = sum of all expense.iva_paid` (this is already the IVA amount)

#### Modelo 130

```typescript
interface Modelo130Input {
  invoices: Invoice[]       // all invoices Q1 through selected quarter (cumulative YTD)
  expenses: Expense[]       // all expenses Q1 through selected quarter (cumulative YTD)
  priorPagos: number       // from quarterly_summaries.prior_pagos
  priorRetenciones: number  // from quarterly_summaries.prior_retenciones
}

interface Modelo130Result {
  cas01: number   // sum of gross_eur from invoices Q1–current (YTD)
  cas02: number   // sum of deductible expenses Q1–current (YTD)
  cas03: number   // cas01 - cas02 (rendimiento neto)
  cas04: number   // cas03 * 0.20 (20%)
  cas05: number   // prior pagos (from quarterly_summaries)
  cas06: number   // sum of irpf_retained from invoices Q1–current (YTD)
  cas07: number   // cas05 + cas06
  cas12: number   // max(0, cas04 - cas07) — final result, never negative
}
```

**YTD cumulative:** `invoices.filter(i => i.year === year && i.quarter <= currentQuarter)` and same for expenses.

**Note on cas02:** Uses the deductible amount (gross × deduct_pct/100), same as cas28 in 303.

---

## Prior Quarter Data

`quarterly_summaries` table stores prior values per quarter:

| Field | Used In | Purpose |
|-------|---------|---------|
| `prior_ingresos` | — | Reserved |
| `prior_gastos` | — | Reserved |
| `prior_pagos` | M130 cas05 | Prior quarter pagos (cumulative) |
| `prior_retenciones` | M130 cas06 | Prior quarter retenciones (cumulative) |
| `prior_303` | M303 cas64 | Prior 303 result for offset |

**On page load:** Fetch `quarterly_summaries` row for (quarter, year) from Supabase.
**On prior field blur:** Upsert the row with updated prior values.

---

## Pages

### `src/pages/Modelo303Page.tsx`

**Header area:**
- Title: "Modelo 303 — IVA"
- Filing deadline displayed: "Fecha límite: {date}"

**Paper form layout (two-column top, full-width bottom):**

```
┌──────────────────────────────┬──────────────────────────────┐
│ IVA DEVENGADO                │ IVA DEDUCIBLE                │
│                              │                              │
│ [01] 0001  Nº operaciones    │ [28] ________ € base        │
│ [02] ________ € base imp.    │ [29] ________ € cuota       │
│ [03] ________ € cuota        │                              │
└──────────────────────────────┴──────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ RESULTADO                                               red/green │
│ [40] ________ €   [41] ________ €                         │
│ [45] ________ €   [64] ________ € [prior 303]              │
│                      [69] ________ € ← final              │
└─────────────────────────────────────────────────────────────┘
```

**Casilla display component:**

```typescript
interface CasillaProps {
  number: string
  label: string
  value: number
  editable?: boolean
  onChange?: (value: number) => void
  highlight?: 'positive' | 'negative' | 'neutral'
}
```

- Read-only casillas: monospace font, right-aligned, dark label text
- cas64 (prior 303): editable input, prefilled from quarterly_summaries, saves on blur
- cas69 (final result): large monospace number
  - Red background + white text if positive (payable)
  - Green background + dark text if negative (refund/carryforward)
  - Banner below: "A PAGAR: €X" or "A DEVOLVER: €X" or "COMPENSAR: €X"

**Empty states:**
- No invoices in quarter: yellow banner "No hay facturas para Q{quarter} {year}. El IVA devengado será €0."
- No expenses in quarter: yellow banner "No hay gastos para Q{quarter} {year}. El IVA deducible será €0."

---

### `src/pages/Modelo130Page.tsx`

**Header area:**
- Title: "Modelo 130 — IRPF Pago Fraccionado"
- Filing deadline displayed

**Paper form layout:**

```
┌─────────────────────────────────────────────────────────────┐
│ RENDIMIENTO Y BASE DE LA CUOTA                               │
│                                                              │
│ [01] ________ € ingresos YTD                                 │
│ [02] ________ € gastos YTD                                  │
│ [03] ________ € rendimiento neto (01 - 02)                  │
│ [04] ________ € 20% sobre rendimiento                        │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ PAGOS Y RETENCIONES                                          │
│                                                              │
│ [05] ________ € pagos anteriores [editable, prior]           │
│ [06] ________ € retenciones YTD                              │
│ [07] ________ € suma (05 + 06)                               │
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│ RESULTADO                                          red/green  │
│ [12] ________ € a ingresar                                   │
│         → €0.00 si cas04 - cas07 < 0                        │
└─────────────────────────────────────────────────────────────┘
```

**cas12 display:**
- If `cas04 - cas07 > 0`: show result in red box as positive (payable)
- If `cas04 - cas07 <= 0`: show "€0.00" in green box, with note "Las retenciones ya superan la cuota"

**Empty states:** Same pattern as 303 page for missing invoices/expenses in YTD range.

---

## Key Implementation Notes

1. **No react-query** — plain `useState`/`useEffect` per Phase 2 patterns
2. **All calculations are pure functions in `tax.ts`** — easy to unit test
3. **Prior data upserted, not inserted** — handles the case where the row already exists for that quarter/year
4. **YTD for M130:** Filter invoices by `year === selectedYear && quarter <= selectedQuarter`
5. **`useTaxPeriod` hook is lifted to App level** — quarter and year state shared across Modelo303Page, Modelo130Page, and the header

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/hooks/useTaxPeriod.ts` | Shared quarter/year state + filing deadline |
| `src/lib/tax.ts` | Pure calculation functions: `calculateModelo303`, `calculateModelo130` |
| `src/lib/__tests__/tax.test.ts` | Unit tests for tax calculations |
| `src/components/ui/Casilla.tsx` | Reusable casilla display component |
| `src/pages/Modelo303Page.tsx` | Modelo 303 paper form page |
| `src/pages/Modelo130Page.tsx` | Modelo 130 paper form page |
| `src/App.tsx` | Add quarter/year selectors to header + wire Modelo303Page/Modelo130Page |

---

## Testing Strategy

`tax.ts` functions are pure — test all edge cases:

```typescript
// calculateModelo303
it('cas45 = (cas02+cas03) - (cas28+cas29)')
it('cas69 = cas45 - prior303')
it('isPayable = cas69 >= 0')
it('cas28 uses deduct_pct (not full gross)')

// calculateModelo130
it('cas01 sums invoices Q1 through current quarter only')
it('cas03 = cas01 - cas02')
it('cas12 = max(0, cas04 - cas07)')
it('cas12 is never negative even if cas04 < cas07')
```
