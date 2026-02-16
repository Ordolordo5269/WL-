import { memo, useMemo, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type ScenarioKey = 'spainRent';

type Scenario = {
  key: ScenarioKey;
  label: string;
  headline: string;
  aiExplanation: string;
  metrics: { name: string; value: string }[];
  pulses: { left: string; top: string; color: string }[];
};

const scenarios: Scenario[] = [
  {
    key: 'spainRent',
    label: 'Spain: Rent +10%',
    headline: 'If rents rise +10% in Spain',
    aiExplanation:
      'Conversational view of everyday impacts in Spain if rents climb further.',
    metrics: [],
    pulses: [],
  },
];

// Comparative categories per scenario: baseline vs simulated values
const comparative: Record<ScenarioKey, { category: string; baseline: string; simulated: string }[]> = {
  spainRent: [
    { category: 'Energy', baseline: '⚡ Energy — Electricity stays high, but fairly stable.', simulated: '⚡ Energy — With rent absorbing more income, households lower electricity and heating by roughly 3–5%. They shift usage to off‑peak hours and delay appliance upgrades, prioritizing essentials.' },
    { category: 'Energy', baseline: '⚡ Energy — Households use more energy than they’d like.', simulated: '⚡ Energy — Consumption at home drops as families adopt efficient habits and turn off devices more often. Bills become a target for savings, reducing comfort during peak winter and summer days.' },
    { category: 'Economy', baseline: '📉 Economy — Inflation is still felt and things remain pricey.', simulated: '📉 Economy — Higher rent cuts disposable income, pushing retail and leisure spending down about 4–7%. Small businesses feel softer demand, and overall growth cools as households prioritize essentials.' },
    { category: 'Economy', baseline: '📉 Economy — Families shop more carefully than before.', simulated: '📉 Economy — Budgets tighten further; price sensitivity rises and non‑essential purchases are postponed. Promotions and discounts drive timing of buys, concentrating sales around deal periods.' },
    { category: 'Housing', baseline: '🏠 Housing — Rents have been creeping up for months.', simulated: '🏠 Housing — Flat‑sharing rises by roughly 2–4 percentage points, and smaller units are favored to afford monthly rent. Occupancy density increases, subtly changing neighborhood composition.' },
    { category: 'Housing', baseline: '🏠 Housing — Few homes are available and many people are looking.', simulated: '🏠 Housing — Moves to cheaper outskirts pick up as people search lower rent per m². Demand eases slightly in the center while commute times increase for many households.' },
    { category: 'Work', baseline: '💼 Work — Many young people still have unstable jobs.', simulated: '💼 Work — Job mobility declines because relocating becomes harder to afford with higher rent. Workers hesitate to change cities, slowing career transitions and wage progression.' },
    { category: 'Work', baseline: '💼 Work — Quality job offers are hard to find.', simulated: '💼 Work — Preference for remote roles rises by around 3–5 percentage points to cut commuting and living costs. Companies offering flexible arrangements attract more applicants and retain talent.' },
    { category: 'Social', baseline: '👥 Social — Many families struggle to make ends meet.', simulated: '👥 Social — Financial stress rises as savings buffers shrink and unexpected expenses become harder to absorb. Wellbeing is affected, with more worry about monthly bills and stability.' },
    { category: 'Social', baseline: '👥 Social — People move out late because rent is expensive.', simulated: '👥 Social — Independence is delayed; young adults stay longer with family, adding months before moving out. Household formation slows, which reshapes rental demand patterns over time.' },
  ],
};

const ScenarioSimulator = memo(() => {
  const [active, setActive] = useState<ScenarioKey>('spainRent');
  const scenario = useMemo(() => scenarios.find(s => s.key === active)!, [active]);

  // Conversación por tema: muestra un único tema por tarjeta y rota categorías
  const [simMsg, setSimMsg] = useState<string>('');
  const [curMsg, setCurMsg] = useState<string>('');
  useEffect(() => {
    const pairs = comparative[active];
    if (!pairs || pairs.length === 0) return;

    // Agrupar por categoría y definir orden deseado
    const order = ['Social', 'Work', 'Housing', 'Economy', 'Energy'];
    const groups: Record<string, { category: string; baseline: string; simulated: string }[]> = {};
    for (const p of pairs) {
      if (!groups[p.category]) groups[p.category] = [];
      groups[p.category].push(p);
    }

    // Punteros por categoría para alternar el segundo mensaje en la próxima vuelta
    const offsetsRef = { current: {} as Record<string, number> } as { current: Record<string, number> };
    order.forEach(cat => { offsetsRef.current[cat] = 0; });

    const replyDelay = 900; // ms de retraso entre baseline y simulated
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let i = 0; // índice de categoría dentro del orden

    const showPairForCategory = (cat: string) => {
      const arr = groups[cat] || [];
      if (arr.length === 0) return; // si falta, se salta
      const idx = offsetsRef.current[cat] % arr.length;
      const pair = arr[idx];
      setCurMsg(pair.baseline);
      timeoutId = setTimeout(() => {
        setSimMsg(pair.simulated);
      }, replyDelay);
      // preparar siguiente para esta categoría cuando vuelva a tocar
      offsetsRef.current[cat] = (idx + 1) % arr.length;
    };

    // Semilla inicial
    showPairForCategory(order[i]);

    const id = setInterval(() => {
      i = (i + 1) % order.length; // pasar a la siguiente categoría
      showPairForCategory(order[i]);
    }, 5200); // ritmo más lento para fluidez

    return () => {
      clearInterval(id);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [active]);

  return (
    <div className="w-full h-full text-white">
      <div className="relative bg-gradient-to-br from-slate-900/70 via-indigo-900/50 to-purple-900/50 rounded-3xl border-2 border-white/20 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="relative z-10 px-6 pt-8 pb-6 border-b border-white/10">
          <div className="flex items-start justify-between">
            <div className="text-left">
              <h3 className="text-2xl font-semibold">Scenario Simulator — Explore possible futures</h3>
              <p className="text-white/70 text-sm mt-1">Play with alternative futures and see how world dynamics respond.</p>
            </div>
            <div className="text-right">
              <div className="text-xs text-white/60">Model Status</div>
              <div className="text-sm font-semibold text-emerald-300">Active — simulating scenarios</div>
              {/* Selector */}
              <div className="mt-3 inline-flex items-center gap-2 bg-slate-900/40 border border-white/10 rounded-full p-1">
                {scenarios.map(s => (
                  <button
                    key={s.key}
                    onClick={() => setActive(s.key)}
                    className={`px-4 py-1 text-xs rounded-full border transition ${
                      active === s.key
                        ? 'bg-indigo-500/20 text-white border-indigo-400/40'
                        : 'text-white/80 bg-slate-800/40 hover:bg-indigo-400/10 border-white/15'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="relative z-10 p-7 grid grid-cols-1 md:grid-cols-2 gap-7">
          {/* Current world trajectory */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden"
          >
            <div className="px-3 pt-3 pb-1 border-b border-white/10">
              <div className="text-sm text-white/70">Baseline</div>
              <div className="text-base font-medium">Spain today</div>
            </div>
            <div className="relative h-64">
              <div className="absolute inset-0 opacity-[0.06] bg-gradient-to-br from-white to-transparent" />
              {/* Mensaje único estilo chat (señal actual) */}
              <div className="absolute top-2 left-2 right-2 flex flex-col gap-2">
                <AnimatePresence initial={false}>
                  {curMsg && (
                    <motion.div
                      key={curMsg}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 26, mass: 0.7 }}
                      layout
                      className="max-w-[85%] rounded-2xl px-3 py-1.5 text-[12px] bg-white/8 border border-white/20 backdrop-blur-sm text-white/90"
                    >
                      {curMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {/* HUD removed per request: Current trajectory focuses on chat feed */}
            </div>
          </motion.div>

          {/* Simulated world */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-white/15 bg-white/5 overflow-hidden"
          >
            <div className="px-3 pt-3 pb-1 border-b border-white/10">
              <div className="text-sm text-white/70">Simulated world</div>
              <AnimatePresence mode="wait">
                <motion.div key={active} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35 }}>
                  <div className="text-base font-medium">{scenario.headline}</div>
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="relative h-64">
              {/* Mensaje único estilo chat (escenario simulado) */}
              <div className="absolute top-2 left-2 right-2 flex flex-col gap-2 items-end">
                <AnimatePresence initial={false}>
                  {simMsg && (
                    <motion.div
                      key={simMsg}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 26, mass: 0.7 }}
                      layout
                      className="max-w-[85%] rounded-2xl px-3 py-1.5 text-[12px] bg-white/8 border border-white/20 backdrop-blur-sm text-white/90"
                    >
                      {simMsg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Metrics removed per request: Simulated world focuses on chat feed */}
            </div>

            {/* AI Explanation removed per user request */}
          </motion.div>
        </div>

        {/* Footer note */}
        <div className="relative z-10 px-6 pb-6">
          <div className="flex items-center justify-center text-[12px] text-white/60">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse mr-2" />
            Baseline vs Simulation — See how dynamics change
          </div>
        </div>
      </div>
    </div>
  );
});

ScenarioSimulator.displayName = 'ScenarioSimulator';

export default ScenarioSimulator;
