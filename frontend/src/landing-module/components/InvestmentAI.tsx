import React, { lazy, Suspense, useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'

// Lazy load heavy components
const Footer = lazy(() => import('./Footer'));

function InvestmentAI() {
  const navigate = useNavigate();
  const [scrollY, setScrollY] = useState(0);
  // Start with just the AI welcome message
  const initialAiMessage = "Hi, I'm World Model AI. I analyze global systems, explain causal links, and simulate scenarios. Ask anything about countries, sectors, or risks.";
  const [messages, setMessages] = useState([
    { sender: 'ai', text: initialAiMessage }
  ]);
  // Predefined conversation flow
  const conversationFlow = [
    { sender: 'user', text: 'How do Red Sea tensions affect global shipping costs?' },
    { sender: 'ai', text: 'When ships avoid the Suez Canal and go around Africa, trips add about two weeks and roughly 30% more fuel. Freight becomes pricier and deliveries slip, mostly felt in imported goods. The pressure eases as routes normalize.' },
    { sender: 'user', text: 'Show a cause–effect chain for oil price drops.' },
    { sender: 'ai', text: 'Brent −$10 lowers diesel about 6% and transport costs around 5%. In the EU that trims headline inflation roughly 0.2pp next quarter, giving households a little more room to spend.' },
    { sender: 'user', text: 'Which countries gain leverage from robotics adoption?' },
    { sender: 'ai', text: 'China installs about half of new robots. Korea has roughly 1000 per 10k workers. Early adopters shorten lead times and gain export leverage; late adopters face higher unit costs and weaker bargaining power.' }
  ];
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [userTyping, setUserTyping] = useState(false);
  const [demoComplete, setDemoComplete] = useState(false);
  const [autoSendTimer, setAutoSendTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [typingTimer, setTypingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [loopTimer, setLoopTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // This function is now only used for the automated demo
  // It's kept for compatibility but not actively used for manual input
  const handleSendMessage = () => {
    // In the automated demo, messages are handled by the useEffect
    // This function is kept for compatibility with existing code
    return;
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);
  
  // Auto-conversation effect - manages the entire conversation flow automatically
  useEffect(() => {
    if (demoComplete) return;
    
    // Function to simulate user typing
    const simulateUserTyping = (messageIndex: number) => {
      const message = conversationFlow[messageIndex];
      if (message.sender !== 'user') return;
      
      // Set user is typing state
      setUserTyping(true);
      
      // Gradually fill in the input message to simulate typing
      let typedChars = 0;
      const fullMessage = message.text;
      const typingSpeed = 50; // ms per character
      
      const typeChar = () => {
        if (typedChars <= fullMessage.length) {
          setInputMessage(fullMessage.substring(0, typedChars));
          typedChars++;
          
          const nextCharTimer = setTimeout(typeChar, typingSpeed);
          setTypingTimer(nextCharTimer);
        } else {
          // Typing complete, send the message after a short pause
          const sendTimer = setTimeout(() => {
            setUserTyping(false);
            // Add user message - only add if it's not already the last message to avoid duplication
            setMessages(prevMessages => {
              const lastMessage = prevMessages[prevMessages.length - 1];
              if (lastMessage && lastMessage.sender === 'user' && lastMessage.text === fullMessage) {
                return prevMessages; // Don't add duplicate message
              }
              return [...prevMessages, { sender: 'user', text: fullMessage }];
            });
            setInputMessage('');
            
            // Set AI typing after user message is sent
            setIsTyping(true);
            
            // Send AI response after a delay
            const aiResponseTimer = setTimeout(() => {
              const aiMessage = conversationFlow[messageIndex + 1];
              if (aiMessage && aiMessage.sender === 'ai') {
                setMessages(prevMessages => {
                  // Check if this AI message is already the last message to avoid duplication
                  const lastMessage = prevMessages[prevMessages.length - 1];
                  if (lastMessage && lastMessage.sender === 'ai' && lastMessage.text === aiMessage.text) {
                    return prevMessages; // Don't add duplicate message
                  }
                  return [...prevMessages, aiMessage];
                });
                setIsTyping(false);
                
                // Move to next user message after a pause
                if (messageIndex + 2 < conversationFlow.length) {
                  const nextMessageTimer = setTimeout(() => {
                    setCurrentMessageIndex(messageIndex + 2);
                  }, 3000);
                  setAutoSendTimer(nextMessageTimer);
                } else {
                  // Conversation complete
                  setDemoComplete(true);
                }
              }
            }, 3000); // AI takes 3 seconds to respond
            
            setAutoSendTimer(aiResponseTimer);
          }, 1000); // Pause before sending
          
          setAutoSendTimer(sendTimer);
        }
      };
      
      // Start typing
      typeChar();
    };
    
    // Start the conversation flow if we have a new user message to process
    if (currentMessageIndex < conversationFlow.length && conversationFlow[currentMessageIndex].sender === 'user') {
      const startTimer = setTimeout(() => {
        simulateUserTyping(currentMessageIndex);
      }, 2000); // Wait 2 seconds before starting the first user message
      
      setAutoSendTimer(startTimer);
    }
    
    // Cleanup function
    return () => {
      if (autoSendTimer) clearTimeout(autoSendTimer);
      if (typingTimer) clearTimeout(typingTimer);
    };
  }, [currentMessageIndex, demoComplete]);

  // When the automated conversation completes, restart it after a short pause
  useEffect(() => {
    if (!demoComplete) return;
    const restartDelay = setTimeout(() => {
      // Reset conversation state and start from the beginning
      setMessages([{ sender: 'ai', text: initialAiMessage }]);
      setCurrentMessageIndex(0);
      setDemoComplete(false);
    }, 2000); // wait 2 seconds before looping again
    setLoopTimer(restartDelay);
    return () => {
      if (loopTimer) clearTimeout(loopTimer);
      clearTimeout(restartDelay);
    };
  }, [demoComplete]);


  return (
    <div className="w-full">

      
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section */}
      <section className="min-h-screen lg:h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
        <div className="max-w-5xl mx-auto w-full text-center">
          {/* Centered Content */}
          <motion.div 
            className="space-y-8"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            {/* Main Heading */}
            <motion.h1 
              className="text-white text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-light tracking-tight leading-[1.1]"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            >
              Understand the world. Anticipate change.
            </motion.h1>
            
            {/* Subheading */}
            <motion.p 
              className="text-base md:text-lg lg:text-xl text-gray-300 leading-snug max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              WorldLore World Model AI turns global data into understanding—linking causes and effects across nations, simulating scenarios, and delivering real-time insights you can act on.
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
            >
              <motion.button 
                className="bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-blue-500/25"
                whileHover={{ scale: 1.05, boxShadow: "0 20px 40px rgba(59, 130, 246, 0.3)" }}
                whileTap={{ scale: 0.95 }}
                aria-label="Get early access to World Model AI"
                onClick={() => navigate('/landing/investment-ai')}
              >
                Explore World Model AI
              </motion.button>
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Narrative Section */}
      <section aria-labelledby="investment-story" className="relative overflow-hidden py-16 md:py-24 lg:py-28">
        {/* Darker gradient overlay to distinguish from hero */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/80"></div>
        
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Story-driven text */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
              className="order-1"
            >
              <h2 id="investment-story" className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-6">
                World Model AI transforms global data into understanding
              </h2>
              <p className="text-gray-300 md:text-lg lg:text-xl leading-snug mb-8 max-w-3xl">
                It explains why events happen, reveals cause–effect connections between nations, and simulates how the world changes when key variables shift.
              </p>

              {/* Key features aligned with homepage */}
              <ul className="grid sm:grid-cols-2 gap-5 max-w-2xl">
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xl">🌐</span>
                  <div>
                    <p className="text-white font-medium">Global Reasoning Engine</p>
                    <p className="text-white/70 text-sm">Understands, reasons, and predicts how the world works.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xl">🔄</span>
                  <div>
                    <p className="text-white font-medium">Scenario Simulator</p>
                    <p className="text-white/70 text-sm">Simulates changes when key variables shift across systems.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xl">🤖</span>
                  <div>
                    <p className="text-white font-medium">Robots & Geopolitics</p>
                    <p className="text-white/70 text-sm">Explores automation, industry, and state power dynamics.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xl">📡</span>
                  <div>
                    <p className="text-white font-medium">Real-time World Insights</p>
                    <p className="text-white/70 text-sm">Live signals and updates across countries and systems.</p>
                  </div>
                </li>
              </ul>
            </motion.div>

            {/* Right: Visual/graphic placeholder */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, ease: 'easeOut', delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="order-2 lg:order-none"
            >
              <div className="relative mx-auto lg:ml-auto w-full max-w-xl">
                <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm overflow-hidden shadow-2xl">
                  {/* Placeholder visual (video-ready) */}
                  <div className="aspect-[16/10] sm:aspect-[4/3] md:aspect-[16/9] w-full grid place-items-center">
                    <div className="text-center p-6">
                      <div className="text-white/40 text-sm">Content will be displayed here</div>
                    </div>
                  </div>
                  {/* Subtle animated sheen */}
                  <div className="pointer-events-none absolute -inset-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite] [mask-image:linear-gradient(90deg,transparent,black,transparent)]" />
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Highlights Section */}
      <section id="highlights" aria-labelledby="investment-highlights" className="relative px-6 py-20 md:py-24 lg:py-28">
        {/* Subtle lighter overlay behind cards */}
        <div className="pointer-events-none absolute inset-0">
          <div className="max-w-7xl mx-auto h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-[0.06] rounded-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          {/* Optional accessible heading (visually hidden) */}
          <h2 id="investment-highlights" className="sr-only">World Model AI Highlights</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Card 1 */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="group h-full p-6 md:p-7 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(139,92,246,0.25)] hover:border-violet-400/30 hover:-translate-y-0.5 hover:scale-[1.02] flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 ring-1 ring-white/10">
                  <span className="text-2xl" aria-hidden>🌐</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Global Reasoning Engine</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  Understands, reasons, and predicts how the world works.
                </p>
                <div aria-hidden className="mt-6 h-px w-full bg-gradient-to-r from-violet-400/20 via-blue-400/20 to-transparent" />
              </div>
            </motion.div>

            {/* Card 2 */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="group h-full p-6 md:p-7 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(59,130,246,0.25)] hover:border-blue-400/30 hover:-translate-y-0.5 hover:scale-[1.02] flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 ring-1 ring-white/10">
                  <span className="text-2xl" aria-hidden>🔄</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Scenario Lab</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  Experiment with variable shifts and compare outcomes across regions.
                </p>
                <div aria-hidden className="mt-6 h-px w-full bg-gradient-to-r from-violet-400/20 via-blue-400/20 to-transparent" />
              </div>
            </motion.div>

            {/* Card 3 */}
            <motion.div
              className="h-full"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="group h-full p-6 md:p-7 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(14,165,233,0.25)] hover:border-sky-400/30 hover:-translate-y-0.5 hover:scale-[1.02] flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 ring-1 ring-white/10">
                  <span className="text-2xl" aria-hidden>📡</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Live World Signals</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  Live signals and system updates across countries and sectors.
                </p>
                <div aria-hidden className="mt-6 h-px w-full bg-gradient-to-r from-violet-400/20 via-blue-400/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Immersive Showcase Section */}
      <section aria-labelledby="investment-showcase" className="relative px-6 py-20 md:py-24 lg:py-28">
        <div className="relative max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <motion.h2 
              id="investment-showcase" 
              className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-6"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
            >
              Interactive World Model Experience
            </motion.h2>
            <motion.p 
              className="text-gray-300 md:text-lg max-w-3xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.05 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              Explore connections, risks, and scenarios with World Model AI. Real-time reasoning tailored to your questions.
            </motion.p>
          </div>
          
          {/* Interactive Chat and Data Panel */}
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left: AI Chat Interface */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative w-full"
            >
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-blue-900/30 to-purple-900/40 backdrop-blur-xl overflow-hidden shadow-[0_0_50px_rgba(59,130,246,0.3)]">
                <div className="bg-black/30 p-4 border-b border-white/10">
                  <h3 className="text-white font-medium">World Model Reasoner</h3>
                </div>
                
                <div ref={chatContainerRef} className="p-4 space-y-4 h-[400px] overflow-y-auto">
                  <AnimatePresence>
                    {messages.map((message, index) => (
                      <motion.div 
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`flex items-start mb-4 ${message.sender === 'user' ? 'justify-end' : ''}`}
                      >
                        {message.sender === 'ai' && (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                            <span className="text-white text-xs">AI</span>
                          </div>
                        )}
                        <motion.div 
                          className={message.sender === 'ai' 
                            ? "bg-blue-900/30 rounded-lg rounded-tl-none p-4 max-w-[85%] border border-blue-500/20"
                            : "bg-white/10 rounded-lg rounded-tr-none p-4 max-w-[85%]"}
                          initial={{ opacity: 0, x: message.sender === 'ai' ? -10 : 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <p className="text-white text-sm">{message.text}</p>
                          {message.sender === 'ai' && <div className="mt-1 text-blue-300 text-xs">World Model AI • Just now</div>}
                        </motion.div>
                      </motion.div>
                    ))}
                    
                    {/* AI typing indicator */}
                    {isTyping && (
                      <motion.div 
                        className="flex items-start mb-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.5)]">
                          <span className="text-white text-xs">AI</span>
                        </div>
                        <motion.div 
                          className="bg-blue-900/30 rounded-lg rounded-tl-none p-4 max-w-[85%] border border-blue-500/20"
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="flex space-x-1">
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-blue-400"
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-blue-400"
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
                            />
                            <motion.div 
                              className="w-2 h-2 rounded-full bg-blue-400"
                              animate={{ scale: [0.5, 1, 0.5] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
                            />
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Chat Input */}
                  <div className="p-4 border-t border-white/10">
                    {userTyping && (
                      <div className="text-xs text-blue-400 mb-1 animate-pulse">
                        User is typing...
                      </div>
                    )}
                    <motion.div 
                      className="relative"
                      whileHover={{ scale: 1.01 }}
                      transition={{ duration: 0.2 }}
                    >
                      <input 
                        type="text" 
                        placeholder={demoComplete ? "Demo completed - Chat is now in view-only mode" : "Ask about global connections, risks, or outcomes..."} 
                        className={`w-full bg-black/30 text-white rounded-full py-3 px-5 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-white/10 transition-all duration-300 opacity-50 cursor-not-allowed`}
                        value={inputMessage}
                        onChange={(e) => {}} // Disabled as this is an automatic demo
                        disabled={true} // Always disabled as this is an automatic demo
                      />
                      <motion.button 
                        className={`absolute right-2 top-[15%] transform -translate-y-1/2 w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-[0_4px_12px_rgba(123,31,162,0.5)] ${demoComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                        initial={{ scale: 1 }}
                        animate={{ 
                          scale: [1, 1.05, 1],
                          transition: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                        }}
                        disabled={true} // Always disabled as this is an automatic demo
                      >
                        <div className="absolute inset-0.5 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </div>
                      </motion.button>
                    </motion.div>
                    {/* Eliminamos el mensaje duplicado, ya que aparece en el placeholder del input */}
                  </div>
              </div>
            </motion.div>
            
            {/* Right: Country Comparison */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="relative"
            >
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 backdrop-blur-sm overflow-hidden shadow-2xl p-6">
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-4">World Model Signals</h3>
                
                {/* Asset cards grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Supply Chains Card */}
                  <motion.div 
                    className="bg-gradient-to-br from-blue-900/30 to-blue-950/30 rounded-lg p-4 border border-white/5 hover:border-blue-500/50 transition-all duration-300"
                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.3)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-blue-300 text-sm font-medium">Shipping & Delays</h4>
                      <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                      <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Asia to Europe delay</span>
                        <span className="text-red-400 text-xs">+6 days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Ships rerouted via Cape</span>
                        <span className="text-red-400 text-xs">30%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Rotterdam port throughput</span>
                        <span className="text-green-400 text-xs">+2.8%</span>
                      </div>
                      <p className="text-white/70 text-[11px] mt-2">Why it matters: delays and reroutes raise costs and delivery times.</p>
                      <p className="text-white/50 text-[10px] mt-2">Days and percent vs typical baseline.</p>
                      </div>
                  </motion.div>
                  
                  {/* Energy Systems Card - Hover animation consistent with others */}
                   <motion.div 
                     className="bg-gradient-to-br from-violet-900/30 to-violet-950/30 rounded-lg p-4 border border-white/5 hover:border-violet-500/50 transition-all duration-300"
                     whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(139, 92, 246, 0.35)' }}
                   >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-violet-300 text-sm font-medium">Power & Fuel</h4>
                      <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                      </div>
                    </div>
                      <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Texas grid stress</span>
                        <span className="text-white/90 text-xs">0.7 (elevated)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Germany renewables share</span>
                        <span className="text-green-400 text-xs">38%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Gulf refinery utilization</span>
                        <span className="text-red-400 text-xs">81%</span>
                      </div>
                      <p className="text-white/70 text-[11px] mt-2">Why it matters: grid stress and fuel capacity affect prices and reliability.</p>
                      <p className="text-white/50 text-[10px] mt-2">Indices normalized 0–1; higher means more stress.</p>
                      </div>
                  </motion.div>
                  
                  {/* Geopolitical Risk Card */}
                  <motion.div 
                    className="bg-gradient-to-br from-cyan-900/30 to-cyan-950/30 rounded-lg p-4 border border-white/5 hover:border-cyan-500/50 transition-all duration-300"
                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(6, 182, 212, 0.3)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-cyan-300 text-sm font-medium">Conflict & Politics</h4>
                      <div className="w-6 h-6 rounded-full bg-cyan-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                      <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Red Sea incident rate</span>
                        <span className="text-red-400 text-xs">+0.3 (higher)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Ukraine truce signals</span>
                        <span className="text-green-400 text-xs">+0.1 (positive)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">LATAM election volatility</span>
                        <span className="text-red-400 text-xs">+1.5 (high)</span>
                      </div>
                      <p className="text-white/70 text-[11px] mt-2">Why it matters: higher risk can disrupt trade and investment plans.</p>
                      <p className="text-white/50 text-[10px] mt-2">Risk scores vs last month; positive = more activity.</p>
                      </div>
                  </motion.div>
                  
                  {/* Climate Signals Card */}
                  <motion.div 
                    className="bg-gradient-to-br from-green-900/30 to-green-950/30 rounded-lg p-4 border border-white/5 hover:border-green-500/50 transition-all duration-300"
                    whileHover={{ y: -5, boxShadow: '0 10px 25px -5px rgba(34, 197, 94, 0.3)' }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="text-green-300 text-sm font-medium">Weather & Clean Energy</h4>
                      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                    </div>
                      <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">SE Brazil heat alerts</span>
                        <span className="text-red-400 text-xs">+0.6 (more alerts)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">North Italy rain anomaly</span>
                        <span className="text-green-400 text-xs">+0.3 (wetter)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-white/70 text-xs">Iberia solar momentum</span>
                        <span className="text-green-400 text-xs">+2.1 (strong)</span>
                      </div>
                      <p className="text-white/70 text-[11px] mt-2">Why it matters: extreme weather shifts demand and production; clean energy builds resilience.</p>
                      <p className="text-white/50 text-[10px] mt-2">Anomaly and momentum vs seasonal norms.</p>
                      </div>
                  </motion.div>
                </div>
                
                {/* AI Insight */}
                <div className="mt-6 bg-gradient-to-r from-blue-900/30 to-violet-900/30 rounded-xl p-4 border border-blue-500/20">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-1">🤖</span>
                    <div>
                      <h4 className="text-white font-medium mb-1">World Model Insight</h4>
                      <p className="text-white/80 text-sm">
                        Asia–Europe shipping shows average delays of about 6 days due to Suez reroutes. EU gas storage near 85% cushions demand spikes, and heat alerts cluster in southeast Brazil. Expect slightly slower deliveries and localized price spreads while systems rebalance.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Subtle animated sheen */}
                <div className="pointer-events-none absolute -inset-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3s_infinite] [mask-image:linear-gradient(90deg,transparent,black,transparent)]" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>
      
      {/* Final CTA Section */}
      <section
        id="cta"
        aria-labelledby="investment-cta"
        className="relative overflow-hidden px-6 py-24 md:py-32"
      >
        {/* Subtle lighter overlay behind content */}
        <div className="pointer-events-none absolute inset-0">
          <div className="max-w-7xl mx-auto h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-[0.06] rounded-3xl" />
        </div>

        {/* Subtle particles (slow float) */}
        <div className="pointer-events-none absolute inset-0">
          <motion.span
            className="absolute top-10 left-1/4 w-40 h-40 rounded-full bg-gradient-to-br from-blue-400/15 to-violet-400/15 blur-3xl"
            initial={{ opacity: 0.25, y: 0, x: 0 }}
            animate={{ opacity: 0.35, y: [0, 12, 0], x: [0, -8, 0] }}
            transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.span
            className="absolute bottom-10 right-1/5 w-56 h-56 rounded-full bg-gradient-to-tr from-violet-400/10 to-blue-400/10 blur-3xl"
            initial={{ opacity: 0.2, y: 0, x: 0 }}
            animate={{ opacity: 0.3, y: [0, -14, 0], x: [0, 10, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
          <motion.span
            className="absolute top-1/2 left-6 w-28 h-28 rounded-full bg-gradient-to-tr from-blue-400/10 to-cyan-400/10 blur-2xl"
            initial={{ opacity: 0.15, y: 0, x: 0 }}
            animate={{ opacity: 0.25, y: [0, 10, 0], x: [0, 6, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            aria-hidden
          />
        </div>

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.h2
            id="investment-cta"
            className="text-white text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.4 }}
          >
            Understand the World. Make Better Decisions.
          </motion.h2>

          <motion.p
            className="mt-5 text-base md:text-lg lg:text-xl text-gray-300 leading-snug max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            World Model AI clarifies global systems, anticipates outcomes, and helps you reason about complex decisions.
          </motion.p>

          <motion.div
            className="mt-10"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            <motion.button
              className="inline-flex items-center justify-center rounded-full px-8 py-4 text-base md:text-lg font-semibold text-white bg-gradient-to-r from-violet-600 to-blue-600 shadow-[0_0_30px_rgba(59,130,246,0.35)] hover:shadow-[0_0_45px_rgba(59,130,246,0.55)] transition-all duration-300"
              whileHover={{ scale: 1.05, boxShadow: '0 0 45px rgba(59,130,246,0.55)' }}
              whileTap={{ scale: 0.96 }}
              aria-label="Explore World Model AI"
              onClick={() => navigate('/landing/investment-ai')}
            >
              Explore World Model AI
            </motion.button>
          </motion.div>
        </div>

        {/* Soft ring frame for focus */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 rounded-none" />
      </section>
      
      {/* Footer */}
      <Suspense fallback={<div className="h-40 w-full bg-black/20 animate-pulse rounded-lg"></div>}>
        <Footer />
      </Suspense>
    </div>
  )
}

export default InvestmentAI
