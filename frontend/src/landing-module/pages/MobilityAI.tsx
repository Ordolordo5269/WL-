import React from 'react';
import { motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const MobilityAI = () => {
  const handleHowItWorksClick = () => {
    // Scroll to next section when implemented
    const nextSection = document.getElementById('how-it-works');
    if (nextSection) {
      nextSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative min-h-screen lg:min-h-[80vh] flex items-center justify-center px-6 py-20">
        <div className="relative z-10 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left Column - Content */}
            <motion.div 
              className="text-center lg:text-left order-2 lg:order-1"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              {/* Main Heading */}
              <motion.h1 
                className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <span className="bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Understand Global Mobility
                </span>
                <br />
                <span className="text-white">
                  with AI.
                </span>
              </motion.h1>
              
              {/* Subheading */}
              <motion.p 
                className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
              >
                Mobility AI is your intelligent companion for international life—helping you plan routes, 
                manage visa requirements, and relocate with clarity.
              </motion.p>
              
              {/* CTA Buttons */}
              <motion.div 
                className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.8 }}
              >
                {/* Primary CTA */}
                <motion.button
                  className="px-8 py-4 bg-gradient-to-r from-violet-600 to-blue-600 text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-violet-500/50"
                  whileHover={{ 
                    boxShadow: "0 0 30px rgba(139, 92, 246, 0.5)",
                    scale: 1.05 
                  }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Get early access to Mobility AI"
                >
                  Get Early Access
                </motion.button>
                
                {/* Secondary CTA */}
                <motion.button
                  onClick={handleHowItWorksClick}
                  className="px-8 py-4 border-2 border-gray-400 text-gray-300 font-semibold rounded-lg hover:border-violet-400 hover:text-violet-400 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-violet-500/50"
                  whileHover={{ 
                    borderColor: "rgb(139, 92, 246)",
                    color: "rgb(139, 92, 246)",
                    scale: 1.02
                  }}
                  whileTap={{ scale: 0.98 }}
                  aria-label="Learn how Mobility AI works"
                >
                  How It Works
                </motion.button>
              </motion.div>
            </motion.div>
            
            {/* Right Column - Visual Placeholder */}
            <motion.div 
              className="order-1 lg:order-2 flex items-center justify-center"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <motion.div 
                className="w-full max-w-lg h-96 bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-gray-700 rounded-2xl flex items-center justify-center backdrop-blur-sm"
                whileHover={{ scale: 1.02 }}
                animate={{ 
                  y: [0, -12, 0],
                }}
                transition={{
                  y: {
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }
                }}
              >
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-blue-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">Mockup:</h3>
                  <p className="text-gray-400">Mobility Dashboard</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Placeholder for How It Works section */}
      <section id="how-it-works" className="relative min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white mb-4">How It Works</h2>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </section>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default MobilityAI;