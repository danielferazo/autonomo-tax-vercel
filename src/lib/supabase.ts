import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase env vars not configured — using demo mode')
}

export const supabase = createClient(
  supabaseUrl || 'https://demo.supabase.co',
  supabaseAnonKey || 'demo-anon-key'
)

type StorageBucket = 'invoices' | 'receipts'

function getBucket(folder: 'invoices' | 'expenses'): StorageBucket {
  return folder === 'expenses' ? 'receipts' : 'invoices'
}

export async function uploadFile(
  userId: string,
  folder: 'invoices' | 'expenses',
  file: File
): Promise<string> {
  const bucket = getBucket(folder)
  const timestamp = Date.now()
  const path = `${userId}/${timestamp}_${file.name}`

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, file, { upsert: false })

  if (error) throw error
  return `${bucket}/${path}`
}

export async function getFileUrl(storagePath: string): Promise<string> {
  const [bucket, ...rest] = storagePath.split('/')
  const filePath = rest.join('/')

  const { data } = await supabase.storage
    .from(bucket)
    .createSignedUrl(filePath, 3600)

  return data?.signedUrl ?? ''
}

export async function deleteFile(storagePath: string): Promise<void> {
  const [bucket, ...rest] = storagePath.split('/')
  const filePath = rest.join('/')

  const { error } = await supabase.storage
    .from(bucket)
    .remove([filePath])

  if (error) throw error
}
