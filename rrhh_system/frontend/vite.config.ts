import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Este archivo ahora está configurado para usar PostCSS y cargar Tailwind.
export default defineConfig({
  css: {
    postcss: './postcss.config.js',
  },
  plugins: [react()],
})