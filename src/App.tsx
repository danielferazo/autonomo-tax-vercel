import { useState } from 'react'
import TabNav from './components/TabNav'
import Auth from './pages/Auth'
import { InvoicesPage } from './pages/InvoicesPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { Modelo303Page } from './pages/Modelo303Page'
import { Modelo130Page } from './pages/Modelo130Page'
import { SummaryPage } from './pages/SummaryPage'
import { ProfilePage } from './pages/ProfilePage'
import { useTaxPeriod } from './hooks/useTaxPeriod'
import { useProfile } from './hooks/useProfile'

const TABS = ['Invoices', 'Expenses', 'Modelo 303', 'Modelo 130', 'Summary', 'Profile'] as const
type Tab = typeof TABS[number]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Invoices')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const { quarter, year, setQuarter, setYear, filingDeadline } = useTaxPeriod()
  const { profile } = useProfile()

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={() => setIsAuthenticated(true)} />
  }

  return (
    <div className="app">
      <header style={{
        background: 'var(--color-header)',
        color: 'white',
        padding: 'var(--space-md) var(--space-lg)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 'var(--space-sm)',
      }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, margin: 0 }}>Autonomo Tax Prep</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
            <span style={{ fontSize: 13 }}>Q</span>
            <select
              className="select"
              style={{ width: 70, padding: '4px 8px', fontSize: 14 }}
              value={quarter}
              onChange={(e) => setQuarter(Number(e.target.value))}
            >
              {[1,2,3,4].map((q) => <option key={q} value={q}>Q{q}</option>)}
            </select>
            <select
              className="select"
              style={{ width: 90, padding: '4px 8px', fontSize: 14 }}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {[new Date().getFullYear() - 1, new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            Plazo: {filingDeadline}
          </div>
          <div style={{ fontSize: 13, opacity: 0.8 }}>
            NIF: {profile?.nif || '—'}
          </div>
          <button className="btn-secondary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={() => setIsAuthenticated(false)}>
            Logout
          </button>
        </div>
      </header>
      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab as (tab: string) => void} />
      <main style={{ padding: 'var(--space-xl)' }}>
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          {activeTab === 'Invoices' && <InvoicesPage />}
          {activeTab === 'Expenses' && <ExpensesPage />}
          {activeTab === 'Modelo 303' && <Modelo303Page />}
          {activeTab === 'Modelo 130' && <Modelo130Page />}
          {activeTab === 'Summary' && <SummaryPage />}
          {activeTab === 'Profile' && <ProfilePage />}
        </div>
      </main>
    </div>
  )
}

export default App
