import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import AppProviders from './app/AppProviders'
import App from './app/App'
import ErrorBoundary from './components/ErrorBoundary'

// Function to hide loading screen
const hideLoadingScreen = () => {
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    loadingScreen.classList.add('fade-out');
    setTimeout(() => {
      loadingScreen.remove();
    }, 500); // Remove after fade animation
  }
};

// Create root and render app
const root = createRoot(document.getElementById('root')!);

root.render(
  <StrictMode>
    <ErrorBoundary>
      <AppProviders>
        <App />
      </AppProviders>
    </ErrorBoundary>
  </StrictMode>
);

// Hide loading screen after React has mounted and rendered
setTimeout(() => {
  hideLoadingScreen();
}, 100); // Small delay to ensure everything is rendered
