import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ComingSoonModal({ 
  isOpen, 
  onClose,
  title = "World Model AI",
  description
}: { 
  isOpen: boolean; 
  onClose: () => void;
  title?: string;
  description?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Prevent scrolling when modal is open
  useEffect(() => {
    if (isOpen && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    } else if (typeof document !== 'undefined') {
      document.body.style.overflow = '';
    }
    
    // Cleanup on unmount or when modal closes
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop - High z-index to cover everything */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
            className="relative z-[10000] w-full max-w-[500px] bg-[#050505] border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()} // Prevent clicks inside modal from closing it if we had a backdrop click handler
          >
            {/* Glow effect */}
            <div className="absolute -top-20 -left-20 w-60 h-60 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-4 right-4 p-2 text-white/40 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all duration-200 cursor-pointer z-[10001]"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Content */}
            <div className="relative z-10 flex flex-col items-center text-center mt-2">
              <h2 className="text-3xl font-light tracking-wide text-white mb-2">WORLDLORE</h2>
              <span className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-6">Coming soon</span>

              <p className="text-gray-300 text-base leading-relaxed mb-8">
                {description || (
                  <>
                    We’re building <span className="text-white font-medium">{title}</span>. A living model of the world that helps you understand what’s happening, why it’s happening, and what could happen next.
                    <br /><br />
                    Soon you’ll be able to explore real-time signals and run AI-driven scenario simulations.
                  </>
                )}
              </p>

              <button
                className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white text-sm font-medium rounded-full hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 transform hover:scale-[1.02]"
              >
                Join waitlist to stay updated
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
