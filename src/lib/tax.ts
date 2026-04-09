import { type Invoice, type Expense } from '../types/database'

export interface Modelo303Result {
  cas01: number
  cas02: number
  cas03: number
  cas22: number
  cas28: number
  cas29: number
  cas40: number
  cas41: number
  cas45: number
  cas64: number
  cas69: number
  isPayable: boolean
}

export interface Modelo130Result {
  cas01: number
  cas02: number
  cas03: number
  cas04: number
  cas05: number
  cas06: number
  cas07: number
  cas12: number
}

export function calculateModelo303(
  invoices: Invoice[],
  expenses: Expense[],
  prior303: number
): Modelo303Result {
  const cas01 = invoices.length
  const cas02 = invoices.reduce((sum, i) => sum + i.gross_eur, 0)
  const cas03 = invoices.reduce((sum, i) => sum + i.iva_collected, 0)
  const cas22 = 0

  const cas28 = expenses.reduce((sum, e) => sum + e.gross * (e.deduct_pct / 100), 0)
  const cas29 = expenses.reduce((sum, e) => sum + e.iva_paid, 0)

  const cas40 = cas02 + cas03
  const cas41 = cas28 + cas29
  const cas45 = cas40 - cas41
  const cas69 = cas45 - prior303

  return { cas01, cas02, cas03, cas22, cas28, cas29, cas40, cas41, cas45, cas64: prior303, cas69, isPayable: cas69 >= 0 }
}

export function calculateModelo130(
  invoices: Invoice[],
  expenses: Expense[],
  quarter: number,
  year: number,
  priorPagos: number,
  _priorRetenciones: number,
): Modelo130Result {
  const ytdInvoices = invoices.filter((i) => i.year === year && i.quarter <= quarter)
  const ytdExpenses = expenses.filter((e) => e.year === year && e.quarter <= quarter)

  const cas01 = ytdInvoices.reduce((sum, i) => sum + i.gross_eur, 0)
  const cas02 = ytdExpenses.reduce((sum, e) => sum + e.gross * (e.deduct_pct / 100), 0)
  const cas03 = cas01 - cas02
  const cas04 = cas03 * 0.20
  const cas05 = priorPagos
  const cas06 = ytdInvoices.reduce((sum, i) => sum + i.irpf_retained, 0)
  const cas07 = cas05 + cas06
  const cas12 = Math.max(0, cas04 - cas07)

  return { cas01, cas02, cas03, cas04, cas05, cas06, cas07, cas12 }
}