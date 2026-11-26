import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Standaard draait de app op de root (aostoernooi.lucdegroen.nl, via de Pi).
// VITE_BASE alleen zetten als hij ooit weer onder een submap moet draaien.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  plugins: [react(), tailwindcss()],
})
