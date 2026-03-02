import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tailwindcss(), react()],
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
    // Optimizar el tamaño del bundle
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // Remover console.logs en producción
        drop_debugger: true
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
