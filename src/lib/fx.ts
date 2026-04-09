export interface FxRate {
  rate: number
  date: string
}

export async function fetchFxRate(date: string): Promise<FxRate> {
  const url = `https://api.frankfurter.app/${date}?from=USD&to=EUR`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch FX rate')
  const data = await res.json() as { rates: { EUR: number }; date: string }
  return { rate: data.rates.EUR, date: data.date }
}