import { type FC } from 'react'

interface CasillaProps {
  number: string
  label: string
  value: number
  editable?: boolean
  onChange?: (value: number) => void
  highlight?: 'positive' | 'negative' | 'neutral'
}

export const Casilla: FC<CasillaProps> = ({
  number,
  label,
  value,
  editable = false,
  onChange,
  highlight = 'neutral',
}) => {
  const bgColor =
    highlight === 'positive'
      ? 'var(--color-success)'
      : highlight === 'negative'
      ? 'var(--color-danger)'
      : 'var(--color-surface)'

  const textColor =
    highlight === 'positive' || highlight === 'negative'
      ? 'white'
      : 'var(--color-text)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            fontWeight: 700,
            color: highlight === 'positive' || highlight === 'negative' ? textColor : 'var(--color-primary)',
            minWidth: 28,
          }}
        >
          {number}
        </span>
        <span style={{ fontSize: 12, color: highlight === 'positive' || highlight === 'negative' ? textColor : 'var(--color-text-muted)' }}>
          {label}
        </span>
      </div>
      {editable ? (
        <input
          type="number"
          step="0.01"
          value={value || ''}
          onChange={(e) => onChange?.(Number(e.target.value))}
          className="input"
          style={{ fontFamily: 'var(--font-mono)', fontSize: 16, textAlign: 'right', maxWidth: 160 }}
        />
      ) : (
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 16,
            fontWeight: 600,
            textAlign: 'right',
            padding: '8px 12px',
            background: bgColor,
            borderRadius: 6,
            color: textColor,
            minWidth: 140,
          }}
        >
          {value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
        </div>
      )}
    </div>
  )
}