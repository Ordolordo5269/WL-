import React, { useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

interface ParticleSphereProps {
  count?: number;
  mouseRef?: React.MutableRefObject<{ x: number; y: number }>;
}

// Componente principal de la esfera de partículas futurista
function ParticleSphere({ count = 15000, mouseRef }: ParticleSphereProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const smoothedMouse = useRef({ x: 0, y: 0 });
  
  // Generar posiciones de partículas en forma esférica
  const { positions, originalPositions } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const originalPositions = new Float32Array(count * 3);
    const radius = 4;
    
    for (let i = 0; i < count; i++) {
      // Distribución esférica uniforme usando el método de Marsaglia
      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      
      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.sin(theta);
      
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      
      originalPositions[i * 3] = x;
      originalPositions[i * 3 + 1] = y;
      originalPositions[i * 3 + 2] = z;
    }
    
    return { positions, originalPositions };
  }, [count]);
  
  // Animación de las partículas
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.elapsedTime;
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    const lerpFactor = 0.25;
    const targetX = mouseRef ? mouseRef.current.x : 0;
    const targetY = mouseRef ? mouseRef.current.y : 0;
    smoothedMouse.current.x += (targetX - smoothedMouse.current.x) * lerpFactor;
    smoothedMouse.current.y += (targetY - smoothedMouse.current.y) * lerpFactor;
    
    // Rotación suave de la esfera
    pointsRef.current.rotation.y = time * 0.1;
    pointsRef.current.rotation.x = Math.sin(time * 0.05) * 0.1;
    
    // Respuesta al mouse
    const mouseInfluence = 1.1;
    pointsRef.current.rotation.y += smoothedMouse.current.x * mouseInfluence * 0.06;
    pointsRef.current.rotation.x += smoothedMouse.current.y * mouseInfluence * 0.06;
    // Parallax sutil del conjunto
    pointsRef.current.position.x = smoothedMouse.current.x * 0.45;
    pointsRef.current.position.y = smoothedMouse.current.y * 0.32;
    
    // Animación de pulsación y ondas sinusoidales
    if (positionAttribute && positionAttribute.array instanceof Float32Array) {
      const positions = positionAttribute.array;
      
      for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        
        // Posiciones originales
        const originalX = originalPositions[i3];
        const originalY = originalPositions[i3 + 1];
        const originalZ = originalPositions[i3 + 2];
        
        // Calcular distancia desde el centro para efectos de onda
        const distance = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
        
        // Efecto de pulsación global
        const pulsation = 1 + Math.sin(time * 2 + distance * 0.5) * 0.1;
        
        // Efecto de onda sinusoidal
        const wave = Math.sin(time * 3 + distance * 0.8 + originalY * 0.5) * 0.2;
        
        // Aplicar transformaciones + flujo sutil por cursor
        const nx = originalX / (distance || 1);
        const ny = originalY / (distance || 1);
        const nz = originalZ / (distance || 1);
        const flow = 0.2;
        positions[i3] = originalX * pulsation + wave * 0.3 + smoothedMouse.current.x * flow * ny;
        positions[i3 + 1] = originalY * pulsation + wave * 0.2 + smoothedMouse.current.y * flow * nx;
        positions[i3 + 2] = originalZ * pulsation + wave * 0.3 + (smoothedMouse.current.x - smoothedMouse.current.y) * flow * nz * 0.5;
      }
      
      positionAttribute.needsUpdate = true;
    }
  });
  
  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#6be8ff"
        size={0.1}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.42}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// Componente para partículas de acento brillantes
function AccentParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  
  const positions = useMemo(() => {
    const positions = new Float32Array(200 * 3);
    const radius = 4.5;
    
    for (let i = 0; i < 200; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.cos(phi);
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    
    return positions;
  }, []);
  
  useFrame((state) => {
    if (!pointsRef.current) return;
    
    const time = state.clock.elapsedTime;
    pointsRef.current.rotation.y = time * 0.05;
  });
  
  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#a855f7"
        size={0.12}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.01}
        blending={THREE.AdditiveBlending}
      />
    </Points>
  );
}

// Componente principal TechGlobe
interface TechGlobeProps {
  labelText?: string;
}

const TechGlobe: React.FC<TechGlobeProps> = ({ labelText = 'WORLDLORE NEURAL INTERFACE' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRefInternal = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    mouseRefInternal.current = { x: nx, y: ny };
  }, []);
  const handleMouseLeave = useCallback(() => {
    mouseRefInternal.current = { x: 0, y: 0 };
  }, []);
  
  return (
    <div
      className="w-full h-full relative"
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <Canvas
        camera={{
          position: [0, 0, 12],
          fov: 50,
          near: 0.1,
          far: 1000
        }}
        style={{
          background: 'transparent'
        }}
      >
        {/* Iluminación suave y atmosférica */}
        <ambientLight intensity={0.1} color="#ffffff" />
        <directionalLight
          position={[5, 5, 5]}
          intensity={0.3}
          color="#00d4ff"
          castShadow
        />
        <pointLight
          position={[-5, -5, 5]}
          intensity={0.2}
          color="#ffffff"
        />
        <pointLight
          position={[0, 0, -10]}
          intensity={0.1}
          color="#00d4ff"
        />
        
        {/* Esfera principal de partículas */}
        <ParticleSphere count={3000} mouseRef={mouseRefInternal} />
        
        {/* Partículas de acento */}
        <AccentParticles />
        
        {/* Niebla atmosférica */}
        <fog attach="fog" args={['#000011', 15, 30]} />
      </Canvas>
      
      {/* Overlay de información minimalista */}
      <div className="absolute bottom-4 right-4 text-white/50 text-xs font-mono tracking-wider pointer-events-none">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
          <span>{labelText}</span>
        </div>
      </div>
    </div>
  );
};

export default TechGlobe;