import { memo, useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import TechGlobe from './TechGlobe';
import CauseEffectChains from './CauseEffectChains';
import ScenarioSimulator from './ScenarioSimulator';
import RobotsGeopolitics from './RobotsGeopolitics';



// Feature Badge Component
const FeatureBadge = memo(({ icon, text, delay }: { icon: string; text: string; delay: number }) => (
  <motion.div
    className="flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 hover:bg-white/10 transition-all duration-300"
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.6, delay, ease: "easeOut" }}
    whileHover={{ scale: 1.05, y: -2 }}
  >
    <span className="text-2xl">{icon}</span>
    <span className="text-white/90 font-medium text-sm md:text-base">{text}</span>
  </motion.div>
));

FeatureBadge.displayName = 'FeatureBadge';

// Slide 1 — Live Reasoning Engine (cinematic entry)
const ChartPlaceholder = memo(() => {
  const [insightIndex, setInsightIndex] = useState(0);
  const insights = [
    'Oil prices fell 6% this week, reducing inflation pressure in Europe.',
    'Red Sea tensions are increasing delays and costs in global shipping.'
  ];
  useEffect(() => {
    const id = setInterval(() => setInsightIndex((i) => (i + 1) % insights.length), 4800);
    return () => clearInterval(id);
  }, []);

  const hotspots = [
    { left: '28%', top: '32%', color: 'bg-cyan-400' },
    { left: '62%', top: '48%', color: 'bg-purple-400' },
    { left: '46%', top: '68%', color: 'bg-emerald-400' }
  ];

  // Live analysis overlay state
  const [stats, setStats] = useState({ signals: 1248, links: 342, anomalies: 7, latency: 58 });
  const [stream, setStream] = useState<string[]>([
    'Analyzing Red Sea maritime trade…',
    'Detected correlation: oil ↓ → inflation ↓ in EU',
  ]);
  useEffect(() => {
    const statsId = setInterval(() => {
      setStats((s) => ({
        signals: s.signals + Math.floor(Math.random() * 25) + 10,
        links: s.links + Math.floor(Math.random() * 6),
        anomalies: Math.max(0, s.anomalies + (Math.random() < 0.3 ? 1 : 0) - (Math.random() < 0.15 ? 1 : 0)),
        latency: Math.max(22, Math.min(95, s.latency + (Math.random() - 0.5) * 6))
      }));
    }, 900);
    const streamId = setInterval(() => {
      const candidates = [
        'New link: shipping routes ↔ logistics costs',
        'Emerging signal: copper demand in Asia ↑',
        'Geopolitical risk: rising tension on eastern border',
        'Oil price volatility impacting air transport',
        'Pattern detected: grains ↔ exchange rate',
      ];
      setStream((list) => {
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        const updated = [next, ...list];
        return updated.slice(0, 3);
      });
    }, 2600);
    return () => { clearInterval(statsId); clearInterval(streamId); };
  }, []);

  return (
    <div className="w-full h-full text-white">
      <div className="relative bg-gradient-to-br from-slate-900/70 via-indigo-900/50 to-purple-900/50 rounded-3xl border-2 border-white/20 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative z-10 px-6 pt-6 pb-3 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="text-left">
              <h3 className="text-2xl font-semibold">World Model AI – Live Global Reasoning</h3>
              <p className="text-white/70 text-sm mt-1">Real-time reasoning on global events, connections, and emerging risks.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Model Status</div>
              <div className="text-sm font-semibold text-emerald-300">Active — updating in real time</div>
            </div>
          </div>
        </div>

        {/* Central Visual */}
        <div className="relative z-10 p-6">
          <div className="relative rounded-2xl border border-white/15 bg-white/5 overflow-hidden h-72 flex items-center justify-center">
            <div className="absolute inset-0">
              {/* Minimal 3D globe with customizable label */}
              <TechGlobe labelText="WORLD MODEL AI" />
            </div>
            {/* Hotspots removed per design preference */}

            {/* Live analysis overlay */}
            <div className="absolute inset-0 pointer-events-none select-none opacity-60">
              {/* HUD superior-izquierda */}
              <div className="absolute top-3 left-3 text-[11px] text-white/60 font-mono tracking-wide">
                <div className="flex gap-4">
                  <div>
                    <div className="text-white/40">signals</div>
                    <div className="text-white/80">{stats.signals.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-white/40">links</div>
                    <div className="text-white/80">{stats.links.toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-white/40">anomalies</div>
                    <div className="text-amber-300/80">{stats.anomalies}</div>
                  </div>
                  <div>
                    <div className="text-white/40">latency</div>
                    <div className="text-cyan-300/80">{Math.round(stats.latency)} ms</div>
                  </div>
                </div>
              </div>

              {/* Stream inferior-izquierda */}
              <div className="absolute bottom-3 left-3 w-[60%] text-[11px] text-white/70 font-mono">
                {stream.map((msg, i) => (
                  <div key={i} className="opacity-80 mb-1">
                    <span className="inline-block w-1.5 h-1.5 bg-cyan-300/60 rounded-full mr-2 align-middle" />
                    {msg}
                  </div>
                ))}
              </div>

              {/* Etiqueta superior-derecha */}
              <div className="absolute top-3 right-3 text-[11px] text-white/50 font-mono tracking-wider">
                Analyzing…
              </div>
            </div>
          </div>

          {/* AI Insight Panel */}
          <AnimatePresence mode="wait">
            <motion.div
              key={insightIndex}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.4 }}
              className="mt-4 text-sm text-white/90 bg-white/5 border border-white/10 rounded-lg px-4 py-3"
            >
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium">AI Insight</span>
              </div>
              <div className="mt-2">
                {insights[insightIndex]}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Cinematic footer accent */}
        <div className="relative z-10 px-6 pb-6">
          <div className="flex items-center justify-center text-[12px] text-white/60">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2" />
            Neural world model monitoring signals in real time
          </div>
        </div>
      </div>
    </div>
  );
});

ChartPlaceholder.displayName = 'ChartPlaceholder';

const InvestmentHeroSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const navigate = useNavigate();
  const [slideIndex, setSlideIndex] = useState<number>(1);

  // Feature badges data
  const features = [
    { icon: '🌐', text: 'Global Reasoning Engine' },
    { icon: '🔄', text: 'Scenario Simulator' },
    { icon: '🤖', text: 'Robots & Geopolitics' },
    { icon: '📡', text: 'Real-time World Insights' }
  ];



  return (
    <section 
      ref={ref}
      className="w-full min-h-screen flex items-start justify-center relative overflow-hidden"
      style={{ willChange: 'transform' }}
    >
      <div className="max-w-7xl mx-auto px-6 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          
          {/* Left Column - Investment Content */}
          <motion.div
            className="space-y-8"
            initial={{ opacity: 0, x: -100, y: 50 }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: -100, y: 50 }}
            transition={{ duration: 1, ease: "easeOut" }}
            style={{ willChange: 'transform, opacity' }}
          >
            {/* Main Headline */}
            <motion.h1 
              className="text-4xl md:text-5xl lg:text-6xl font-light text-white mb-6 leading-tight"
              style={{ 
                textShadow: '0 0 20px rgba(0, 170, 255, 0.5), 0 0 40px rgba(0, 170, 255, 0.3)',
                willChange: 'transform, opacity'
              }}
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={isInView ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.9, y: 20 }}
              transition={{ 
                duration: 0.8, 
                ease: "easeOut",
                delay: 0.2,
                scale: { type: "spring", stiffness: 300, damping: 30 }
              }}
            >
              Understand the world. Anticipate change.
            </motion.h1>
            
            {/* Subheadline */}
            <motion.h2 
              className="text-xl md:text-2xl text-white/80 font-light mb-6"
              style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 font-semibold">WorldLore World Model AI</span> turns global data into understanding—linking causes and effects, simulating scenarios, and delivering real-time insights.
            </motion.h2>
            
            {/* Description Paragraph */}
            <motion.p 
              className="text-lg md:text-xl text-white/90 leading-relaxed font-light mb-8"
              style={{ textShadow: '0 0 15px rgba(0, 0, 0, 0.7)' }}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              World Model AI transforms global data into understanding. It explains why events happen, reveals cause–effect connections between nations, and simulates how the world changes when key variables shift. WorldLore evolves from a global map into a living, reasoning model of the planet.
            </motion.p>
            
            {/* Feature Badges */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              {features.map((feature, index) => (
                <FeatureBadge
                  key={index}
                  icon={feature.icon}
                  text={feature.text}
                  delay={1 + index * 0.1}
                />
              ))}
            </motion.div>
            
            {/* CTA Button */}
            <motion.div 
              className="flex justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 1.4 }}
            >
              <button
                className="px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 text-white font-medium text-lg rounded-full hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] transition-all duration-300 transform hover:scale-105"
                style={{
                  background: 'linear-gradient(45deg, #3b82f6, #8b5cf6, #6366f1)',
                  boxShadow: '0 0 20px rgba(59, 130, 246, 0.3)'
                }}
                onClick={() => navigate('/landing/investment-ai')}
              >
                Explore World Model AI
              </button>
            </motion.div>
          </motion.div>
          
          {/* Right Column - Chart Visualization */}
          <motion.div
            className="relative w-full"
            initial={{ opacity: 0, x: 100, y: 50 }}
            animate={isInView ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: 100, y: 50 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
            style={{ willChange: 'transform, opacity' }}
          >
            <div className="w-full min-h-[600px]">
              {slideIndex === 1 && <ChartPlaceholder />}
              {slideIndex === 2 && <CauseEffectChains />}
              {slideIndex === 3 && <ScenarioSimulator />}
              {slideIndex === 4 && <RobotsGeopolitics />}
            </div>
            {/* Back/Next controls below the entire dashboard card */}
            <div className="mt-6 flex items-center justify-center gap-4">
              <button
                onClick={() => setSlideIndex(s => Math.max(1, s - 1))}
                className={`px-6 py-3 rounded-full border border-white/20 bg-white/5 text-white/90 text-sm hover:bg-white/10 transition ${slideIndex === 1 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                Back
              </button>
              <button
                onClick={() => setSlideIndex(s => Math.min(4, s + 1))}
                className={`px-6 py-3 rounded-full border border-white/20 bg-white/5 text-white/90 text-sm hover:bg-white/10 transition ${slideIndex === 4 ? 'opacity-50 pointer-events-none' : ''}`}
              >
                Next
              </button>
            </div>
          </motion.div>
          
        </div>
      </div>
    </section>
  );
};

InvestmentHeroSection.displayName = 'InvestmentHeroSection';

export default InvestmentHeroSection;
