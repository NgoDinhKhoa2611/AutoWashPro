import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../backend/wwwroot',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5023',
        changeOrigin: true,
        secure: false,
      },
      '/Account': {
        target: 'http://localhost:5023',
        changeOrigin: true,
        secure: false,
      },
      '/Customer': {
        target: 'http://localhost:5023',
        changeOrigin: true,
        secure: false,
      },
      '/Admin': {
        target: 'http://localhost:5023',
        changeOrigin: true,
        secure: false,
      },
      '/Debug': {
        target: 'http://localhost:5023',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
