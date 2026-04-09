import { type FC, type Dispatch, type SetStateAction } from 'react'

interface TabNavProps {
  tabs: readonly string[]
  active: string
  onChange: Dispatch<SetStateAction<string>>
}

const TabNav: FC<TabNavProps> = ({ tabs, active, onChange }) => {
  return (
    <nav style={{
      display: 'flex',
      gap: 'var(--space-xs)',
      padding: 'var(--space-md) var(--space-lg)',
      background: 'var(--color-bg)',
      borderBottom: '2px solid var(--color-border)',
      overflowX: 'auto'
    }}>
      {tabs.map(tab => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          style={{
            padding: 'var(--space-sm) var(--space-md)',
            borderRadius: '4px',
            fontWeight: 600,
            fontSize: '0.875rem',
            fontFamily: 'var(--font-sans)',
            background: active === tab ? 'var(--color-header)' : 'transparent',
            color: active === tab ? 'white' : 'var(--color-primary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'all 150ms ease',
            whiteSpace: 'nowrap'
          }}
        >
          {tab}
        </button>
      ))}
    </nav>
  )
}

export default TabNav
