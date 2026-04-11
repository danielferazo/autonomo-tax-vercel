import { useState, useEffect } from 'react'
import { useInvoices } from '../hooks/useInvoices'
import { useExpenses } from '../hooks/useExpenses'
import { useTaxPeriod } from '../hooks/useTaxPeriod'
import { calculateModelo303, calculateModelo130 } from '../lib/tax'
import { supabase } from '../lib/supabase'
import { USER_ID } from '../lib/constants'
import { EmptyState } from '../components/ui/EmptyState'

function formatCurrency(amount: number, currency: 'EUR' | 'USD'): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function SummaryPage() {
  const { allInvoices } = useInvoices()
  const { allExpenses } = useExpenses()
  const { quarter, year, filingDeadline } = useTaxPeriod()

  const [priorValues, setPriorValues] = useState({ prior303: 0, priorPagos: 0, priorRetenciones: 0 })

  useEffect(() => {
    supabase
      .from('quarterly_summaries')
      .select('prior_303, prior_pagos, prior_retenciones')
      .eq('user_id', USER_ID)
      .eq('quarter', quarter)
      .eq('year', year)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPriorValues({
            prior303: data.prior_303 ?? 0,
            priorPagos: data.prior_pagos ?? 0,
            priorRetenciones: data.prior_retenciones ?? 0,
          })
        }
      })
  }, [quarter, year])

  const m303 = calculateModelo303(allInvoices, allExpenses, priorValues.prior303)
  const m130 = calculateModelo130(allInvoices, allExpenses, quarter, year, priorValues.priorPagos, priorValues.priorRetenciones)

  const totalLiability = m303.cas69 + m130.cas12
  const isPayable = totalLiability >= 0

  const usdInvoices = allInvoices.filter((inv) => inv.currency === 'USD')

  const hasData = allInvoices.length > 0 || allExpenses.length > 0

  if (!hasData) {
    return (
      <div>
        <EmptyState
          title="Sin datos para mostrar"
          description="Añade facturas y gastos para ver el resumen de tus obligaciones fiscales."
        />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xl)' }}>
      {/* Liability Banner */}
      <div
        style={{
          background: isPayable ? 'var(--color-debt)' : 'var(--color-credit)',
          color: 'white',
          borderRadius: 8,
          padding: 'var(--space-lg) var(--space-xl)',
          textAlign: 'center',
          transition: 'background 200ms ease',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.875rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          opacity: 0.9,
          marginBottom: 'var(--space-xs)',
        }}>
          {isPayable ? 'Total a Ingresar' : 'Total a Devolver / Crédito'}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '2rem',
          fontWeight: 600,
          lineHeight: 1.2,
        }}>
          {formatCurrency(Math.abs(totalLiability), 'EUR')}
        </div>
        <div style={{
          fontFamily: 'var(--font-sans)',
          fontSize: '0.875rem',
          opacity: 0.85,
          marginTop: 'var(--space-sm)',
        }}>
          Plazo: {filingDeadline}
        </div>
      </div>

      {/* Modelo Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--space-lg)',
      }}>
        {/* Modelo 303 Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            background: 'var(--color-header)',
            color: 'white',
            padding: 'var(--space-sm) var(--space-md)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Modelo 303
          </div>
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: m303.isPayable ? 'var(--color-debt)' : 'var(--color-credit)',
              marginBottom: 'var(--space-xs)',
            }}>
              {formatCurrency(m303.cas69, 'EUR')}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Resultado (Casilla 69)
            </div>
          </div>
        </div>

        {/* Modelo 130 Card */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            background: 'var(--color-header)',
            color: 'white',
            padding: 'var(--space-sm) var(--space-md)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Modelo 130
          </div>
          <div style={{
            padding: 'var(--space-lg)',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: m130.cas12 > 0 ? 'var(--color-debt)' : 'var(--color-credit)',
              marginBottom: 'var(--space-xs)',
            }}>
              {formatCurrency(m130.cas12, 'EUR')}
            </div>
            <div style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              color: 'var(--color-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              Resultado (Casilla 12)
            </div>
          </div>
        </div>
      </div>

      {/* Currency Conversion Table */}
      {usdInvoices.length === 0 ? (
        <EmptyState
          title="Sin facturas en USD"
          description="No hay facturas en USD para mostrar."
        />
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{
            background: 'var(--color-header)',
            color: 'white',
            padding: 'var(--space-sm) var(--space-md)',
            fontFamily: 'var(--font-sans)',
            fontWeight: 600,
            fontSize: '0.75rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            Conversión de Divisas (USD → EUR)
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontFamily: 'var(--font-sans)',
          }}>
            <thead>
              <tr className="table-header">
                <th style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  background: 'var(--color-header)',
                  color: 'white',
                }}>
                  Factura
                </th>
                <th style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'left',
                  background: 'var(--color-header)',
                  color: 'white',
                }}>
                  Fecha
                </th>
                <th style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'right',
                  background: 'var(--color-header)',
                  color: 'white',
                }}>
                  Importe Original (USD)
                </th>
                <th style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'right',
                  background: 'var(--color-header)',
                  color: 'white',
                }}>
                  Tipo de Cambio
                </th>
                <th style={{
                  padding: 'var(--space-sm) var(--space-md)',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  textAlign: 'right',
                  background: 'var(--color-header)',
                  color: 'white',
                }}>
                  Importe EUR
                </th>
              </tr>
            </thead>
            <tbody>
              {usdInvoices.map((inv, idx) => (
                <tr
                  key={inv.id}
                  style={{
                    background: idx % 2 === 0 ? 'var(--color-surface)' : 'var(--color-header-light)',
                    transition: 'background 150ms ease',
                  }}
                >
                  <td style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {inv.number}
                  </td>
                  <td style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                    {inv.date}
                  </td>
                  <td style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    color: 'var(--color-usd)',
                  }}>
                    {formatCurrency(inv.gross_orig, 'USD')}
                  </td>
                  <td style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                    color: 'var(--color-usd)',
                  }}>
                    {inv.fx_rate != null ? inv.fx_rate.toFixed(4) : '—'}
                  </td>
                  <td style={{
                    padding: 'var(--space-sm) var(--space-md)',
                    borderBottom: '1px solid var(--color-border)',
                    fontFamily: 'var(--font-mono)',
                    textAlign: 'right',
                  }}>
                    {formatCurrency(inv.gross_eur, 'EUR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
