import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode } from 'react';

interface FullscreenChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function FullscreenChartModal({
  isOpen,
  onClose,
  title,
  children
}: FullscreenChartModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fullscreen-chart-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className="fullscreen-chart-modal"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="fullscreen-chart-header">
              <h2 className="fullscreen-chart-title">{title}</h2>
              <button
                onClick={onClose}
                className="fullscreen-chart-close-btn"
                aria-label="Close fullscreen"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="fullscreen-chart-content">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}








