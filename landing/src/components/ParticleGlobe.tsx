import React, { useRef, useMemo, useEffect, useState, memo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import * as d3 from 'd3-geo';

// Declaración de módulo para d3-geo
declare module 'd3-geo' {
  export function geoOrthographic(): any;
  export function geoPath(): any;
}

interface GeoFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  properties: any;
}

interface GeoData {
  type: string;
  features: GeoFeature[];
}



interface ParticleGlobeProps {
  // Props interface for future extensibility
  activeCategory?: string | null;
}

const ParticleGlobe: React.FC<ParticleGlobeProps> = memo(() => {
  const pointsRef = useRef<THREE.Points>(null);
  const sphereRef = useRef<THREE.Points>(null);
  const [geoData, setGeoData] = useState<GeoData | null>(null);
  
  // Estados para interacción con mouse
  const mousePosition = useRef({ x: 0, y: 0 });
  const targetRotation = useRef({ x: 0, y: 0 });
  const currentRotation = useRef({ x: 0, y: 0 });



  // Cargar datos GeoJSON
  useEffect(() => {
    const loadGeoData = async () => {
      try {
        const response = await fetch('/world.geo.json');
        const data = await response.json();
        setGeoData(data);
      } catch (error) {
        console.error('Error loading GeoJSON:', error);
      }
    };

    loadGeoData();
  }, []);

  // Generar partículas esféricas de fondo para dar forma general (optimizado)
  const spherePositions = useMemo(() => {
    const radius = 1;
    const particleCount = 2000; // Reducido agresivamente para eliminar lag
    const positions: number[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      // Distribución uniforme en esfera usando método de Marsaglia
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);
      
      positions.push(x, y, z);
    }
    
    return new Float32Array(positions);
  }, []);

  // Generar posiciones de partículas basadas en datos geográficos (continentes)
  const continentPositions = useMemo(() => {
    if (!geoData) return new Float32Array(0);

    const radius = 1.002; // Ligeramente más grande para que destaque
    const particlePositions: number[] = [];

    // Procesar cada feature del GeoJSON con mayor densidad
    geoData.features.forEach((feature) => {
      if (feature.geometry.type === 'Polygon') {
        const coordinates = feature.geometry.coordinates as number[][][];
        coordinates.forEach((ring) => {
          ring.forEach((coord, index) => {
              // Procesar cada 2 puntos para aumentar un poco la densidad sin generar lag
              if (index % 2 !== 0) return;
              
              const [lon, lat] = coord;
              
              // Convertir coordenadas geográficas a coordenadas esféricas
              const phi = (90 - lat) * (Math.PI / 180);
              const theta = (lon + 180) * (Math.PI / 180);
              
              // Convertir a coordenadas cartesianas 3D
              const x = radius * Math.sin(phi) * Math.cos(theta);
              const y = radius * Math.cos(phi);
              const z = radius * Math.sin(phi) * Math.sin(theta);
              
              particlePositions.push(x, y, z);
              
              // Añadir pocas partículas adicionales para dar cuerpo sin afectar el rendimiento
              const offset = 0.005;
              for (let i = 0; i < 3; i++) {
                const randomOffset = {
                  x: (Math.random() - 0.5) * offset,
                  y: (Math.random() - 0.5) * offset,
                  z: (Math.random() - 0.5) * offset
                };
                
                particlePositions.push(
                  x + randomOffset.x,
                  y + randomOffset.y,
                  z + randomOffset.z
                );
              }
            });
        });
      } else if (feature.geometry.type === 'MultiPolygon') {
        const coordinates = feature.geometry.coordinates as number[][][][];
        coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            ring.forEach((coord, index) => {
              // Procesar cada 2 puntos para aumentar un poco la densidad sin generar lag
              if (index % 2 !== 0) return;
              
              const [lon, lat] = coord;
              
              const phi = (90 - lat) * (Math.PI / 180);
              const theta = (lon + 180) * (Math.PI / 180);
              
              const x = radius * Math.sin(phi) * Math.cos(theta);
              const y = radius * Math.cos(phi);
              const z = radius * Math.sin(phi) * Math.sin(theta);
              
              particlePositions.push(x, y, z);
              
              // Añadir pocas partículas adicionales para dar cuerpo sin afectar el rendimiento
              const offset = 0.005;
              for (let i = 0; i < 3; i++) {
                const randomOffset = {
                  x: (Math.random() - 0.5) * offset,
                  y: (Math.random() - 0.5) * offset,
                  z: (Math.random() - 0.5) * offset
                };
                
                particlePositions.push(
                  x + randomOffset.x,
                  y + randomOffset.y,
                  z + randomOffset.z
                );
              }
            });
          });
        });
      }
    });

    return new Float32Array(particlePositions);
  }, [geoData]);



  // Animación fluida y orgánica para todas las capas con interacción de mouse
  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;
    
    // Interpolación suave para la rotación del mouse (efecto inercial más rápido)
    const lerpFactor = 1 - Math.pow(0.85, delta * 60); // Suavizado más rápido para mayor respuesta
    currentRotation.current.x += (targetRotation.current.x - currentRotation.current.x) * lerpFactor;
    currentRotation.current.y += (targetRotation.current.y - currentRotation.current.y) * lerpFactor;
    

    
    // Rotación automática base
    const autoRotationY = time * 0.03;
    const autoRotationX = Math.sin(time * 0.2) * 0.05;
    
    // Animación de la esfera de fondo - Movimiento muy sutil
    if (sphereRef.current) {
      sphereRef.current.rotation.y = autoRotationY * 0.6 + currentRotation.current.y;
      sphereRef.current.rotation.x = Math.sin(time * 0.08) * 0.015 + currentRotation.current.x;
    }
    
    // Animación de las partículas principales de continentes - Fluida y elegante
    if (pointsRef.current) {
      pointsRef.current.rotation.y = autoRotationY + currentRotation.current.y;
      pointsRef.current.rotation.x = Math.sin(time * 0.12) * 0.02 + currentRotation.current.x;
    }
    

  });

  // Interacción avanzada con mouse para rotación suave
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      // Normalizar posición del mouse (-1 a 1)
      const mouseX = (event.clientX / window.innerWidth) * 2 - 1;
      const mouseY = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Actualizar posición del mouse
      mousePosition.current = { x: mouseX, y: mouseY };
      
      // Calcular rotación objetivo con límites más amplios y mayor sensibilidad
      const maxRotationX = Math.PI * 0.25; // Límite vertical aumentado (45 grados)
      const maxRotationY = Math.PI * 0.5;  // Límite horizontal aumentado (90 grados)
      
      // Aumentar significativamente la sensibilidad
      targetRotation.current = {
        x: Math.max(-maxRotationX, Math.min(maxRotationX, mouseY * 0.8)),
        y: Math.max(-maxRotationY, Math.min(maxRotationY, mouseX * 1.2))
      };
      

    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  if (!geoData || continentPositions.length === 0) {
    return null;
  }

  return (
    <group>
      {/* Iluminación ambiental muy sutil */}
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.2} color="#ffffff" />
      
      {/* Partículas de fondo - Sutil esfera de fondo */}
        <Points 
          ref={sphereRef}
          positions={spherePositions} 
          stride={3} 
          frustumCulled={false}
        >
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.003}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.25}
          blending={THREE.NormalBlending}
        />
      </Points>
      
      {/* Partículas principales de continentes - Nítidas y elegantes */}
      <Points 
        ref={pointsRef} 
        positions={continentPositions} 
        stride={3} 
        frustumCulled={false}
      >
        <PointMaterial
          transparent
          color="#ffffff"
          size={0.005}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.9}
          blending={THREE.AdditiveBlending}
        />
      </Points>
    </group>
  );
});

ParticleGlobe.displayName = 'ParticleGlobe';

export default ParticleGlobe;