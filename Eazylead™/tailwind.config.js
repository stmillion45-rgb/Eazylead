/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        // Display: per titoli e logo
        display: ['Syne', 'sans-serif'],
        // Body: per testo e UI
        body: ['DM Sans', 'sans-serif'],
        // Mono: per valori numerici e dati
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        // Palette LeadOS (estensione per classi custom se necessario)
        brand: {
          cyan: '#22d3ee',
          emerald: '#34d399',
          red: '#ef4444',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
