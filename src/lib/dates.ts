export function getQuarter(dateStr: string): number {
  const month = new Date(dateStr + 'T00:00:00Z').getUTCMonth() + 1
  if (month <= 3) return 1
  if (month <= 6) return 2
  if (month <= 9) return 3
  return 4
}

export function getYear(dateStr: string): number {
  return new Date(dateStr + 'T00:00:00Z').getUTCFullYear()
}

export function getDefaultYear(): number {
  return new Date().getFullYear()
}

export function getFilingDeadline(quarter: number, year: number): string {
  const deadlines: Record<number, string> = {
    1: `${year}-04-30`,
    2: `${year}-07-31`,
    3: `${year}-10-31`,
    4: `${year + 1}-01-30`,
  }
  const dateStr = deadlines[quarter]
  if (!dateStr) return ''
  return new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr + 'T00:00:00Z'))
}