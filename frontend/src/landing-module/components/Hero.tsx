import { motion } from 'framer-motion';
import { useEffect, useRef, memo, useCallback, useMemo } from 'react';
import ParticleGlobeWithLegend from './ParticleGlobeWithLegend';

const Hero = memo(() => {
  const textRef = useRef<HTMLParagraphElement>(null);
  const intervalRef = useRef<number | null>(null);
  const currentIndexRef = useRef(0);
  
  const phrases = useMemo(() => [
    "The Smartest Way To Understand The World",
    "AI-driven geopolitical intelligence",
    "Detecting global disruption in real time",
    "Monitoring conflicts & innovation worldwide"
  ], []);
  
  const animateText = useCallback(() => {
    if (!textRef.current) return;
    
    // Fade out usando CSS transition
    textRef.current.style.opacity = '0';
    
    setTimeout(() => {
      // Change text
      currentIndexRef.current = (currentIndexRef.current + 1) % phrases.length;
      if (textRef.current) {
        textRef.current.textContent = phrases[currentIndexRef.current];
        // Fade in
        textRef.current.style.opacity = '1';
      }
    }, 500);
  }, [phrases]);

  // Inicializar el estilo de transición
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.transition = 'opacity 0.5s ease-in-out';
    }
    
    // Start animation after initial delay
    const startAnimation = () => {
      intervalRef.current = setInterval(animateText, 3000);
    };
    
    const timer = setTimeout(startAnimation, 3000);
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      clearTimeout(timer);
    };
  }, [animateText]);
  
  return (
    <section className="relative min-h-screen overflow-hidden">
      {/* Globe Background with Events */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        className="absolute inset-0"
        style={{ 
          willChange: 'opacity',
          transform: 'translate3d(0, 0, 0)' // Forzar aceleración por hardware
        }}
      >
        <ParticleGlobeWithLegend />
      </motion.div>
      
      {/* Overlay for better text readability */}
      <div 
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40"
        style={{ zIndex: 0 }}
      />
      
      {/* Main Content */}
      <motion.div 
        className="relative flex flex-col items-center justify-center min-h-screen px-4 text-center"
        style={{ 
          zIndex: 1,
          willChange: 'transform, opacity',
          transform: 'translate3d(0, 0, 0)' // Forzar aceleración por hardware
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <motion.h1 
          className="text-4xl md:text-6xl lg:text-7xl mb-8 text-white"
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
          style={{
            fontFamily: '"Space Grotesk", "Manrope", "Inter", "Helvetica Neue", system-ui, sans-serif',
            fontWeight: '500',
            letterSpacing: '0',
            textTransform: 'uppercase',
            color: '#FFFFFF',
            textShadow: '0 0 20px rgba(92, 108, 255, 0.4), 0 0 40px rgba(166, 107, 255, 0.2), 0 4px 15px rgba(0, 0, 0, 0.6)',
            lineHeight: '1.1',
            maxWidth: '70%',
            willChange: 'transform, opacity',
            transform: 'translate3d(0, 0, 0)' // Forzar aceleración por hardware
          }}
        >
          WORLDLORE
        </motion.h1>
        
        <motion.p 
          ref={textRef}
          id="dynamic-text"
          className="text-lg md:text-xl lg:text-2xl text-white mb-10 max-w-3xl font-normal tracking-wide leading-relaxed"
          initial={false}
          style={{
            textShadow: '0 0 20px rgba(0, 0, 0, 0.8), 0 2px 20px rgba(0, 0, 0, 0.9)',
            color: '#f0f8ff',
            willChange: 'opacity'
          }}
        >
          The Smartest Way To Understand The World
        </motion.p>
        
        <motion.button 
          className="px-10 py-4 bg-gradient-to-r from-purple-600 via-purple-700 to-blue-600 text-white text-lg font-semibold rounded-lg shadow-2xl border border-purple-500/30 relative overflow-hidden transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-600"
          initial={false}
          style={{
            boxShadow: '0 8px 25px rgba(147, 51, 234, 0.4), 0 0 15px rgba(59, 130, 246, 0.2)',
            willChange: 'transform'
          }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: '0 0 30px rgba(0, 255, 224, 0.6), 0 0 60px rgba(143, 0, 255, 0.4), 0 8px 25px rgba(147, 51, 234, 0.4)'
          }}
          whileTap={{ scale: 0.98 }}
        >
          <span className="relative z-10">Explore Now</span>
          <motion.div
            className="absolute inset-0 opacity-0"
            style={{
              background: 'linear-gradient(90deg, #00ffe0, #8f00ff)',
              pointerEvents: 'none'
            }}
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          />
        </motion.button>
        
        {/* Indicador de estado de IA - Reubicado debajo del botón */}
        <motion.div
          className="flex items-center justify-center gap-3 mt-8 text-sm font-medium"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.3 }}
        >
          <motion.div
            className="w-3 h-3 rounded-full"
            style={{
              background: 'linear-gradient(45deg, #3b82f6, #8b5cf6)'
            }}
            animate={{ 
              scale: [1, 1.3, 1], 
              opacity: [0.7, 1, 0.7],
              background: [
                'linear-gradient(45deg, #3b82f6, #8b5cf6)',
                'linear-gradient(45deg, #8b5cf6, #3b82f6)',
                'linear-gradient(45deg, #3b82f6, #8b5cf6)'
              ]
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.span 
            className="bg-gradient-to-r from-blue-400 via-purple-400 to-blue-500 bg-clip-text text-transparent"
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{
              backgroundSize: '200% 200%'
            }}
          >
            AI Monitoring Global Events
          </motion.span>
        </motion.div>
        
        {/* Leyenda de categorías de eventos - Separada y más abajo */}
        <motion.div
          className="flex flex-wrap justify-center gap-6 mt-8 text-sm font-medium text-white/70"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6 }}
        >
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-2 h-2 bg-red-400 rounded-full"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>Conflicts</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-2 h-2 bg-blue-400 rounded-full"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>Political Changes</span>
          </motion.div>
          
          <motion.div 
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="w-2 h-2 bg-green-400 rounded-full"
              animate={{ opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <span>Innovation & Social</span>
          </motion.div>
        </motion.div>
        
        {/* Indicador de scroll */}
        <motion.div
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
        >
          <div className="w-6 h-10 border-2 border-white/30 rounded-full flex justify-center">
            <motion.div
              className="w-1 h-3 bg-white/60 rounded-full mt-2"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
});

Hero.displayName = 'Hero';

export default Hero;
