import { lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Navbar from './Navbar'

// Lazy load heavy components
const Footer = lazy(() => import('./Footer'));

function MobilityAI() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToHowItWorks = () => {
    const element = document.getElementById('how-it-works');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

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
              The Future of Global Mobility
            </motion.h1>
            
            {/* Subheading */}
            <motion.p 
              className="text-base md:text-lg lg:text-xl text-gray-300 leading-snug max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              An AI-powered assistant that simplifies relocation, visa requirements, and international planning with clarity.
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
                aria-label="Get early access to Mobility AI"
              >
                Get Early Access
              </motion.button>
              
              {/* Removed secondary button as requested */}
            </motion.div>
          </motion.div>
        </div>
      </section>
      
      {/* Narrative Section */}
      <section aria-labelledby="mobility-story" className="relative overflow-hidden py-16 md:py-24 lg:py-28">
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
              <h2 id="mobility-story" className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-6">
                Redefining Global Mobility with AI
              </h2>
              <p className="text-gray-300 md:text-lg lg:text-xl leading-snug mb-8 max-w-3xl">
                Whether you’re relocating for work, study, or exploration, Mobility AI adapts to your journey. It anticipates needs, predicts migration routes, and provides tailored guidance so you can focus on opportunities instead of bureaucracy.
              </p>

              {/* Key features */}
              <ul className="grid sm:grid-cols-2 gap-5 max-w-2xl">
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xl">🌍</span>
                  <div>
                    <p className="text-white font-medium">Predicts optimal migration routes</p>
                    <p className="text-white/70 text-sm">Smarter pathways based on policy, logistics, and timing.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-500/20 text-xl">📄</span>
                  <div>
                    <p className="text-white font-medium">Real-time visa & document alerts</p>
                    <p className="text-white/70 text-sm">Stay ahead of deadlines and changing requirements.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cyan-500/20 text-xl">⚡</span>
                  <div>
                    <p className="text-white font-medium">Adaptive guidance</p>
                    <p className="text-white/70 text-sm">Recommendations that learn from your profile and goals.</p>
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
      <section id="highlights" aria-labelledby="mobility-highlights" className="relative px-6 py-20 md:py-24 lg:py-28">
        {/* Subtle lighter overlay behind cards */}
        <div className="pointer-events-none absolute inset-0">
          <div className="max-w-7xl mx-auto h-full bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-[0.06] rounded-3xl" />
        </div>
        <div className="relative max-w-7xl mx-auto">
          {/* Optional accessible heading (visually hidden) */}
          <h2 id="mobility-highlights" className="sr-only">Mobility AI Highlights</h2>

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
                  <span className="text-2xl" aria-hidden>🌍</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Smart Migration Paths</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  AI predicts the best relocation routes based on real-time political, social, and economic conditions.
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
                  <span className="text-2xl" aria-hidden>📄</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Visa & Document Alerts</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  Stay ahead with instant notifications on visa requirements, legal updates, and critical deadlines.
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
              <div className="group h-full p-6 md:p-7 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all duration-300 hover:shadow-[0_0_40px_rgba(6,182,212,0.25)] hover:border-cyan-400/30 hover:-translate-y-0.5 hover:scale-[1.02] flex flex-col">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-blue-600/20 ring-1 ring-white/10">
                  <span className="text-2xl" aria-hidden>⚡</span>
                </div>
                <h3 className="text-white text-xl md:text-2xl font-light tracking-tight leading-snug mb-2">Adaptive Guides</h3>
                <p className="text-gray-300 text-sm md:text-base leading-snug">
                  Receive personalized checklists and country-specific guides to ensure a smooth transition.
                </p>
                <div aria-hidden className="mt-6 h-px w-full bg-gradient-to-r from-violet-400/20 via-blue-400/20 to-transparent" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Immersive Showcase Section */}
      <section id="immersive-showcase" aria-labelledby="mobility-showcase" className="relative px-6 py-20 md:py-24 lg:py-28">
        <div className="relative max-w-7xl mx-auto space-y-16">
          <h2 id="mobility-showcase" className="sr-only">Mobility AI Showcase</h2>

          {/* Block 1: Image Left, Text Right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Image / Illustration */}
            <motion.div
              className="lg:col-span-7 order-1"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="relative h-[320px] sm:h-[380px] lg:h-[440px] w-full rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_-20px_rgba(0,0,0,0.6)]">
                {/* Badge: Coming Soon */}
                <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 ring-1 ring-white/20 backdrop-blur-sm" aria-label="Content in development">
                  <span aria-hidden>🛠️</span> Coming Soon
                </span>
                {/* Glow backdrop */}
                <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(1200px 400px at -10% 0%, rgba(139,92,246,0.25), transparent), radial-gradient(1000px 400px at 110% 100%, rgba(59,130,246,0.25), transparent)' }} />
                {/* Simplified content area */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/40 text-sm">Interactive globe visualization</div>
                </div>
              </div>
            </motion.div>

            {/* Text */}
            <motion.div
              className="lg:col-span-5 order-2"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <h3 className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-4">Global Relocation, Simplified</h3>
              <p className="text-gray-300 md:text-lg leading-snug max-w-xl mb-4">Visualize migration paths across the world in real time, with AI guidance adapted to your profile.</p>
              <ul className="space-y-2 text-gray-300/90 text-sm md:text-base">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-violet-400"></span><span>Real-time route visualization</span></li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span><span>Profile-adapted recommendations</span></li>
              </ul>
            </motion.div>
          </div>

          {/* Block 2: Text Left, Image Right (alternate) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Text */}
            <motion.div
              className="lg:col-span-5 order-2 lg:order-1"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <h3 className="text-white text-3xl md:text-4xl lg:text-5xl font-light tracking-tight leading-[1.1] mb-4">Documents Always in Check</h3>
              <p className="text-gray-300 md:text-lg leading-snug max-w-xl mb-4">Get proactive alerts for visas, permits, and critical dates — all in one place.</p>
              <ul className="space-y-2 text-gray-300/90 text-sm md:text-base">
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span><span>Unified document tracker</span></li>
                <li className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-blue-400"></span><span>Proactive notifications</span></li>
              </ul>
            </motion.div>

            {/* Image / Illustration */}
            <motion.div
              className="lg:col-span-7 order-1 lg:order-2"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <div className="relative h-[320px] sm:h-[380px] lg:h-[440px] w-full rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-white/10 overflow-hidden shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_20px_60px_-20px_rgba(0,0,0,0.6)]">
                {/* Badge: Coming Soon */}
                <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/10 text-white/90 ring-1 ring-white/20 backdrop-blur-sm" aria-label="Content in development">
                  <span aria-hidden>🛠️</span> Coming Soon
                </span>
                {/* Glow backdrop */}
                <div className="absolute inset-0 opacity-60" style={{ background: 'radial-gradient(1200px 400px at -10% 0%, rgba(139,92,246,0.25), transparent), radial-gradient(1000px 400px at 110% 100%, rgba(59,130,246,0.25), transparent)' }} />
                {/* Simplified content area */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-white/40 text-sm">Document management interface</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      
      {/* Final CTA Section */}
      <section
        id="cta"
        aria-labelledby="mobility-cta"
        className="relative overflow-hidden px-6 py-24 md:py-32"
      >
        {/* Subtle lighter overlay behind content (consistent with other sections) */}
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
            id="mobility-cta"
            className="text-white text-4xl md:text-5xl lg:text-6xl font-light tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            viewport={{ once: true, amount: 0.4 }}
          >
            Your World. Your Move.
          </motion.h2>

          <motion.p
            className="mt-5 text-base md:text-lg lg:text-xl text-gray-300 leading-snug max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
            viewport={{ once: true, amount: 0.4 }}
          >
            Mobility AI makes relocation smarter, faster, and easier — anywhere in the world.
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
              aria-label="Start with Mobility AI"
            >
              Start with Mobility AI
            </motion.button>
          </motion.div>
        </div>

        {/* Soft ring frame for focus */}
        <div className="pointer-events-none absolute inset-0 ring-1 ring-white/10 rounded-none" />
      </section>
      
      {/* Footer */}
      <Suspense fallback={<div className="h-32 bg-gray-900 animate-pulse" />}>
        <Footer />
      </Suspense>
    </div>
  )
}

export default MobilityAI