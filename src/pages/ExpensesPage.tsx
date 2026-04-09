import { useState, useCallback, useEffect } from 'react'
import { useExpenses } from '../hooks/useExpenses'
import { FileDropzone } from '../components/ui/FileDropzone'
import { FormField } from '../components/ui/FormField'
import { EmptyState } from '../components/ui/EmptyState'
import { CategoryBadge } from '../components/ui/CategoryBadge'
import { parseExpense } from '../lib/ai'
import { supabase } from '../lib/supabase'
import { type Expense } from '../types/database'

type View = 'list' | 'form'

interface ExpenseFormData {
  category: string
  description: string
  gross: number
  iva_paid: number
  deduct_pct: number
  is_fixed: boolean
  quarter: number
  year: number
  filename: string | null
}

const emptyForm = (): ExpenseFormData => ({
  category: '',
  description: '',
  gross: 0,
  iva_paid: 0,
  deduct_pct: 100,
  is_fixed: false,
  quarter: 1,
  year: new Date().getFullYear(),
  filename: null,
})

const QUARTERS = [
  { value: null, label: 'All quarters' },
  { value: 1, label: 'Q1' },
  { value: 2, label: 'Q2' },
  { value: 3, label: 'Q3' },
  { value: 4, label: 'Q4' },
]

const YEARS = [new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1]

function getCategoryDefaults(category: string, homeOfficePct: number): { defaultDeduct: number; ivaRate: number } {
  switch (category) {
    case 'rent':
      return { defaultDeduct: homeOfficePct, ivaRate: 0 }
    case 'electricity':
      return { defaultDeduct: homeOfficePct, ivaRate: 21 }
    case 'water':
      return { defaultDeduct: homeOfficePct, ivaRate: 0 }
    case 'internet':
      return { defaultDeduct: 50, ivaRate: 21 }
    case 'phone':
      return { defaultDeduct: 50, ivaRate: 21 }
    case 'cuota':
      return { defaultDeduct: 100, ivaRate: 0 }
    case 'software':
      return { defaultDeduct: 100, ivaRate: 21 }
    case 'hardware':
      return { defaultDeduct: 100, ivaRate: 21 }
    default:
      return { defaultDeduct: 100, ivaRate: 21 }
  }
}

const CATEGORIES = [
  { value: 'rent', label: 'Rent' },
  { value: 'electricity', label: 'Electricity' },
  { value: 'water', label: 'Water' },
  { value: 'internet', label: 'Internet' },
  { value: 'phone', label: 'Phone' },
  { value: 'cuota', label: 'Cuota Autónomos' },
  { value: 'software', label: 'Software' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'other', label: 'Other' },
]

export function ExpensesPage() {
  const {
    expenses, loading, filters, setFilters,
    createExpense, updateExpense, deleteExpense,
  } = useExpenses()

  const [view, setView] = useState<View>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<ExpenseFormData>(emptyForm())
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [homeOfficePct, setHomeOfficePct] = useState<number>(20)

  // Fetch home office percentage from user profile
  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('home_office_pct')
        .eq('user_id', user.id)
        .single()
      if (data) {
        setHomeOfficePct(data.home_office_pct ?? 20)
      }
    }
    fetchProfile()
  }, [])

  // Fill form for edit
  const openEdit = useCallback((exp: Expense) => {
    setEditingId(exp.id)
    setForm({
      category: exp.category,
      description: exp.description,
      gross: exp.gross,
      iva_paid: exp.iva_paid,
      deduct_pct: exp.deduct_pct,
      is_fixed: exp.is_fixed,
      quarter: exp.quarter,
      year: exp.year,
      filename: exp.filename,
    })
    setView('form')
  }, [])

  const openNew = useCallback(() => {
    setEditingId(null)
    setForm(emptyForm())
    setView('form')
    setParseError(null)
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
      const parsed = await parseExpense(base64)
      const defaults = getCategoryDefaults(parsed.category || 'other', homeOfficePct)
      setForm((prev) => ({
        ...prev,
        category: parsed.category,
        description: parsed.description,
        gross: parsed.gross,
        iva_paid: parsed.iva_paid,
        deduct_pct: defaults.defaultDeduct,
        filename: file.name,
      }))
    } catch {
      setParseError('Parsing failed. Please enter data manually.')
    } finally {
      setParsing(false)
    }
  }, [homeOfficePct])

  const handleCategoryChange = useCallback((category: string) => {
    const defaults = getCategoryDefaults(category, homeOfficePct)
    setForm((prev) => ({
      ...prev,
      category,
      deduct_pct: defaults.defaultDeduct,
    }))
  }, [homeOfficePct])

  const handleSave = useCallback(async () => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editingId) {
        await updateExpense(editingId, {
          category: form.category,
          description: form.description,
          gross: form.gross,
          iva_paid: form.iva_paid,
          deduct_pct: form.deduct_pct,
          is_fixed: form.is_fixed,
          quarter: form.quarter,
          year: form.year,
          filename: form.filename,
        })
      } else {
        await createExpense({
          category: form.category,
          description: form.description,
          gross: form.gross,
          iva_paid: form.iva_paid,
          deduct_pct: form.deduct_pct,
          is_fixed: form.is_fixed,
          quarter: form.quarter,
          year: form.year,
          filename: form.filename,
        })
      }
      setView('list')
    } catch {
      setSaveError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [form, editingId, createExpense, updateExpense])

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await deleteExpense(id)
  }, [deleteExpense])

  const missingQuarter = expenses.filter((e) => !e.quarter || e.quarter < 1 || e.quarter > 4)

  return (
    <div>
      {view === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
            <h2 style={{ margin: 0 }}>Expenses</h2>
            <button className="btn-primary" onClick={openNew}>+ Add Expense</button>
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

          {missingQuarter.length > 0 && (
            <div className="banner banner-warning">
              ⚠ {missingQuarter.length} expense(s) missing quarter assignment
            </div>
          )}

          {expenses.length === 0 && !loading ? (
            <EmptyState
              title="No expenses yet"
              description="Upload a receipt or add an expense manually"
              action={{ label: '+ Add Expense', onClick: openNew }}
            />
          ) : (
            <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th>Description</th>
                    <th className="num">Gross (€)</th>
                    <th className="num">IVA Paid</th>
                    <th className="num">Deduct %</th>
                    <th>Q</th>
                    <th>Fixed</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((exp) => (
                    <tr key={exp.id} onClick={() => openEdit(exp)} style={{ cursor: 'pointer' }}>
                      <td><CategoryBadge category={exp.category} /></td>
                      <td>{exp.description}</td>
                      <td className="num">{exp.gross.toFixed(2)}</td>
                      <td className="num">{exp.iva_paid.toFixed(2)}</td>
                      <td className="num">{exp.deduct_pct}%</td>
                      <td style={{ textAlign: 'center' }}>Q{exp.quarter}</td>
                      <td style={{ textAlign: 'center' }}>{exp.is_fixed ? '📌' : '—'}</td>
                      <td>
                        <button
                          className="btn-danger"
                          style={{ padding: '4px 8px', fontSize: 12 }}
                          onClick={(e) => { e.stopPropagation(); handleDelete(exp.id) }}
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
            <h2 style={{ margin: 0 }}>{editingId ? 'Edit Expense' : 'New Expense'}</h2>
            <button className="btn-secondary" onClick={() => setView('list')}>Cancel</button>
          </div>

          <div className="card">
            <FileDropzone
              onFile={handleFile}
              parsing={parsing}
              error={parseError}
            />

            {parseError && (
              <div className="banner banner-info" style={{ marginTop: 'var(--space-md)' }}>
                Enter the details below manually.
              </div>
            )}

            {saveError && (
              <div className="banner banner-error" style={{ marginTop: 'var(--space-md)' }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginTop: 'var(--space-lg)' }}>
              <FormField label="Category">
                <select
                  className="select"
                  value={form.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                >
                  <option value="">Select category...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Description">
                <input
                  className="input"
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                />
              </FormField>
              <FormField label="Gross (€)">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.gross || ''}
                  onChange={(e) => setForm((p) => ({ ...p, gross: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              <FormField label="IVA Paid (€)">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  value={form.iva_paid || ''}
                  onChange={(e) => setForm((p) => ({ ...p, iva_paid: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              <FormField label="Deduct %">
                <input
                  className="input"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.deduct_pct || ''}
                  onChange={(e) => setForm((p) => ({ ...p, deduct_pct: Number(e.target.value) }))}
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
              </FormField>
              <FormField label="Quarter">
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="4"
                  value={form.quarter || ''}
                  onChange={(e) => setForm((p) => ({ ...p, quarter: Number(e.target.value) }))}
                />
              </FormField>
              <FormField label="Year">
                <input
                  className="input"
                  type="number"
                  value={form.year || ''}
                  onChange={(e) => setForm((p) => ({ ...p, year: Number(e.target.value) }))}
                />
              </FormField>
              <FormField label="Fixed Monthly?">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <input
                    type="checkbox"
                    checked={form.is_fixed}
                    onChange={(e) => setForm((p) => ({ ...p, is_fixed: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: 'pointer' }}
                  />
                  <span style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>
                    Mark if this expense recurs monthly (e.g., cuota autónomos)
                  </span>
                </div>
              </FormField>
            </div>

            <div style={{ marginTop: 'var(--space-xl)', display: 'flex', gap: 'var(--space-md)' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Expense' : 'Save Expense'}
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
