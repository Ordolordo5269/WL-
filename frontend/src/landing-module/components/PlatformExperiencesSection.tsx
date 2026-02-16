import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// Removed SpaceWavesBackground to avoid blue waves background flicker

const PlatformExperiencesSection = () => {
  const [activeSlide, setActiveSlide] = useState(0);
  const [currentChatIndex, setCurrentChatIndex] = useState(0);

  const chatConversations = [
    {
      userMessage: "I'm planning to move to Germany. What do I need to know?",
      aiResponse: "I'll help you with that! For Germany, you'll need a visa, health insurance, and proof of income. I've created a personalized checklist for you.",
      followUpUser: "What about current safety alerts?",
      followUpAI: "Germany is currently low-risk. I'm monitoring real-time data and will alert you of any changes."
    },
    {
      userMessage: "Can you help me plan a trip to Japan?",
      aiResponse: "Absolutely! Japan requires a valid passport for most visitors. I'll create a travel itinerary and check current entry requirements for your country.",
      followUpUser: "What's the best season to visit?",
      followUpAI: "Spring (March-May) offers cherry blossoms, while autumn (September-November) has beautiful foliage. I'll show you climate data for both periods."
    },
    {
      userMessage: "I need investment opportunities in emerging markets.",
      aiResponse: "Great choice! I'm analyzing current emerging market trends. Southeast Asia and Eastern Europe show strong growth potential with favorable risk profiles.",
      followUpUser: "Which countries have the best ROI?",
      followUpAI: "Based on current data: Vietnam, Poland, and Mexico show excellent ROI potential. I'll provide detailed investment guides for each."
    },
    {
      userMessage: "Are there any security alerts for my business trip to Brazil?",
      aiResponse: "I'm tracking real-time security data for Brazil. Currently showing moderate risk in urban areas. I'll send you location-specific safety protocols.",
      followUpUser: "What about transportation safety?",
      followUpAI: "Recommended: Use registered taxi apps, avoid public transport at night. I've compiled a comprehensive safety guide for São Paulo."
    }
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentChatIndex((prev) => (prev + 1) % chatConversations.length);
    }, 5000); // Change every 5 seconds

    return () => clearInterval(interval);
  }, [chatConversations.length]);

  const webFeatures = [
    {
      title: "Interactive globe access",
      description: "Facilitating clear and rapid visualization of essential data."
    },
    {
      title: "Dynamic panel with immediate information",
      description: "When selecting a country, information about economy, politics, society and culture is displayed."
    },
    {
      title: "Premium option with AI integration",
      description: "Would be the paid version:",
      subFeatures: [
        "Intelligent chatbot that answers specific questions.",
        "Automatic generation of personalized summaries."
      ]
    }
  ];

  const webModules = [
    {
      name: "Mobility AI Web",
      description: "Essential information about international mobility, migration routes, visa requirements, and global opportunities."
    },
    {
      name: "WorldLore Investment AI Web",
      description: "Visual dashboard for global investments, simplified recommendations, basic trend prediction."
    }
  ];

  const userManagement = [
    "Each user will have their own personal account.",
    "Each user's progress will be saved, facilitating continuity between sessions."
  ];

  return (
    <div className="w-full min-h-screen relative overflow-hidden bg-black">
      {/* Background removed: keep a solid black background */}
      
      <div className="relative z-10 py-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header */}
        <div className="text-center mb-16">
          <motion.h1
            className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight"
            style={{ 
              textShadow: '0 0 20px rgba(0, 170, 255, 0.5), 0 0 40px rgba(0, 170, 255, 0.3)',
              willChange: 'transform, opacity'
            }}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ 
              duration: 0.8, 
              ease: "easeOut",
              delay: 0.2,
              scale: { type: "spring", stiffness: 300, damping: 30 }
            }}
          >
            One Platform. Two Experiences.
          </motion.h1>
          
          <motion.h2
            className="text-xl md:text-2xl text-white/80 font-light mb-6"
            style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Discover how <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400 font-semibold">WorldLore</span> adapts to your needs, offering a complete experience both on the web and mobile devices.
          </motion.h2>
          
          <motion.p
            className="text-lg md:text-xl text-white/90 leading-relaxed font-light mb-8 max-w-4xl mx-auto"
            style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            Each platform is designed to maximize your productivity and access to global information, providing seamless integration across all your devices while maintaining the full power of our AI-driven insights and recommendations.
          </motion.p>
        </div>

        {/* Slide Navigation */}
        <div className="flex justify-center mb-12">
          <div className="flex bg-slate-800/30 rounded-full p-1 backdrop-blur-sm border border-white/10">
            <button
              onClick={() => setActiveSlide(0)}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeSlide === 0 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/50'
              }`}
            >
              Web Platform
            </button>
            <button
              onClick={() => setActiveSlide(1)}
              className={`px-8 py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                activeSlide === 1 
                  ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg transform scale-105' 
                  : 'text-gray-400 hover:text-white bg-gray-700/50 hover:bg-gray-600/50'
              }`}
            >
              Mobile App
            </button>
          </div>
        </div>

        {/* Web Platform Slide */}
        {activeSlide === 0 && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Content */}
            <div className="space-y-8">
              <div>
                <h3 className="text-4xl md:text-5xl font-light text-white mb-8 leading-tight">How the Web Platform Works</h3>
                
                {/* Feature Categories Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* AI Intelligence Category */}
                  <motion.div
                    className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <h4 className="text-xl font-semibold text-white">Mobility AI Agent</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • AI assistant for migration planning and dynamic checklists
                      </p>
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Predicts best routes and provides real-time legal/document alerts
                      </p>
                    </div>
                  </motion.div>

                  {/* Data & Analytics Category */}
                  <motion.div
                    className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18" />
                          <path d="M12 3a15 15 0 0 1 0 18" />
                          <path d="M12 3a15 15 0 0 0 0 18" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-semibold text-white">Data & Country Insights</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Interactive globe with instant access to economy, politics, and culture data
                      </p>
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Country summaries, safety alerts, and offline quick guides
                      </p>
                    </div>
                  </motion.div>

                  {/* Navigation & Safety Category */}
                  <motion.div
                    className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                        </svg>
                      </div>
                      <h4 className="text-xl font-semibold text-white">Geopolitical Risk Mapping</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Live conflict alerts with geolocated maps
                      </p>
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • AI-driven risk assessment and event tracking
                      </p>
                    </div>
                  </motion.div>

                  {/* World Model AI Category (replaced from Investment Intelligence) */}
                  <motion.div
                    className="bg-gradient-to-br from-gray-900/50 to-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-white/10"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-purple-500 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M3 12h18" />
                          <path d="M12 3a15 15 0 0 1 0 18" />
                          <path d="M12 3a15 15 0 0 0 0 18" />
                        </svg>
                      </div>
                      <h4 className="text-xl font-semibold text-white">World Model AI</h4>
                    </div>
                    <div className="space-y-3">
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Live global reasoning: connections, risks, and emerging signals
                      </p>
                      <p className="text-[15px] text-white/90 leading-snug font-medium">
                        • Simulates cause–effect chains to forecast outcomes
                      </p>
                    </div>
                  </motion.div>

                </div>
              </div>
            </div>

            {/* MacBook Mockup */}
            <div className="relative flex justify-center">
              <motion.div
                className="relative"
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                {/* MacBook Pro Frame */}
                <div className="relative w-[500px] h-[320px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-t-2xl shadow-2xl">
                  {/* Screen Bezel */}
                  <div className="absolute inset-2 bg-black rounded-xl overflow-hidden border border-gray-600">
                    {/* Menu Bar */}
                    <div className="h-6 bg-gray-800 flex items-center px-3 justify-between">
                      <div className="flex gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      </div>
                      <div className="text-white text-xs font-medium">WorldLore Web Platform</div>
                      <div className="w-16"></div>
                    </div>
                    
                    {/* Browser Content */}
                    <div className="h-full bg-gradient-to-br from-slate-900 via-gray-900 to-purple-900 relative overflow-hidden">
                      {/* Header */}
                      <div className="p-4 border-b border-white/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <motion.div
                              className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-lg flex items-center justify-center"
                              animate={{ rotate: [0, 5, -5, 0] }}
                              transition={{ duration: 3, repeat: Infinity }}
                            >
                              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                            </motion.div>
                            <div>
                              <h4 className="text-white text-sm font-semibold">WorldLore</h4>
                              <p className="text-white/60 text-xs">Global Intelligence Platform</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <motion.div
                              className="w-2 h-2 bg-green-400 rounded-full"
                              animate={{ opacity: [1, 0.3, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                            />
                            <span className="text-green-400 text-xs">Live</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Main Dashboard */}
                      <div className="p-4 grid grid-cols-3 gap-3 h-full">
                        {/* Left Column - Interactive Globe */}
                        <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-lg p-3 border border-cyan-400/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-cyan-400 rounded-full"></div>
                            <span className="text-white text-xs font-medium">Interactive Globe</span>
                          </div>
                          <div className="h-16 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded border border-cyan-400/20 relative overflow-hidden">
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent"
                              animate={{ x: [-20, 80] }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            />
                          </div>
                        </div>
                        
                        {/* Middle Column - Dynamic Panel */}
                        <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-lg p-3 border border-purple-400/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-purple-400 rounded-full"></div>
                            <span className="text-white text-xs font-medium">Dynamic Panel</span>
                          </div>
                          <div className="space-y-1">
                            <div className="h-1.5 bg-purple-400/40 rounded w-full"></div>
                            <div className="h-1.5 bg-purple-400/40 rounded w-3/4"></div>
                            <div className="h-1.5 bg-purple-400/40 rounded w-1/2"></div>
                            <div className="h-1.5 bg-purple-400/40 rounded w-5/6"></div>
                          </div>
                        </div>
                        
                        {/* Right Column - AI Premium */}
                        <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg p-3 border border-green-400/30">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-green-400 rounded-full"></div>
                            <span className="text-white text-xs font-medium">AI Premium</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-1">
                              <motion.div
                                className="w-1.5 h-1.5 bg-green-400 rounded-full"
                                animate={{ opacity: [1, 0.3, 1] }}
                                transition={{ duration: 1, repeat: Infinity }}
                              />
                              <span className="text-green-400 text-xs">AI Active</span>
                            </div>
                            <div className="bg-green-400/20 rounded p-1">
                              <div className="text-green-300 text-xs">Chat Available</div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Bottom Status Bar */}
                      <div className="absolute bottom-0 left-0 right-0 h-6 bg-gray-800/80 border-t border-white/10 flex items-center px-4 justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                          <span className="text-cyan-400 text-xs">Real-time Data</span>
                        </div>
                        <div className="text-white/60 text-xs">Connected to 195 countries</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Camera Notch */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-4 h-2 bg-gray-900 rounded-b-lg border-b border-gray-700"></div>
                </div>
                
                {/* MacBook Base */}
                <div className="relative w-[540px] h-4 bg-gradient-to-b from-gray-600 to-gray-800 rounded-b-2xl -mt-1 shadow-xl">
                  {/* Keyboard hint */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gray-700 rounded-full"></div>
                </div>
                
                {/* Reflection */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-t-2xl pointer-events-none"></div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Mobile App Slide */}
        {activeSlide === 1 && (
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="grid lg:grid-cols-2 gap-12 items-center"
          >
            {/* Devices Mockup */}
            <div className="relative flex justify-center lg:justify-start gap-8 items-center">
              {/* iPhone */}
              <motion.div
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
              >
                {/* Phone Frame with realistic design */}
                <div className="relative w-64 h-[520px] bg-gradient-to-b from-gray-800 via-gray-900 to-black rounded-[3rem] p-2 shadow-2xl">
                  {/* Side buttons */}
                  {/* Volume buttons (left side) */}
                  <div className="absolute -left-1 top-20 w-1 h-8 bg-gray-700 rounded-r-sm shadow-inner"></div>
                  <div className="absolute -left-1 top-32 w-1 h-8 bg-gray-700 rounded-r-sm shadow-inner"></div>
                  
                  {/* Power button (right side) */}
                  <div className="absolute -right-1 top-24 w-1 h-12 bg-gray-700 rounded-l-sm shadow-inner"></div>
                  
                  {/* Mute switch (left side, top) */}
                  <div className="absolute -left-1 top-12 w-1 h-4 bg-gray-600 rounded-r-sm"></div>
                  
                  {/* Camera bump */}
                  <div className="absolute top-4 left-4 w-16 h-16 bg-gray-800 rounded-2xl shadow-lg border border-gray-700">
                    <div className="absolute top-2 left-2 w-12 h-12 bg-gray-900 rounded-xl">
                      <div className="absolute top-2 left-2 w-8 h-8 bg-black rounded-lg border border-gray-600"></div>
                    </div>
                  </div>
                  
                  {/* Screen */}
                  <div className="w-full h-full bg-black rounded-[2.5rem] overflow-hidden relative border-2 border-gray-700 shadow-inner">
                    {/* Dynamic Island */}
                    <div className="absolute top-2 left-1/2 transform -translate-x-1/2 w-24 h-6 bg-black rounded-full border border-gray-800"></div>
                    {/* Status Bar */}
                    <div className="flex justify-between items-center px-5 py-2 text-white text-xs">
                      <span>9:41</span>
                      <div className="flex gap-1">
                        <div className="w-3 h-1.5 bg-white rounded-sm"></div>
                      </div>
                    </div>
                    
                    {/* App Content - Coming Soon Placeholder */}
                    <div className="px-5 py-3 h-full flex flex-col">
                      {/* Contenido minimal */}
                      <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        
                        {/* Placeholder simple */}
                        <div className="relative z-10 text-center px-4">
                          <span className="text-white/70 text-xs tracking-wider">Loading…</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* iPad */}
              <motion.div
                className="relative"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                {/* iPad Frame with realistic design */}
                <div className="relative w-80 h-[520px] bg-gradient-to-b from-gray-700 via-gray-800 to-gray-900 rounded-[2rem] p-2 shadow-2xl">
                  {/* Side buttons */}
                  {/* Volume buttons (top right) */}
                  <div className="absolute -top-1 right-20 h-1 w-8 bg-gray-600 rounded-b-sm shadow-inner"></div>
                  <div className="absolute -top-1 right-32 h-1 w-8 bg-gray-600 rounded-b-sm shadow-inner"></div>
                  
                  {/* Power button (top right corner) */}
                  <div className="absolute -top-1 right-8 h-1 w-12 bg-gray-600 rounded-b-sm shadow-inner"></div>
                  
                  {/* Home indicator area */}
                  <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 w-32 h-1 bg-gray-700 rounded-full"></div>
                  
                  {/* Camera (top center) */}
                  <div className="absolute top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-black rounded-full border border-gray-600"></div>
                  
                  {/* Screen */}
                  <div className="w-full h-full bg-black rounded-[1.5rem] overflow-hidden relative border-2 border-gray-600 shadow-inner">
                    {/* Status Bar */}
                    {/* App Content - Coming Soon Placeholder */}
                    <div className="px-8 py-6 h-full flex flex-col">
                      {/* Status Bar */}
                      <div className="flex justify-between items-center px-2 py-3 text-white text-sm">
                        <span>9:41</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-2 bg-white rounded-sm"></div>
                        </div>
                      </div>
                      
                      {/* Contenido minimal */}
                      <div className="flex-1 bg-black rounded-lg overflow-hidden flex items-center justify-center">
                        
                        {/* Placeholder simple */}
                        <div className="relative z-10 text-center px-8">
                          <span className="text-white/70 text-sm tracking-wider">Loading…</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* Content */}
            <div className="space-y-8">
              <div>
                <motion.h3 
                  className="text-4xl md:text-5xl font-light text-white mb-4 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <span className="text-cyan-400 font-normal">WorldLore</span> mobile experience
                </motion.h3>
                
                <motion.p 
                  className="text-lg md:text-xl text-white/80 mb-8 leading-relaxed"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Your AI-powered global mobility assistant. Access country insights, real-time alerts, and intelligent planning from your mobile device.
                </motion.p>

                {/* Official App Store Buttons */}
                <motion.div 
                  className="flex flex-col sm:flex-row gap-3 sm:gap-0.5 justify-center items-center mb-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <motion.a
                    href="https://apps.apple.com/app/worldlore/id123456789"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <img 
                      src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" 
                      alt="Download on the App Store" 
                      className="h-12 w-40"
                    />
                  </motion.a>

                  <motion.a
                      href="https://play.google.com/store/apps/details?id=com.worldlore.app"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <img 
                        src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" 
                        alt="Get it on Google Play" 
                        className="h-[66px] w-auto"
                      />
                    </motion.a>
                </motion.div>

                {/* Features Description */}
                <motion.div 
                  className="space-y-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                >
                  <p className="text-lg md:text-xl text-white/90 leading-relaxed mb-6">
                    Experience intelligent conversations with your AI mobility assistant:
                  </p>
                  
                  {/* AI Chat Messages Mockup (auto-rotating) */}
                  <div className="bg-gray-800/50 rounded-xl p-6 space-y-3 max-w-lg h-[350px] overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`user-1-${currentChatIndex}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm ml-8 shadow-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35 }}
                      >
                        {chatConversations[currentChatIndex].userMessage}
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`ai-1-${currentChatIndex}`}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm mr-8 shadow-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: 0.08 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-cyan-300 rounded-full"></div>
                          <span className="text-xs text-cyan-200">WorldLore AI</span>
                        </div>
                        {chatConversations[currentChatIndex].aiResponse}
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`user-2-${currentChatIndex}`}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm ml-8 shadow-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: 0.15 }}
                      >
                        {chatConversations[currentChatIndex].followUpUser}
                      </motion.div>
                    </AnimatePresence>

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`ai-2-${currentChatIndex}`}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-4 py-2 rounded-lg text-sm mr-8 shadow-md"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.35, delay: 0.22 }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-2 h-2 bg-cyan-300 rounded-full"></div>
                          <span className="text-xs text-cyan-200">WorldLore AI</span>
                        </div>
                        {chatConversations[currentChatIndex].followUpAI}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* App Features */}
                <motion.div 
                  className="mt-6"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {/* Feature 1 - AI Assistant */}
                    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-all duration-300 hover:bg-white/8">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-cyan-400/20 to-blue-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-cyan-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                      </div>
                      <p className="text-white font-medium text-sm leading-snug">Intelligent personal assistant with personalized recommendations</p>
                    </div>

                    {/* Feature 2 - Checklists */}
                    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-purple-400/30 transition-all duration-300 hover:bg-white/8">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-purple-400/20 to-pink-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
                        </svg>
                      </div>
                      <p className="text-white font-medium text-sm leading-snug">Dynamic checklists and alerts for procedures and documentation</p>
                    </div>

                    {/* Feature 3 - Mobile Access */}
                    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-emerald-400/30 transition-all duration-300 hover:bg-white/8">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-emerald-400/20 to-green-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 20c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5-4H7V6h10v12z"/>
                        </svg>
                      </div>
                      <p className="text-white font-medium text-sm leading-snug">Simplified mobile access to essential country information</p>
                    </div>

                    {/* Feature 4 - Risk Assessment */}
                    <div className="group flex items-center gap-3 px-4 py-3 rounded-lg bg-white/5 border border-white/10 hover:border-orange-400/30 transition-all duration-300 hover:bg-white/8">
                      <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-400/20 to-red-500/20 flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/>
                        </svg>
                      </div>
                      <p className="text-white font-medium text-sm leading-snug">Conflict alerts and simplified maps for global risk assessment</p>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </div>
      </div>
    </div>
  );
};

export default PlatformExperiencesSection;
