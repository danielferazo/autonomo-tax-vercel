import { type FC } from 'react'

interface EmptyStateProps {
  title: string
  description: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const EmptyState: FC<EmptyStateProps> = ({ title, description, action }) => (
  <div style={{
    textAlign: 'center',
    padding: 'var(--space-2xl)',
    color: 'var(--color-text-muted)',
  }}>
    <div style={{ fontSize: 48, marginBottom: 'var(--space-md)' }}>📋</div>
    <h3 style={{ margin: '0 0 var(--space-sm) 0', color: 'var(--color-text)' }}>{title}</h3>
    <p style={{ margin: '0 0 var(--space-lg) 0' }}>{description}</p>
    {action && (
      <button className="btn-primary" onClick={action.onClick}>
        {action.label}
      </button>
    )}
  </div>
)