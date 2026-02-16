import { useEffect, useRef, useState, useCallback } from 'react';
import Globe from 'react-globe.gl';

interface GlobeBackgroundProps {
  className?: string;
}

interface WorldEvent {
  lat: number;
  lng: number;
  type: string;
  color: string;
  baseSize: number;
  size: number;
  intensity: number;
  lastUpdate: number;
  activity: number;
  label: string;
}

// Datos de puntos monitoreados por la IA de WORLDLORE con categorización por colores
const initialWorldEvents: WorldEvent[] = [
  // 🔴 Conflictos activos y tensiones geopolíticas (rojo) - Expandido
  { lat: 33.3152, lng: 44.3661, type: 'conflict', color: '#ff3333', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.9, label: 'Middle East Conflict' },
  { lat: 50.4501, lng: 30.5234, type: 'conflict', color: '#ff3333', baseSize: 0.9, size: 0.9, intensity: 1, lastUpdate: Date.now(), activity: 0.95, label: 'Eastern Europe Tension' },
  { lat: 31.7683, lng: 35.2137, type: 'conflict', color: '#ff3333', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.85, label: 'Palestine Crisis' },
  { lat: 34.5553, lng: 69.2075, type: 'conflict', color: '#ff3333', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Afghanistan Situation' },
  { lat: 22.3964, lng: 120.9779, type: 'conflict', color: '#ff3333', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Taiwan Strait' },
  { lat: 34.8021, lng: 38.9968, type: 'conflict', color: '#dc2626', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.9, label: 'Syria Crisis' },
  { lat: 15.5007, lng: 32.5599, type: 'conflict', color: '#b91c1c', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Sudan Unrest' },
  { lat: 15.5527, lng: 48.5164, type: 'conflict', color: '#dc2626', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.9, label: 'Yemen Crisis' },
  { lat: 9.0820, lng: 8.6753, type: 'conflict', color: '#b91c1c', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Nigeria Security' },
  { lat: 12.8628, lng: 30.2176, type: 'conflict', color: '#dc2626', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'South Sudan' },
  
  // 🔵 Eventos políticos, cambios económicos y movimientos diplomáticos (azul) - Expandido
  { lat: 40.7128, lng: -74.0060, type: 'political', color: '#3366ff', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'UN Diplomatic Hub' },
  { lat: 51.5074, lng: -0.1278, type: 'political', color: '#3366ff', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.6, label: 'Brexit Aftermath' },
  { lat: 48.8566, lng: 2.3522, type: 'political', color: '#3366ff', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.65, label: 'EU Parliament' },
  { lat: 25.2048, lng: 55.2708, type: 'political', color: '#3366ff', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Economic Hub Dubai' },
  { lat: 1.3521, lng: 103.8198, type: 'political', color: '#3366ff', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.75, label: 'Singapore Trade' },
  { lat: -23.5505, lng: -46.6333, type: 'political', color: '#3366ff', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.55, label: 'Brazil Politics' },
  { lat: 38.9072, lng: -77.0369, type: 'political', color: '#2563eb', baseSize: 0.9, size: 0.9, intensity: 1, lastUpdate: Date.now(), activity: 0.9, label: 'US Political Changes' },
  { lat: 39.9334, lng: 32.8597, type: 'political', color: '#1d4ed8', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Turkey Developments' },
  { lat: 35.6892, lng: 51.3890, type: 'political', color: '#1e40af', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Iran Relations' },
  { lat: 28.6139, lng: 77.2090, type: 'political', color: '#1d4ed8', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'India Policy Updates' },
  { lat: 41.9028, lng: 12.4964, type: 'political', color: '#2563eb', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'European Union' },
  { lat: 6.5244, lng: 3.3792, type: 'political', color: '#1e40af', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.6, label: 'Nigeria Growth' },
  
  // 🟢 Eventos naturales, sociales e innovación tecnológica global (verde) - Expandido
  { lat: 37.7749, lng: -122.4194, type: 'innovation', color: '#22dd44', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Silicon Valley Tech' },
  { lat: 39.9042, lng: 116.4074, type: 'innovation', color: '#22dd44', baseSize: 0.9, size: 0.9, intensity: 1, lastUpdate: Date.now(), activity: 0.85, label: 'Beijing Innovation' },
  { lat: 35.6762, lng: 139.6503, type: 'innovation', color: '#22dd44', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.75, label: 'Tokyo Tech Hub' },
  { lat: 52.5200, lng: 13.4050, type: 'innovation', color: '#22dd44', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.6, label: 'Berlin Startup' },
  { lat: -33.8688, lng: 151.2093, type: 'innovation', color: '#22dd44', baseSize: 0.5, size: 0.5, intensity: 1, lastUpdate: Date.now(), activity: 0.6, label: 'Sydney Climate Tech' },
  { lat: 55.7558, lng: 37.6176, type: 'innovation', color: '#22dd44', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.5, label: 'Moscow Energy' },
  { lat: 19.4326, lng: -99.1332, type: 'innovation', color: '#22dd44', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.5, label: 'Mexico City Social' },
  { lat: 37.5665, lng: 126.9780, type: 'innovation', color: '#16a34a', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.9, label: 'South Korea Innovation' },
  { lat: 47.6062, lng: -122.3321, type: 'innovation', color: '#15803d', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Seattle Tech' },
  { lat: 60.1699, lng: 24.9384, type: 'innovation', color: '#16a34a', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Nordic Innovation' },
  { lat: -26.2041, lng: 28.0473, type: 'innovation', color: '#047857', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'South Africa Development' },
  { lat: -33.4489, lng: -70.6693, type: 'innovation', color: '#059669', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Chile Social Progress' },
  { lat: 12.9716, lng: 77.5946, type: 'innovation', color: '#15803d', baseSize: 0.8, size: 0.8, intensity: 1, lastUpdate: Date.now(), activity: 0.8, label: 'Bangalore Tech Hub' },
  { lat: 45.4642, lng: 9.1900, type: 'innovation', color: '#16a34a', baseSize: 0.7, size: 0.7, intensity: 1, lastUpdate: Date.now(), activity: 0.7, label: 'Milan Design Innovation' },
  { lat: 59.9311, lng: 30.3609, type: 'innovation', color: '#047857', baseSize: 0.6, size: 0.6, intensity: 1, lastUpdate: Date.now(), activity: 0.6, label: 'St. Petersburg Culture' }
];

export default function GlobeBackground({ className = '' }: GlobeBackgroundProps) {
  const globeEl = useRef<any>(null);
  const [pointsData, setPointsData] = useState(initialWorldEvents);

  // Simulación de actividad de IA en tiempo real
  const updateAIActivity = useCallback(() => {
    const currentTime = Date.now();
    
    setPointsData(prevPoints => 
      prevPoints.map(point => {
        // Simular detección de eventos por la IA
        const timeSinceUpdate = currentTime - point.lastUpdate;
        const shouldUpdate = Math.random() < (point.activity * 0.01); // Probabilidad basada en actividad
        
        let newIntensity = point.intensity;
        let newActivity = point.activity;
        let newLastUpdate = point.lastUpdate;
        
        if (shouldUpdate || timeSinceUpdate > 5000) {
          // La IA detecta nueva actividad
          newIntensity = 0.3 + Math.random() * 0.7; // Intensidad variable
          newActivity = Math.max(0.1, point.activity + (Math.random() - 0.5) * 0.1);
          newLastUpdate = currentTime;
        }
        
        // Efecto de parpadeo inteligente optimizado por tipo de evento
        const baseFreq = point.type === 'conflict' ? 0.012 : 
                        point.type === 'political' ? 0.008 : 
                        point.type === 'innovation' ? 0.006 : 0.007;
        
        // Pulse effect más suave y constante
        const pulseEffect = 0.6 + 0.4 * Math.sin(currentTime * baseFreq * newActivity + point.lat * 0.1);
        const intensityEffect = 0.4 + 0.6 * newIntensity;
        
        // Efecto de "escaneo" de la IA más sutil
        const scanEffect = 1 + 0.15 * Math.sin(currentTime * 0.003 + point.lng * 0.08);
        
        // Efecto de respiración global para sincronización
        const globalPulse = 1 + 0.1 * Math.sin(currentTime * 0.004);
        
        // Efecto de aparición/desaparición gradual
        const fadeTime = currentTime * 0.0008;
        const fadeEffect = Math.sin(fadeTime + point.lng * 0.01) * 0.2 + 0.8;
        
        return {
          ...point,
          size: point.baseSize * pulseEffect * intensityEffect * scanEffect * globalPulse * fadeEffect,
          intensity: newIntensity * fadeEffect,
          activity: Math.min(1, newActivity),
          lastUpdate: newLastUpdate,
          // Colores dinámicos mejorados por categoría con transiciones
          color: point.type === 'conflict' ? 
            `rgba(255, ${Math.floor(51 * (1 - newIntensity * 0.5))}, ${Math.floor(51 * (1 - newIntensity * 0.5))}, ${(0.85 + 0.15 * newIntensity) * fadeEffect})` :
            point.type === 'political' ? 
            `rgba(${Math.floor(51 * (1 - newIntensity * 0.5))}, ${Math.floor(102 * (1 - newIntensity * 0.3))}, 255, ${(0.85 + 0.15 * newIntensity) * fadeEffect * 0.9})` :
            point.type === 'innovation' ? 
            `rgba(${Math.floor(34 * (1 - newIntensity * 0.5))}, ${Math.floor(221 + 34 * newIntensity)}, ${Math.floor(68 * (1 - newIntensity * 0.3))}, ${(0.85 + 0.15 * newIntensity) * fadeEffect * 0.9})` :
            `rgba(${Math.floor(34 * (1 - newIntensity))}, 255, ${Math.floor(136 * (1 - newIntensity) + 119 * newIntensity)}, ${(0.85 + 0.15 * newIntensity) * fadeEffect})`
        };
      })
    );
  }, []);

  useEffect(() => {
    if (globeEl.current) {
      const globe = globeEl.current;
      
      // Configurar controles para rotación más lenta y fluida
      globe.controls().autoRotate = true;
      globe.controls().autoRotateSpeed = 0.2; // Más lento para efecto de monitoreo
      globe.controls().enableZoom = true;
      globe.controls().enablePan = false;
      globe.controls().minDistance = 180;
      globe.controls().maxDistance = 600;
      
      // Configurar iluminación optimizada para mayor vida visual
      const scene = globe.scene();
      if (scene) {
        // Luz ambiental mejorada para dar más vida a los continentes
        const ambientLight = scene.children.find((child: any) => child.type === 'AmbientLight');
        if (ambientLight) {
          ambientLight.intensity = 0.8; // Aumentado para mayor brillo y claridad
        }
        
        // Luz direccional optimizada para resaltar continentes sin comprometer la estética oscura
        const directionalLight = scene.children.find((child: any) => child.type === 'DirectionalLight');
        if (directionalLight) {
          directionalLight.intensity = 2.2; // Incrementado para mejor definición de continentes
          directionalLight.position.set(3, 2, 1.5); // Posición optimizada para mejor iluminación
        }
        
        // Verificar que THREE.js esté disponible antes de crear luces adicionales
        if (typeof (window as any).THREE !== 'undefined') {
          // Añadir luz adicional para mejorar la visibilidad de los continentes
          const additionalLight = new (window as any).THREE.DirectionalLight(0xffffff, 0.8);
          additionalLight.position.set(-2, 1, 2);
          scene.add(additionalLight);
          
          // Luz de relleno suave para eliminar sombras muy oscuras
          const fillLight = new (window as any).THREE.DirectionalLight(0x4a90e2, 0.4);
          fillLight.position.set(0, -1, 1);
          scene.add(fillLight);
        }
      }
    }
  }, []);

  // Animación principal de la IA
  useEffect(() => {
    const interval = setInterval(() => {
      updateAIActivity();
    }, 150); // Actualización más frecuente para mayor fluidez

    return () => clearInterval(interval);
  }, [updateAIActivity]);

  return (
    <div 
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ zIndex: 0 }}
    >
      <Globe
        ref={globeEl}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        backgroundColor="rgba(0,0,0,0)"
        width={window.innerWidth}
        height={window.innerHeight}
        showAtmosphere={true}
        atmosphereColor="#4338ca"
        atmosphereAltitude={0.15}
        enablePointerInteraction={true}
        
        // Configuración de puntos
        pointsData={pointsData}
        pointLat={(d: any) => d.lat}
        pointLng={(d: any) => d.lng}
        pointColor={(d: any) => d.color}
        pointAltitude={0.02}
        pointRadius={(d: any) => d.size}
        pointResolution={8}
      />
    </div>
  );
}