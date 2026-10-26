import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true, // Exposes the server to 0.0.0.0 for Docker
    port: 5173,
    watch: {
      usePolling: true // Ensures hot-reloading works across Windows/Docker volume mounts
    }
  }
})
