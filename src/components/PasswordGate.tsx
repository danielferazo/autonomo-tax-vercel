import { useState } from 'react'

const PASSWORD = import.meta.env.VITE_SITE_PASSWORD || 'autonomo2026'

export default function PasswordGate({ children }: { children: React.ReactNode }) {
  const [authenticated, setAuthenticated] = useState(
    sessionStorage.getItem('auth') === 'true'
  )
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === PASSWORD) {
      sessionStorage.setItem('auth', 'true')
      setAuthenticated(true)
      setError(false)
    } else {
      setError(true)
    }
  }

  if (authenticated) {
    return <>{children}</>
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      fontFamily: 'var(--font-sans)',
    }}>
      <div style={{
        background: '#16213e',
        padding: 'var(--space-xl)',
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        maxWidth: 400,
        width: '100%',
      }}>
        <h1 style={{ color: '#e94560', marginBottom: 'var(--space-md)', textAlign: 'center' }}>
          🔐 Autonomo Tax
        </h1>
        <p style={{ color: '#a0a0a0', textAlign: 'center', marginBottom: 'var(--space-lg)', fontSize: 14 }}>
          Enter password to access
        </p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false) }}
            placeholder="Password"
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: 16,
              borderRadius: 8,
              border: error ? '2px solid #e94560' : '2px solid #0f3460',
              background: '#0f3460',
              color: 'white',
              marginBottom: 'var(--space-md)',
              boxSizing: 'border-box',
            }}
            autoFocus
          />
          {error && (
            <p style={{ color: '#e94560', textAlign: 'center', marginBottom: 'var(--space-md)', fontSize: 14 }}>
              Invalid password
            </p>
          )}
          <button
            type="submit"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: 16,
              fontWeight: 600,
              background: '#e94560',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Access
          </button>
        </form>
      </div>
    </div>
  )
}