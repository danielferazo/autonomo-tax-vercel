// src/pages/Modelo130Page.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { USER_ID } from '../lib/constants'
import { type Invoice, type Expense } from '../types/database'
import { calculateModelo130 } from '../lib/tax'
import { useTaxPeriod } from '../hooks/useTaxPeriod'
import { Casilla } from '../components/ui/Casilla'
import { ErrorBanner } from '../components/ui/ErrorBanner'

export function Modelo130Page() {
  const { quarter, year } = useTaxPeriod()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [priorPagos, setPriorPagos] = useState(0)
  const [priorRetenciones, setPriorRetenciones] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    setFetchError(null)

    try {
      // Fetch Q1 through current quarter (cumulative YTD)
      const [invRes, expRes, summaryRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', USER_ID).eq('year', year).gte('quarter', 1).lte('quarter', quarter),
        supabase.from('expenses').select('*').eq('user_id', USER_ID).eq('year', year).gte('quarter', 1).lte('quarter', quarter),
        supabase.from('quarterly_summaries').select('prior_pagos,prior_retenciones').eq('user_id', USER_ID).eq('quarter', quarter).eq('year', year).maybeSingle(),
      ])

      setInvoices((invRes.data ?? []) as Invoice[])
      setExpenses((expRes.data ?? []) as Expense[])
      setPriorPagos(summaryRes.data?.prior_pagos ?? 0)
      setPriorRetenciones(summaryRes.data?.prior_retenciones ?? 0)
    } catch {
      setFetchError('Error loading data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [quarter, year])

  useEffect(() => { fetchData() }, [fetchData])

  const result = calculateModelo130(invoices, expenses, quarter, year, priorPagos, priorRetenciones)

  const savePrior = useCallback(async (field: 'prior_pagos' | 'prior_retenciones', val: number) => {
    await supabase.from('quarterly_summaries').upsert({
      user_id: USER_ID, quarter, year, [field]: val,
    }, { onConflict: 'user_id,quarter,year' })
  }, [quarter, year])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>Cargando...</div>
  }

  const isExento = result.cas04 <= result.cas07

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ margin: 0 }}>Modelo 130 — IRPF Pago Fraccionado</h2>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Acumulado Q1–Q{quarter} {year}
        </div>
      </div>

      {fetchError && (
        <ErrorBanner message={fetchError} variant="error" onRetry={fetchData} />
      )}

      {quarter > 1 && (
        <div className="banner banner-info" style={{ marginBottom: 'var(--space-md)' }}>
          Datos acumulativos de Q1 a Q{quarter} {year}
        </div>
      )}

      <div className="card">
        {/* Rendimiento y base */}
        <div style={{ marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
            Rendimiento y Base de la Cuota
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Casilla number="01" label="Ingresos YTD" value={result.cas01} />
            <Casilla number="02" label="Gastos YTD" value={result.cas02} />
            <Casilla number="03" label="Rendimiento neto (01 - 02)" value={result.cas03} />
            <Casilla number="04" label="20% sobre rendimiento" value={result.cas04} />
          </div>
        </div>

        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
            Pagos y Retenciones
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
            <Casilla
              number="05"
              label="Pagos anteriores"
              value={priorPagos}
              editable
              onChange={(v) => { setPriorPagos(v); savePrior('prior_pagos', v) }}
            />
            <Casilla number="06" label="Retenciones YTD" value={result.cas06} />
            <Casilla number="07" label="Suma (05 + 06)" value={result.cas07} />
          </div>
        </div>

        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Resultado
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', flexWrap: 'wrap' }}>
            <Casilla
              number="12"
              label="A INGRESAR"
              value={result.cas12}
              highlight={isExento ? 'neutral' : 'positive'}
            />
            {isExento ? (
              <div style={{ color: 'var(--color-success)', fontWeight: 600, fontSize: 14 }}>
                Cuota cero — las retenciones superan el rendimiento
              </div>
            ) : (
              <div style={{ color: 'var(--color-danger)', fontWeight: 600, fontSize: 14 }}>
                A PAGAR: {result.cas12.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}