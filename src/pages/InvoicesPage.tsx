import { useState, useCallback } from 'react'
import { useInvoices } from '../hooks/useInvoices'
import { FileDropzone } from '../components/ui/FileDropzone'
import { EmptyState } from '../components/ui/EmptyState'
import { InlineDatePicker } from '../components/InlineDatePicker'
import { parseDocument } from '../lib/documentParser'
import { uploadFile } from '../lib/supabase'
import { USER_ID } from '../lib/constants'

import { type Invoice } from '../types/database'

const QUARTERS = [
  { value: null, label: 'All quarters' },
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

interface PendingInvoice {
  tempId: string
  file: File
  data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>
  storagePath: string | null
  saving?: boolean
  error?: string | null
}

export function InvoicesPage() {
  const { invoices, loading, filters, setFilters, error: fetchError, createInvoice, deleteInvoice, refetch } = useInvoices()

  const [pending, setPending] = useState<PendingInvoice[]>([])
  const [parseError, setParseError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) {
        setParseError(`${file.name}: File too large. Max 10MB.`)
        continue
      }
      const tempId = `${Date.now()}-${Math.random()}`
      setPending((prev) => [
        ...prev,
        {
          tempId,
          file,
          data: {
            number: '',
            date: '',
            date_paid: null,
            client: '',
            currency: 'EUR',
            gross_orig: 0,
            fx_rate: null,
            fx_date: null,
            gross_eur: 0,
            iva_collected: 0,
            irpf_retained: 0,
            quarter: Math.ceil((new Date().getMonth() + 1) / 3),
            year: new Date().getFullYear(),
            filename: file.name,
          },
          storagePath: null,
        },
      ])
      setParseError(null)
      try {
        const parsed = await parseDocument(file, 'invoice')
        setPending((prev) =>
          prev.map((p) =>
            p.tempId === tempId
              ? { ...p, data: { ...p.data, ...parsed } as typeof p.data }
              : p
          )
        )
      } catch (e) {
        setPending((prev) =>
          prev.map((p) =>
            p.tempId === tempId
              ? { ...p, error: e instanceof Error ? e.message : 'Parsing failed' }
              : p
          )
        )
      }
    }
  }, [])

  const handleUpdatePending = useCallback(
    (tempId: string, field: keyof PendingInvoice['data'], value: unknown) => {
      setPending((prev) =>
        prev.map((p) =>
          p.tempId === tempId
            ? { ...p, data: { ...p.data, [field]: value } }
            : p
        )
      )
    },
    []
  )

  const handleDiscardPending = useCallback((tempId: string) => {
    setPending((prev) => prev.filter((p) => p.tempId !== tempId))
  }, [])

  const handleSavePending = useCallback(
    async (tempId: string) => {
      const item = pending.find((p) => p.tempId === tempId)
      if (!item) return
      setPending((prev) =>
        prev.map((p) => (p.tempId === tempId ? { ...p, saving: true, error: null } : p))
      )
      try {
        let storagePath = item.storagePath
        if (!storagePath && item.file) {
          storagePath = await uploadFile(USER_ID, 'invoices', item.file)
        }
        const invoiceData = {
          ...item.data,
          filename: storagePath,
        }
        await createInvoice(invoiceData)
        setPending((prev) => prev.filter((p) => p.tempId !== tempId))
      } catch (e) {
        setPending((prev) =>
          prev.map((p) =>
            p.tempId === tempId
              ? { ...p, saving: false, error: e instanceof Error ? e.message : 'Save failed' }
              : p
          )
        )
      }
    },
    [pending, createInvoice]
  )

  const handleSaveAll = useCallback(async () => {
    const all = [...pending.filter((p) => !p.saving)]
    for (const item of all) {
      await handleSavePending(item.tempId)
    }
  }, [pending, handleSavePending])

  const handleDiscardAll = useCallback(() => {
    setPending([])
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this invoice?')) return
    setDeleteError(null)
    try {
      await deleteInvoice(id)
    } catch {
      setDeleteError('Failed to delete. Try again.')
    }
  }, [deleteInvoice])

  const missingDatePaid = invoices.filter((i) => !i.date_paid)

  return (
    <div>
      <h2 style={{ margin: '0 0 var(--space-lg) 0' }}>Invoices</h2>

      <FileDropzone onFiles={handleFiles} parsing={false} error={parseError} />

      {pending.length > 0 && (
        <div style={{ marginTop: 'var(--space-lg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', marginBottom: 'var(--space-md)' }}>
            <h3 style={{ margin: 0 }}>Pending Review ({pending.length})</h3>
            <button className="btn-primary" onClick={handleSaveAll} style={{ padding: '4px 12px', fontSize: 13 }}>
              Save All
            </button>
            <button className="btn-secondary" onClick={handleDiscardAll} style={{ padding: '4px 12px', fontSize: 13 }}>
              Discard All
            </button>
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
            {pending.map((item) => (
              <div key={item.tempId} className="card" style={{ padding: 'var(--space-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-sm)' }}>
                  <span style={{ fontSize: 13, color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}>
                    {item.file.name}
                  </span>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {!item.error && (
                      <button
                        className="btn-primary"
                        onClick={() => handleSavePending(item.tempId)}
                        disabled={item.saving}
                        style={{ padding: '2px 10px', fontSize: 12 }}
                      >
                        {item.saving ? '...' : 'Save'}
                      </button>
                    )}
                    <button
                      className="btn-danger"
                      onClick={() => handleDiscardPending(item.tempId)}
                      disabled={item.saving}
                      style={{ padding: '2px 10px', fontSize: 12 }}
                    >
                      Discard
                    </button>
                  </div>
                </div>
                {item.error ? (
                  <div style={{ color: 'var(--color-danger)', fontSize: 13 }}>{item.error}</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 'var(--space-sm)' }}>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Number
                      <input
                        className="input"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.number}
                        onChange={(e) => handleUpdatePending(item.tempId, 'number', e.target.value)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Date
                      <input
                        className="input"
                        type="date"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.date}
                        onChange={(e) => handleUpdatePending(item.tempId, 'date', e.target.value)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Client
                      <input
                        className="input"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.client}
                        onChange={(e) => handleUpdatePending(item.tempId, 'client', e.target.value)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Gross (€)
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.gross_eur || ''}
                        onChange={(e) => handleUpdatePending(item.tempId, 'gross_eur', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      IVA
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.iva_collected || ''}
                        onChange={(e) => handleUpdatePending(item.tempId, 'iva_collected', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      IRPF
                      <input
                        className="input"
                        type="number"
                        step="0.01"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.irpf_retained || ''}
                        onChange={(e) => handleUpdatePending(item.tempId, 'irpf_retained', parseFloat(e.target.value) || 0)}
                      />
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Quarter
                      <select
                        className="select"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.quarter}
                        onChange={(e) => handleUpdatePending(item.tempId, 'quarter', parseInt(e.target.value))}
                      >
                        <option value={1}>Q1</option>
                        <option value={2}>Q2</option>
                        <option value={3}>Q3</option>
                        <option value={4}>Q4</option>
                      </select>
                    </label>
                    <label style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                      Year
                      <input
                        className="input"
                        type="number"
                        style={{ width: '100%', fontSize: 13 }}
                        value={item.data.year}
                        onChange={(e) => handleUpdatePending(item.tempId, 'year', parseInt(e.target.value))}
                      />
                    </label>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fetchError && (
        <div style={{ color: 'var(--color-danger)', marginTop: 'var(--space-md)', fontSize: 14 }}>
          {fetchError}
        </div>
      )}

      {deleteError && (
        <div style={{ color: 'var(--color-danger)', marginTop: 'var(--space-md)', fontSize: 14 }}>
          {deleteError}
        </div>
      )}

      {missingDatePaid.length > 0 && (
        <div className="banner banner-warning" style={{ marginTop: 'var(--space-lg)' }}>
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}><path d="M10 6V10M10 14h.01M19 10a9 9 0 11-18 0 9 9 0 0118 0z" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {missingDatePaid.length} invoice(s) missing Date Paid — quarter not yet assigned
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-md)', marginTop: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
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

      {invoices.length === 0 && !loading ? (
        <EmptyState
          title="No invoices yet"
          description="Upload a PDF or image and AI will extract everything automatically"
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
                <tr key={inv.id}>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{inv.number}</td>
                  <td>{inv.date}</td>
                  <td>
                    <InlineDatePicker
                      invoice={inv}
                      onUpdate={() => refetch()}
                    />
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
                      onClick={() => handleDelete(inv.id)}
                    >
                      x
                    </button>
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
