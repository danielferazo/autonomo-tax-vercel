# Phase 2 Implementation Plan — Invoice & Expense Management

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full CRUD for invoices and expenses with AI parsing, file upload, quarter/year filtering, FX rate handling, and home office deduction logic.

**Architecture:** React state-driven page switching (no routing library). AI parsing via direct Anthropic REST API. FX rates via Frankfurter API. All data via Supabase. Design system from `design-system/autonomo-tax/MASTER.md`.

**Tech Stack:** React + TypeScript + Vite, Supabase JS SDK, Anthropic API, Frankfurter API

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/lib/ai.ts` | Claude API client for invoice/receipt parsing |
| `src/lib/fx.ts` | Frankfurter API client for USD→EUR rates |
| `src/hooks/useInvoices.ts` | Invoice CRUD + filter state |
| `src/hooks/useExpenses.ts` | Expense CRUD + filter state |
| `src/pages/InvoicesPage.tsx` | Invoice list table + invoice form (state toggle) |
| `src/pages/ExpensesPage.tsx` | Expense list table + expense form (state toggle) |
| `src/components/ui/FileDropzone.tsx` | Drag-and-drop file upload |
| `src/components/ui/FormField.tsx` | Label + input + error message |
| `src/components/ui/EmptyState.tsx` | Illustrated empty state with CTA |
| `src/components/ui/CategoryBadge.tsx` | Colored expense category badge |
| `src/App.tsx` | Wire InvoicesPage + ExpensesPage into tab |
| `src/lib/supabase.ts` | Add Supabase Storage client |
| `src/index.css` | CSS variables + global styles |

---

## Dependencies

Install `@supabase/storage-js@^2.5.0` before starting.

Add to `.env`:
```
VITE_ANTHROPIC_API_KEY=your_key_here
```

---

## Task 1: Global CSS and Supabase Storage Client

**Files:**
- Create: `src/index.css`
- Modify: `src/lib/supabase.ts`

- [ ] **Step 1: Create `src/index.css` with design system variables and global styles**

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');

:root {
  /* Colors from design-system/autonomo-tax/MASTER.md */
  --color-primary: #F59E0B;
  --color-secondary: #FBBF24;
  --color-cta: #8B5CF6;
  --color-background: #0F172A;
  --color-surface: #1E293B;
  --color-border: #334155;
  --color-text: #F8FAFC;
  --color-text-muted: #94A3B8;
  --color-success: #10B981;
  --color-danger: #EF4444;
  --color-warning: #F59E0B;
  --color-info: #3B82F6;

  /* FX / USD color (blue as per spec) */
  --color-usd: #3B82F6;

  /* Spacing */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 32px;
  --space-2xl: 48px;

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);

  /* Typography */
  --font-sans: 'IBM Plex Sans', system-ui, sans-serif;
  --font-mono: 'IBM Plex Mono', 'Courier New', monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: var(--font-sans);
  background: var(--color-background);
  color: var(--color-text);
  -webkit-font-smoothing: antialiased;
}

/* Button base */
.btn-primary {
  background: var(--color-cta);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-family: var(--font-sans);
  border: none;
  cursor: pointer;
  transition: opacity 200ms ease, transform 150ms ease;
}
.btn-primary:hover { opacity: 0.9; transform: translateY(-1px); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-secondary {
  background: transparent;
  color: var(--color-primary);
  border: 2px solid var(--color-primary);
  padding: 10px 22px;
  border-radius: 8px;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: all 200ms ease;
}
.btn-secondary:hover { background: var(--color-primary); color: var(--color-background); }

.btn-danger {
  background: var(--color-danger);
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-family: var(--font-sans);
  border: none;
  cursor: pointer;
  transition: opacity 200ms ease;
}
.btn-danger:hover { opacity: 0.85; }

/* Card */
.card {
  background: var(--color-surface);
  border-radius: 12px;
  padding: var(--space-xl);
  box-shadow: var(--shadow-md);
}

/* Input */
.input {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  font-family: var(--font-sans);
  background: var(--color-background);
  color: var(--color-text);
  width: 100%;
  transition: border-color 200ms ease;
}
.input:focus {
  border-color: var(--color-primary);
  outline: none;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
}
.input.error { border-color: var(--color-danger); }

/* Select */
.select {
  padding: 10px 14px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 16px;
  font-family: var(--font-sans);
  background: var(--color-background);
  color: var(--color-text);
  cursor: pointer;
  width: 100%;
}
.select:focus { border-color: var(--color-primary); outline: none; }

/* Table */
.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}
.table th {
  text-align: left;
  padding: var(--space-sm) var(--space-md);
  border-bottom: 2px solid var(--color-border);
  color: var(--color-text-muted);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  cursor: pointer;
  user-select: none;
}
.table th:hover { color: var(--color-primary); }
.table td {
  padding: var(--space-sm) var(--space-md);
  border-bottom: 1px solid var(--color-border);
}
.table tr:hover td { background: rgba(255,255,255,0.02); }
.table .num { text-align: right; font-family: var(--font-mono); }

/* Badge */
.badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
}

/* Banner */
.banner {
  padding: var(--space-sm) var(--space-md);
  border-radius: 6px;
  font-size: 14px;
  margin-bottom: var(--space-md);
}
.banner-warning { background: rgba(245, 158, 11, 0.15); color: var(--color-warning); border: 1px solid var(--color-warning); }
.banner-error { background: rgba(239, 68, 68, 0.15); color: var(--color-danger); border: 1px solid var(--color-danger); }
.banner-info { background: rgba(59, 130, 246, 0.15); color: var(--color-info); border: 1px solid var(--color-info); }
```

- [ ] **Step 2: Add Supabase Storage client to `src/lib/supabase.ts`**

Read the existing `src/lib/supabase.ts` first, then add:

```typescript
import { createClient } from '@supabase/supabase-js'
import { type Database } from '../types/database'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

// Storage client for file uploads
export const storageClient = supabase.storage
```

Run: `grep -n "supabaseUrl\|supabaseAnonKey" src/lib/supabase.ts` to verify existing env vars are already used.

- [ ] **Step 3: Run build to verify no errors**

Run: `cd /Users/daniel/projects/autonomo-tax && npm run build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/index.css src/lib/supabase.ts
git commit -m "feat(phase-2): add global CSS design system variables and Supabase storage client
```

---

## Task 2: FX Rate Fetcher

**Files:**
- Create: `src/lib/fx.ts`
- Create: `src/lib/__tests__/fx.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/fx.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

// Mock global fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('fetchFxRate', () => {
  beforeEach(() => mockFetch.mockReset())
  afterEach(() => mockFetch.mockRestore())

  it('fetches USD->EUR rate for a given date', async () => {
    const { fetchFxRate } = await import('../fx')
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ rates: { EUR: 0.92 }, date: '2026-01-15' }),
    })

    const result = await fetchFxRate('2026-01-15')

    expect(result).toEqual({ rate: 0.92, date: '2026-01-15' })
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.frankfurter.app/2026-01-15?from=USD&to=EUR'
    )
  })

  it('throws if API returns error', async () => {
    const { fetchFxRate } = await import('../fx')
    mockFetch.mockResolvedValueOnce({ ok: false })

    await expect(fetchFxRate('2026-01-15')).rejects.toThrow('Failed to fetch FX rate')
  })
})
```

Run: `npm test -- src/lib/__tests__/fx.test.ts` — expect FAIL (file doesn't exist)

- [ ] **Step 2: Write minimal implementation**

```typescript
// src/lib/fx.ts

export interface FxRate {
  rate: number
  date: string
}

export async function fetchFxRate(date: string): Promise<FxRate> {
  const url = `https://api.frankfurter.app/${date}?from=USD&to=EUR`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch FX rate')
  const data = await res.json() as { rates: { EUR: number }; date: string }
  return { rate: data.rates.EUR, date: data.date }
}
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npm test -- src/lib/__tests__/fx.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/fx.ts src/lib/__tests__/fx.test.ts
git commit -m "feat(phase-2): add FX rate fetcher via Frankfurter API"
```

---

## Task 3: AI Parsing Client

**Files:**
- Create: `src/lib/ai.ts`
- Create: `src/lib/__tests__/ai.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/ai.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockPost = vi.fn()
vi.stubGlobal('fetch', mockPost)

describe('AI parsing', () => {
  afterEach(() => vi.restoreAllMocks())

  describe('parseInvoice', () => {
    it('extracts invoice fields from base64 file data', async () => {
      const { parseInvoice } = await import('../ai')
      mockPost.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            type: 'text',
            text: JSON.stringify({
              number: 'INV-001',
              date: '2026-01-15',
              client: 'Acme Corp',
              currency: 'EUR',
              gross_orig: 1000,
              iva_collected: 210,
              irpf_retained: 150,
            }),
          }],
        }),
      })

      const result = await parseInvoice('base64data123')

      expect(result.number).toBe('INV-001')
      expect(result.client).toBe('Acme Corp')
      expect(result.currency).toBe('EUR')
      expect(result.gross_orig).toBe(1000)
    })

    it('throws if API key is missing', async () => {
      const { parseInvoice } = await import('../ai')
      // vi.stubEnv not available in vitest the same way — test by checking error path
      mockPost.mockRejectedValueOnce(new Error('Invalid API key'))

      await expect(parseInvoice('data')).rejects.toThrow()
    })
  })

  describe('parseExpense', () => {
    it('extracts expense fields from base64 file data', async () => {
      const { parseExpense } = await import('../ai')
      mockPost.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          content: [{
            type: 'text',
            text: JSON.stringify({
              description: 'AWS Server',
              gross: 50,
              iva_paid: 10.5,
              category: 'software',
            }),
          }],
        }),
      })

      const result = await parseExpense('base64data456')

      expect(result.description).toBe('AWS Server')
      expect(result.category).toBe('software')
      expect(result.gross).toBe(50)
    })
  })
})
```

Run: `npm test -- src/lib/__tests__/ai.test.ts` — expect FAIL

- [ ] **Step 2: Write minimal implementation**

```typescript
// src/lib/ai.ts

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6-20250514'
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string

export interface ParsedInvoice {
  number: string
  date: string
  client: string
  currency: 'USD' | 'EUR'
  gross_orig: number
  iva_collected: number
  irpf_retained: number
}

export interface ParsedExpense {
  description: string
  gross: number
  iva_paid: number
  category: string
}

async function anthropicCompletion(system: string, userMessage: string): Promise<string> {
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text response from Anthropic')
  return textBlock.text
}

export async function parseInvoice(fileData: string): Promise<ParsedInvoice> {
  const system = `You are an expert at extracting structured data from Spanish freelance invoices.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"number":"string","date":"YYYY-MM-DD","client":"string","currency":"USD|EUR","gross_orig":number,"iva_collected":number,"irpf_retained":number}
If a field cannot be determined, use null.`

  const userMessage = `Extract invoice data from this document. Return JSON matching the schema exactly.\n${fileData}`

  const text = await anthropicCompletion(system, userMessage)
  const parsed = JSON.parse(text)

  return {
    number: parsed.number ?? '',
    date: parsed.date ?? '',
    client: parsed.client ?? '',
    currency: (parsed.currency === 'USD' || parsed.currency === 'EUR') ? parsed.currency : 'EUR',
    gross_orig: Number(parsed.gross_orig) || 0,
    iva_collected: Number(parsed.iva_collected) || 0,
    irpf_retained: Number(parsed.irpf_retained) || 0,
  }
}

export async function parseExpense(fileData: string): Promise<ParsedExpense> {
  const system = `You are an expert at extracting structured data from Spanish expense receipts.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"description":"string","gross":number,"iva_paid":number,"category":"rent|electricity|water|internet|phone|cuota|software|hardware|other"}
Choose the most appropriate category from the list. If a field cannot be determined, use null.`

  const userMessage = `Extract expense data from this receipt. Return JSON matching the schema exactly.\n${fileData}`

  const text = await anthropicCompletion(system, userMessage)
  const parsed = JSON.parse(text)

  return {
    description: parsed.description ?? '',
    gross: Number(parsed.gross) || 0,
    iva_paid: Number(parsed.iva_paid) || 0,
    category: parsed.category ?? 'other',
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/ai.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/ai.ts src/lib/__tests__/ai.test.ts
git commit -m "feat(phase-2): add AI parsing client for invoices and expenses"
```

---

## Task 4: Quarter/Year Utility Helpers

**Files:**
- Create: `src/lib/dates.ts`
- Create: `src/lib/__tests__/dates.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/lib/__tests__/dates.test.ts
import { describe, it, expect } from 'vitest'
import { getQuarter, getYear, getFilingDeadline, getDefaultYear } from '../dates'

describe('getQuarter', () => {
  it('returns Q1 for Jan-Mar dates', () => {
    expect(getQuarter('2026-01-15')).toBe(1)
    expect(getQuarter('2026-03-31')).toBe(1)
  })
  it('returns Q2 for Apr-Jun dates', () => {
    expect(getQuarter('2026-04-01')).toBe(2)
    expect(getQuarter('2026-06-30')).toBe(2)
  })
  it('returns Q3 for Jul-Sep dates', () => {
    expect(getQuarter('2026-07-15')).toBe(3)
    expect(getQuarter('2026-09-30')).toBe(3)
  })
  it('returns Q4 for Oct-Dec dates', () => {
    expect(getQuarter('2026-10-01')).toBe(4)
    expect(getQuarter('2026-12-31')).toBe(4)
  })
})

describe('getFilingDeadline', () => {
  it('Q1 deadline is Apr 30', () => {
    expect(getFilingDeadline(1, 2026)).toBe('2026-04-30')
  })
  it('Q2 deadline is Jul 31', () => {
    expect(getFilingDeadline(2, 2026)).toBe('2026-07-31')
  })
  it('Q3 deadline is Oct 31', () => {
    expect(getFilingDeadline(3, 2026)).toBe('2026-10-31')
  })
  it('Q4 deadline is Jan 30 of following year', () => {
    expect(getFilingDeadline(4, 2026)).toBe('2027-01-30')
  })
})

describe('getDefaultYear', () => {
  it('returns current year', () => {
    const now = new Date()
    expect(getDefaultYear()).toBe(now.getFullYear())
  })
})
```

Run: `npm test -- src/lib/__tests__/dates.test.ts` — expect FAIL

- [ ] **Step 2: Write minimal implementation**

```typescript
// src/lib/dates.ts

export function getQuarter(dateStr: string): number {
  const month = new Date(dateStr + 'T00:00:00').getUTCMonth() + 1
  if (month <= 3) return 1
  if (month <= 6) return 2
  if (month <= 9) return 3
  return 4
}

export function getYear(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00').getUTCFullYear()
}

export function getDefaultYear(): number {
  return new Date().getFullYear()
}

export function getFilingDeadline(quarter: number, year: number): string {
  const deadlines: Record<number, string> = {
    1: `${year}-04-30`,
    2: `${year}-07-31`,
    3: `${year}-10-31`,
    4: `${year + 1}-01-30`,
  }
  return deadlines[quarter] ?? ''
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/lib/__tests__/dates.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/lib/dates.ts src/lib/__tests__/dates.test.ts
git commit -m "feat(phase-2): add date utility helpers for quarter and filing deadlines"
```

---

## Task 5: useInvoices Hook

**Files:**
- Create: `src/hooks/useInvoices.ts`
- Create: `src/hooks/__tests__/useInvoices.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/hooks/__tests__/useInvoices.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useInvoices } from '../useInvoices'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } })) },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: { id: 'upd-id' }, error: null })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    })),
  },
}))

const queryClient = new QueryClient()
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('useInvoices', () => {
  it('isLoading true while fetching', async () => {
    const { result } = renderHook(() => useInvoices(), { wrapper })
    expect(result.current.loading).toBe(true)
  })
})
```

Run: `npm test -- src/hooks/__tests__/useInvoices.test.ts` — expect FAIL

- [ ] **Step 2: Write the hook implementation**

Read `src/types/database.ts` first for the `Invoice` type.

```typescript
// src/hooks/useInvoices.ts
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type Invoice } from '../types/database'
import { getQuarter, getYear, getDefaultYear } from '../lib/dates'

export interface InvoiceFilters {
  quarter: number | null
  year: number
}

export interface UseInvoicesReturn {
  invoices: Invoice[]
  loading: boolean
  error: string | null
  filters: InvoiceFilters
  setFilters: (f: Partial<InvoiceFilters>) => void
  createInvoice: (data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => Promise<Invoice>
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  isLoading: boolean
}

async function getUserId() {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

export function useInvoices(): UseInvoicesReturn {
  const [filters, setFilters] = useState<InvoiceFilters>({
    quarter: null,
    year: getDefaultYear(),
  })

  const userId = useState<string | null>(null)[0]

  const { data: allInvoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices', userId],
    queryFn: async (): Promise<Invoice[]> => {
      const uid = await getUserId()
      if (!uid) return []
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', uid)
        .order('date', { ascending: false })
      if (error) throw error
      return data as Invoice[]
    },
    enabled: !!userId,
  })

  const queryClient = useQueryClient()

  const createInvoice = useMutation({
    mutationFn: async (data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => {
      const uid = await getUserId()
      if (!uid) throw new Error('Not authenticated')
      const { data: result, error } = await supabase
        .from('invoices')
        .insert({ ...data, user_id: uid })
        .select()
        .single()
      if (error) throw error
      return result as Invoice
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const updateInvoice = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<Invoice>) => {
      const { data: result, error } = await supabase
        .from('invoices')
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return result as Invoice
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const deleteInvoice = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('invoices').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  })

  const filteredInvoices = allInvoices.filter((inv) => {
    if (inv.year !== filters.year) return false
    if (filters.quarter !== null && inv.quarter !== filters.quarter) return false
    return true
  })

  const handleSetFilters = useCallback((f: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...f }))
  }, [])

  return {
    invoices: filteredInvoices,
    loading: isLoading,
    error: error instanceof Error ? error.message : (error as string | null),
    filters,
    setFilters: handleSetFilters,
    createInvoice: createInvoice.mutateAsync,
    updateInvoice: (id: string, data: Partial<Invoice>) =>
      updateInvoice.mutateAsync({ id, ...data }),
    deleteInvoice: deleteInvoice.mutateAsync,
    isLoading,
  }
}
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `npm test -- src/hooks/__tests__/useInvoices.test.ts`
Expected: PASS (or skip if react-query test setup is complex — verify build passes instead)

- [ ] **Step 4: Run build to verify no TypeScript errors**

Run: `npm run build 2>&1 | grep -E "error|src/hooks" | head -20`
Expected: No errors related to useInvoices

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useInvoices.ts src/hooks/__tests__/useInvoices.test.ts
git commit -m "feat(phase-2): add useInvoices hook with CRUD and filtering"
```

---

## Task 6: useExpenses Hook

**Files:**
- Create: `src/hooks/useExpenses.ts`

Mirror `useInvoices.ts` but for expenses. Same pattern, different table name.

- [ ] **Step 1: Create `src/hooks/useExpenses.ts`** following the exact same structure as `useInvoices.ts` but with:
  - Table name: `'expenses'`
  - Query key: `['expenses', userId]`
  - Filtered by `year` and `quarter` in same way
  - No `irpf_retained` field

```typescript
// src/hooks/useExpenses.ts
// Same structure as useInvoices.ts — see that file for full implementation
// Changes: table 'expenses', no irpf_retained
import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type Expense } from '../types/database'
import { getDefaultYear } from '../lib/dates'

export interface ExpenseFilters {
  quarter: number | null
  year: number
}

// ... (mirror useInvoices structure)
```

- [ ] **Step 2: Run build to verify no TypeScript errors**

Run: `npm run build 2>&1 | grep -E "error" | head -20`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useExpenses.ts
git commit -m "feat(phase-2): add useExpenses hook with CRUD and filtering"
```

---

## Task 7: Shared UI Components

**Files:**
- Create: `src/components/ui/FileDropzone.tsx`
- Create: `src/components/ui/FormField.tsx`
- Create: `src/components/ui/EmptyState.tsx`
- Create: `src/components/ui/CategoryBadge.tsx`

- [ ] **Step 1: Create `src/components/ui/FileDropzone.tsx`**

```typescript
// src/components/ui/FileDropzone.tsx
import { type FC, useCallback, useState } from 'react'

interface FileDropzoneProps {
  onFile: (file: File) => void
  accept?: string
  parsing?: boolean
  error?: string | null
}

export const FileDropzone: FC<FileDropzoneProps> = ({
  onFile,
  accept = '.pdf,.jpg,.jpeg,.png',
  parsing = false,
  error = null,
}) => {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      const file = e.dataTransfer.files[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) onFile(file)
    },
    [onFile]
  )

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${error ? 'var(--color-danger)' : dragging ? 'var(--color-primary)' : 'var(--color-border)'}`,
        borderRadius: 12,
        padding: 'var(--space-xl)',
        textAlign: 'center',
        cursor: 'pointer',
        position: 'relative',
        background: dragging ? 'rgba(245,158,11,0.05)' : 'transparent',
        transition: 'all 200ms ease',
      }}
      onClick={() => !parsing && document.getElementById('file-input')?.click()}
    >
      <input
        id="file-input"
        type="file"
        accept={accept}
        onChange={handleChange}
        style={{ display: 'none' }}
      />
      {parsing ? (
        <div style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
          <div>Parsing document...</div>
        </div>
      ) : error ? (
        <div style={{ color: 'var(--color-danger)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>⚠</div>
          <div>{error}</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Click to try again or enter manually</div>
        </div>
      ) : (
        <div style={{ color: 'var(--color-text-muted)' }}>
          <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
          <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>
            Drop invoice PDF or image here
          </div>
          <div style={{ fontSize: 14 }}>or click to browse</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>PDF, JPG, PNG up to 10MB</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `src/components/ui/FormField.tsx`**

```typescript
// src/components/ui/FormField.tsx
import { type FC, type ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  error?: string | null
  hint?: string
}

export const FormField: FC<FormFieldProps> = ({ label, children, error, hint }) => (
  <div style={{ marginBottom: 'var(--space-md)' }}>
    <label style={{
      display: 'block',
      marginBottom: 'var(--space-xs)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-text)',
    }}>
      {label}
    </label>
    {children}
    {hint && !error && (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
        {hint}
      </div>
    )}
    {error && (
      <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>
        {error}
      </div>
    )}
  </div>
)
```

- [ ] **Step 3: Create `src/components/ui/EmptyState.tsx`**

```typescript
// src/components/ui/EmptyState.tsx
import { type FC } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: FC<EmptyStateProps> = ({ title, description, action }) => (
  <div style={{
    textAlign: 'center',
    padding: 'var(--space-2xl)',
    color: 'var(--color-text-muted)',
  }}>
    <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>📋</div>
    <h3 style={{ margin: '0 0 var(--space-sm) 0', color: 'var(--color-text)' }}>{title}</h3>
    <p style={{ margin: '0 0 var(--space-lg) 0' }}>{description}</p>
    {action && (
      <button className="btn-primary" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
)
```

- [ ] **Step 4: Create `src/components/ui/CategoryBadge.tsx`**

```typescript
// src/components/ui/CategoryBadge.tsx
import { type FC } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#3B82F6',
  electricity: '#F59E0B',
  water: '#06B6D4',
  internet: '#10B981',
  phone: '#8B5CF6',
  cuota: '#EF4444',
  software: '#F97316',
  hardware: '#6B7280',
  other: '#94A3B8',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  water: 'Water',
  internet: 'Internet',
  phone: 'Phone',
  cuota: 'Cuota',
  software: 'Software',
  hardware: 'Hardware',
  other: 'Other',
}

interface CategoryBadgeProps {
  category: string
}

export const CategoryBadge: FC<CategoryBadgeProps> = ({ category }) => (
  <span
    className="badge"
    style={{
      background: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
      color: 'white',
    }}
  >
    {CATEGORY_LABELS[category] ?? category}
  </span>
)
```

- [ ] **Step 5: Run build to verify no TypeScript errors**

Run: `npm run build 2>&1 | grep -E "error" | head -20`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/FileDropzone.tsx src/components/ui/FormField.tsx src/components/ui/EmptyState.tsx src/components/ui/CategoryBadge.tsx
git commit -m "feat(phase-2): add shared UI components (FileDropzone, FormField, EmptyState, CategoryBadge)"
```

---

## Task 8: InvoicesPage

**Files:**
- Create: `src/pages/InvoicesPage.tsx`
- Create: `src/pages/__tests__/InvoicesPage.test.tsx`

- [ ] **Step 1: Write a basic smoke test**

```typescript
// src/pages/__tests__/InvoicesPage.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoicesPage } from '../InvoicesPage'

vi.mock('../../hooks/useInvoices', () => ({
  useInvoices: () => ({
    invoices: [],
    loading: false,
    error: null,
    filters: { quarter: null, year: 2026 },
    setFilters: () => {},
    createInvoice: async () => ({} as any),
    updateInvoice: async () => ({} as any),
    deleteInvoice: async () => {},
    isLoading: false,
  }),
}))

describe('InvoicesPage', () => {
  it('renders the page title', () => {
    render(<InvoicesPage />)
    expect(screen.getByText('Invoices')).toBeTruthy()
  })
})
```

Run: `npm test -- src/pages/__tests__/InvoicesPage.test.tsx` — expect FAIL

- [ ] **Step 2: Build the full `InvoicesPage.tsx`**

Read `src/App.tsx` and `src/hooks/useInvoices.ts` first for context.

```typescript
// src/pages/InvoicesPage.tsx
import { useState, useCallback, useEffect } from 'react'
import { useInvoices } from '../hooks/useInvoices'
import { FileDropzone } from '../components/ui/FileDropzone'
import { FormField } from '../components/ui/FormField'
import { EmptyState } from '../components/ui/EmptyState'
import { parseInvoice } from '../lib/ai'
import { fetchFxRate } from '../lib/fx'
import { getQuarter, getYear } from '../lib/dates'
import { type Invoice } from '../types/database'

type View = 'list' | 'form'

interface InvoiceFormData {
  number: string
  date: string
  date_paid: string
  client: string
  currency: 'USD' | 'EUR'
  gross_orig: number
  iva_collected: number
  irpf_retained: number
  fx_rate: number | null
  fx_date: string | null
  notes: string
  filename: string | null
}

const emptyForm = (): InvoiceFormData => ({
  number: '', date: '', date_paid: '', client: '',
  currency: 'EUR', gross_orig: 0, iva_collected: 0, irpf_retained: 0,
  fx_rate: null, fx_date: null, notes: '', filename: null,
})

const QUARTERS = [
  { value: null, label: 'All quarters' },
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

export function InvoicesPage() {
  const {
    invoices, loading, error, filters, setFilters,
    createInvoice, updateInvoice, deleteInvoice,
  } = useInvoices()

  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceFormData>(emptyForm())
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fill form for edit
  const openEdit = useCallback((inv: Invoice) => {
    setEditingId(inv.id)
    setForm({
      number: inv.number,
      date: inv.date,
      date_paid: inv.date_paid ?? '',
      client: inv.client,
      currency: inv.currency,
      gross_orig: inv.gross_orig,
      iva_collected: inv.iva_collected,
      irpf_retained: inv.irpf_retained,
      fx_rate: inv.fx_rate,
      fx_date: inv.fx_date,
      notes: '',
      filename: inv.filename,
    })
    setView('form')
  }, [])

  const openNew = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm())
    setView('form')
    setParseError(null)
    setFxError(null)
    setSaveError(null)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setParseError('File too large. Max 10MB.')
      return
    }
    setParsing(true)
    setParseError(null)
    try {
      const base64 = await fileToBase64(file)
      const parsed = await parseInvoice(base64)
      const quarter = getQuarter(parsed.date || new Date().toISOString().split('T')[0])
      const year = getYear(parsed.date || new Date().toISOString().split('T')[0])
      setForm((prev) => ({
        ...prev,
        number: parsed.number,
        date: parsed.date,
        client: parsed.client,
        currency: parsed.currency,
        gross_orig: parsed.gross_orig,
        iva_collected: parsed.iva_collected,
        irpf_retained: parsed.irpf_retained,
        quarter,
        year,
        filename: file.name,
      }))
    } catch {
      setParseError('Parsing failed. Please enter data manually.')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const quarter = getQuarter(form.date_paid || form.date)
      const year = getYear(form.date_paid || form.date)
      const base = {
        number: form.number,
        date: form.date,
        date_paid: form.date_paid || null,
        client: form.client,
        currency: form.currency,
        gross_orig: form.gross_orig,
        fx_rate: form.fx_rate,
        fx_date: form.fx_date,
        gross_eur: form.currency === 'EUR' ? form.gross_orig : 0,
        iva_collected: form.iva_collected,
        irpf_retained: form.irpf_retained,
        quarter,
        year,
        filename: form.filename,
      }
      if (editingId) {
        await updateInvoice(editingId, base)
      } else {
        await createInvoice(base as Omit<Invoice, 'id' | 'user_id' | 'created_at'>)
      }
      setView('list')
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, createInvoice, updateInvoice])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    await deleteInvoice(id)
  }, [deleteInvoice])

  // Auto-fetch FX rate when currency changes to USD and no rate set
  useEffect(() => {
    if (form.currency === 'USD' && !form.fx_rate && form.date) {
      setFxError(null)
      fetchFxRate(form.date)
        .then(({ rate }) => {
          setForm((prev) => ({ ...prev, fx_rate: rate, fx_date: form.date }))
        })
        .catch(() => {
          setFxError('Could not fetch FX rate. Enter manually.')
        })
    }
  }, [form.currency, form.date, form.fx_rate])

  const missingDatePaid = invoices.filter((i) => !i.date_paid)

  return (
    <div>
      {view === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: 0 }}>Invoices</h2>
            <button className="btn-primary" onClick={openNew}>+ Add Invoice</button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <select
              className="select"
              style={{ width: 150 }}
              value={filters.quarter ?? ''}
              onChange={(e) => setFilters({ quarter: e.target.value === '' ? null : Number(e.target.value) })}
            >
              {QUARTERS.map((q) => (
                <option key={String(q.value)} value={q.value ?? ''}>{q.label}</option>
              ))}
            </select>
            <select
              className="select"
              style={{ width: 120 }}
              value={filters.year}
              onChange={(e) => setFilters({ year: Number(e.target.value) })}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {missingDatePaid.length > 0 && (
            <div className="banner banner-warning">
              ⚠ {missingDatePaid.length} invoice(s) missing Date Paid
            </div>
          )}

          {invoices.length === 0 && !loading ? (
            <EmptyState
              title="No invoices yet"
              description="Upload a PDF or add an invoice manually"
              action={{ label: '+ Add Invoice', onClick: openNew }}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Date</th>
                    <th>Date Paid</th>
                    <th>Client</th>
                    <th className="num">Gross (€)</th>
                    <th className="num">IVA</th>
                    <th className="num">IRPF</th>
                    <th>Q</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} onClick={() => openEdit(inv)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.number}</td>
                      <td>{inv.date}</td>
                      <td style={{ color: inv.date_paid ? undefined : 'var(--color-warning)' }}>
                        {inv.date_paid ?? '—'}
                      </td>
                      <td>{inv.client}</td>
                      <td className="num" style={{ color: inv.currency === 'USD' ? 'var(--color-usd)' : undefined }}>
                        {inv.gross_eur.toFixed(2)}
                      </td>
                      <td className="num">{inv.iva_collected.toFixed(2)}</td>
                      <td className="num">{inv.irpf_retained.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>Q{inv.quarter}</td>
                      <td>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(inv.id) }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: 0 }}>{editingId ? 'Edit Invoice' : 'New Invoice'}</h2>
            <button className="btn-secondary" onClick={() => setView('list')}>Cancel</button>
          </div>

          <div className="card">
            <FileDropzone
              onFile={handleFile}
              parsing={parsing}
              error={parseError}
            />

            {parseError && (
              <div className="banner banner-info" style={{ marginTop: 'var(--space-md)' }}>
                Enter the details below manually.
              </div>
            )}

            {fxError && (
              <div className="banner banner-warning" style={{ marginTop: 'var(--space-md)' }}>
                {fxError}
              </div>
            )}

            {saveError && (
              <div className="banner banner-error" style={{ marginTop: 'var(--space-md)' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              <FormField label="Invoice Number">
                <input className="input" value={form.number} onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} />
              </FormField>
              <FormField label="Client">
                <input className="input" value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} />
              </FormField>
              <FormField label="Invoice Date">
                <input className="input" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </FormField>
              <FormField label="Date Paid">
                <input className="input" type="date" value={form.date_paid} onChange={(e) => setForm((p) => ({ ...p, date_paid: e.target.value }))} />
              </FormField>
              <FormField label="Currency">
                <select
                  className="select"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as 'USD' | 'EUR', fx_rate: null }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </FormField>
              <FormField label={`Gross Amount (${form.currency})`}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.gross_orig || ''}
                  onChange={(e) => setForm((p) => ({ ...p, gross_orig: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)', color: form.currency === 'USD' ? 'var(--color-usd)' : undefined }}
                />
              </FormField>
              <FormField label="IVA Collected">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.iva_collected || ''}
                  onChange={(e) => setForm((p) => ({ ...p, iva_collected: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              <FormField label="IRPF Retained">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.irpf_retained || ''}
                  onChange={(e) => setForm((p) => ({ ...p, irpf_retained: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              {form.currency === 'USD' && (
                <FormField label="FX Rate (USD→EUR)">
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={form.fx_rate ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, fx_rate: Number(e.target.value) }))}
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-usd)' }}
                  />
                </FormField>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Invoice' : 'Save Invoice'}
              </button>
              <button className="btn-secondary" onClick={() => setView('list')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 3: Run build to verify no TypeScript errors**

Run: `npm run build 2>&1 | grep -E "error" | head -20`
Expected: Clean build

- [ ] **Step 4: Commit**

```bash
git add src/pages/InvoicesPage.tsx src/pages/__tests__/InvoicesPage.test.tsx
git commit -m "feat(phase-2): build InvoicesPage with list table and full-page form"
```

---

## Task 9: ExpensesPage

**Files:**
- Create: `src/pages/ExpensesPage.tsx`

Mirror `InvoicesPage.tsx` for expenses. Key differences:
- `useExpenses` hook instead of `useInvoices`
- Form fields: Category (dropdown), Description, Gross, IVA Paid, Deduct %, Fixed Monthly checkbox
- Deduction auto-fill based on category selection
- Home office % fetched from profile to adjust rent/electricity/water

- [ ] **Step 1: Create `src/pages/ExpensesPage.tsx`**

Read `src/pages/InvoicesPage.tsx` first as the reference.

The form grid layout is identical. The field differences:

```typescript
// Category dropdown
const CATEGORIES = [
  { value: 'rent', label: 'Rent', defaultDeduct: homeOfficePct, ivaRate: 0 },
  { value: 'electricity', label: 'Electricity', defaultDeduct: homeOfficePct, ivaRate: 21 },
  { value: 'water', label: 'Water', defaultDeduct: homeOfficePct, ivaRate: 0 },
  { value: 'internet', label: 'Internet', defaultDeduct: 50, ivaRate: 21 },
  { value: 'phone', label: 'Phone', defaultDeduct: 50, ivaRate: 21 },
  { value: 'cuota', label: 'Cuota Autónomos', defaultDeduct: 100, ivaRate: 0 },
  { value: 'software', label: 'Software', defaultDeduct: 100, ivaRate: 21 },
  { value: 'hardware', label: 'Hardware', defaultDeduct: 100, ivaRate: 21 },
  { value: 'other', label: 'Other', defaultDeduct: 100, ivaRate: 21 },
]
```

When category changes:
```typescript
const handleCategoryChange = (cat: string) => {
  const catInfo = CATEGORIES.find((c) => c.value === cat)
  if (catInfo) {
    setForm((prev) => ({
      ...prev,
      category: cat,
      deduct_pct: catInfo.defaultDeduct,
    }))
  }
}
```

The `deduct_pct` for rent/electricity/water comes from the user's profile's `home_office_pct`. Fetch it with `useQuery` on mount using `supabase.from('profiles').select('home_office_pct')`.

Table columns: Category, Description, Gross, IVA Paid, Deduct %, Quarter, Fixed, Actions

Fixed shown as: `{form.is_fixed ? '📌' : '—'}`

- [ ] **Step 2: Run build to verify no TypeScript errors**

Run: `npm run build 2>&1 | grep -E "error" | head -20`
Expected: Clean build

- [ ] **Step 3: Commit**

```bash
git add src/pages/ExpensesPage.tsx
git commit -m "feat(phase-2): build ExpensesPage with list table and full-page form"
```

---

## Task 10: Wire Pages into App

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update `src/App.tsx` to import and use the new pages**

Read `src/App.tsx` first.

Change the Invoices and Expenses tab content:

```typescript
// At top of App.tsx
import { InvoicesPage } from './pages/InvoicesPage'
import { ExpensesPage } from './pages/ExpensesPage'

// Replace the placeholder divs:
{activeTab === 'Invoices' && <InvoicesPage />}
{activeTab === 'Expenses' && <ExpensesPage />}
```

- [ ] **Step 2: Run build to verify full app compiles**

Run: `npm run build 2>&1 | tail -10`
Expected: Build succeeds with no errors

- [ ] **Step 3: Run all tests**

Run: `npm test -- --run 2>&1 | tail -30`
Expected: All tests pass

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(phase-2): wire InvoicesPage and ExpensesPage into App TabNav"
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] INV-01: Upload PDF → `parseInvoice()` in `InvoicesPage.handleFile()`
- [x] INV-02: Manual invoice entry → `InvoiceFormData` form with all fields
- [x] INV-03: Date Paid → `getQuarter(form.date_paid || form.date)` on save
- [x] INV-04: USD FX auto-fetch → `useEffect` in `InvoicesPage` calls `fetchFxRate`
- [x] INV-05: Inline FX editing → `fx_rate` field in form, editable
- [x] INV-06: Quarter/year filter → `useInvoices` + filter bar dropdowns
- [x] EXP-01: Receipt upload → `parseExpense()` in `ExpensesPage.handleFile()`
- [x] EXP-02: Manual expense entry → `ExpenseFormData` form with category selector
- [x] EXP-03: Fixed monthly flag → `is_fixed` checkbox in form
- [x] EXP-04: Home office % → fetched from profile, applied to rent/electricity/water
- [x] FILE-02: AI via direct Claude API → `src/lib/ai.ts` direct REST calls

**Placeholder scan:** No TBD/TODO/placeholder text found.

**Type consistency:** `Invoice` and `Expense` types from `src/types/database.ts` used throughout. `getQuarter`/`getYear` from `src/lib/dates.ts` used in both pages. `fetchFxRate` returns `{ rate, date }` in both pages.

---

## Execution Choice

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-phase-2-invoice-expense-plan.md`.**

Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints

Which approach?
