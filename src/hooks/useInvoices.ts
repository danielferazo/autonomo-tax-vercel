// src/hooks/useInvoices.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { type Invoice } from '../types/database'
import { getDefaultYear } from '../lib/dates'

export interface InvoiceFilters {
  quarter: number | null
  year: number
}

export interface UseInvoicesReturn {
  invoices: Invoice[]
  allInvoices: Invoice[]
  loading: boolean
  error: string | null
  filters: InvoiceFilters
  setFilters: (f: Partial<InvoiceFilters>) => void
  createInvoice: (data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>) => Promise<Invoice>
  updateInvoice: (id: string, data: Partial<Invoice>) => Promise<Invoice>
  deleteInvoice: (id: string) => Promise<void>
  isLoading: boolean
}

export function useInvoices(): UseInvoicesReturn {
  const [filters, setFilters] = useState<InvoiceFilters>({
    quarter: null,
    year: getDefaultYear(),
  })
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setAllInvoices([]); return }
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
      if (error) throw error
      setAllInvoices((data as Invoice[]) ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInvoices() }, [fetchInvoices])

  const createInvoice = useCallback(async (data: Omit<Invoice, 'id' | 'user_id' | 'created_at'>): Promise<Invoice> => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not authenticated')
    const { data: result, error } = await supabase
      .from('invoices')
      .insert({ ...data, user_id: user.id })
      .select()
      .single()
    if (error) throw error
    await fetchInvoices()
    return result as Invoice
  }, [fetchInvoices])

  const updateInvoice = useCallback(async (id: string, data: Partial<Invoice>): Promise<Invoice> => {
    const { data: result, error } = await supabase
      .from('invoices')
      .update(data)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    await fetchInvoices()
    return result as Invoice
  }, [fetchInvoices])

  const deleteInvoice = useCallback(async (id: string): Promise<void> => {
    const { error } = await supabase.from('invoices').delete().eq('id', id)
    if (error) throw error
    await fetchInvoices()
  }, [fetchInvoices])

  const filteredInvoices = allInvoices.filter((inv) => {
    if (inv.year !== filters.year) return false
    if (filters.quarter !== null && inv.quarter !== filters.quarter) return false
    return true
  })

  const handleSetFilters = useCallback((f: Partial<InvoiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...f }))
  }, [])

  return {
    invoices: filteredInvoices,
    allInvoices,
    loading,
    error,
    filters,
    setFilters: handleSetFilters,
    createInvoice,
    updateInvoice,
    deleteInvoice,
    isLoading: loading,
  }
}