import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const handleNavClick = (target: string) => {
    if (location.pathname === target) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <motion.nav 
      className="fixed top-0 w-full z-50 bg-black/60 backdrop-blur-md font-space"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="relative max-w-screen-xl mx-auto px-6 py-5 flex items-center">
        {/* Logo */}
        <motion.div 
          className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          WORLDLORE
        </motion.div>
        
        {/* Menú central centrado en la parte superior */}
        <div className="hidden md:flex gap-8 text-white text-sm absolute left-1/2 -translate-x-1/2">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/" 
              onClick={() => handleNavClick('/')} 
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              Home
            </Link>
          </motion.div>
          
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/about" 
              onClick={() => handleNavClick('/about')} 
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              About
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              to="/#platform-experiences"
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              App
            </Link>
          </motion.div>
        </div>

        {/* Open App button */}
        <motion.a
          href={`${import.meta.env.VITE_WL_APP_URL || 'http://localhost:5173'}/map`}
          className="hidden md:inline-flex ml-auto px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-purple-600 transition-all duration-300"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.98 }}
        >
          Open App
        </motion.a>

        {/* Menú móvil (hamburger) */}
        <div className="md:hidden flex flex-col gap-1 cursor-pointer ml-auto">
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
        </div>
      </div>

      {/* Menú móvil expandido (opcional para futuras mejoras) */}
      <div className="md:hidden max-w-screen-xl mx-auto px-6 pb-4">
        <div className="pt-4 border-t border-white/20">
          <div className="flex flex-col gap-3 text-white text-sm">
            <Link to="/" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/') }>
              Home
            </Link>
            
            <Link to="/about" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/about')}>
              About
            </Link>
            <Link to="/#platform-experiences" className="hover:text-violet-400 transition-colors duration-300">
              App
            </Link>
            <a
              href={`${import.meta.env.VITE_WL_APP_URL || 'http://localhost:5173'}/map`}
              className="px-4 py-2 text-center font-semibold text-white bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg hover:from-cyan-400 hover:to-purple-600 transition-all duration-300"
            >
              Open App
            </a>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
