# Phase 4: Polish - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Polish phase delivers the Summary dashboard, Profile page, error handling, and mobile responsiveness. Phase 3 wired the Modelo 303/130 pages with live data — Phase 4 surfaces that data in a dashboard, fills in the Profile tab, handles errors gracefully, and makes the whole app usable on mobile.

</domain>

<decisions>
## Implementation Decisions

### Summary Dashboard Layout
- **D-01:** Grid layout — liability banner spans full width at top, two modelo cards side-by-side below, currency conversion table below that
- **D-02:** NIF displayed in header (DASH-05) — currently NOT in header, needs to be added next to the title or filing deadline area
- **D-03:** Currency conversion table (DASH-01) shows all USD invoices: original amount, FX rate, EUR amount — placed below the modelo results
- **D-04:** Total liability (DASH-03) = Modelo 303 result + Modelo 130 result, displayed prominently with filing deadline

### Profile Page UX
- **D-05:** Card-based form — matches the paper-form aesthetic used throughout the app
- **D-06:** Fields: NIF (text input) and Home Office % (number input, default 20)
- **D-07:** Save button persists to Supabase `profiles` table via existing profile hooks

### Error Handling
- **D-08:** Transient errors (network failure, rate limit, API timeout) → banner error message at top of affected page section
- **D-09:** Empty data states → use existing `EmptyState` component with contextual message per page
- **D-10:** Claude API rate limits → show friendly message with retry option, do not block the UI
- **D-11:** Error messages must be user-friendly (no technical jargon)

### Mobile Breakpoints
- **D-12:** Fix 768px breakpoint first — header overflows with Q/year selectors + logout button bunching up
- **D-13:** TabNav adapts to mobile (horizontal scroll or collapses to dropdown at <768px)
- **D-14:** Form pages prevent horizontal overflow at 768px and below

### console.log Audit
- **D-15:** No action needed — grep confirms zero console.log statements in `src/`

### DASH-04 Status
- **Note:** Quarter/year selectors (DASH-04) already implemented in `App.tsx` via `useTaxPeriod()` hook. Confirmed working from Phase 3 commit `474495f`. No implementation needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design-system/autonomo-tax-prep/MASTER.md` — Paper-form aesthetic, color palette, typography, spacing, component specs, anti-patterns

### Requirements
- `.planning/REQUIREMENTS.md` — DASH-01 through DASH-05 requirements, PROF-01 and PROF-02 already marked complete

### Project Brief
- Root `PROJECT.md` — Design principles (paper form aesthetic, red/green/blue color coding, no console.log)

### Prior Context
- `.planning/phases/01-foundation/01-CONTEXT.md` — Tab nav structure, Supabase storage buckets, profile fields, established patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `EmptyState` (`src/components/ui/EmptyState.tsx`): Ready-made for empty data states — just pass title/description/action
- `fx.ts` (`src/lib/fx.ts`): `fetchFxRate()` already exists for USD→EUR conversion — currency table should use this
- `tax.ts` (`src/lib/tax.ts`): `calculateModelo303()` and `calculateModelo130()` return full result objects — dashboard can call these directly
- `useTaxPeriod` (`src/hooks/useTaxPeriod.ts`): Already provides `quarter`, `year`, `setQuarter`, `setYear`, `filingDeadline` — reuses in Summary page
- `useInvoices` / `useExpenses` (`src/hooks/`): Existing hooks for data fetching — Summary page needs filtered USD invoices for currency table

### Established Patterns
- Paper-form aesthetic: beige background, dark navy headers, IBM Plex Mono for numbers
- Tab navigation: `TABS` array in `App.tsx`, `TabNav` component
- Color coding: `--color-debt` (red) for owed, `--color-credit` (green) for refunds, `--color-usd` (blue) for USD values
- Banner styles: `--color-warning` (yellow), `--color-error` (red) — ready to use for error states

### Integration Points
- `App.tsx:71-72`: Summary and Profile tabs are empty placeholders — wire in new pages here
- Header in `App.tsx:25-63`: NIF display needs to be added here (DASH-05)
- Filing deadline already displayed in header via `useTaxPeriod().filingDeadline`

</code_context>

<specifics>
## Specific Ideas

- Filing deadlines per quarter: Q1=April 20, Q2=July 20, Q3=October 20, Q4=January 20 (already in `useTaxPeriod`)
- NIF should appear in header near the title or filing deadline — not as a prominent card, just a small label
- Currency table should only show USD invoices (filter by `currency === 'USD'`)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within Phase 4 scope.

</deferred>

---

*Phase: 04-polish*
*Context gathered: 2026-04-09*
