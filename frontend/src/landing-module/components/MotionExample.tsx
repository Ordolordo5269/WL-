import React from 'react';
import { motion } from 'framer-motion';

interface MotionExampleProps {
  text?: string;
}

const MotionExample: React.FC<MotionExampleProps> = ({ text = 'Framer Motion funciona!' }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="p-6 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg text-white text-center"
    >
      <motion.h2 
        className="text-2xl font-bold mb-2"
        animate={{ 
          scale: [1, 1.1, 1],
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          repeatType: "reverse"
        }}
      >
        {text}
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="text-white/80"
      >
        Animaciones fluidas con Framer Motion
      </motion.p>
    </motion.div>
  );
};

export default MotionExample;