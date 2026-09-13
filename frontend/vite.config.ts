import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    proxy: {
      '/media': {
        target: loadEnv(mode, process.cwd(), '').VITE_API_BASE_URL || 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
}))
