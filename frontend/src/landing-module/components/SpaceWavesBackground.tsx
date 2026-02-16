import React, { useEffect, useRef, memo } from 'react';

// Vanta.js type declarations
declare global {
  interface Window {
    VANTA: {
      WAVES: (options: any) => {
        destroy: () => void;
        resize: () => void;
      };
    };
  }
}

interface SpaceWavesBackgroundProps {
  className?: string;
}

const SpaceWavesBackground: React.FC<SpaceWavesBackgroundProps> = memo(({ className = '' }) => {
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  useEffect(() => {
    // Function to initialize Vanta effect
    const initVanta = () => {
      if (vantaRef.current && window.VANTA && typeof window.VANTA.WAVES === 'function') {
        vantaEffect.current = window.VANTA.WAVES({
          el: vantaRef.current,
          mouseControls: false, // Desactivado para mejor rendimiento
          touchControls: false, // Desactivado para mejor rendimiento
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          scale: 1.00,
          scaleMobile: 0.8, // Reducido para móviles
          color: 0x030d14,
          shininess: 20.00, // Reducido para mejor rendimiento
          waveHeight: 14.00, // Ligeramente mayor para hacer el movimiento más visible
          waveSpeed: 1.1, // Aumentado para que se perciba el movimiento
          zoom: 0.7,
          // Performance optimizations
          forceAnimate: true, // Asegura que la animación se ejecute
          fps: 30, // Un poco más fluido pero aún razonable
          // Subtle and smooth settings
          material: {
            options: {
              fog: false, // Desactivado para mejor rendimiento
              wireframe: false
            }
          }
        });
      }
    };

    // Function to load Vanta.js scripts
    const loadVantaScripts = () => {
      // Check if scripts are already loaded
      if (window.VANTA && typeof window.VANTA.WAVES === 'function') {
        initVanta();
        return;
      }

      // Load Three.js first
      const threeScript = document.createElement('script');
      threeScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js';
      threeScript.onload = () => {
        // Load Vanta.js WAVES after Three.js
        const vantaScript = document.createElement('script');
        vantaScript.src = 'https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.waves.min.js';
        vantaScript.onload = () => {
          initVanta();
        };
        vantaScript.onerror = () => {
          console.warn('Failed to load Vanta WAVES script');
        };
        document.head.appendChild(vantaScript);
      };
      threeScript.onerror = () => {
        console.warn('Failed to load Three.js script');
      };
      document.head.appendChild(threeScript);
    };

    // Start loading scripts
    loadVantaScripts();

    // Handle window resize
    const handleResize = () => {
      if (vantaEffect.current) {
        vantaEffect.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={vantaRef}
      className={`fixed inset-0 w-full h-full -z-10 ${className}`}
      style={{
        pointerEvents: 'none',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)'
      }}
    />
  );
});

SpaceWavesBackground.displayName = 'SpaceWavesBackground';

export default SpaceWavesBackground;