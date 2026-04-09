import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { type Expense } from '../types/database'
import { getDefaultYear } from '../lib/dates'

export interface ExpenseFilters {
  quarter: number | null
  year: number
}

export interface UseExpensesReturn {
  expenses: Expense[]
  loading: boolean
  error: string | null
  filters: ExpenseFilters
  setFilters: (f: Partial<ExpenseFilters>) => void
  createExpense: (data: Omit<Expense, 'id' | 'user_id' | 'created_at'>) => Promise<Expense>
  updateExpense: (id: string, data: Partial<Expense>) => Promise<Expense>
  deleteExpense: (id: string) => Promise<void>
  isLoading: boolean
}

export function useExpenses(): UseExpensesReturn {
  const [filters, setFilters] = useState<ExpenseFilters>({
    quarter: null,
    year: getDefaultYear(),
  })
  const [allExpenses, setAllExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAllExpenses([]); return }
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .order('quarter', { ascending: false })
      if (error) throw error
      setAllExpenses((data as Expense[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  const createExpense = useCallback(async (data: Omit<Expense, 'id' | 'user_id' | 'created_at'>): Promise<Expense> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: result, error } = await supabase
      .from('expenses')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    await fetchExpenses()
    return result as Expense
  }, [fetchExpenses])

  const updateExpense = useCallback(async (id: string, data: Partial<Expense>): Promise<Expense> => {
    const { data: result, error } = await supabase
      .from('expenses')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await fetchExpenses()
    return result as Expense
  }, [fetchExpenses])

  const deleteExpense = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) throw error
    await fetchExpenses()
  }, [fetchExpenses])

  const filteredExpenses = allExpenses.filter((exp) => {
    if (exp.year !== filters.year) return false
    if (filters.quarter !== null && exp.quarter !== filters.quarter) return false
    return true
  })

  const handleSetFilters = useCallback((f: Partial<ExpenseFilters>) => {
    setFilters((prev) => ({ ...prev, ...f }))
  }, [])

  return {
    expenses: filteredExpenses,
    loading,
    error,
    filters,
    setFilters: handleSetFilters,
    createExpense,
    updateExpense,
    deleteExpense,
    isLoading: loading,
  }
}
