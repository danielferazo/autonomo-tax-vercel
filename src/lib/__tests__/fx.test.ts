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