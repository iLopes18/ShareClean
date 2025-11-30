import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/ShareClean/", // <--- IMPORTANTE: Mete aqui o nome exato do teu repositório
})