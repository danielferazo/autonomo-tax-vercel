# Phase 2 Design — Invoice & Expense Management

**Date:** 2026-04-09
**Phase:** 2 of 4
**Status:** Approved for planning

---

## Decisions

| # | Question | Decision |
|---|----------|----------|
| 1 | AI parsing UX | Review/edit step before save (Option A) |
| 2 | FX rate fetch | Auto-fetch on save (Option A) |
| 3 | Invoice list view | Table view (Option A) |
| 4 | Invoice form | Full-page form (Option A) |
| 5 | File upload UX | Upload inside form (Option A) |

---

## Pages

### InvoicesPage (`src/pages/InvoicesPage.tsx`)

**States:**
- `list` — table of invoices with filter bar
- `form` — full-page invoice entry/edit form

**List state:**
- Filter bar: Quarter dropdown (Q1/Q2/Q3/Q4/All), Year dropdown (current ± 1)
- Table columns: Number, Date, Date Paid, Client, Gross (EUR), IVA, IRPF, Quarter, Actions
- Sortable by clicking column headers
- Row click → opens form in edit mode
- Yellow banner if any invoice in current filter is missing `date_paid`
- Empty state: illustration + "Upload your first invoice" CTA
- Header bar: "Invoices" title + "Add Invoice" button

**Form state:**
- File dropzone at top: "Drop invoice PDF or image, or click to browse"
  - On file drop: spinner → `ai.parseInvoice()` → fields pre-fill
  - Parsing banner: "Review extracted data below, correct any errors, then save"
  - Parsing fails → error in dropzone with manual fill prompt
- Fields: Invoice Number, Invoice Date, Date Paid, Client Name, Currency (USD/EUR), Gross Amount, IVA Collected, IRPF Retained, FX Rate (auto-filled for USD, editable), Notes
- Blue styling for USD/FX fields
- Save → Supabase INSERT/UPDATE → return to list
- Cancel → return to list

### ExpensesPage (`src/pages/ExpensesPage.tsx`)

**States:**
- `list` — table of expenses with filter bar
- `form` — full-page expense entry/edit form

**List state:**
- Same table/card pattern as invoices
- Columns: Category (badge), Description, Gross, IVA Paid, Deduct %, Quarter, Fixed (icon), Actions
- Category badge colors: rent=blue, electricity=yellow, water=cyan, internet=green, phone=purple, cuota=red, software=orange, hardware=gray, other=slate
- Fixed flag shown as pin icon
- Quarter/year filters identical to invoices
- Empty state with CTA

**Form state:**
- File dropzone at top (same UX as invoice form)
  - On file drop: `ai.parseExpense()` → fields pre-fill
- Fields: Category (dropdown), Description, Gross, IVA Paid, Deduct % (auto-suggested, editable), Fixed Monthly? (checkbox), Quarter, Year
- **Deduction auto-fill rules:**

| Category | Default deduct_pct | IVA Rate |
|---|---|---|
| rent | home_office_pct from profile | 0% |
| electricity | home_office_pct from profile | 21% |
| water | home_office_pct from profile | 0% |
| internet | 50% | 21% |
| phone | 50% | 21% |
| cuota | 100% | 0% |
| software | 100% | 21% |
| hardware | 100% | 21% |
| other | 100% | 21% |

- Fixed monthly note: "Mark for recurring monthly expenses (e.g., cuota autónomos). Auto-propagates to future quarters in Phase 4."
- Save → Supabase → return to list

---

## Key Modules

### `src/lib/ai.ts`

```typescript
// parseInvoice: takes base64-encoded file data, returns invoice fields
parseInvoice(fileData: string): Promise<{
  number: string
  date: string
  client: string
  currency: 'USD' | 'EUR'
  gross_orig: number
  iva_collected: number
  irpf_retained: number
}>

// parseExpense: takes base64-encoded file data, returns expense fields
parseExpense(fileData: string): Promise<{
  description: string
  gross: number
  iva_paid: number
  category: string
}>
```

- Uses Anthropic Claude Sonnet 4.6 via direct REST API (no edge function)
- System prompt includes Spanish invoice/receipt vocabulary and expected JSON schema
- API key from `import.meta.env.VITE_ANTHROPIC_API_KEY`

### `src/lib/fx.ts`

```typescript
// fetchFxRate: gets USD→EUR rate for a specific date
fetchFxRate(date: string): Promise<{ rate: number; date: string }>
// date format: YYYY-MM-DD
// API: https://api.frankfurter.app/{date}?from=USD&to=EUR
// Falls back to latest rate if exact date unavailable
```

### `src/hooks/useInvoices.ts`

```typescript
interface UseInvoicesReturn {
  invoices: Invoice[]
  loading: boolean
  error: string | null
  filters: { quarter: number | null; year: number }
  setFilters: (f: Partial<filters>) => void
  createInvoice: (data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => Promise<Invoice>
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  fetchFxRate: (date: string) => Promise<{ rate: number; date: string }>
}
```

- All operations scoped to authenticated user via `supabase.auth.getUser()`
- Filters applied client-side after fetching all user's invoices for the year
- Quarter derived from `date_paid` for invoices (not stored as editable field)

### `src/hooks/useExpenses.ts`

Same pattern as `useInvoices`, scoped to expenses.

### `src/components/ui/FileDropzone.tsx`

```typescript
interface FileDropzoneProps {
  onFile: (file: File) => void
  accept: string  // e.g., '.pdf,.jpg,.jpeg,.png'
  parsing?: boolean
  error?: string | null
}
```

- Drag-and-drop zone with click fallback
- Shows parsing spinner overlay when `parsing={true}`
- Shows error message in red when `error` is set
- Accepted file types: PDF, JPG, PNG

---

## Quarter/Year Helpers

```typescript
// Derives quarter (1-4) from a date string (YYYY-MM-DD)
function getQuarter(date: string): number

// Derives year from a date string
function getYear(date: string): number

// Formats date as YYYY-MM-DD for <input type="date">
function toDateInputValue(date: string): string

// Filing deadline: Q1=Apr 30, Q2=Jul 31, Q3=Oct 31, Q4=Jan 30
function getFilingDeadline(quarter: number, year: number): string
```

---

## Supabase Schema (Phase 1 — already in place)

Tables `invoices`, `expenses`, `profiles` match the Phase 1 schema. No schema changes needed for Phase 2.

**RLS policies (Phase 1):** All tables scoped to `auth.uid()`.

---

## File Storage

- Supabase Storage bucket: `receipts` (created in Phase 1)
- Path pattern: `/{user_id}/invoices/{uuid}.pdf` and `/{user_id}/expenses/{uuid}.{ext}`
- File URL stored in `filename` column of respective tables
- File upload via Supabase Storage JS SDK in `useInvoices` / `useExpenses` hooks

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| AI parse fails | Dropzone shows red error: "Parsing failed. Enter manually." Form remains empty. |
| FX API fails | Error banner on FX field: "Rate unavailable. Enter manually." Field becomes editable. |
| Supabase save fails | Form-level error banner with "Retry" button. Data preserved. |
| No invoices/expenses | Illustrated empty state with upload CTA |
| File too large (>10MB) | Dropzone error: "File too large. Max 10MB." |

---

## Dependencies Added in Phase 2

```json
{
  "@supabase/storage-js": "^2.5.0"
}
```

(No new routing library needed — state-driven view switching)
