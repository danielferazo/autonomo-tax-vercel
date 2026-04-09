import { useState, type FC } from 'react'
import { supabase } from '../lib/supabase'

interface AuthProps {
  onAuthSuccess: () => void
}

const Auth: FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      onAuthSuccess()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: 'var(--space-lg)'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--space-xl)' }}>
        <h1 style={{
          fontFamily: 'var(--font-sans)',
          fontWeight: 700,
          fontSize: '1.5rem',
          textAlign: 'center',
          marginBottom: 'var(--space-lg)',
          color: 'var(--color-header)'
        }}>
          Autonomo Tax Prep
        </h1>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: 'var(--space-lg)', borderBottom: '2px solid var(--color-border)' }}>
          <button
            onClick={() => setIsLogin(true)}
            style={{
              flex: 1, padding: 'var(--space-sm)', border: 'none', background: 'none',
              fontWeight: isLogin ? 600 : 400, color: isLogin ? 'var(--color-header)' : 'var(--color-muted)',
              cursor: 'pointer', borderBottom: isLogin ? '2px solid var(--color-header)' : 'none',
              marginBottom: '-2px'
            }}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            style={{
              flex: 1, padding: 'var(--space-sm)', border: 'none', background: 'none',
              fontWeight: !isLogin ? 600 : 400, color: !isLogin ? 'var(--color-header)' : 'var(--color-muted)',
              cursor: 'pointer', borderBottom: !isLogin ? '2px solid var(--color-header)' : 'none',
              marginBottom: '-2px'
            }}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 'var(--space-md)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 500, color: 'var(--color-primary)' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              required
            />
          </div>

          <div style={{ marginBottom: 'var(--space-lg)' }}>
            <label style={{ display: 'block', marginBottom: 'var(--space-xs)', fontWeight: 500, color: 'var(--color-primary)' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="input"
              style={{ width: '100%' }}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div style={{
              padding: 'var(--space-sm) var(--space-md)',
              background: '#FEE2E2',
              border: '1px solid var(--color-debt)',
              borderRadius: '6px',
              color: '#991B1B',
              marginBottom: 'var(--space-md)',
              fontSize: '0.875rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>

        <p style={{
          marginTop: 'var(--space-lg)',
          textAlign: 'center',
          fontSize: '0.875rem',
          color: 'var(--color-muted)'
        }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null) }}
            style={{
              background: 'none', border: 'none', color: 'var(--color-primary)',
              fontWeight: 600, cursor: 'pointer', textDecoration: 'underline'
            }}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  )
}

export default Auth
