import { useState } from 'react'
import TabNav from './components/TabNav'
import Auth from './pages/Auth'

const TABS = ['Invoices', 'Expenses', 'Modelo 303', 'Modelo 130', 'Summary', 'Profile'] as const
type Tab = typeof TABS[number]

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('Invoices')
  const [isAuthenticated, setIsAuthenticated] = useState(false)

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
        alignItems: 'center'
      }}>
        <h1 style={{ fontFamily: 'var(--font-sans)', fontWeight: 600 }}>Autonomo Tax Prep</h1>
        <button className="btn-secondary" onClick={() => setIsAuthenticated(false)}>
          Logout
        </button>
      </header>
      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />
      <main style={{ padding: 'var(--space-xl)' }}>
        <div className="card" style={{ padding: 'var(--space-xl)' }}>
          {activeTab === 'Invoices' && <div>Invoices Tab (Phase 2)</div>}
          {activeTab === 'Expenses' && <div>Expenses Tab (Phase 2)</div>}
          {activeTab === 'Modelo 303' && <div>Modelo 303 Tab (Phase 3)</div>}
          {activeTab === 'Modelo 130' && <div>Modelo 130 Tab (Phase 3)</div>}
          {activeTab === 'Summary' && <div>Summary Tab (Phase 4)</div>}
          {activeTab === 'Profile' && <div>Profile Tab</div>}
        </div>
      </main>
    </div>
  )
}

export default App
