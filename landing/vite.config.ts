import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss() as any, react() as any],
  build: {
    // Optimizaciones de rendimiento
    rollupOptions: {
      output: {
        // Code splitting manual para mejor caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          motion: ['framer-motion'],
          three: ['three', '@react-three/fiber', '@react-three/drei'],
          d3: ['d3-geo']
        }
      }
    },
    // Aumentar el límite de advertencia de chunk size
    chunkSizeWarningLimit: 1000
  },
  // Optimizaciones de desarrollo
  server: {
    port: 5174,
    host: '0.0.0.0',
    hmr: {
      overlay: false // Desactivar overlay de errores para mejor rendimiento
    }
  },
  // Optimizar dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'framer-motion', 'three', '@react-three/fiber', '@react-three/drei']
  }
})
