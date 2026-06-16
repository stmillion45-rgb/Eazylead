import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { initFontsFromConsent } from './utils/loadFonts'
import App from './App.jsx'

initFontsFromConsent()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
