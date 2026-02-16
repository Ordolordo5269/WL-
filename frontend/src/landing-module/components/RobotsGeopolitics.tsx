import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const RobotsGeopolitics = memo(() => {
  // Global tick to synchronize card bullets and AI Insight
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 3600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="w-full h-full text-white">
      <div className="relative bg-gradient-to-br from-slate-900/70 via-indigo-900/50 to-purple-900/50 rounded-3xl border-2 border-white/20 overflow-hidden shadow-2xl max-h-[560px]">
        {/* Header */}
        <div className="relative z-10 px-6 pt-8 pb-4 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="text-left">
              <h3 className="text-2xl font-semibold">Robots & Geopolitics — Where nations shape tomorrow</h3>
              <p className="text-white/70 text-sm mt-1">A new era where machines amplify human capability, redraw economic borders, and redefine global influence.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Module Status</div>
              <div className="text-sm font-semibold text-emerald-300">Active — scanning</div>
            </div>
          </div>
        </div>

        {/* Three equal visual blocks */}
        <div className="relative z-10 p-6 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Global Robotics Index */}
          {(() => {
            const bullets = [
              '🤖 China installs more robots than the rest of the world combined.',
              '🇯🇵 Japan and 🇰🇷 South Korea lead in robots per worker.',
              '🇩🇪 Germany excels in high-precision industrial robotics.',
              '🇺🇸 The U.S. accelerates automation in logistics and automotive factories.',
            ];
            const idx = tick % bullets.length;
            return (
          <div className="flex flex-col">
            <div className="text-white/60 text-[12px] mb-2 px-1 text-center">See which nations lead the robotics future.</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden h-56 flex flex-col"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
                <div className="text-sm text-white/70">Global Robotics Index</div>
              </div>
              <div className="p-4 text-[13px] leading-relaxed flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mb-2"
                  >
                    • {bullets[idx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
            );
          })()}

          {/* Automation Impact Score */}
          {(() => {
            const bullets = [
              '⚙️ Automated factories deliver higher speed and fewer errors.',
              '🚚 Supply chains become faster and more resilient.',
              '🧠 More companies shift from traditional machinery to intelligent robots.',
              '🛠️ Automation transforms jobs into more technical and high-skill roles.',
            ];
            const idx = tick % bullets.length;
            return (
          <div className="flex flex-col">
            <div className="text-white/60 text-[12px] mb-2 px-1 text-center">See how automation transforms work.</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden h-56 flex flex-col"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
                <div className="text-sm text-white/70">Automation Impact Score</div>
              </div>
              <div className="p-4 text-[13px] leading-relaxed flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mb-2"
                  >
                    • {bullets[idx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
            );
          })()}

          {/* Robotics in Defense & Industry Map */}
          {(() => {
            const bullets = [
              '🛩️ The U.S. leads in autonomous drones and robotic defense systems.',
              '🛰️ China expands surveillance robots and advanced manufacturing robotics.',
              '🛡️ South Korea deploys autonomous border-security robots.',
              '🏥 Japan excels in collaborative robots for industry and healthcare.',
            ];
            const idx = tick % bullets.length;
            return (
          <div className="flex flex-col">
            <div className="text-white/60 text-[12px] mb-2 px-1 text-center">Explore how robotics is redefining global power.</div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden h-56 flex flex-col"
            >
              <div className="px-4 pt-3 pb-2 border-b border-white/10">
              <div className="text-sm text-white/70">Robotics in Defense & Industry</div>
              </div>
              <div className="p-4 text-[13px] leading-relaxed flex-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mb-2"
                  >
                    • {bullets[idx]}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
            );
          })()}
        </div>

        {/* AI Insight Panel */}
        <div className="relative z-10 px-7 pb-8 -mt-3">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-[13px] text-white/90 bg-white/5 border border-white/10 rounded-lg px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">AI Insight</span>
            </div>
            {(() => {
              const insights = [
                '📦 Countries leading in robotics gain leverage in manufacturing and trade.',
                '📈 Automation raises productivity while polarizing skills; reskilling drives advantage.',
                '🛡️ Autonomous defense and industrial robots redefine deterrence and logistics.',
                '🌐 Strategic robotics investment aligns with export growth and supply-chain resilience.'
              ];
              const insightIdx = tick % insights.length;
              return (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={insightIdx}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.35 }}
                    className="mt-2"
                  >
                    {insights[insightIdx]}
                  </motion.div>
                </AnimatePresence>
              );
            })()}
          </motion.div>
        </div>

        {/* Footer accent removed per design request */}
      </div>
    </div>
  );
});

RobotsGeopolitics.displayName = 'RobotsGeopolitics';

export default RobotsGeopolitics;
