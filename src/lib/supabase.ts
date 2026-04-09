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

const STORAGE_BUCKET = 'documents'

export async function uploadFile(
  userId: string,
  folder: 'invoices' | 'expenses',
  file: File
): Promise<string> {
  const timestamp = Date.now()
  const path = `${userId}/${folder}/${timestamp}_${file.name}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { upsert: false })

  if (error) throw error
  return path
}

export async function getFileUrl(storagePath: string): Promise<string> {
  const { data } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(storagePath, 3600)

  return data?.signedUrl ?? ''
}

export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .remove([storagePath])

  if (error) throw error
}
