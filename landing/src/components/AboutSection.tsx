import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';

const AboutSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <section 
      ref={ref}
      className="w-full min-h-screen flex items-center justify-center relative"
    >
      <div className="max-w-4xl mx-auto px-6 py-20 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-8 leading-tight" style={{ textShadow: '0 0 20px rgba(0, 0, 0, 0.8)' }}>
            Understand the world like never before.
          </h2>
          
          <motion.p 
            className="text-lg md:text-xl lg:text-2xl text-white/90 leading-relaxed font-light max-w-3xl mx-auto"
            style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          >
            WorldLore is an AI-powered platform that analyzes conflicts, political shifts, and global innovation in real time. Our mission is to help you interpret the present and anticipate the future.
          </motion.p>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutSection;