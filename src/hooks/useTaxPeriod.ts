// src/hooks/useTaxPeriod.ts
import { useState } from 'react'
import { getFilingDeadline, getDefaultYear } from '../lib/dates'

export function useTaxPeriod() {
  const now = new Date()
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3)
  const [quarter, setQuarter] = useState(currentQuarter)
  const [year, setYear] = useState(getDefaultYear())

  const filingDeadline = getFilingDeadline(quarter, year)

  return { quarter, year, setQuarter, setYear, filingDeadline }
}