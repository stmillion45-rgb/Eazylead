import { supabase } from '../supabaseClient'
import { applyLogoShapeToCanvas } from './logoShape'

/** Estrae path bucket logos da URL Supabase public */
export function parseLogosBucketPath(url) {
  if (!url) return null
  const clean = url.split('?')[0]
  const match = clean.match(/\/storage\/v1\/object\/public\/logos\/(.+)$/i)
  return match ? decodeURIComponent(match[1]) : null
}

export function cleanLogoPublicUrl(url) {
  return url?.trim()?.split('?')[0] || null
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Immagine non caricabile'))
    img.src = src
  })
}

async function blobToImage(blob) {
  const objectUrl = URL.createObjectURL(blob)
  try {
    return await loadImageElement(objectUrl)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Canvas → JPEG su sfondo bianco (jsPDF gestisce male PNG trasparenti) */
function toPdfLogoImage(img, shape = 'square') {
  const maxPx = 320
  const canvas = document.createElement('canvas')
  const aspect = img.naturalWidth / img.naturalHeight
  let w = maxPx
  let h = maxPx
  if (aspect > 1) h = maxPx / aspect
  else w = maxPx * aspect
  canvas.width = Math.round(w)
  canvas.height = Math.round(h)

  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const shaped = applyLogoShapeToCanvas(canvas, shape)

  const flat = document.createElement('canvas')
  flat.width = shaped.width
  flat.height = shaped.height
  const fctx = flat.getContext('2d')
  fctx.fillStyle = '#ffffff'
  fctx.fillRect(0, 0, flat.width, flat.height)
  fctx.drawImage(shaped, 0, 0)

  return {
    dataUrl: flat.toDataURL('image/jpeg', 0.92),
    format: 'JPEG',
    width: flat.width,
    height: flat.height,
  }
}

/**
 * Carica logo per jsPDF: prima Storage autenticato (no CORS), poi fetch, poi Image.
 */
export async function loadLogoForPdf(logoUrl, shape = 'square') {
  const trimmed = cleanLogoPublicUrl(logoUrl)
  if (!trimmed) return null

  const storagePath = parseLogosBucketPath(trimmed)

  if (storagePath) {
    const { data, error } = await supabase.storage.from('logos').download(storagePath)
    if (!error && data) {
      try {
        const img = await blobToImage(data)
        return toPdfLogoImage(img, shape)
      } catch {
        // fallback sotto
      }
    }
  }

  try {
    const res = await fetch(trimmed, { mode: 'cors', cache: 'no-store' })
    if (res.ok) {
      const blob = await res.blob()
      if (blob.type.startsWith('image/')) {
        const img = await blobToImage(blob)
        return toPdfLogoImage(img, shape)
      }
    }
  } catch {
    // fallback sotto
  }

  try {
    const img = await loadImageElement(trimmed)
    return toPdfLogoImage(img, shape)
  } catch {
    return null
  }
}
