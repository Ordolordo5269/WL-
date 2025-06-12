import React from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface MenuToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

export default function MenuToggleButton({ isOpen, onClick }: MenuToggleButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className="menu-toggle-button"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      aria-label={isOpen ? 'Cerrar menú' : 'Abrir menú'}
    >
      <motion.div
        className="menu-toggle-icon"
        animate={{ rotate: isOpen ? 180 : 0 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </motion.div>
      
      {/* Efecto de fondo animado */}
      <motion.div
        className="menu-toggle-bg"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: isOpen ? 1.2 : 1, 
          opacity: isOpen ? 0.8 : 0.6 
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Tooltip */}
      <div className="menu-toggle-tooltip">
        {isOpen ? 'Cerrar menú' : 'Abrir menú'}
      </div>
    </motion.button>
  );
}