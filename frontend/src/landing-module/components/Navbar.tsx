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
      <div className="max-w-screen-xl mx-auto px-6 py-5 flex justify-between items-center">
        {/* Logo */}
        <motion.div 
          className="text-xl font-bold bg-gradient-to-r from-purple-400 to-blue-500 bg-clip-text text-transparent"
          whileHover={{ scale: 1.05 }}
          transition={{ duration: 0.2 }}
        >
          WORLDLORE
        </motion.div>
        
        {/* Menú central alineado */}
            <div className="flex max-md:hidden flex-1 justify-center gap-8 text-white text-sm">
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/landing" 
              onClick={() => handleNavClick('/landing')} 
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
              to="/landing/mobility-ai" 
              onClick={() => handleNavClick('/landing/mobility-ai')} 
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              Mobility AI
            </Link>
          </motion.div>
          <motion.div 
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/landing/investment-ai" 
              onClick={() => handleNavClick('/landing/investment-ai')} 
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              World Model AI
            </Link>
          </motion.div>
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Link 
              to="/landing/about" 
              onClick={() => handleNavClick('/landing/about')} 
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
              to="/landing/#platform-experiences" 
              className="hover:text-violet-400 transition-colors duration-300 cursor-pointer"
            >
              App
            </Link>
          </motion.div>
        </div>

        {/* Botones de descarga */}
        <div className="flex items-center gap-6">
          <motion.a
            href="https://apps.apple.com/app/worldlore/id123456789"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
            initial={{ scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <img 
              src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
              alt="Download on App Store"
              className="h-11 w-auto object-contain cursor-pointer"
            />
          </motion.a>
          <motion.a
            href="https://play.google.com/store/apps/details?id=com.worldlore.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block"
            initial={{ scale: 1.35 }}
            whileHover={{ scale: 1.42 }}
            whileTap={{ scale: 1.28 }}
            transition={{ duration: 0.2 }}
          >
            <img 
              src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
              alt="Get it on Google Play"
              className="h-11 w-auto object-contain translate-y-[1px] cursor-pointer"
            />
          </motion.a>
        </div>

        {/* Menú móvil (hamburger) */}
        <div className="flex md:hidden flex-col gap-1 cursor-pointer">
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
          <div className="w-6 h-0.5 bg-white"></div>
        </div>
      </div>

      {/* Menú móvil expandido (opcional para futuras mejoras) */}
      <div className="max-md:block hidden max-w-screen-xl mx-auto px-6 pb-4">
        <div className="pt-4 border-t border-white/20">
          <div className="flex flex-col gap-3 text-white text-sm">
            <Link to="/landing" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/landing') }>
              Home
            </Link>
            <Link to="/landing/mobility-ai" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/landing/mobility-ai') }>
              Mobility AI
            </Link>
            <Link to="/landing/investment-ai" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/landing/investment-ai') }>
              World Model AI
            </Link>
            <Link to="/landing/about" className="hover:text-violet-400 transition-colors duration-300" onClick={() => handleNavClick('/landing/about')}>
              About
            </Link>
            <Link to="/landing/#platform-experiences" className="hover:text-violet-400 transition-colors duration-300">
              App
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
