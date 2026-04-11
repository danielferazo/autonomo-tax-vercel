import { describe, it, expect } from 'vitest'
import { getQuarter, getFilingDeadline, getDefaultYear } from '../dates'

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
  it('Q1 deadline is April 20', () => {
    expect(getFilingDeadline(1, 2026)).toBe('20 de abril de 2026')
  })
  it('Q2 deadline is July 20', () => {
    expect(getFilingDeadline(2, 2026)).toBe('20 de julio de 2026')
  })
  it('Q3 deadline is October 20', () => {
    expect(getFilingDeadline(3, 2026)).toBe('20 de octubre de 2026')
  })
  it('Q4 deadline is January 20 of following year', () => {
    expect(getFilingDeadline(4, 2026)).toBe('20 de enero de 2027')
  })
  it('returns empty string for invalid quarter', () => {
    expect(getFilingDeadline(5, 2026)).toBe('')
  })
})

describe('getDefaultYear', () => {
  it('returns current year', () => {
    const now = new Date()
    expect(getDefaultYear()).toBe(now.getFullYear())
  })
})
