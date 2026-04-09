import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTaxPeriod } from '../useTaxPeriod'

describe('useTaxPeriod', () => {
  it('returns current quarter and year', () => {
    const { result } = renderHook(() => useTaxPeriod())
    const now = new Date()
    const expectedQuarter = Math.ceil((now.getMonth() + 1) / 3)
    const expectedYear = now.getFullYear()

    expect(result.current.quarter).toBe(expectedQuarter)
    expect(result.current.year).toBe(expectedYear)
  })

  it('computes filing deadline for the selected quarter', () => {
    const { result } = renderHook(() => useTaxPeriod())
    const { year, filingDeadline } = result.current

    expect(filingDeadline).toContain(String(year))
  })

  it('updates quarter via setQuarter', () => {
    const { result } = renderHook(() => useTaxPeriod())

    act(() => {
      result.current.setQuarter(2)
    })

    expect(result.current.quarter).toBe(2)
  })

  it('updates year via setYear', () => {
    const { result } = renderHook(() => useTaxPeriod())

    act(() => {
      result.current.setYear(2025)
    })

    expect(result.current.year).toBe(2025)
  })

  it('updates filing deadline when quarter changes', () => {
    const { result } = renderHook(() => useTaxPeriod())

    const initialDeadline = result.current.filingDeadline

    act(() => {
      result.current.setQuarter(result.current.quarter === 1 ? 2 : 1)
    })

    expect(result.current.filingDeadline).not.toBe(initialDeadline)
  })
})
