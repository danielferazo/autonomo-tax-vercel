export interface Profile {
  id: string
  nif: string | null
  home_office_pct: number
  created_at: string
}

export interface Invoice {
  id: string; user_id: string; number: string; date: string
  date_paid: string | null; client: string; currency: 'USD' | 'EUR'
  gross_orig: number; fx_rate: number | null; fx_date: string | null
  gross_eur: number; iva_collected: number; irpf_retained: number
  quarter: number; year: number; filename: string | null; created_at: string
}

export interface Expense {
  id: string; user_id: string; category: string; description: string
  gross: number; iva_paid: number; deduct_pct: number; is_fixed: boolean
  quarter: number; year: number; filename: string | null; created_at: string
}

export interface QuarterlySummary {
  id: string; user_id: string; year: number; quarter: number
  prior_ingresos: number; prior_gastos: number; prior_pagos: number
  prior_retenciones: number; prior_303: number; m130_result: number; m303_result: number; created_at: string
}
