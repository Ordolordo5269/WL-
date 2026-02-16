import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SpaceBackgroundProps {
  variant?: 'stars' | 'animated';
}

const SpaceBackground: React.FC<SpaceBackgroundProps> = ({ variant = 'animated' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    z: number;
    size: number;
    speed: number;
    opacity: number;
    color: string;
  }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize stars
    const initStars = () => {
      const stars = [];
      for (let i = 0; i < 200; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          z: Math.random() * 1000,
          size: Math.random() * 2 + 0.5,
          speed: Math.random() * 0.5 + 0.1,
          opacity: Math.random() * 0.8 + 0.2,
          color: Math.random() > 0.5 ? '#4a90e2' : '#8b5cf6'
        });
      }
      starsRef.current = stars;
    };
    initStars();

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 2 - 1,
        y: (e.clientY / window.innerHeight) * 2 - 1
      });
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Animation loop
    const animate = () => {
      ctx.fillStyle = 'rgba(10, 10, 10, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      starsRef.current.forEach((star, index) => {
        // Update star position with mouse influence
        star.x += star.speed + mousePos.x * 0.1;
        star.y += star.speed * 0.5 + mousePos.y * 0.1;
        star.z -= star.speed * 2;

        // Reset star if it goes off screen
        if (star.x > canvas.width + 10) star.x = -10;
        if (star.y > canvas.height + 10) star.y = -10;
        if (star.z <= 0) {
          star.z = 1000;
          star.x = Math.random() * canvas.width;
          star.y = Math.random() * canvas.height;
        }

        // Calculate perspective
        const perspective = 1000 / (1000 - star.z);
        const x = star.x * perspective;
        const y = star.y * perspective;
        const size = star.size * perspective;

        // Pulsing effect
        const pulse = Math.sin(Date.now() * 0.001 + index * 0.1) * 0.3 + 0.7;
        
        // Draw star
        ctx.save();
        ctx.globalAlpha = star.opacity * pulse;
        ctx.fillStyle = star.color;
        ctx.shadowBlur = size * 2;
        ctx.shadowColor = star.color;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Draw connecting lines occasionally
        if (Math.random() > 0.995) {
          const nearbyStars = starsRef.current.filter((otherStar, otherIndex) => {
            if (otherIndex === index) return false;
            const dx = star.x - otherStar.x;
            const dy = star.y - otherStar.y;
            return Math.sqrt(dx * dx + dy * dy) < 100;
          });

          nearbyStars.forEach(nearStar => {
            ctx.save();
            ctx.globalAlpha = 0.1;
            ctx.strokeStyle = star.color;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(x, y);
            const nearPerspective = 1000 / (1000 - nearStar.z);
            ctx.lineTo(nearStar.x * nearPerspective, nearStar.y * nearPerspective);
            ctx.stroke();
            ctx.restore();
          });
        }
      });

      animationRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mousePos.x, mousePos.y]);

  return (
    <>
      {/* Gradient Background */}
      <div 
        className="fixed inset-0 w-full h-full -z-50"
        style={{
          background: 'radial-gradient(ellipse at center, #1a1a2e 0%, #16213e 50%, #0a0a0a 100%)',
        }}
      />
      
      {/* Animated Stars Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full -z-40 opacity-60"
        style={{ pointerEvents: 'none' }}
      />
      
      {/* Additional floating particles */}
      {Array.from({ length: 20 }).map((_, i) => (
        <motion.div
          key={i}
          className="fixed w-1 h-1 bg-blue-400 rounded-full -z-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.3, 0.8, 0.3],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
            ease: "easeInOut"
          }}
        />
      ))}
    </>
  );
};

export default SpaceBackground;