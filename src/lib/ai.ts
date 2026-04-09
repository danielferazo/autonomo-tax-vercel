// src/lib/ai.ts

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6-20250514'
const API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string

export interface ParsedInvoice {
  number: string
  date: string
  client: string
  currency: 'USD' | 'EUR'
  gross_orig: number
  iva_collected: number
  irpf_retained: number
}

export interface ParsedExpense {
  description: string
  gross: number
  iva_paid: number
  category: string
}

async function anthropicCompletion(system: string, userMessage: string): Promise<string> {
  if (!API_KEY) throw new Error('VITE_ANTHROPIC_API_KEY is not set')

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system,
      messages: [{ role: 'user', content: userMessage }],
    }),
  })

  if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)
  const data = await res.json() as { content: Array<{ type: string; text: string }> }
  const textBlock = data.content.find((b) => b.type === 'text')
  if (!textBlock) throw new Error('No text response from Anthropic')
  return textBlock.text
}

export async function parseInvoice(fileData: string): Promise<ParsedInvoice> {
  const system = `You are an expert at extracting structured data from Spanish freelance invoices.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"number":"string","date":"YYYY-MM-DD","client":"string","currency":"USD|EUR","gross_orig":number,"iva_collected":number,"irpf_retained":number}
If a field cannot be determined, use null.`

  const userMessage = `Extract invoice data from this document. Return JSON matching the schema exactly.\n${fileData}`

  const text = await anthropicCompletion(system, userMessage)
  const parsed = JSON.parse(text)

  return {
    number: parsed.number ?? '',
    date: parsed.date ?? '',
    client: parsed.client ?? '',
    currency: (parsed.currency === 'USD' || parsed.currency === 'EUR') ? parsed.currency : 'EUR',
    gross_orig: Number(parsed.gross_orig) || 0,
    iva_collected: Number(parsed.iva_collected) || 0,
    irpf_retained: Number(parsed.irpf_retained) || 0,
  }
}

export async function parseExpense(fileData: string): Promise<ParsedExpense> {
  const system = `You are an expert at extracting structured data from Spanish expense receipts.
Return ONLY valid JSON with no markdown formatting or explanation.
Schema: {"description":"string","gross":number,"iva_paid":number,"category":"rent|electricity|water|internet|phone|cuota|software|hardware|other"}
Choose the most appropriate category from the list. If a field cannot be determined, use null.`

  const userMessage = `Extract expense data from this receipt. Return JSON matching the schema exactly.\n${fileData}`

  const text = await anthropicCompletion(system, userMessage)
  const parsed = JSON.parse(text)

  return {
    description: parsed.description ?? '',
    gross: Number(parsed.gross) || 0,
    iva_paid: Number(parsed.iva_paid) || 0,
    category: parsed.category ?? 'other',
  }
}