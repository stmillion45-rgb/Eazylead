export const LOGO_SHAPES = [
  { id: 'square', label: 'Quadrato' },
  { id: 'round',  label: 'Rotondo' },
  { id: 'oval',   label: 'Ovale' },
]

export function logoPreviewClass(shape) {
  switch (shape) {
    case 'round':
      return 'h-12 w-12 object-cover rounded-full'
    case 'oval':
      return 'h-10 w-14 object-cover rounded-[50%]'
    default:
      return 'h-12 w-auto max-w-[120px] object-contain rounded'
  }
}

export function logoEmailStyle(shape) {
  switch (shape) {
    case 'round':
      return 'display:block;width:48px;height:48px;object-fit:cover;border-radius:50%;margin-bottom:8px;'
    case 'oval':
      return 'display:block;width:56px;height:40px;object-fit:cover;border-radius:50%;margin-bottom:8px;'
    default:
      return 'display:block;max-height:48px;max-width:120px;width:auto;height:auto;margin-bottom:8px;border-radius:4px;'
  }
}

export function applyLogoShapeToCanvas(sourceCanvas, shape) {
  if (!shape || shape === 'square') {
    return sourceCanvas
  }

  const w = sourceCanvas.width
  const h = sourceCanvas.height
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const ctx = out.getContext('2d')

  ctx.save()
  ctx.beginPath()
  if (shape === 'round') {
    const r = Math.min(w, h) / 2
    ctx.arc(w / 2, h / 2, r, 0, Math.PI * 2)
  } else if (shape === 'oval') {
    ctx.ellipse(w / 2, h / 2, w / 2, h * 0.36, 0, 0, Math.PI * 2)
  }
  ctx.closePath()
  ctx.clip()
  ctx.drawImage(sourceCanvas, 0, 0)
  ctx.restore()

  return out
}
