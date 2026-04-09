# Phase 1: Foundation - Context

**Gathered:** 2026-04-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up Vite + React project with Supabase auth, database schema, and basic structure. User can sign up/login, profile persists, file upload works, and `autonomo-tax-prep.jsx` is integrated into the new structure.

</domain>

<decisions>
## Implementation Decisions

### Supabase Setup
- **D-01:** Use local Supabase development via `npx supabase init` + Docker (free, no account required)
- **D-02:** Schema created as Supabase migrations (SQL files in `supabase/migrations/`)
- **D-03:** Supabase client configured in `src/lib/supabase.ts`

### Auth
- **D-04:** Email/password only for Phase 1 (scope control)
- **D-05:** Auth handled via `@supabase/auth-helpers-react` or `@supabase/ssr`
- **D-06:** Auth state managed via Supabase's built-in session handling

### Project Structure
- **D-07:** Vite + React project initialized in project root
- **D-08:** Directory structure:
  ```
  src/
    components/    # Reusable UI components (Casilla, forms, tables)
    pages/         # Main views (Auth, Dashboard, Invoices, Expenses, Modelos)
    lib/           # Supabase client, API helpers, utils
    hooks/         # Custom React hooks
    styles/        # Global CSS, design system variables
  supabase/        # Migrations and config
  ```
- **D-09:** `autonomo-tax-prep.jsx` content refactored into components over Phase 1-2

### Routing
- **D-10:** Single-page app with tab/section navigation (no React Router in Phase 1)
- **D-11:** Tabs: Invoices | Expenses | Modelo 303 | Modelo 130 | Summary | Profile

### File Upload
- **D-12:** Supabase Storage bucket: `invoices` and `receipts`
- **D-13:** File paths: `invoices/{user_id}/{filename}`, `receipts/{user_id}/{filename}`

### Profile
- **D-14:** Profile created automatically on signup via Supabase trigger
- **D-15:** Profile fields: `nif` (string), `home_office_pct` (default 20)

### Claude's Discretion
- Routing structure details (tab names, order) — open to standard tab order
- Component file naming conventions — use standard lowercase-kebab
- CSS approach (plain CSS modules vs CSS-in-JS) — use plain CSS modules to match existing patterns

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design-system/autonomo-tax-prep/MASTER.md` — Paper-form aesthetic, color palette, typography specs

### Requirements
- `.planning/REQUIREMENTS.md` — AUTH-01, AUTH-02, FILE-01, PROF-01, PROF-02 requirements
- `.planning/ROADMAP.md` — Phase 1 success criteria

### Project Brief
- Root `PROJECT.md` — Full context including Supabase schema, expense categories, design principles

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `autonomo-tax-prep.jsx` (66KB): Contains all UI components, Claude API integration, expense categories, quarter logic, currency formatting — to be refactored into proper structure over Phase 1-2
- `design-system/autonomo-tax-prep/MASTER.md`: CSS variables and component specs ready to implement

### Established Patterns
- Expense categories defined as array of objects with `key`, `label`, `labelES`, `deductPct`, `ivaRate`
- Currency formatting: `fmt()` for EUR, `fmtUSD()` for USD, `pct()` for percentages
- Claude API calls with exponential backoff retry logic (already implemented in seed file)

### Integration Points
- `autonomo-tax-prep.jsx` → split into `src/components/` and `src/pages/`
- `window.storage` references → replace with Supabase client calls
- Auth: wrap app in `AuthProvider` from `@supabase/ssr`

</code_context>

<specifics>
## Specific Ideas

- Quarter selector and year selector in header (per brief, DASH-04)
- Filing deadlines per quarter: Q1=April 20, Q2=July 20, Q3=October 20, Q4=January 20
- Expense categories mapping to deduction % and IVA rate already defined in seed file

</specifics>

<deferred>
## Deferred Ideas

### Auth Expansion
- Google OAuth — deferred to Phase 2 or later (Phase 1 uses email/password only per D-04)

### Routing
- React Router / multi-page navigation — deferred (Phase 1 uses single-page tab nav per D-10)

### File Management
- File deletion — deferred (Phase 1 focuses on upload only)

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-09*
