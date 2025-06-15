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
      className="fixed top-5 left-5 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-900/95 to-slate-800/95 backdrop-blur-xl border border-blue-500/40 text-white cursor-pointer flex items-center justify-center transition-all duration-500 shadow-2xl hover:shadow-blue-500/30 group overflow-hidden"
      whileHover={{ 
        scale: 1.08,
        backgroundColor: isOpen ? 'rgba(239, 68, 68, 0.15)' : 'rgba(59, 130, 246, 0.15)',
        borderColor: isOpen ? 'rgba(239, 68, 68, 0.6)' : 'rgba(59, 130, 246, 0.6)',
        boxShadow: isOpen 
          ? '0 20px 40px rgba(239, 68, 68, 0.3), 0 0 20px rgba(239, 68, 68, 0.2)'
          : '0 20px 40px rgba(59, 130, 246, 0.3), 0 0 20px rgba(59, 130, 246, 0.2)'
      }}
      whileTap={{ scale: 0.92 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 20
      }}
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100"
        animate={{
          background: isOpen 
            ? 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%)'
        }}
        transition={{ duration: 0.3 }}
      />
      
      {/* Enhanced SVG container with multiple effects */}
      <motion.div
        className="relative z-10 p-1 rounded-xl bg-gradient-to-br from-white/10 to-transparent backdrop-blur-sm border border-white/20 shadow-inner"
        animate={{ 
          rotate: isOpen ? 180 : 0,
          scale: isOpen ? 1.15 : 1,
          background: isOpen 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(37, 99, 235, 0.1))'
        }}
        whileHover={{
          rotate: isOpen ? 225 : 45,
          scale: 1.25,
          background: isOpen 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.15))'
            : 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(37, 99, 235, 0.15))',
          borderColor: isOpen ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)',
          boxShadow: isOpen 
            ? '0 0 20px rgba(239, 68, 68, 0.4), inset 0 0 10px rgba(239, 68, 68, 0.2)'
            : '0 0 20px rgba(59, 130, 246, 0.4), inset 0 0 10px rgba(59, 130, 246, 0.2)'
        }}
        transition={{ 
          duration: 0.4, 
          ease: 'easeInOut',
          type: 'spring',
          stiffness: 250,
          damping: 15
        }}
      >
        <motion.div
          animate={{
            filter: isOpen 
              ? 'drop-shadow(0 0 8px rgba(239, 68, 68, 0.6)) brightness(1.2)'
              : 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.6)) brightness(1.1)',
            color: isOpen ? '#ef4444' : '#3b82f6'
          }}
          whileHover={{
            filter: isOpen 
              ? 'drop-shadow(0 0 12px rgba(239, 68, 68, 0.8)) brightness(1.4)'
              : 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.8)) brightness(1.3)'
          }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X size={22} strokeWidth={2.5} /> : <Menu size={22} strokeWidth={2.5} />}
        </motion.div>
      </motion.div>
      
      {/* Pulse effect on state change */}
      <motion.div
        className="absolute inset-0 rounded-2xl border-2 opacity-0"
        animate={{
          borderColor: isOpen ? 'rgba(239, 68, 68, 0.8)' : 'rgba(59, 130, 246, 0.8)',
          scale: [1, 1.2, 1],
          opacity: [0, 0.6, 0]
        }}
        transition={{
          duration: 0.6,
          ease: 'easeOut',
          times: [0, 0.5, 1]
        }}
        key={isOpen ? 'open' : 'closed'}
      />
    </motion.button>
  );
};

export default MenuToggleButton;