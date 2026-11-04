import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const isDemo =
  process.env.VITE_DEMO_MODE === 'true' ||
  process.env.DEMO_MODE === 'true' ||
  process.env.npm_lifecycle_event === 'dev:demo';

const backendPort = process.env.VITE_BACKEND_PORT || (isDemo ? '4001' : '4000');

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
})

