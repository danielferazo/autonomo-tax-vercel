import { describe, it, expect } from 'vitest'
import { calculateModelo303, calculateModelo130 } from '../tax'
import { type Invoice, type Expense } from '../../types/database'

const makeInvoice = (overrides: Partial<Invoice> = {}): Invoice => ({
  id: '1', user_id: 'u1', number: 'INV-1', date: '2026-01-15',
  date_paid: '2026-01-20', client: 'Acme', currency: 'EUR',
  gross_orig: 1000, fx_rate: null, fx_date: null,
  gross_eur: 1000, iva_collected: 210, irpf_retained: 150,
  quarter: 1, year: 2026, filename: null, created_at: '',
  ...overrides,
})

const makeExpense = (overrides: Partial<Expense> = {}): Expense => ({
  id: '1', user_id: 'u1', category: 'software', description: 'AWS', date: null,
  gross: 100, iva_paid: 21, deduct_pct: 100, is_fixed: false,
  quarter: 1, year: 2026, filename: null, created_at: '',
  ...overrides,
})

describe('calculateModelo303', () => {
  it('cas01 = count of invoices', () => {
    const invoices = [makeInvoice(), makeInvoice({ id: '2' })]
    const expenses: Expense[] = []
    const result = calculateModelo303(invoices, expenses, 0)
    expect(result.cas01).toBe(2)
  })

  it('cas02 = sum of gross_eur', () => {
    const invoices = [makeInvoice({ gross_eur: 1000 }), makeInvoice({ gross_eur: 2000 })]
    const result = calculateModelo303(invoices, [], 0)
    expect(result.cas02).toBe(3000)
  })

  it('cas03 = sum of iva_collected', () => {
    const invoices = [makeInvoice({ iva_collected: 210 }), makeInvoice({ iva_collected: 420 })]
    const result = calculateModelo303(invoices, [], 0)
    expect(result.cas03).toBe(630)
  })

  it('cas28 = sum of gross * deduct_pct/100 (not full gross)', () => {
    const expenses = [
      makeExpense({ gross: 100, deduct_pct: 100 }),   // deduct 100
      makeExpense({ gross: 200, deduct_pct: 50 }),    // deduct 100
      makeExpense({ gross: 100, deduct_pct: 20 }),    // deduct 20 (home office)
    ]
    const result = calculateModelo303([], expenses, 0)
    expect(result.cas28).toBe(220) // 100 + 100 + 20
  })

  it('cas29 = sum of iva_paid', () => {
    const expenses = [makeExpense({ iva_paid: 21 }), makeExpense({ iva_paid: 10 })]
    const result = calculateModelo303([], expenses, 0)
    expect(result.cas29).toBe(31)
  })

  it('cas40 = cas02 + cas03', () => {
    const invoices = [makeInvoice({ gross_eur: 1000, iva_collected: 210 })]
    const result = calculateModelo303(invoices, [], 0)
    expect(result.cas40).toBe(1210)
  })

  it('cas45 = cas40 - (cas28 + cas29)', () => {
    const invoices = [makeInvoice({ gross_eur: 1000, iva_collected: 210 })]
    const expenses = [makeExpense({ gross: 200, iva_paid: 42, deduct_pct: 100 })]
    const result = calculateModelo303(invoices, expenses, 0)
    expect(result.cas45).toBe(1000 + 210 - (200 + 42)) // 968
  })

  it('cas69 = cas45 - prior303', () => {
    const invoices = [makeInvoice({ gross_eur: 1000, iva_collected: 210 })]
    const result = calculateModelo303(invoices, [], 500)
    expect(result.cas69).toBe(1210 - 500) // 710
  })

  it('isPayable = true when cas69 >= 0', () => {
    const result = calculateModelo303([makeInvoice()], [], 0)
    expect(result.isPayable).toBe(true)
  })

  it('isPayable = false when cas69 < 0', () => {
    const result = calculateModelo303([], [], 1000) // prior303 exceeds IVA
    expect(result.isPayable).toBe(false)
  })
})

describe('calculateModelo130', () => {
  it('cas01 = sum of gross_eur Q1 through current quarter only', () => {
    const invoices = [
      makeInvoice({ quarter: 1, gross_eur: 1000 }),
      makeInvoice({ id: '2', quarter: 2, gross_eur: 2000 }),
      makeInvoice({ id: '3', quarter: 3, gross_eur: 3000 }),
    ]
    const result = calculateModelo130(invoices, [], 2, 2026, 0, 0)
    expect(result.cas01).toBe(3000) // Q1 + Q2 only
  })

  it('cas02 = sum of deductible expenses Q1 through current quarter', () => {
    const expenses = [
      makeExpense({ quarter: 1, gross: 1000, deduct_pct: 100 }), // deduct 1000
      makeExpense({ id: '2', quarter: 2, gross: 500, deduct_pct: 100 }), // deduct 500
    ]
    const result = calculateModelo130([], expenses, 2, 2026, 0, 0)
    expect(result.cas02).toBe(1500)
  })

  it('cas03 = cas01 - cas02', () => {
    const invoices = [makeInvoice({ gross_eur: 1000 })]
    const expenses = [makeExpense({ gross: 400, deduct_pct: 100 })]
    const result = calculateModelo130(invoices, expenses, 1, 2026, 0, 0)
    expect(result.cas03).toBe(600)
  })

  it('cas04 = cas03 * 0.20', () => {
    const result = calculateModelo130([makeInvoice({ gross_eur: 1000 })], [makeExpense({ gross: 0, deduct_pct: 100 })], 1, 2026, 0, 0)
    expect(result.cas04).toBe(200)
  })

  it('cas06 = sum of irpf_retained Q1 through current quarter', () => {
    const invoices = [
      makeInvoice({ quarter: 1, irpf_retained: 100 }),
      makeInvoice({ id: '2', quarter: 2, irpf_retained: 150 }),
    ]
    const result = calculateModelo130(invoices, [], 2, 2026, 0, 0)
    expect(result.cas06).toBe(250)
  })

  it('cas07 = priorPagos + cas06', () => {
    const result = calculateModelo130([], [], 1, 2026, 500, 0)
    expect(result.cas07).toBe(500)
  })

  it('cas12 = max(0, cas04 - cas07)', () => {
    const result = calculateModelo130([makeInvoice({ gross_eur: 1000, irpf_retained: 0 })], [makeExpense({ gross: 0, deduct_pct: 100 })], 1, 2026, 0, 0)
    // cas04 = 200, cas07 = 0 → cas12 = 200
    expect(result.cas12).toBe(200)
  })

  it('cas12 never negative — returns 0 when retenciones exceed quota', () => {
    const result = calculateModelo130([], [], 1, 2026, 0, 500)
    // cas04 = 0, cas07 = 500 → cas12 = max(0, 0-500) = 0
    expect(result.cas12).toBe(0)
  })
})