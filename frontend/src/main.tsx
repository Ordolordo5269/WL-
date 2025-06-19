import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

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
    <App />
  </StrictMode>,
)
