import { type FC } from 'react'

const CATEGORY_COLORS: Record<string, string> = {
  rent: '#3B82F6',
  electricity: '#F59E0B',
  water: '#06B6D4',
  internet: '#10B981',
  phone: '#8B5CF6',
  cuota: '#EF4444',
  software: '#F97316',
  hardware: '#6B7280',
  other: '#94A3B8',
}

const CATEGORY_LABELS: Record<string, string> = {
  rent: 'Rent',
  electricity: 'Electricity',
  water: 'Water',
  internet: 'Internet',
  phone: 'Phone',
  cuota: 'Cuota',
  software: 'Software',
  hardware: 'Hardware',
  other: 'Other',
}

interface CategoryBadgeProps {
  category: string
}

export const CategoryBadge: FC<CategoryBadgeProps> = ({ category }) => (
  <span
    className="badge"
    style={{
      background: CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other,
      color: 'white',
    }}
  >
    {CATEGORY_LABELS[category] ?? category}
  </span>
)