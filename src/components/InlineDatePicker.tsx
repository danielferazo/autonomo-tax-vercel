import { useState } from 'react'
import { invokeEdgeFunction } from '../lib/edgeFunction'
import { type Invoice } from '../types/database'

interface InlineDatePickerProps {
  invoice: Invoice
  onUpdate: (invoice: Invoice) => void
}

export function InlineDatePicker({ invoice, onUpdate }: InlineDatePickerProps) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState(invoice.date_paid ?? '')
  const [saving, setSaving] = useState(false)

  if (invoice.date_paid && !editing) {
    return (
      <span
        style={{ cursor: 'pointer', borderBottom: '1px dashed var(--color-muted)' }}
        onClick={() => { setDate(invoice.date_paid ?? ''); setEditing(true) }}
        title="Click to change"
      >
        {invoice.date_paid}
      </span>
    )
  }

  if (!editing && !invoice.date_paid) {
    return (
      <button
        onClick={() => setEditing(true)}
        style={{
          background: 'none',
          border: '1px dashed var(--color-warning)',
          color: 'var(--color-warning)',
          padding: '2px 8px',
          borderRadius: 4,
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        + Add date
      </button>
    )
  }

  const handleSave = async () => {
    if (!date) return
    setSaving(true)
    try {
      const updated = await invokeEdgeFunction<Invoice>('update-date-paid', {
        invoice_id: invoice.id,
        date_paid: date,
      })
      onUpdate(updated)
      setEditing(false)
    } catch {
      // Keep editing on error
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <input
        type="date"
        className="input"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        style={{ padding: '2px 4px', fontSize: 12, width: 120 }}
        autoFocus
      />
      <button
        onClick={handleSave}
        disabled={saving || !date}
        style={{
          background: 'var(--color-primary)',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          padding: '2px 8px',
          fontSize: 11,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? '...' : 'OK'}
      </button>
      <button
        onClick={() => setEditing(false)}
        style={{
          background: 'none',
          border: '1px solid var(--color-border)',
          borderRadius: 4,
          padding: '2px 6px',
          fontSize: 11,
          cursor: 'pointer',
        }}
      >
        X
      </button>
    </div>
  )
}
