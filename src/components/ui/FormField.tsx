import { type FC, type ReactNode } from 'react'

interface FormFieldProps {
  label: string
  children: ReactNode
  error?: string | null
  hint?: string
}

export const FormField: FC<FormFieldProps> = ({ label, children, error, hint }) => (
  <div style={{ marginBottom: 'var(--space-md)' }}>
    <label style={{
      display: 'block',
      marginBottom: 'var(--space-xs)',
      fontSize: 14,
      fontWeight: 600,
      color: 'var(--color-text)',
    }}>
      {label}
    </label>
    {children}
    {hint && !error && (
      <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 4 }}>
        {hint}
      </div>
    )}
    {error && (
      <div style={{ fontSize: 12, color: 'var(--color-danger)', marginTop: 4 }}>
        {error}
      </div>
    )}
  </div>
)