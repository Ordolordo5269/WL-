import React from 'react';
import { motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';

interface MenuToggleButtonProps {
  isOpen: boolean;
  onClick: () => void;
}

const MenuToggleButton: React.FC<MenuToggleButtonProps> = ({ isOpen, onClick }) => {
  return (
    <motion.button
      onClick={onClick}
      className="menu-toggle-button group"
      whileHover={{ 
        scale: 1.1,
        rotate: isOpen ? -5 : 5
      }}
      whileTap={{ 
        scale: 0.9,
        rotate: isOpen ? -10 : 10
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 25
      }}
      animate={{
        backgroundColor: isOpen 
          ? 'rgba(239, 68, 68, 0.1)' 
          : 'rgba(15, 23, 42, 0.95)',
        borderColor: isOpen 
          ? 'rgba(239, 68, 68, 0.5)' 
          : 'rgba(59, 130, 246, 0.4)',
        boxShadow: isOpen
          ? '0 8px 32px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2)'
          : '0 8px 32px rgba(59, 130, 246, 0.2), 0 0 15px rgba(59, 130, 246, 0.1)'
      }}
    >
      {/* Glow effect background */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
        animate={{
          background: isOpen 
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)'
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Icon container */}
      <motion.div
        className="menu-toggle-icon"
        initial={{
          filter: 'drop-shadow(0 0 0px rgba(59, 130, 246, 0))'
        }}
        animate={{ 
          rotate: isOpen ? 180 : 0,
          color: isOpen ? '#ef4444' : '#3b82f6'
        }}
        whileHover={{
          scale: 1.1,
          filter: isOpen 
            ? 'drop-shadow(0 0 10px rgba(239, 68, 68, 0.8))'
            : 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.8))'
        }}
        transition={{ 
          duration: 0.3,
          type: 'spring',
          stiffness: 300
        }}
      >
        {isOpen ? <X size={20} strokeWidth={2.5} /> : <Menu size={20} strokeWidth={2.5} />}
      </motion.div>
      
      {/* Ripple effect on click */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 opacity-0"
        animate={{
          borderColor: isOpen ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)',
          scale: [1, 1.3, 1],
          opacity: [0, 0.8, 0]
        }}
        transition={{
          duration: 0.5,
          ease: 'easeOut'
        }}
        key={isOpen ? 'open' : 'closed'}
      />
      
      {/* Tooltip */}
      <motion.div
        className="menu-toggle-tooltip"
        initial={{ opacity: 0, x: -10 }}
        whileHover={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
      >
        {isOpen ? 'Close menu' : 'Open menu'}
      </motion.div>
    </motion.button>
  );
};

export default MenuToggleButton;