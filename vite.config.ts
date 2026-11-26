import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standaard draait de app op de root (aostoernooi.lucdegroen.nl, via de Pi).
// De GitHub Pages-build zet VITE_BASE=/aostoernooi/ (zie .github/workflows/deploy.yml).
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
})
