import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useExpenses } from '../useExpenses'

const mockGetUser = vi.fn()
const mockOrder = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (...args: string[]) => mockFrom(...args),
  },
}))

const sampleExpenses = [
  { id: '1', user_id: 'u1', category: 'software', description: 'VS Code', gross: 10, iva_paid: 2.1, deduct_pct: 100, is_fixed: false, quarter: 1, year: 2026, filename: null, created_at: '2026-01-01' },
  { id: '2', user_id: 'u1', category: 'rent', description: 'Office', gross: 500, iva_paid: 0, deduct_pct: 20, is_fixed: true, quarter: 2, year: 2026, filename: null, created_at: '2026-04-01' },
]

// Chain: from('expenses').select('*').eq('user_id', id).order('quarter', { ascending: false })
function setupChain(data: unknown[]) {
  mockOrder.mockResolvedValue({ data, error: null })
  mockEq.mockReturnValue({ order: mockOrder })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

describe('useExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty array and loading initially', () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain([])

    const { result } = renderHook(() => useExpenses())
    expect(result.current.expenses).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('loads expenses from supabase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain(sampleExpenses)

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.allExpenses).toHaveLength(2)
  })

  it('filters expenses by quarter', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain(sampleExpenses)

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    act(() => {
      result.current.setFilters({ quarter: 1, year: 2026 })
    })

    const filtered = result.current.expenses
    expect(filtered.every((e: { quarter: number }) => e.quarter === 1)).toBe(true)
  })

  it('clears expenses when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    setupChain([])

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.allExpenses).toEqual([])
  })

  it('sets error on fetch failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    mockOrder.mockResolvedValue({ data: null, error: new Error('Connection failed') })
    mockEq.mockReturnValue({ order: mockOrder })
    mockSelect.mockReturnValue({ eq: mockEq })
    mockFrom.mockReturnValue({ select: mockSelect })

    const { result } = renderHook(() => useExpenses())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Connection failed')
  })
})
