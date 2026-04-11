import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { USER_ID } from '../lib/constants'
import { type Invoice, type Expense } from '../types/database'
import { calculateModelo303 } from '../lib/tax'
import { useTaxPeriod } from '../hooks/useTaxPeriod'
import { Casilla } from '../components/ui/Casilla'
import { ErrorBanner } from '../components/ui/ErrorBanner'

export function Modelo303Page() {
  const { quarter, year } = useTaxPeriod()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [prior303, setPrior303] = useState(0)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)

    try {
      const [invRes, expRes, summaryRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', USER_ID).eq('quarter', quarter).eq('year', year),
        supabase.from('expenses').select('*').eq('user_id', USER_ID).eq('quarter', quarter).eq('year', year),
        supabase.from('quarterly_summaries').select('prior_303').eq('user_id', USER_ID).eq('quarter', quarter).eq('year', year).maybeSingle(),
      ])

      setInvoices((invRes.data ?? []) as Invoice[])
      setExpenses((expRes.data ?? []) as Expense[])
      setPrior303(summaryRes.data?.prior_303 ?? 0)
    } catch {
      setFetchError('Error loading data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [quarter, year])

  useEffect(() => { fetchData() }, [fetchData])

  const result = calculateModelo303(invoices, expenses, prior303)

  const handlePrior303Change = useCallback(async (val: number) => {
    setPrior303(val)
    await supabase.from('quarterly_summaries').upsert({
      user_id: USER_ID, quarter, year, prior_303: val,
    }, { onConflict: 'user_id,quarter,year' })
  }, [quarter, year])

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-muted)' }}>Cargando...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
        <h2 style={{ margin: 0 }}>Modelo 303 — IVA</h2>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
          Q{quarter} {year}
        </div>
      </div>

      {fetchError && (
        <ErrorBanner message={fetchError} variant="error" onRetry={fetchData} />
      )}

      {invoices.length === 0 && (
        <div className="banner banner-warning">
          No hay facturas para Q{quarter} {year}. El IVA devengado será €0.
        </div>
      )}

      {expenses.length === 0 && (
        <div className="banner banner-warning">
          No hay gastos para Q{quarter} {year}. El IVA deducible será €0.
        </div>
      )}

      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
              IVA Devengado
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Casilla number="01" label="Nº operaciones" value={result.cas01} />
              <Casilla number="02" label="Base imponible" value={result.cas02} />
              <Casilla number="03" label="Cuota repercotido" value={result.cas03} />
            </div>
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-primary)', marginBottom: 'var(--space-md)' }}>
              IVA Deducible
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              <Casilla number="28" label="Base deducible" value={result.cas28} />
              <Casilla number="29" label="Cuota soportado" value={result.cas29} />
            </div>
          </div>
        </div>

        <div style={{ borderTop: '2px solid var(--color-border)', paddingTop: 'var(--space-xl)' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-text-muted)', marginBottom: 'var(--space-md)' }}>
            Resultado
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-lg)', alignItems: 'flex-start' }}>
            <Casilla number="40" label="Total devengado" value={result.cas40} />
            <Casilla number="41" label="Total deducible" value={result.cas41} />
            <Casilla number="45" label="Diferencia" value={result.cas45} />
            <Casilla number="64" label="Regularización previa" value={prior303} editable onChange={handlePrior303Change} />
          </div>

          <div style={{ marginTop: 'var(--space-xl)', display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
            <Casilla
              number="69"
              label="RESULTADO"
              value={result.cas69}
              highlight={result.isPayable ? 'positive' : 'negative'}
            />
            <div style={{ fontSize: 14, color: result.isPayable ? 'var(--color-danger)' : 'var(--color-success)', fontWeight: 600 }}>
              {result.isPayable
                ? `A PAGAR: ${result.cas69.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`
                : `A DEVOLVER / COMPENSAR: ${Math.abs(result.cas69).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
