import { useState, useCallback, useEffect } from 'react'
import { useInvoices } from '../hooks/useInvoices'
import { FileDropzone } from '../components/ui/FileDropzone'
import { FormField } from '../components/ui/FormField'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBanner } from '../components/ui/ErrorBanner'
import { parseInvoice } from '../lib/ai'
import { fetchFxRate } from '../lib/fx'
import { getQuarter, getYear } from '../lib/dates'
import { type Invoice } from '../types/database'

type View = 'list' | 'form'

interface InvoiceFormData {
  number: string
  date: string
  date_paid: string
  client: string
  currency: 'USD' | 'EUR'
  gross_orig: number
  iva_collected: number
  irpf_retained: number
  fx_rate: number | null
  fx_date: string | null
  notes: string
  filename: string | null
}

const emptyForm = (): InvoiceFormData => ({
  number: '', date: '', date_paid: '', client: '',
  currency: 'EUR', gross_orig: 0, iva_collected: 0, irpf_retained: 0,
  fx_rate: null, fx_date: null, notes: '', filename: null,
})

const QUARTERS = [
  { value: null, label: 'All quarters' },
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

export function InvoicesPage() {
  const {
    invoices, loading, filters, setFilters,
    createInvoice, updateInvoice, deleteInvoice,
  } = useInvoices()

  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<InvoiceFormData>(emptyForm())
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [fxError, setFxError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fill form for edit
  const openEdit = useCallback((inv: Invoice) => {
    setEditingId(inv.id)
    setForm({
      number: inv.number,
      date: inv.date,
      date_paid: inv.date_paid ?? '',
      client: inv.client,
      currency: inv.currency,
      gross_orig: inv.gross_orig,
      iva_collected: inv.iva_collected,
      irpf_retained: inv.irpf_retained,
      fx_rate: inv.fx_rate,
      fx_date: inv.fx_date,
      notes: '',
      filename: inv.filename,
    })
    setView('form')
  }, [])

  const openNew = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm())
    setView('form')
    setParseError(null)
    setFxError(null)
    setSaveError(null)
  }, [])

  const handleFile = useCallback(async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setParseError('File too large. Max 10MB.')
      return
    }
    setParsing(true)
    setParseError(null)
    try {
      const base64 = await fileToBase64(file)
      const parsed = await parseInvoice(base64)
      const quarter = getQuarter(parsed.date || new Date().toISOString().split('T')[0])
      const year = getYear(parsed.date || new Date().toISOString().split('T')[0])
      setForm((prev) => ({
        ...prev,
        number: parsed.number,
        date: parsed.date,
        client: parsed.client,
        currency: parsed.currency,
        gross_orig: parsed.gross_orig,
        iva_collected: parsed.iva_collected,
        irpf_retained: parsed.irpf_retained,
        quarter,
        year,
        filename: file.name,
      }))
    } catch {
      setParseError('Parsing failed. Please enter data manually.')
    } finally {
      setParsing(false)
    }
  }, [])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const quarter = getQuarter(form.date_paid || form.date)
      const year = getYear(form.date_paid || form.date)
      const base = {
        number: form.number,
        date: form.date,
        date_paid: form.date_paid || null,
        client: form.client,
        currency: form.currency,
        gross_orig: form.gross_orig,
        fx_rate: form.fx_rate,
        fx_date: form.fx_date,
        gross_eur: form.currency === 'EUR' ? form.gross_orig : 0,
        iva_collected: form.iva_collected,
        irpf_retained: form.irpf_retained,
        quarter,
        year,
        filename: form.filename,
      }
      if (editingId) {
        await updateInvoice(editingId, base)
      } else {
        await createInvoice(base as Omit<Invoice, 'id' | 'user_id' | 'created_at'>)
      }
      setView('list')
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, createInvoice, updateInvoice])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    await deleteInvoice(id)
  }, [deleteInvoice])

  // Auto-fetch FX rate when currency changes to USD and no rate set
  useEffect(() => {
    if (form.currency === 'USD' && !form.fx_rate && form.date) {
      setFxError(null)
      fetchFxRate(form.date)
        .then(({ rate }) => {
          setForm((prev) => ({ ...prev, fx_rate: rate, fx_date: form.date }))
        })
        .catch(() => {
          setFxError('Could not fetch FX rate. Enter manually.')
        })
    }
  }, [form.currency, form.date, form.fx_rate])

  const missingDatePaid = invoices.filter((i) => !i.date_paid)

  return (
    <div>
      {view === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: 0 }}>Invoices</h2>
            <button className="btn-primary" onClick={openNew}>+ Add Invoice</button>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
            <select
              className="select"
              style={{ width: 150 }}
              value={filters.quarter ?? ''}
              onChange={(e) => setFilters({ quarter: e.target.value === '' ? null : Number(e.target.value) })}
            >
              {QUARTERS.map((q) => (
                <option key={String(q.value)} value={q.value ?? ''}>{q.label}</option>
              ))}
            </select>
            <select
              className="select"
              style={{ width: 120 }}
              value={filters.year}
              onChange={(e) => setFilters({ year: Number(e.target.value) })}
            >
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {missingDatePaid.length > 0 && (
            <div className="banner banner-warning">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M10 6V10M10 14h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#D97706" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              {missingDatePaid.length} invoice(s) missing Date Paid
            </div>
          )}

          {invoices.length === 0 && !loading ? (
            <EmptyState
              title="No invoices yet"
              description="Upload a PDF or add an invoice manually"
              action={{ label: '+ Add Invoice', onClick: openNew }}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Number</th>
                    <th>Date</th>
                    <th>Date Paid</th>
                    <th>Client</th>
                    <th className="num">Gross (€)</th>
                    <th className="num">IVA</th>
                    <th className="num">IRPF</th>
                    <th>Q</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} onClick={() => openEdit(inv)} style={{ cursor: 'pointer' }}>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.number}</td>
                      <td>{inv.date}</td>
                      <td style={{ color: inv.date_paid ? undefined : 'var(--color-warning)' }}>
                        {inv.date_paid ?? '—'}
                      </td>
                      <td>{inv.client}</td>
                      <td className="num" style={{ color: inv.currency === 'USD' ? 'var(--color-usd)' : undefined }}>
                        {inv.gross_eur.toFixed(2)}
                      </td>
                      <td className="num">{inv.iva_collected.toFixed(2)}</td>
                      <td className="num">{inv.irpf_retained.toFixed(2)}</td>
                      <td style={{ textAlign: 'center' }}>Q{inv.quarter}</td>
                      <td>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          aria-label="Delete invoice"
                          onClick={(e) => { e.stopPropagation(); handleDelete(inv.id) }}
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: 0 }}>{editingId ? 'Edit Invoice' : 'New Invoice'}</h2>
            <button className="btn-secondary" onClick={() => setView('list')}>Cancel</button>
          </div>

          <div className="card">
            <FileDropzone
              onFile={handleFile}
              parsing={parsing}
              error={parseError}
            />

            {parseError && (
              <ErrorBanner message={parseError} variant="info" onDismiss={() => setParseError(null)} />
            )}

            {fxError && (
              <ErrorBanner message={fxError} variant="warning" onDismiss={() => setFxError(null)} />
            )}

            {saveError && (
              <ErrorBanner message={saveError} variant="error" onDismiss={() => setSaveError(null)} />
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              <FormField label="Invoice Number">
                <input className="input" value={form.number} onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))} />
              </FormField>
              <FormField label="Client">
                <input className="input" value={form.client} onChange={(e) => setForm((p) => ({ ...p, client: e.target.value }))} />
              </FormField>
              <FormField label="Invoice Date">
                <input className="input" type="date" value={form.date} onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))} />
              </FormField>
              <FormField label="Date Paid">
                <input className="input" type="date" value={form.date_paid} onChange={(e) => setForm((p) => ({ ...p, date_paid: e.target.value }))} />
              </FormField>
              <FormField label="Currency">
                <select
                  className="select"
                  value={form.currency}
                  onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value as 'USD' | 'EUR', fx_rate: null }))}
                >
                  <option value="EUR">EUR</option>
                  <option value="USD">USD</option>
                </select>
              </FormField>
              <FormField label={`Gross Amount (${form.currency})`}>
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.gross_orig || ''}
                  onChange={(e) => setForm((p) => ({ ...p, gross_orig: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)', color: form.currency === 'USD' ? 'var(--color-usd)' : undefined }}
                />
              </FormField>
              <FormField label="IVA Collected">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.iva_collected || ''}
                  onChange={(e) => setForm((p) => ({ ...p, iva_collected: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              <FormField label="IRPF Retained">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.irpf_retained || ''}
                  onChange={(e) => setForm((p) => ({ ...p, irpf_retained: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              {form.currency === 'USD' && (
                <FormField label="FX Rate (USD→EUR)">
                  <input
                    className="input"
                    type="number"
                    step="0.000001"
                    value={form.fx_rate ?? ''}
                    onChange={(e) => setForm((p) => ({ ...p, fx_rate: Number(e.target.value) }))}
                    style={{ fontFamily: 'var(--font-mono)', color: 'var(--color-usd)' }}
                  />
                </FormField>
              )}
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Invoice' : 'Save Invoice'}
              </button>
              <button className="btn-secondary" onClick={() => setView('list')}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}