import { type FC } from 'react'

interface ErrorBannerProps {
  message: string
  variant?: 'error' | 'warning' | 'info'
  onRetry?: () => void
  onDismiss?: () => void
}

export const ErrorBanner: FC<ErrorBannerProps> = ({
  message,
  variant = 'error',
  onRetry,
  onDismiss,
}) => {
  const variantClass = `banner banner-${variant}`

  return (
    <div className={variantClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-md)' }}>
      <span>{message}</span>
      <div style={{ display: 'flex', gap: 'var(--space-sm)', flexShrink: 0 }}>
        {onRetry && (
          <button
            onClick={onRetry}
            style={{
              background: 'transparent',
              border: '1px solid currentColor',
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 12,
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.9,
            }}
          >
            Reintentar
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '2px 6px',
              fontSize: 14,
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.7,
              lineHeight: 1,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
