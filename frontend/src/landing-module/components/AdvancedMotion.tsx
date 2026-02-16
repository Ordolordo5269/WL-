import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedMotion: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  
  const tabs = [
    { label: 'Animaciones', color: 'from-blue-500 to-cyan-500' },
    { label: 'Transiciones', color: 'from-purple-500 to-pink-500' },
    { label: 'Gestos', color: 'from-amber-500 to-orange-500' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium shadow-lg"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
      >
        {isOpen ? 'Cerrar ejemplos' : 'Ver ejemplos avanzados'}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden mt-4 rounded-lg shadow-lg bg-white dark:bg-gray-800"
          >
            {/* Tabs */}
            <div className="flex border-b border-gray-200 dark:border-gray-700">
              {tabs.map((tab, index) => (
                <motion.button
                  key={index}
                  className={`relative flex-1 py-3 px-4 text-sm font-medium ${selectedTab === index ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-500 dark:text-gray-400'}`}
                  onClick={() => setSelectedTab(index)}
                  whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                  whileTap={{ scale: 0.95 }}
                >
                  {tab.label}
                  {selectedTab === index && (
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${tab.color}`}
                      layoutId="underline"
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {selectedTab === 0 && (
                    <motion.div
                      variants={containerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-4"
                    >
                      <motion.div variants={itemVariants} className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <h3 className="font-bold text-blue-700 dark:text-blue-300">Animaciones de entrada</h3>
                        <p className="text-sm text-blue-600 dark:text-blue-400">Controla cómo aparecen los elementos en la pantalla.</p>
                      </motion.div>
                      <motion.div variants={itemVariants} className="p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
                        <h3 className="font-bold text-cyan-700 dark:text-cyan-300">Animaciones de salida</h3>
                        <p className="text-sm text-cyan-600 dark:text-cyan-400">Define cómo desaparecen los elementos de la pantalla.</p>
                      </motion.div>
                    </motion.div>
                  )}

                  {selectedTab === 1 && (
                    <div className="space-y-4">
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1, transition: { type: 'spring', stiffness: 300 } }}
                        className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg"
                      >
                        <h3 className="font-bold text-purple-700 dark:text-purple-300">Transiciones con resorte</h3>
                        <p className="text-sm text-purple-600 dark:text-purple-400">Movimientos naturales basados en física.</p>
                      </motion.div>
                      <motion.div 
                        initial={{ x: 100, opacity: 0 }}
                        animate={{ x: 0, opacity: 1, transition: { delay: 0.2, ease: 'easeOut' } }}
                        className="p-4 bg-pink-50 dark:bg-pink-900/20 rounded-lg"
                      >
                        <h3 className="font-bold text-pink-700 dark:text-pink-300">Curvas de aceleración</h3>
                        <p className="text-sm text-pink-600 dark:text-pink-400">Controla la velocidad de la animación a lo largo del tiempo.</p>
                      </motion.div>
                    </div>
                  )}

                  {selectedTab === 2 && (
                    <div className="space-y-4">
                      <motion.div 
                        className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95, backgroundColor: 'rgba(251,191,36,0.3)' }}
                        drag
                        dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                        dragElastic={0.2}
                      >
                        <h3 className="font-bold text-amber-700 dark:text-amber-300">Arrastrar (Drag)</h3>
                        <p className="text-sm text-amber-600 dark:text-amber-400">¡Intenta arrastrar este elemento!</p>
                      </motion.div>
                      <motion.div 
                        className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg cursor-pointer"
                        whileHover={{
                          scale: 1.05,
                          rotate: [0, 5, -5, 0],
                          transition: { duration: 0.5 }
                        }}
                      >
                        <h3 className="font-bold text-orange-700 dark:text-orange-300">Hover avanzado</h3>
                        <p className="text-sm text-orange-600 dark:text-orange-400">Pasa el cursor por encima para ver el efecto.</p>
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdvancedMotion;