import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'
import AppRouter from './AppRouter.tsx'

// Función para mostrar el contenido cuando todo esté listo
function showContent() {
  document.body.classList.add('loaded');
}

// Esperar a que todo esté cargado
window.addEventListener('load', () => {
  // Pequeño delay para asegurar que Mapbox esté completamente inicializado
  setTimeout(showContent, 100);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
