import React, { memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ParticleGlobe from './ParticleGlobe';

const ParticleGlobeWithLegend: React.FC = memo(() => {
  return (
    <div className="relative w-full h-full">
      {/* Canvas 3D */}
      <Canvas
        camera={{ position: [0, 0, 4], fov: 45 }}
        className="w-full h-full"
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        <ParticleGlobe activeCategory={null} />
        <OrbitControls 
          enableZoom={false}
          enablePan={false}
          minDistance={2}
          maxDistance={8}
          autoRotate={false}
          enableDamping={false}
        />
      </Canvas>
    </div>
  );
});

ParticleGlobeWithLegend.displayName = 'ParticleGlobeWithLegend';

export default ParticleGlobeWithLegend;