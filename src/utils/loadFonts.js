/** Carica Google Fonts solo dopo consenso cookie (facoltativo). */
export function loadOptionalFonts() {
  if (document.getElementById('leados-google-fonts')) return

  const pre1 = document.createElement('link')
  pre1.rel = 'preconnect'
  pre1.href = 'https://fonts.googleapis.com'
  document.head.appendChild(pre1)

  const pre2 = document.createElement('link')
  pre2.rel = 'preconnect'
  pre2.href = 'https://fonts.gstatic.com'
  pre2.crossOrigin = 'anonymous'
  document.head.appendChild(pre2)

  const link = document.createElement('link')
  link.id = 'leados-google-fonts'
  link.rel = 'stylesheet'
  link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap'
  document.head.appendChild(link)
}

export function initFontsFromConsent() {
  if (localStorage.getItem('leados_cookie_consent_v1') === 'accepted') {
    loadOptionalFonts()
  }
}
