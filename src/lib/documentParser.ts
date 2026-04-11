import { invokeEdgeFunction } from './edgeFunction'
import { type Invoice, type Expense } from '../types/database'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

async function pdfToImage(file: File): Promise<{ base64: string; mime: string }> {
  const pdfjsLib = await import('pdfjs-dist')
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`

  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  const page = await pdf.getPage(1)

  const scale = 2
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement('canvas')
  canvas.width = viewport.width
  canvas.height = viewport.height

  const ctx = canvas.getContext('2d')!
  // @ts-expect-error pdfjs-dist types require canvas property but browser render works without it
  await page.render({ canvasContext: ctx, viewport }).promise

  const dataUrl = canvas.toDataURL('image/png')
  return { base64: dataUrl, mime: 'image/png' }
}

export async function parseDocument(
  file: File,
  documentType: 'invoice' | 'expense',
): Promise<Invoice | Expense> {
  let base64: string
  let mimeType: string

  if (file.type === 'application/pdf') {
    const result = await pdfToImage(file)
    base64 = result.base64
    mimeType = result.mime
  } else {
    base64 = await fileToBase64(file)
    mimeType = file.type
  }

  return invokeEdgeFunction<Invoice | Expense>('parse-document', {
    file_base64: base64,
    document_type: documentType,
    filename: file.name,
    mime_type: mimeType,
  })
}
