import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProfile } from '../useProfile'

const mockGetUser = vi.fn()
const mockSingle = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: { getUser: () => mockGetUser() },
    from: (...args: string[]) => mockFrom(...args),
  },
}))

// Chain: from('profiles').select('*').eq('user_id', id).single()
function setupChain(singleReturn: unknown) {
  mockSingle.mockResolvedValue(singleReturn)
  mockEq.mockReturnValue({ single: mockSingle })
  mockSelect.mockReturnValue({ eq: mockEq })
  mockFrom.mockReturnValue({ select: mockSelect })
}

describe('useProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading initially', () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain({ data: { user_id: 'u1', nif: '12345678A', home_office_pct: 20 }, error: null })

    const { result } = renderHook(() => useProfile())
    expect(result.current.loading).toBe(true)
    expect(result.current.profile).toBeNull()
  })

  it('loads profile from supabase', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain({ data: { user_id: 'u1', nif: '12345678A', home_office_pct: 25 }, error: null })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toEqual({
      user_id: 'u1',
      nif: '12345678A',
      home_office_pct: 25,
    })
  })

  it('sets profile to null when no user', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.profile).toBeNull()
  })

  it('sets error on fetch failure', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    setupChain({ data: null, error: new Error('DB error') })

    const { result } = renderHook(() => useProfile())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('DB error')
  })
})
