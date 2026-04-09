import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useInvoices } from '../useInvoices'

// Mock supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1' } } })) },
    from: vi.fn(() => ({
      select: vi.fn(() => vi.fn(() => Promise.resolve({ data: [], error: null }))),
      insert: vi.fn(() => Promise.resolve({ data: { id: 'new-id' }, error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: { id: 'upd-id' }, error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ error: null })) })),
    })),
  },
}))

describe('useInvoices', () => {
  it('returns empty array initially', async () => {
    const { result } = renderHook(() => useInvoices())
    expect(result.current.invoices).toEqual([])
    expect(result.current.loading).toBe(true)
  })
})