import { supabase } from '../supabaseClient'

const MAX_BYTES = 2 * 1024 * 1024
const ALLOWED = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp'])

const EXT = {
  'image/png':  'png',
  'image/jpeg': 'jpg',
  'image/jpg':  'jpg',
  'image/webp': 'webp',
}

export function validateLogoFile(file) {
  if (!file) return 'Nessun file selezionato'
  if (!ALLOWED.has(file.type)) return 'Formato non supportato. Usa PNG, JPG o WebP.'
  if (file.size > MAX_BYTES) return 'Il file supera 2 MB.'
  return null
}

export async function uploadLogoFile(userId, file) {
  const validation = validateLogoFile(file)
  if (validation) return { error: new Error(validation), publicUrl: null }

  const ext = EXT[file.type] || 'png'
  const path = `${userId}/logo.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('logos')
    .upload(path, file, { contentType: file.type, upsert: true })

  if (uploadError) {
    const hint = uploadError.message?.includes('Bucket not found')
      ? ' Esegui supabase/migrations/20250531000002_storage_logos.sql su Supabase.'
      : ''
    return { error: new Error(uploadError.message + hint), publicUrl: null }
  }

  const { data } = supabase.storage.from('logos').getPublicUrl(path)
  const publicUrl = data?.publicUrl
    ? `${data.publicUrl}?t=${Date.now()}`
    : null

  return { error: null, publicUrl }
}
