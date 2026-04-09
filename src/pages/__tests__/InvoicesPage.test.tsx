import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { InvoicesPage } from '../InvoicesPage'
import { vi } from 'vitest'

vi.mock('../../hooks/useInvoices', () => ({
  useInvoices: () => ({
    invoices: [],
    loading: false,
    error: null,
    filters: { quarter: null, year: 2026 },
    setFilters: () => {},
    createInvoice: async () => ({} as any),
    updateInvoice: async () => ({} as any),
    deleteInvoice: async () => {},
    isLoading: false,
  }),
}))

describe('InvoicesPage', () => {
  it('renders the page title', () => {
    render(<InvoicesPage />)
    expect(screen.getByText('Invoices')).toBeTruthy()
  })
})