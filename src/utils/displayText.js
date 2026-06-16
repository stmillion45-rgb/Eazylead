// Troncamento solo UI — il valore in DB resta invariato
const DEFAULT_MAX = 80

export function formatServizioDisplay(servizio, maxLen = DEFAULT_MAX) {
  if (!servizio) return { text: '—', title: undefined }
  if (servizio.length <= maxLen) return { text: servizio, title: undefined }
  return { text: `${servizio.slice(0, maxLen)}…`, title: servizio }
}
