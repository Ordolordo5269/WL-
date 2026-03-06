import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
// Removed SpaceWavesBackground to keep a clean black background

const Footer = () => {
  return (
    <div className="relative min-h-[400px] overflow-hidden bg-black">
      {/* Divider Line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent z-20"></div>
      
      {/* Background removed: solid black background only */}
      
      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 py-16">
        <motion.div
          className="max-w-6xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start mb-12">
            
            {/* Left - Brand and Slogan */}
            <div className="lg:col-span-2 text-center lg:text-left">
              <motion.h2 
                className="text-3xl font-medium mb-4 relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.02 }}
              >
                <span className="bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent font-semibold tracking-wide relative">
                  WORLDLORE
                  <div className="absolute -bottom-1 left-0 w-full h-0.5 bg-gradient-to-r from-cyan-400/40 via-blue-500/30 to-transparent rounded-full"></div>
                </span>
              </motion.h2>
              
              <motion.div 
                className="relative"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p className="text-base text-white/80 font-light leading-relaxed italic">
                  The Smartest Way To Understand The World
                </p>
              </motion.div>
            </div>

            {/* Right - Resources Column */}
            <motion.div 
              className="text-center lg:text-right"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-white mb-6">Resources</h3>
              <div className="space-y-4">
                <motion.a 
                  href="mailto:support@worldlore.ai"
                  className="block text-white/80 hover:text-cyan-400 transition-colors duration-300 text-lg"
                  whileHover={{ x: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  Contact Us
                </motion.a>
                <motion.div 
                  whileHover={{ x: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link 
                    to="/privacy-policy"
                    className="block text-white/80 hover:text-cyan-400 transition-colors duration-300 text-lg"
                  >
                    Privacy Policy
                  </Link>
                </motion.div>
                <motion.div 
                  whileHover={{ x: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link 
                    to="/terms-of-service"
                    className="block text-white/80 hover:text-cyan-400 transition-colors duration-300 text-lg"
                  >
                    Terms of Service
                  </Link>
                </motion.div>
                <motion.div 
                  whileHover={{ x: -5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Link 
                    to="/about"
                    className="block text-white/80 hover:text-cyan-400 transition-colors duration-300 text-lg"
                  >
                    About Us
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Bottom - Copyright and Social Media */}
          <motion.div 
            className="border-t border-white/10 pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-white/60 text-lg">
                Copyright 2025 WORLDLORE
              </p>
              
              {/* Social Media Links */}
              <div className="flex items-center gap-4">
                <motion.a 
                  href="https://instagram.com/worldlore" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-gradient-to-r hover:from-pink-500 hover:to-orange-500 rounded-lg flex items-center justify-center transition-all duration-300 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5 text-white group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </motion.a>
                
                <motion.a 
                  href="https://www.tiktok.com/@worldlore" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-gradient-to-r hover:from-cyan-400 hover:to-pink-500 rounded-lg flex items-center justify-center transition-all duration-300 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  aria-label="TikTok"
                >
                  <svg className="w-5 h-5 text-white group-hover:text-white" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3h3a7 7 0 0 0 7 7v3a9.97 9.97 0 0 1-5-1.4v5.4a6 6 0 1 1-6-6h1v3H11a3 3 0 1 0 3 3V3z" />
                  </svg>
                </motion.a>
                
                <motion.a 
                  href="https://linkedin.com/company/worldlore" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-all duration-300 group"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <svg className="w-5 h-5 text-white group-hover:text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                </motion.a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Footer;
